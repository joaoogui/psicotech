import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {ROOT,one,all,run,uid,now,digest,hashPassword,verifyPassword,seal,unseal,publicUser,audit,transaction} from './db.mjs';

const port=Number(process.env.PORT||3000), production=process.env.NODE_ENV==='production';
const origin=process.env.APP_URL||(process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:`http://localhost:${port}`);
if(production&&!process.env.VERCEL&&!origin.startsWith('https://')) throw Error('APP_URL HTTPS é obrigatória em produção.');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const text=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const required=(v,max=200)=>{const s=text(v,max); if(!s)fail(400,'Preencha os campos obrigatórios.');return s;};
const role=(u,r)=>{if(u.role!==r)fail(403,'Acesso não permitido.');};
const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));};
const getSetting=(key,fallback)=>one('SELECT value FROM settings WHERE key=?',key)?.value||fallback;
const doctorProfile=p=>({bio:p.bio,city:p.city,approach:p.approach,style:p.style,format:p.format,specialties:p.specialties||[],price:p.price});
const rates=new Map();
function limit(key,n=30,ms=900000){const t=Date.now();let r=rates.get(key);if(!r||r.until<t)r={until:t+ms,count:0};if(++r.count>n)fail(429,'Muitas tentativas. Aguarde alguns minutos.');rates.set(key,r);}
setInterval(()=>{for(const[k,v]of rates)if(v.until<Date.now())rates.delete(k);run('DELETE FROM sessions WHERE expires<?',Date.now());run('DELETE FROM resets WHERE expires<?',Date.now());},300000).unref();
const dummyHash=hashPassword(randomBytes(32).toString('hex'));
function session(req){const token=/\bpt_session=([a-f0-9]+)/.exec(req.headers.cookie||'')?.[1];return token?one('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>? AND users.active=1',digest(token),Date.now()):null;}
function cookie(token,age){return `pt_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${production?'; Secure':''}`;}
function signin(res,user,remember){const token=randomBytes(32).toString('hex'),age=remember?30*86400:86400;run('INSERT INTO sessions VALUES(?,?,?)',digest(token),user.id,Date.now()+age*1000);json(res,200,{user:publicUser(user)},{'Set-Cookie':cookie(token,age)});}
async function body(req){let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>6000000)fail(413,'Arquivo ou formulário muito grande.');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'Dados inválidos.');}}
function pair(u,id,accepted=true){let patient,doctor;if(u.role==='paciente'){patient=u.id;doctor=id;}else if(u.role==='psicologo'){patient=id;doctor=u.id;}else fail(403,'Acesso não permitido.');const link=one('SELECT * FROM likes WHERE patient=? AND doctor=?',patient,doctor);if(!link||(accepted&&link.status!=='accepted'))fail(403,'É necessário um match aceito.');return {patient,doctor,link};}
function appointment(u,id){const a=one('SELECT * FROM appointments WHERE id=?',id);if(!a||![a.patient,a.doctor].includes(u.id))fail(404,'Sessão não encontrada.');return a;}
function parseDate(value){const d=new Date(value);if(!Number.isFinite(d.getTime()))fail(400,'Data inválida.');return d.toISOString();}
function validMeeting(s){if(!s)return '';try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}fail(400,'Use um link HTTPS para a sala de atendimento.');}
export function scoreMatch(q,p){
 const needs=[...new Set([...(q?.['0']||[]),...(q?.['1']||[])])];
 const tags=(p.specialties||[]).map(x=>x.toLocaleLowerCase('pt-BR'));
 const matched=needs.filter(x=>tags.includes(x.toLocaleLowerCase('pt-BR')));
 const noApproach=['Não tenho preferência','Não sei qual escolher'].includes(q?.['5']);
 const approach=noApproach||q?.['5']===p.approach;
 const format=q?.['6']==='Tanto faz / híbrido'||p.format==='Tanto faz / híbrido'||q?.['6']===p.format;
 const style=q?.['4']==='Ainda não sei'||q?.['4']===p.style;
 const score=Math.round((needs.length?matched.length/needs.length:0)*60+(approach?15:0)+(format?15:0)+(style?10:0));
 return {score,reasons:[matched.length?`Áreas em comum: ${matched.join(', ')}`:'Sem áreas em comum declaradas',approach?'Abordagem compatível':'Abordagem diferente da preferência',format?'Formato compatível':'Formato diferente',style?'Estilo compatível':'Estilo diferente']};
}
async function provider(path,options={}){if(!process.env.MERCADOPAGO_ACCESS_TOKEN)fail(503,'Pagamentos online ainda não configurados.');const r=await fetch('https://api.mercadopago.com'+path,{...options,headers:{Authorization:`Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});if(!r.ok)fail(502,'Não foi possível consultar o pagamento. Tente novamente.');return r.json();}
function reconcile(payment){const a=one('SELECT * FROM appointments WHERE id=?',String(payment.external_reference||''));if(!a||payment.currency_id!=='BRL'||Math.round(Number(payment.transaction_amount)*100)!==a.price)return; if(payment.status==='approved'){run("UPDATE appointments SET payment='paid',payment_id=? WHERE id=?",String(payment.id),a.id);} else if(['refunded','charged_back'].includes(payment.status)){run('UPDATE appointments SET payment=? WHERE id=? AND payment_id=?',payment.status,a.id,String(payment.id));}}

async function api(req,res,url){
 const path=url.pathname,method=req.method;
 const remote=req.socket.remoteAddress||'';
 limit('api:'+remote,600,60000);
 if(method!=='GET'&&path!=='/api/payments/webhook'){
   if(req.headers.origin&&req.headers.origin!==origin&&!req.headers.origin.endsWith('.vercel.app'))fail(403,'Origem não permitida.');
   if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Origem não permitida.');
   if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Envie dados em JSON.');
 }
 const b=method==='GET'?{}:await body(req);
 if(path==='/api/health'&&method==='GET')return json(res,200,{ok:!!one('SELECT 1 AS ok').ok});
 if(path==='/api/payments/webhook'&&method==='POST'){
   const id=String(b.data?.id||url.searchParams.get('data.id')||'');
   if(!/^\d+$/.test(id))return json(res,200,{ok:true});
   reconcile(await provider('/v1/payments/'+id));return json(res,200,{ok:true});
 }
 if(path==='/api/register'&&method==='POST'){
   limit('register:'+remote,10);const email=required(b.email,254).toLowerCase(),name=required(b.name,100),password=required(b.password,128);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10)fail(400,'Use um e-mail válido e uma senha com pelo menos 10 caracteres.');
   if(!['paciente','psicologo'].includes(b.role))fail(400,'Tipo de conta inválido.');
   if(!b.consent)fail(400,'Confirme o consentimento informado.');
   const crp=b.role==='psicologo'?required(b.crp,30):'';if(crp&&!/^\d{2}\/\d{4,8}$/.test(crp))fail(400,'Informe o CRP no formato 06/123456.');
   const id=uid();try{run('INSERT INTO users(id,email,password,name,role,profile,crp,created) VALUES(?,?,?,?,?,?,?,?)',id,email,hashPassword(password),name,b.role,seal({}),crp,now());}catch(e){if(e.code?.includes('CONSTRAINT')||e.message.includes('UNIQUE'))fail(409,'Não foi possível cadastrar este e-mail. Entre ou recupere a senha.');throw e;}
   audit(id,'register',id);return signin(res,one('SELECT * FROM users WHERE id=?',id),false);
 }
 if(path==='/api/login'&&method==='POST'){
   limit('login:'+remote,20);const email=text(b.email,254).toLowerCase();limit('email:'+digest(email),12);const u=one('SELECT * FROM users WHERE email=?',email);const valid=verifyPassword(text(b.password,128),u?.password||dummyHash);if(!u||!valid||!u.active)fail(401,'E-mail ou senha inválidos.');return signin(res,u,b.remember===true);
 }
 if(path==='/api/forgot'&&method==='POST'){
   limit('forgot:'+remote,5);if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)fail(503,'Recuperação por e-mail ainda não configurada. Contate o administrador.');
   const u=one('SELECT * FROM users WHERE email=?',text(b.email,254).toLowerCase());
   if(u){const token=randomBytes(32).toString('hex');run('INSERT INTO resets VALUES(?,?,?)',digest(token),u.id,Date.now()+1800000);const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[u.email],subject:'Recuperar acesso — PsicoTech',text:`Abra ${origin}/?reset=${token} para definir sua senha. O link expira em 30 minutos.`}),signal:AbortSignal.timeout(15000)});if(!r.ok)fail(502,'Não foi possível enviar o e-mail.');}
   return json(res,200,{ok:true});
 }
 if(path==='/api/reset'&&method==='POST'){
   limit('reset:'+remote,10);const r=one('SELECT * FROM resets WHERE token=? AND expires>?',digest(text(b.token,100)),Date.now());if(!r)fail(400,'Link inválido ou expirado.');const password=required(b.password,128);if(password.length<10)fail(400,'Use pelo menos 10 caracteres.');transaction(()=>{run('UPDATE users SET password=? WHERE id=?',hashPassword(password),r.user_id);run('DELETE FROM sessions WHERE user_id=?',r.user_id);run('DELETE FROM resets WHERE user_id=?',r.user_id);});return json(res,200,{ok:true});
 }
 const u=session(req);if(!u)fail(401,'Entre na sua conta para continuar.');
 if(path==='/api/me'&&method==='GET')return json(res,200,{user:publicUser(u),payments:!!process.env.MERCADOPAGO_ACCESS_TOKEN,minimum:Number(getSetting('minimum','0')),cancelHours:Number(getSetting('cancelHours','24'))});
 if(path==='/api/logout'&&method==='POST'){const token=/\bpt_session=([a-f0-9]+)/.exec(req.headers.cookie||'')?.[1];if(token)run('DELETE FROM sessions WHERE token=?',digest(token));return json(res,200,{ok:true},{'Set-Cookie':cookie('',0)});}
 if(path==='/api/profile'&&method==='PUT'){
   const name=required(b.name,100);const p={phone:text(b.phone,30),city:text(b.city,100),birth:text(b.birth,10),bio:text(b.bio,3000),approach:text(b.approach,100),style:text(b.style,100),format:text(b.format,60),specialties:Array.isArray(b.specialties)?b.specialties.slice(0,15).map(x=>text(x,70)):[],price:Math.round(Number(b.price)*100)};
   if(u.role==='psicologo'&&(!Number.isInteger(p.price)||p.price<100||p.price>1000000))fail(400,'Informe um valor de sessão entre R$ 1 e R$ 10.000.');if(u.role!=='psicologo')p.price=0;
   run('UPDATE users SET name=?,profile=? WHERE id=?',name,seal(p),u.id);return json(res,200,{user:publicUser(one('SELECT * FROM users WHERE id=?',u.id))});
 }
 if(path==='/api/password'&&method==='PUT'){if(!verifyPassword(text(b.current,128),u.password))fail(400,'Senha atual incorreta.');const password=required(b.password,128);if(password.length<10)fail(400,'Use pelo menos 10 caracteres.');transaction(()=>{run('UPDATE users SET password=? WHERE id=?',hashPassword(password),u.id);run('DELETE FROM sessions WHERE user_id=?',u.id);});return signin(res,one('SELECT * FROM users WHERE id=?',u.id),false);}
 if(path==='/api/quiz'&&method==='PUT'){
   role(u,'paciente');const q=b.answers;if(!q||!Array.isArray(q['0'])||!q['0'].length||q['0'].length>3||!Array.isArray(q['1'])||!q['1'].length||q['1'].length>3||[2,3,4,5,6].some(k=>typeof q[k]!=='string'||!q[k]))fail(400,'Responda todas as perguntas obrigatórias.');
   if([...q['0'],...q['1']].some(x=>typeof x!=='string'||!x.trim()||x.length>100)||[2,3,4,5,6].some(k=>q[k].length>150)||(q['7']!==undefined&&(typeof q['7']!=='string'||q['7'].length>600))||JSON.stringify(q).length>12000)fail(400,'Respostas inválidas ou muito longas.');run('UPDATE users SET quiz=? WHERE id=?',seal(q),u.id);return json(res,200,{ok:true});
 }
 if(path==='/api/doctors'&&method==='GET'){
   role(u,'paciente');const q=u.quiz?unseal(u.quiz):null;const doctors=all("SELECT * FROM users WHERE role='psicologo' AND active=1 AND verified=1").map(d=>{const p=unseal(d.profile);return {id:d.id,name:d.name,crp:d.crp,profile:doctorProfile(p),...(q?scoreMatch(q,p):{score:null,reasons:[]}),like:one('SELECT status FROM likes WHERE patient=? AND doctor=?',u.id,d.id)?.status||null,reviews:all('SELECT rating,body,created FROM reviews WHERE doctor=? ORDER BY created DESC',d.id)};}).filter(d=>d.profile.price>0&&(!q||d.score>=Number(getSetting('minimum','0')))).sort((a,b)=>(b.score||0)-(a.score||0));return json(res,200,{doctors});
 }
 if(path==='/api/likes'&&method==='POST'){role(u,'paciente');if(!u.quiz)fail(400,'Complete o questionário primeiro.');const d=one("SELECT * FROM users WHERE id=? AND role='psicologo' AND active=1 AND verified=1",text(b.doctor));if(!d)fail(404,'Profissional indisponível.');const p=unseal(d.profile);if(!p.price||scoreMatch(unseal(u.quiz),p).score<Number(getSetting('minimum','0')))fail(400,'Perfil fora dos critérios de compatibilidade.');run("INSERT INTO likes(patient,doctor,status,created) VALUES(?,?,'pending',?) ON CONFLICT(patient,doctor) DO UPDATE SET status=CASE WHEN status='rejected' THEN 'pending' ELSE status END",u.id,d.id,now());return json(res,200,{ok:true});}
 if(path==='/api/likes'&&method==='GET'){
   const key=u.role==='paciente'?'patient':'doctor';if(u.role==='admin')fail(403,'Acesso não permitido.');const links=all(`SELECT * FROM likes WHERE ${key}=? ORDER BY created DESC`,u.id).map(l=>{const other=one('SELECT id,name,active FROM users WHERE id=?',u.role==='paciente'?l.doctor:l.patient);return {...l,other};});return json(res,200,{links});
 }
 if(path==='/api/likes'&&method==='PUT'){role(u,'psicologo');if(!u.verified)fail(403,'Aguarde a aprovação profissional.');if(!['accepted','rejected'].includes(b.status))fail(400,'Situação inválida.');pair(u,text(b.patient),false);run('UPDATE likes SET status=? WHERE patient=? AND doctor=?',b.status,b.patient,u.id);return json(res,200,{ok:true});}
 if(path==='/api/messages'&&method==='GET'){const p=pair(u,required(url.searchParams.get('other')));const after=Math.max(0,Number(url.searchParams.get('after'))||0);const rows=all('SELECT * FROM messages WHERE patient=? AND doctor=? AND id>? ORDER BY id LIMIT 300',p.patient,p.doctor,after).map(m=>({...m,body:unseal(m.body)}));return json(res,200,{messages:rows});}
 if(path==='/api/messages'&&method==='POST'){const p=pair(u,required(b.other));limit('messages:'+u.id,60,60000);run('INSERT INTO messages(patient,doctor,sender,body,created) VALUES(?,?,?,?,?)',p.patient,p.doctor,u.id,seal(required(b.body,4000)),now());return json(res,201,{ok:true});}
 if(path==='/api/slots'&&method==='GET'){const doctor=u.role==='psicologo'?u.id:required(url.searchParams.get('doctor'));if(u.role==='paciente')pair(u,doctor);return json(res,200,{slots:all("SELECT s.* FROM slots s WHERE s.doctor=? AND s.starts>? AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.doctor=s.doctor AND a.starts=s.starts AND a.status!='cancelled') ORDER BY s.starts",doctor,now())});}
 if(path==='/api/slots'&&method==='POST'){role(u,'psicologo');if(!u.verified)fail(403,'Aguarde a aprovação profissional.');const starts=parseDate(b.starts);const d=new Date(starts);if(d.getTime()<Date.now()||d.getMinutes()!==0||d.getSeconds()!==0||d.getMilliseconds()!==0)fail(400,'Escolha uma hora cheia futura. Cada sessão ocupa uma hora.');run('INSERT OR IGNORE INTO slots VALUES(?,?,?)',uid(),u.id,starts);return json(res,201,{ok:true});}
 if(path==='/api/slots'&&method==='DELETE'){role(u,'psicologo');run('DELETE FROM slots WHERE id=? AND doctor=?',text(b.id),u.id);return json(res,200,{ok:true});}
 if(path==='/api/appointments'&&method==='GET'){if(u.role==='admin')fail(403,'Acesso não permitido.');const rows=all(`SELECT a.*,p.name patient_name,d.name doctor_name FROM appointments a JOIN users p ON p.id=a.patient JOIN users d ON d.id=a.doctor WHERE a.${u.role==='paciente'?'patient':'doctor'}=? ORDER BY a.starts DESC`,u.id);return json(res,200,{appointments:rows});}
 if(path==='/api/appointments'&&method==='POST'){
   role(u,'paciente');pair(u,required(b.doctor));const starts=parseDate(b.starts);if(starts<=now())fail(400,'Escolha um horário futuro.');const d=one('SELECT * FROM users WHERE id=? AND verified=1 AND active=1',b.doctor);if(!d)fail(400,'Profissional indisponível.');const price=unseal(d.profile).price;if(!price)fail(400,'Profissional sem valor de sessão definido.');
   transaction(()=>{if(!one('SELECT id FROM slots WHERE doctor=? AND starts=?',d.id,starts))fail(409,'Horário indisponível.');if(one("SELECT id FROM appointments WHERE (doctor=? OR patient=?) AND starts=? AND status!='cancelled'",d.id,u.id,starts))fail(409,'Este horário já está ocupado.');run("INSERT INTO appointments(id,patient,doctor,starts,price,status,created) VALUES(?,?,?,?,?,'scheduled',?)",uid(),u.id,d.id,starts,price,now());});return json(res,201,{ok:true});
 }
 if(path==='/api/appointments'&&method==='PUT'){
   const a=appointment(u,required(b.id));if(a.status!=='scheduled')fail(400,'A sessão já foi finalizada ou cancelada.');
   if(b.action==='cancel'){if(new Date(a.starts).getTime()-Date.now()<Number(getSetting('cancelHours','24'))*3600000)fail(400,'Prazo de cancelamento encerrado. Abra um chamado no suporte.');if(a.payment==='paid')fail(409,'Sessão paga: solicite cancelamento e reembolso pelo suporte.');run("UPDATE appointments SET status='cancelled' WHERE id=?",a.id);}
   else if(b.action==='complete'){role(u,'psicologo');if(new Date(a.starts).getTime()+3600000>Date.now())fail(400,'Aguarde o término do horário da sessão.');run("UPDATE appointments SET status='completed' WHERE id=?",a.id);}
   else if(b.action==='meeting'){role(u,'psicologo');run('UPDATE appointments SET meeting=? WHERE id=?',validMeeting(text(b.meeting,1500)),a.id);}
   else fail(400,'Ação inválida.');audit(u.id,b.action,a.id);return json(res,200,{ok:true});
 }
 if(path==='/api/checkout'&&method==='POST'){role(u,'paciente');const a=appointment(u,required(b.id));if(a.status!=='scheduled'||a.payment==='paid')fail(400,'Sessão indisponível para pagamento.');if(!origin.startsWith('https://'))fail(503,'O pagamento exige a publicação com HTTPS.');const p=await provider('/checkout/preferences',{method:'POST',body:JSON.stringify({items:[{id:a.id,title:'Sessão agendada',quantity:1,currency_id:'BRL',unit_price:a.price/100}],external_reference:a.id,notification_url:origin+'/api/payments/webhook',back_urls:{success:origin+'/?payment=return',pending:origin+'/?payment=return',failure:origin+'/?payment=return'},auto_return:'approved'})});return json(res,200,{url:p.init_point});}
 if(path==='/api/payments/check'&&method==='POST'){const a=appointment(u,required(b.id));limit('payment:'+u.id,10,60000);const result=await provider('/v1/payments/search?external_reference='+encodeURIComponent(a.id));for(const p of result.results||[])reconcile(p);return json(res,200,{ok:true});}
 if(path==='/api/moods'&&method==='GET'){role(u,'paciente');return json(res,200,{moods:all('SELECT * FROM moods WHERE patient=? ORDER BY day DESC LIMIT 365',u.id).map(m=>({...m,note:unseal(m.note)}))});}
 if(path==='/api/moods'&&method==='PUT'){role(u,'paciente');if(!Number.isInteger(b.score)||b.score<1||b.score>5||!/^\d{4}-\d{2}-\d{2}$/.test(b.day))fail(400,'Informe dia e humor de 1 a 5.');if(b.day>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}))fail(400,'Não registre dias futuros.');run('INSERT INTO moods VALUES(?,?,?,?,?) ON CONFLICT(patient,day) DO UPDATE SET score=excluded.score,note=excluded.note',uid(),u.id,b.day,b.score,seal(text(b.note,3000)));return json(res,200,{ok:true});}
 if(path==='/api/notes'&&method==='GET'){role(u,'psicologo');const p=pair(u,required(url.searchParams.get('patient')));audit(u.id,'read_notes',p.patient);return json(res,200,{notes:all('SELECT * FROM notes WHERE doctor=? AND patient=? ORDER BY created DESC',u.id,p.patient).map(n=>({...n,body:unseal(n.body)}))});}
 if(path==='/api/notes'&&method==='POST'){role(u,'psicologo');const p=pair(u,required(b.patient));run('INSERT INTO notes VALUES(?,?,?,?,?)',uid(),u.id,p.patient,seal(required(b.body,15000)),now());audit(u.id,'create_note',p.patient);return json(res,201,{ok:true});}
 if(path==='/api/documents'&&method==='POST'){
   role(u,'psicologo');if(!['diploma','crp'].includes(b.kind))fail(400,'Tipo de documento inválido.');const bytes=Buffer.from(text(b.data,4000000),'base64');const mime=bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':null;if(!mime||bytes.length>2*1024*1024)fail(400,'Envie PDF, PNG ou JPEG de até 2 MB.');transaction(()=>{run('DELETE FROM documents WHERE owner=? AND kind=?',u.id,b.kind);run('INSERT INTO documents VALUES(?,?,?,?,?,?,?)',uid(),u.id,b.kind,text(b.filename,150),mime,seal(bytes.toString('base64')),now());run("UPDATE users SET verified=0,review_note='' WHERE id=?",u.id);});return json(res,201,{ok:true});
 }
 if(path==='/api/documents'&&method==='GET'){const owner=u.role==='admin'?required(url.searchParams.get('owner')):u.id;return json(res,200,{documents:all('SELECT id,kind,filename,mime,created FROM documents WHERE owner=?',owner)});}
 if(path.startsWith('/api/documents/')&&method==='GET'){const d=one('SELECT * FROM documents WHERE id=?',path.split('/').pop());if(!d||(d.owner!==u.id&&u.role!=='admin'))fail(404,'Documento não encontrado.');audit(u.id,'read_document',d.id);res.writeHead(200,{'Content-Type':d.mime,'Content-Disposition':'attachment; filename="documento.'+(d.mime==='application/pdf'?'pdf':d.mime==='image/png'?'png':'jpg')+'"','Cache-Control':'no-store'});return res.end(Buffer.from(unseal(d.body),'base64'));}
 if(path==='/api/reviews'&&method==='POST'){role(u,'paciente');const a=appointment(u,required(b.appointment));if(a.status!=='completed'||!Number.isInteger(b.rating)||b.rating<1||b.rating>5)fail(400,'Avalie uma sessão concluída com nota de 1 a 5.');run('INSERT INTO reviews VALUES(?,?,?,?,?,?) ON CONFLICT(appointment) DO UPDATE SET rating=excluded.rating,body=excluded.body',a.id,u.id,a.doctor,b.rating,text(b.body,1500),now());return json(res,200,{ok:true});}
 if(path==='/api/reviews'&&method==='GET'){role(u,'psicologo');return json(res,200,{reviews:all('SELECT rating,body,created FROM reviews WHERE doctor=? ORDER BY created DESC',u.id)});}
 if(path==='/api/tickets'&&method==='GET'){return json(res,200,{tickets:(u.role==='admin'?all('SELECT t.*,u.name FROM tickets t JOIN users u ON t.owner=u.id ORDER BY created DESC'):all('SELECT * FROM tickets WHERE owner=? ORDER BY created DESC',u.id)).map(t=>({...t,body:unseal(t.body),reply:t.reply?unseal(t.reply):''}))});}
 if(path==='/api/tickets'&&method==='POST'){run('INSERT INTO tickets(id,owner,subject,body,created) VALUES(?,?,?,?,?)',uid(),u.id,required(b.subject,150),seal(required(b.body,5000)),now());return json(res,201,{ok:true});}
 if(path==='/api/tickets'&&method==='PUT'){role(u,'admin');run("UPDATE tickets SET reply=?,status='answered' WHERE id=?",seal(required(b.reply,5000)),required(b.id));return json(res,200,{ok:true});}
 if(path==='/api/articles'&&method==='GET')return json(res,200,{articles:all('SELECT * FROM articles ORDER BY created DESC')});
 if(path==='/api/articles'&&method==='POST'){role(u,'admin');run('INSERT INTO articles VALUES(?,?,?,?)',uid(),required(b.title,150),required(b.body,15000),now());return json(res,201,{ok:true});}
 if(path==='/api/articles'&&method==='DELETE'){role(u,'admin');run('DELETE FROM articles WHERE id=?',required(b.id));return json(res,200,{ok:true});}
 if(path==='/api/admin/users'&&method==='GET'){role(u,'admin');return json(res,200,{users:all('SELECT id,name,email,role,active,crp,verified,review_note,created FROM users ORDER BY created DESC')});}
 if(path==='/api/admin/users'&&method==='PUT'){role(u,'admin');const target=one('SELECT * FROM users WHERE id=?',required(b.id));if(!target||target.id===u.id||target.role==='admin')fail(400,'Esta conta não pode ser alterada.');if(typeof b.active==='boolean'){run('UPDATE users SET active=? WHERE id=?',b.active?1:0,target.id);run('DELETE FROM sessions WHERE user_id=?',target.id);}if(typeof b.verified==='boolean'){if(target.role!=='psicologo')fail(400,'Conta não profissional.');if(b.verified&&all('SELECT DISTINCT kind FROM documents WHERE owner=?',target.id).length!==2)fail(400,'São necessários diploma e registro CRP para revisão.');if(!text(b.note))fail(400,'Registre o resultado e a referência da verificação profissional.');run('UPDATE users SET verified=?,review_note=? WHERE id=?',b.verified?1:0,text(b.note,2000),target.id);}audit(u.id,'review_user',target.id);return json(res,200,{ok:true});}
 if(path==='/api/admin/stats'&&method==='GET'){role(u,'admin');return json(res,200,{users:one('SELECT COUNT(*) n FROM users').n,doctors:one("SELECT COUNT(*) n FROM users WHERE role='psicologo' AND verified=1").n,appointments:one('SELECT COUNT(*) n FROM appointments').n,paid:one("SELECT COALESCE(SUM(price),0) n FROM appointments WHERE payment='paid'").n,pending:one("SELECT COUNT(*) n FROM users WHERE role='psicologo' AND verified=0").n,audit:all('SELECT a.*,u.name FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.id DESC LIMIT 50')});}
 if(path==='/api/admin/settings'&&method==='PUT'){role(u,'admin');const min=Number(b.minimum),hours=Number(b.cancelHours);if(!Number.isInteger(min)||min<0||min>100||!Number.isInteger(hours)||hours<0||hours>168)fail(400,'Compatibilidade deve ser 0–100; cancelamento, 0–168 horas.');transaction(()=>{run('INSERT OR REPLACE INTO settings VALUES(?,?)','minimum',String(min));run('INSERT OR REPLACE INTO settings VALUES(?,?)','cancelHours',String(hours));});audit(u.id,'settings','platform');return json(res,200,{ok:true});}
 if(path==='/api/export'&&method==='GET'){const own=publicUser(u);const messages=all('SELECT * FROM messages WHERE sender=?',u.id).map(m=>({...m,body:unseal(m.body)}));const moods=u.role==='paciente'?all('SELECT * FROM moods WHERE patient=?',u.id).map(m=>({...m,note:unseal(m.note)})):[];return json(res,200,{user:own,messages,moods},{'Content-Disposition':'attachment; filename="meus-dados-psicotech.json"'});}
 fail(404,'Recurso não encontrado.');
}
const assets={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.css':'app.css','/script.js':'script.js','/app.js':'app.js','/logo.png':'logo.png','/logo2.png':'logo2.png','/logo-small.png':'logo-small.png'};
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(self), microphone=(self)');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(production)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 try{const url=new URL(req.url,origin);if(url.pathname.startsWith('/api/'))return await api(req,res,url);const asset=assets[url.pathname];if(!asset||!['GET','HEAD'].includes(req.method))fail(404,'Página não encontrada.');const mime=asset.endsWith('.css')?'text/css':asset.endsWith('.js')?'text/javascript':asset.endsWith('.png')?'image/png':'text/html';res.writeHead(200,{'Content-Type':mime+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:readFileSync(resolve(ROOT,asset)));}
 catch(e){const status=e.status||500;if(status===500)console.error('Request failed:',e.message);json(res,status,{error:status===500?'Não foi possível concluir. Tente novamente.':e.message});}
});
if(process.argv[1]&&resolve(process.argv[1])===resolve(ROOT,'server.mjs'))server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`PsicoTech disponível em ${origin}`));
