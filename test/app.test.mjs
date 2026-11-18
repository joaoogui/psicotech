import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'psicotech-test-'));
process.env.DATA_KEY='a'.repeat(64);
process.env.NODE_ENV='test';
const {server,scoreMatch}=await import('../server.mjs');
const {one,run,uid,now,seal,hashPassword}=await import('../db.mjs');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;

class Client{
 cookie='';
 async call(path,method='GET',data,expected=200,headers={}){
  const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',cookie:this.cookie,...headers},body:data===undefined?undefined:JSON.stringify(data)});
  if(r.headers.get('set-cookie'))this.cookie=r.headers.get('set-cookie').split(';')[0];
  const body=await r.json();assert.equal(r.status,expected,JSON.stringify(body));return body;
 }
}
const p=new Client(),p2=new Client(),d=new Client(),admin=new Client(),anon=new Client();
let patient,patient2,doctor,appointmentId;
const quiz={'0':['Ansiedade'],'1':['Autoestima'],'2':'Bem','3':'Não, será minha primeira vez','4':'Mais direto e prático','5':'TCC','6':'Online','7':'privado-questionario'};
const profile={name:'Profissional de teste',price:150,phone:'privado-telefone',birth:'1980-01-01',approach:'TCC',format:'Online',style:'Mais direto e prático',specialties:['Ansiedade','Autoestima'],bio:'Perfil de teste'};
await test('fluxos integrados', async t=>{
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 await t.test('cadastro e autenticação com controle de papéis',async()=>{
 await anon.call('/me','GET',undefined,401);
 await anon.call('/register','POST',{name:'Fraude',email:'admin@test.example',password:'senha-de-teste-123',role:'admin',consent:true},400);
 patient=(await p.call('/register','POST',{name:'Paciente teste',email:'p@test.example',password:'senha-de-teste-123',role:'paciente',consent:true})).user;
 patient2=(await p2.call('/register','POST',{name:'Outro paciente',email:'p2@test.example',password:'senha-de-teste-123',role:'paciente',consent:true})).user;
 doctor=(await d.call('/register','POST',{name:'Profissional',email:'d@test.example',password:'senha-de-teste-123',role:'psicologo',crp:'06/123456',consent:true})).user;
 await anon.call('/login','POST',{email:'p@test.example',password:'senha-incorreta'},401);
 await p.call('/admin/users','GET',undefined,403);
 const id=uid();run('INSERT INTO users(id,email,password,name,role,profile,created) VALUES(?,?,?,?,?,?,?)',id,'admin@test.example',hashPassword('admin-test-password'),'Admin de teste','admin',seal({}),now());
 await admin.call('/login','POST',{email:'admin@test.example',password:'admin-test-password'});
});
await t.test('perfis pendentes não aparecem; revisão requer documentos',async()=>{
 await d.call('/profile','PUT',profile);
 assert.equal((await p.call('/doctors')).doctors.length,0);
 await p.call('/likes','POST',{doctor:doctor.id},400);
 await admin.call('/admin/users','PUT',{id:doctor.id,verified:true,note:'Fixture de teste'},400);
 for(const kind of['diploma','crp'])await d.call('/documents','POST',{kind,filename:'teste.pdf',data:Buffer.from('%PDF-1.7\n documento de teste').toString('base64')},201);
 await admin.call('/admin/users','PUT',{id:doctor.id,verified:true,note:'Somente teste automatizado'});
 const docs=(await d.call('/documents')).documents;
 const r=await fetch(base+'/api/documents/'+docs[0].id,{headers:{cookie:p.cookie}});assert.equal(r.status,404);
});
await t.test('match usa respostas reais e valida questionário',async()=>{
 await p.call('/quiz','PUT',{answers:{}},400);
 await p.call('/quiz','PUT',{answers:quiz});
 assert.equal(scoreMatch(quiz,profile).score,100);
 const doctors=(await p.call('/doctors')).doctors;assert.equal(doctors.length,1);assert.equal(doctors[0].score,100);
 assert.equal(doctors[0].profile.birth,undefined);assert.equal(doctors[0].profile.phone,undefined);
 await p.call('/likes','POST',{doctor:doctor.id});
 await p.call('/messages?other='+doctor.id,'GET',undefined,403);
 await d.call('/likes','PUT',{patient:patient.id,status:'accepted'});
});
await t.test('mensagens persistem e são restritas aos participantes',async()=>{
 await p.call('/messages','POST',{other:doctor.id,body:'mensagem-secreta-teste'},201);
 const messages=(await d.call('/messages?other='+patient.id)).messages;assert.equal(messages[0].body,'mensagem-secreta-teste');
 await p2.call('/messages?other='+doctor.id,'GET',undefined,403);
 await admin.call('/messages?other='+doctor.id,'GET',undefined,403);
 assert.ok(!one('SELECT body FROM messages').body.includes('mensagem-secreta-teste'));
 assert.ok(!one('SELECT quiz FROM users WHERE id=?',patient.id).quiz.includes('privado-questionario'));
});
await t.test('agenda persiste preço e impede reserva duplicada',async()=>{
 const starts=new Date(Date.now()+4*86400000);starts.setUTCHours(15,0,0,0);const iso=starts.toISOString();
 await d.call('/slots','POST',{starts:iso},201);
 await p.call('/appointments','POST',{doctor:doctor.id,starts:iso},201);
 await p.call('/appointments','POST',{doctor:doctor.id,starts:iso},409);
 const list=(await p.call('/appointments')).appointments;appointmentId=list[0].id;assert.equal(list[0].price,15000);
 await p2.call('/appointments','PUT',{id:appointmentId,action:'cancel'},404);
 await d.call('/appointments','PUT',{id:appointmentId,action:'meeting',meeting:'javascript:alert(1)'},400);
 await d.call('/appointments','PUT',{id:appointmentId,action:'meeting',meeting:'https://example.org/sala-teste'});
 assert.equal((await p.call('/appointments')).appointments[0].meeting,'https://example.org/sala-teste');
 await d.call('/appointments','PUT',{id:appointmentId,action:'complete'},400);
});
await t.test('humor privado e prontuário restrito ao psicólogo vinculado',async()=>{
 await p.call('/moods','PUT',{day:'2026-01-01',score:4,note:'humor-privado'});
 assert.equal((await p.call('/moods')).moods[0].score,4);assert.equal((await p2.call('/moods')).moods.length,0);
 await d.call('/moods','GET',undefined,403);
 await d.call('/notes','POST',{patient:patient.id,body:'anotacao-clinica-privada'},201);
 assert.equal((await d.call('/notes?patient='+patient.id)).notes.length,1);
 await p.call('/notes?patient='+patient.id,'GET',undefined,403);
 await admin.call('/notes?patient='+patient.id,'GET',undefined,403);
 assert.ok(!one('SELECT body FROM notes').body.includes('anotacao-clinica-privada'));
});
await t.test('cancelamento libera horário, concluído permite avaliação',async()=>{
 await p.call('/appointments','PUT',{id:appointmentId,action:'cancel'});
 assert.equal((await p.call('/appointments')).appointments[0].status,'cancelled');
 run("UPDATE appointments SET starts=?,status='completed' WHERE id=?",'2026-01-01T15:00:00.000Z',appointmentId);
 await p.call('/reviews','POST',{appointment:appointmentId,rating:5,body:'Avaliação de teste'});
 assert.equal((await d.call('/reviews')).reviews[0].rating,5);
 await p2.call('/reviews','POST',{appointment:appointmentId,rating:5},404);
});
await t.test('suporte e conteúdos administrativos persistem',async()=>{
 await p.call('/tickets','POST',{subject:'Solicitação teste',body:'Detalhes de teste'},201);
 const t=(await admin.call('/tickets')).tickets[0];await admin.call('/tickets','PUT',{id:t.id,reply:'Resposta teste'});
 assert.equal((await p.call('/tickets')).tickets[0].reply,'Resposta teste');assert.equal((await p2.call('/tickets')).tickets.length,0);
 await admin.call('/articles','POST',{title:'Teste',body:'Conteúdo de teste'},201);
 assert.equal((await p.call('/articles')).articles.length,1);
 await p.call('/articles','POST',{title:'Proibido',body:'x'},403);
});
await t.test('CSRF, publicação de segredos, recuperação e suspensão',async()=>{
 await p.call('/profile','PUT',{name:'Invasor'},403,{Origin:'https://malicious.example'});
 for(const path of['/data/psicotech.sqlite','/server.mjs','/.env','/original/index.html'])assert.equal((await fetch(base+path)).status,404);
 const html=await fetch(base);assert.equal(html.status,200);assert.ok(html.headers.get('content-security-policy'));
 await p.call('/forgot','POST',{email:'p@test.example'},503);
 await admin.call('/admin/users','PUT',{id:patient2.id,active:false});await p2.call('/me','GET',undefined,401);
 await p.call('/logout','POST',{});await p.call('/me','GET',undefined,401);
});

});
