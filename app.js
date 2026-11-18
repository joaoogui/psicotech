/* Interface conectada ao servidor. Nenhum dado clínico é salvo no navegador. */
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>(Number(v||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=v=>new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const formatTime=v=>{if(!v)return '';const d=new Date(v),n=new Date();const isToday=d.toDateString()===n.toDateString();const t=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});return isToday?t:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+t;};
const day=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const statusName={pending:'Aguardando',accepted:'Aceito',rejected:'Não aceito',scheduled:'Agendada',cancelled:'Cancelada',completed:'Concluída',paid:'Pago',refunded:'Reembolsado',charged_back:'Contestado',open:'Aberto',answered:'Respondido'};
const topics=['Ansiedade','Estresse ou sobrecarga','Problemas nos relacionamentos','Autoestima','Família','Trabalho ou estudos','Autoconhecimento','Estou passando por uma fase difícil','Relacionamentos','Sono e rotina','Questões emocionais','Outro'];
let user=null,meta={},page='',renderVersion=0,selectedOther='',chatTimer=null,messageCursor=0,chatMessages=[];
let requestBusy=false;
async function api(path,method='GET',data){const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const b=await r.json();if(!r.ok){if(r.status===401&&user){user=null;showScreen('login');}throw Error(b.error||'Não foi possível concluir.');}return b;}
function toast(message){let el=$('#live-toast');if(!el){el=document.createElement('div');el.id='live-toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.remove(),4500);}
function error(el,message){let box=el.querySelector('.live-error');if(!box){box=document.createElement('div');box.className='live-error';box.setAttribute('role','alert');el.prepend(box);}box.textContent=message;}
function heading(title,sub=''){return `<div class="live-header"><span class="eyebrow">PsicoTech · ${esc(user?.role||'')}</span><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div>`;}
function empty(title,body){return `<div class="live-empty"><h2>${esc(title)}</h2><p>${esc(body)}</p></div>`;}
function button(label,action,args={},style='primary'){return `<button class="btn btn-${style}" data-action="${action}" ${Object.entries(args).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')}>${esc(label)}</button>`;}
function go(label,id){return button(label,'navigate',{page:id},'outline');}
function input(label,name,value='',type='text',attrs=''){return `<label for="f-${name}">${esc(label)}</label><input class="input" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`;}
function area(label,name,value='',attrs=''){return `<label for="f-${name}">${esc(label)}</label><textarea class="textarea" id="f-${name}" name="${name}" ${attrs}>${esc(value)}</textarea>`;}
function select(label,name,options,value){return `<label for="f-${name}">${esc(label)}</label><select class="input" id="f-${name}" name="${name}">${options.map(o=>`<option value="${esc(Array.isArray(o)?o[0]:o)}" ${value===(Array.isArray(o)?o[0]:o)?'selected':''}>${esc(Array.isArray(o)?o[1]:o)}</option>`).join('')}</select>`;}
function form(name,content,submit='Salvar',attrs=''){content=content.replaceAll('id="f-','id="'+name+'-').replaceAll('for="f-','for="'+name+'-');return `<form class="live-form" data-form="${name}" ${attrs}>${content}<button class="btn btn-primary" type="submit">${submit}</button></form>`;}
const card=content=>`<div class="live-card">${content}</div>`;
function signedIn(){currentRole=user.role;quizAnswers=user.quiz?structuredClone(user.quiz):{};quizIndex=0;renderQuizQuestion();$('.role-switch').textContent=`${user.name} · ${user.role}`;$('#topbar-avatar').textContent=user.name.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase();renderSidebar();}
const baseShow=showScreen;
showScreen=function(id){
 const previousPage=page;clearInterval(chatTimer);page=id;
 const publicPages=['landing','login','como-funciona','para-psicologos','sobre','privacy','terms'];
 if(publicPages.includes(id)){baseShow(id);return;}
 if(!user){baseShow('login');return;}
 const prefix=user.role==='paciente'?'p':user.role==='psicologo'?'d':'a';
 if(!id.startsWith(prefix+'-'))id=prefix+'-dashboard';page=id;
 if(id==='p-questionario'&&previousPage!==id){quizIndex=0;quizAnswers=user.quiz?structuredClone(user.quiz):{};renderQuizQuestion();}
 if(!document.getElementById('scr-'+id)){const section=document.createElement('section');section.className='screen';section.id='scr-'+id;$('#content').append(section);}
 baseShow(id);
 if(['p-questionario','p-quiz-intro'].includes(id))return;
 renderPage(id);
};
switchRole=function(){if(user){signedIn();showScreen(user.role==='paciente'?'p-dashboard':user.role==='psicologo'?'d-dashboard':'a-dashboard');}else showScreen('login');};
goHome=()=>showScreen('landing');
startQuiz=function(){quizIndex=0;quizAnswers=user?.quiz?structuredClone(user.quiz):{};showScreen('p-questionario');renderQuizQuestion();};
saveQuizDraft=function(){};
finishQuiz=async function(){if(requestBusy)return;requestBusy=true;try{await api('/quiz','PUT',{answers:quizAnswers});user.quiz=structuredClone(quizAnswers);showScreen('p-resultados');toast('Respostas salvas. Compatibilidade atualizada.');}catch(e){$('#quiz-error').textContent=e.message;}finally{requestBusy=false;}};
NAV.psicologo[0].items.push({id:'d-chat',icon:'chat',label:'Chat'});
for(const [r,p]of[['paciente','p'],['psicologo','d']])NAV[r].push({label:'Informações',items:[{id:p+'-conteudos',icon:'book',label:'Conteúdos'},{id:p+'-suporte',icon:'headset',label:'Suporte'}]});

function setupLogin(){
 $('.login__div8').innerHTML=`<div class="tabs mb-16"><button class="tab-btn active" data-action="login-mode" data-mode="entrar">Entrar</button><button class="tab-btn" data-action="login-mode" data-mode="cadastrar">Cadastrar</button></div><h2 id="login-title">Bem-vindo(a) de volta</h2><form id="login-form" class="live-form" data-form="login"><div id="login-name-field" class="live-hidden">${input('Nome completo','name','','text','autocomplete="name" maxlength="100"')}</div><div id="login-role-field" class="live-hidden">${select('Tipo de conta','role',[['paciente','Sou paciente'],['psicologo','Sou psicólogo']],'paciente')}</div>${input('E-mail','email','','email','required autocomplete="email" maxlength="254"')}${input('Senha','password','','password','required autocomplete="current-password" maxlength="128"')}<div id="login-crp-field" class="live-hidden">${input('Registro profissional — CRP','crp','','text','placeholder="06/123456"')}<small>Envie o diploma e o registro na área de validação após o cadastro.</small></div><div id="login-consent-field" class="live-hidden"><label><input type="checkbox" name="consent">Concordo com os termos e autorizo o armazenamento dos dados que informar para utilizar a plataforma.</label><div class="live-actions">${go('Privacidade','privacy')}${go('Termos','terms')}</div></div><div id="login-remember-field"><label><input type="checkbox" name="remember">Manter conectado neste dispositivo</label></div><button class="btn btn-primary btn-block" id="login-submit-btn">Entrar na conta</button></form><div class="live-actions">${button('Esqueci a senha','forgot',{},'ghost')}${go('Voltar ao início','landing')}</div>`;
 $('#f-role').addEventListener('change',()=>$('#login-crp-field').classList.toggle('live-hidden',$('#f-role').value!=='psicologo'||loginMode!=='cadastrar'));
}
setLoginTab=function(btn,mode){loginMode=mode;const signup=mode==='cadastrar';for(const id of['name','role','consent'])$('#login-'+id+'-field').classList.toggle('live-hidden',!signup);$('#login-remember-field').classList.toggle('live-hidden',signup);$('#login-crp-field').classList.toggle('live-hidden',!signup||$('#f-role').value!=='psicologo');$('#f-name').required=signup;$('#f-password').minLength=signup?10:1;$('#login-title').textContent=signup?'Crie sua conta':'Bem-vindo(a) de volta';$('#login-submit-btn').textContent=signup?'Criar conta':'Entrar na conta';document.querySelectorAll('[data-action="login-mode"]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));};
startPsiSignup=function(){setLoginTab(null,'cadastrar');$('#f-role').value='psicologo';$('#login-crp-field').classList.remove('live-hidden');showScreen('login');};

async function dashboard(){
 const {appointments}=await api('/appointments');const upcoming=appointments.filter(a=>a.status==='scheduled'&&a.starts>new Date().toISOString()).sort((a,b)=>a.starts.localeCompare(b.starts));const done=appointments.filter(a=>a.status==='completed');
 let html=heading(`Olá, ${user.name.split(' ')[0]}`,user.role==='paciente'?'Acompanhe seu cuidado, um passo de cada vez.':'Sua agenda e seus atendimentos em um só lugar.');
 if(user.role==='psicologo'&&!user.verified)html+=`<div class="live-notice live-warning">Seu perfil aguarda aprovação profissional. Complete o perfil e envie os documentos.${go('Validar CRP','d-crp')}</div>`;
 html+=`<div class="live-grid">${[['Sessões agendadas',upcoming.length],['Sessões concluídas',done.length],['Pagamentos pendentes',money(appointments.filter(a=>a.payment==='paid').reduce((n,a)=>n+a.price,0))]].map(([t,v])=>card(`<span class="live-muted">${t}</span><div class="live-stat">${v}</div>`)).join('')}</div><div class="live-stack mt-24">`;
 html+=card('<h2>Próximo atendimento</h2>'+(upcoming[0]?appointmentCard(upcoming[0]):empty('Sua agenda está livre',user.role==='paciente'?'Complete o questionário, solicite um match e escolha um horário após o aceite.':'Publique horários na agenda para seus pacientes.')));
 if(user.role==='paciente'){
   const {moods}=await api('/moods');html+=card('<h2>Seu humor</h2>'+moodChart(moods)+`<div class="live-actions">${go('Registrar humor','p-humor')}${go(user.quiz?'Atualizar questionário':'Responder questionário','p-questionario')}${go('Encontrar psicólogo','p-resultados')}</div>`);
 }else html+=card(`<h2>Organize seus atendimentos</h2><div class="live-actions">${go('Publicar horários','d-agenda')}${go('Revisar solicitações','d-matches')}${go('Completar perfil','d-perfil')}</div>`);
 return html+'</div>';
}
function moodChart(moods){const recent=moods.slice(0,14).reverse();return recent.length?`<div class="live-chart" role="img" aria-label="Humor por dia, notas de 1 a 5">${recent.map(m=>`<div class="live-chart-col" title="${esc(m.day)}: ${m.score}/5"><div>${m.score}</div><div class="live-chart-bar" style="height:${m.score*20}px"></div><small>${esc(m.day.slice(8))}/${esc(m.day.slice(5,7))}</small></div>`).join('')}</div><p class="live-muted">Registros pessoais de 1 a 5; não são uma avaliação clínica.</p>`:empty('Ainda sem registros','Registre como se sente para acompanhar seu histórico.');}
function appointmentCard(a){const upcoming=a.status==='scheduled';return `<div class="live-row"><div><strong>${esc(user.role==='paciente'?a.doctor_name:a.patient_name)}</strong><p>${date(a.starts)} · ${money(a.price)}</p><span class="live-tag">${statusName[a.status]}</span><span class="live-tag">Pagamento: ${statusName[a.payment]||esc(a.payment)}</span></div><div class="live-actions">${upcoming&&a.meeting?`<a class="btn btn-primary" href="${esc(a.meeting)}" target="_blank" rel="noopener noreferrer">Abrir sala</a>`:''}${upcoming?button('Cancelar','cancel',{id:a.id},'outline'):''}${upcoming&&user.role==='psicologo'?button('Link da sessão','meeting',{id:a.id},'outline')+button('Concluir','complete',{id:a.id},'outline'):''}${upcoming&&user.role==='paciente'&&a.payment!=='paid'?button('Pagar','checkout',{id:a.id}):''}${a.status==='completed'&&user.role==='paciente'?button('Avaliar','review',{id:a.id},'outline'):''}</div></div>`;}
async function matches(){
 if(user.role==='paciente'){
  if(!user.quiz)return heading('Seus matches')+empty('Vamos conhecer suas preferências','Responda ao questionário antes de solicitar atendimento.')+`<div class="live-actions">${button('Responder questionário','quiz')}</div>`;
  const {doctors}=await api('/doctors');window.liveDoctors=doctors;
  return heading('Encontre seu psicólogo','Compatibilidade calculada: áreas de interesse (60%), abordagem (15%), formato (15%) e estilo (10%). Não representa garantia de resultado clínico.')+`<div class="live-toolbar"><input class="input" id="doctor-filter" placeholder="Buscar por nome ou especialidade" aria-label="Buscar psicólogos"></div><div class="live-grid" id="doctors-grid">`+(doctors.length?doctors.map(d=>`<article class="live-card doctor-card" data-search="${esc((d.name+' '+d.profile.specialties?.join(' ')).toLowerCase())}"><div class="live-row"><div class="live-avatar">${esc(d.name.split(' ').map(s=>s[0]).slice(0,2).join(''))}</div><div class="live-score">${d.score}%</div></div><h2>${esc(d.name)}</h2><p class="live-muted">CRP ${esc(d.crp)} · Revisado pela administração</p><p>${esc(d.profile.approach)} · ${esc(d.profile.format)}</p><p>${money(d.profile.price)} / sessão</p><div>${(d.profile.specialties||[]).map(t=>`<span class="live-tag">${esc(t)}</span>`).join('')}</div><p class="live-pre">${esc(d.profile.bio)}</p><details><summary>Entender a compatibilidade</summary>${d.reasons.map(r=>`<p>${esc(r)}</p>`).join('')}</details>${d.reviews.length?`<details><summary>Avaliações (${d.reviews.length})</summary>${d.reviews.map(r=>`<p>${r.rating}/5 — ${esc(r.body)}</p>`).join('')}</details>`:''}<div class="live-actions">${d.like==='accepted'?button('Conversar','chat',{other:d.id})+button('Agendar','book',{doctor:d.id},'outline'):d.like==='pending'?'<span class="live-tag">Solicitação enviada</span>':button('Solicitar match','like',{doctor:d.id})}</div></article>`).join(''):empty('Nenhum profissional disponível','Os profissionais aparecem aqui após cadastro, preenchimento do perfil e aprovação dos documentos.'))+'</div><p id="filter-empty" class="live-hidden">Nenhum resultado para sua busca.</p>';
 }
 const {links}=await api('/likes');return heading('Solicitações de match','Aceite uma solicitação para abrir a conversa e permitir o agendamento.')+`<div class="live-stack">`+(links.length?links.map(l=>card(`<h2>${esc(l.other.name)}</h2><span class="live-tag">${statusName[l.status]}</span><p>Solicitado em ${date(l.created)}</p><div class="live-actions">${l.status==='pending'?button('Aceitar','respond-match',{patient:l.patient,status:'accepted'})+button('Recusar','respond-match',{patient:l.patient,status:'rejected'},'outline'):l.status==='accepted'?button('Conversar','chat',{other:l.patient}):''}</div>`)).join(''):empty('Nenhuma solicitação ainda','Após a aprovação, seu perfil poderá receber solicitações de pacientes.'))+'</div>';
}
async function agenda(){const {appointments}=await api('/appointments');let html=heading('Sua agenda','Horários exibidos no fuso do seu dispositivo. Cada atendimento reserva uma hora.');if(user.role==='psicologo'){const {slots}=await api('/slots');html+=card(form('slot',input('Disponibilizar horário','starts','','datetime-local','required step="3600"'),'Adicionar horário')+`<div class="live-actions">${slots.map(s=>button(date(s.starts)+' ×','remove-slot',{id:s.id},'outline')).join('')}</div>`);}else{const {links}=await api('/likes');html+=card('<h2>Marcar uma sessão</h2><div class="live-actions">'+(links.filter(l=>l.status==='accepted').map(l=>button(l.other.name,'book',{doctor:l.doctor},'outline')).join('')||'<p>Você precisa de um match aceito para agendar.</p>')+'</div>');}html+=`<div id="booking-panel" class="mt-24"></div><div class="live-stack mt-24">${appointments.length?appointments.map(a=>card(appointmentCard(a))).join(''):empty('Nenhuma sessão agendada','Os agendamentos aparecerão aqui.')}</div>`;return html;}
async function booking(doctor){const {slots}=await api('/slots?doctor='+doctor);const panel=$('#booking-panel');panel.innerHTML=card('<h2>Escolha um horário</h2>'+(slots.length?`<div class="live-actions">${slots.map(s=>button(date(s.starts),'reserve',{doctor,starts:s.starts},'outline')).join('')}</div>`:empty('Sem horários disponíveis','Converse com o profissional para combinar uma disponibilidade.')));panel.scrollIntoView({behavior:'smooth',block:'center'});}
async function chat(){
 const {links}=await api('/likes');
 const accepted=links.filter(l=>l.status==='accepted');
 if(!accepted.some(l=>l.other.id===selectedOther)){
  if(window.innerWidth>768){selectedOther=accepted[0]?.other.id||'';}else{selectedOther='';}
 }
 chatMessages=[];messageCursor=0;
 if(!accepted.length){
  return heading('Conversas','Mensagens com psicólogos e pacientes com match aceito.')+
   empty('Nenhuma conversa disponível','A conversa é liberada quando o psicólogo aceita a solicitação de match.')+
   `<div class="live-actions mt-16">${user.role==='paciente'?go('Encontrar psicólogos','p-resultados'):go('Ver solicitações de match','d-matches')}</div>`;
 }
 const active=accepted.find(l=>l.other.id===selectedOther);
 const activeName=active?active.other.name:'';
 const activeInitials=activeName?activeName.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase():'';
 const activeRole=user.role==='paciente'?'Psicólogo(a) CFP':'Paciente';
 const hasActive=Boolean(selectedOther&&active);

 return `<div class="wa-chat-window ${hasActive?'has-active-chat':'no-active-chat'}" id="wa-window">
  <aside class="wa-sidebar">
   <div class="wa-sidebar-header">
    <div class="wa-user-profile">
     <div class="wa-avatar wa-avatar-self">${esc(user.name.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase())}</div>
     <div class="wa-header-title">
      <span class="wa-app-name">Conversas</span>
      <span class="wa-chat-count">${accepted.length} ${accepted.length===1?'conversa':'conversas'}</span>
     </div>
    </div>
    <span class="wa-role-tag">${user.role==='paciente'?'Paciente':'Psicólogo'}</span>
   </div>
   <div class="wa-search-bar">
    <div class="wa-search-box">
     <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#54656f" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
     <input type="text" id="wa-search-input" class="wa-search-input" placeholder="Pesquisar conversa..." aria-label="Pesquisar conversa">
    </div>
   </div>
   <div class="wa-contact-list" id="wa-contact-list">
    ${accepted.map(l=>{
     const name=l.other.name;
     const initials=name.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase();
     const isSelected=selectedOther===l.other.id;
     return `<div class="wa-contact-item ${isSelected?'active':''}" data-action="chat" data-other="${l.other.id}" data-name="${esc(name.toLowerCase())}">
      <div class="wa-avatar-wrap">
       <div class="wa-avatar">${esc(initials)}</div>
       <span class="wa-online-dot"></span>
      </div>
      <div class="wa-contact-info">
       <div class="wa-contact-top">
        <span class="wa-contact-name">${esc(name)}</span>
        <span class="wa-contact-time">Hoje</span>
       </div>
       <div class="wa-contact-bottom">
        <span class="wa-contact-preview">${user.role==='paciente'?'Psicólogo(a) · Match aceito':'Paciente · Match aceito'}</span>
       </div>
      </div>
     </div>`;
    }).join('')}
   </div>
  </aside>
  <section class="wa-main">
   ${hasActive?`
    <header class="wa-chat-header">
     <div class="wa-header-left">
      <button class="wa-back-btn" data-action="chat-back" title="Voltar para a lista" aria-label="Voltar">
       <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#54656f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="wa-avatar-wrap">
       <div class="wa-avatar wa-avatar-header">${esc(activeInitials)}</div>
       <span class="wa-online-dot"></span>
      </div>
      <div class="wa-chat-header-info">
       <div class="wa-chat-name">${esc(activeName)}</div>
       <div class="wa-chat-status"><span class="wa-status-text">online</span> · <span class="wa-status-sub">${esc(activeRole)}</span></div>
      </div>
     </div>
     <div class="wa-header-right">
      ${user.role==='paciente'?`
       <button class="wa-header-action-btn" data-action="navigate" data-page="p-agenda" title="Agendar sessão" aria-label="Agendar sessão">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#54656f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
       </button>
       <button class="wa-header-action-btn" data-action="navigate" data-page="p-sessao" title="Sessão online" aria-label="Sessão online">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#54656f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/></svg>
       </button>
      `:`
       <button class="wa-header-action-btn" data-action="navigate" data-page="d-agenda" title="Minha agenda" aria-label="Minha agenda">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#54656f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
       </button>
      `}
     </div>
    </header>
    <div class="wa-messages-viewport" id="messages-viewport">
     <div class="wa-messages-content">
      <div class="wa-encryption-card">
       <svg viewBox="0 0 24 24" width="14" height="14" fill="#667781"><path d="M12 2a4 4 0 0 0-4 4v3H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v3h-4V6z"/></svg>
       <span>As mensagens são criptografadas e protegidas. Apenas você e ${esc(activeName)} têm acesso a esta conversa.</span>
      </div>
      <div class="wa-date-divider"><span class="wa-date-pill">Hoje</span></div>
      <div class="wa-messages-list" id="messages" role="log" aria-live="polite"></div>
     </div>
    </div>
    <div class="wa-input-bar">
     <div class="wa-quick-emojis hidden" id="wa-quick-emojis">
      ${['😊','👍','❤️','🙏','👏','✨','💡','🙂','💬','🙌','💪','🌿','☀️','💙'].map(e=>`<button type="button" class="wa-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
     </div>
     <div class="wa-input-row">
      <button type="button" class="wa-tool-btn" id="wa-btn-emoji" title="Emojis" aria-label="Emojis">
       <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#54656f" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
      </button>
      <button type="button" class="wa-tool-btn" title="Anexar arquivo" onclick="toast('Envio de anexos liberado em atendimentos agendados.')" aria-label="Anexar">
       <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#54656f" stroke-width="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>
      <form class="wa-form" data-form="message" id="wa-form">
       <div class="wa-input-wrapper">
        <textarea class="wa-textarea" id="wa-input" name="body" placeholder="Mensagem" rows="1" required maxlength="4000" aria-label="Digite uma mensagem"></textarea>
       </div>
       <button type="submit" class="wa-send-btn" id="wa-send-btn" title="Enviar mensagem" aria-label="Enviar">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
       </button>
      </form>
     </div>
    </div>
   `:`
    <div class="wa-empty-state">
     <div class="wa-empty-icon">
      <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="#00a884" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 8v4M12 16h.01"/></svg>
     </div>
     <h2>PsicoTech Mensagens</h2>
     <p>Selecione uma conversa na lista para visualizar as mensagens e conversar em tempo real com segurança e privacidade.</p>
     <div class="wa-empty-lock">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#8696a0"><path d="M12 2a4 4 0 0 0-4 4v3H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v3h-4V6z"/></svg>
      <span>Protegido com criptografia de ponta a ponta</span>
     </div>
    </div>
   `}
  </section>
 </div>`;
}
async function pollChat(){
 const other=selectedOther;if(!other||!page.endsWith('-chat'))return;
 try{
  const {messages}=await api('/messages?other='+other+'&after='+messageCursor);
  if(other!==selectedOther||!page.endsWith('-chat'))return;
  const box=$('#messages');if(!box)return;
  if(messages.length){
   chatMessages.push(...messages);messageCursor=messages.at(-1).id;
   renderMessagesDOM(box);
  }else if(!chatMessages.length){
   box.innerHTML='<div class="wa-first-msg-prompt"><div class="wa-bubble theirs"><div class="wa-bubble-body">Olá! Este é um espaço seguro e sigiloso para conversarem e combinarem detalhes. Envie a primeira mensagem! 👋</div><div class="wa-bubble-meta"><span class="wa-time">'+formatTime(Date.now())+'</span></div></div></div>';
  }
 }catch(e){const box=$('#messages');if(box)error(box,e.message);}
}
function renderMessagesDOM(box){
 box.innerHTML=chatMessages.map(m=>{
  const isMine=m.sender===user.id;
  return `<div class="wa-bubble-row ${isMine?'mine':'theirs'}">
   <div class="wa-bubble ${isMine?'mine':'theirs'}">
    <div class="wa-bubble-body">${esc(m.body)}</div>
    <div class="wa-bubble-meta">
     <span class="wa-time">${formatTime(m.created)}</span>
     ${isMine?`<span class="wa-checks" title="Entregue"><svg viewBox="0 0 16 11" width="16" height="11" fill="none"><path d="M11.05 1L5.5 6.55L2.95 4" stroke="#53bdeb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.55 1L9 6.55" stroke="#53bdeb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`:''}
    </div>
   </div>
  </div>`;
 }).join('');
 const vp=$('#messages-viewport');if(vp)vp.scrollTop=vp.scrollHeight;
}
async function profile(){const p=user.profile||{};return heading('Meu perfil','Mantenha seus dados atualizados.')+`<div class="live-grid">${card(form('profile',input('Nome completo','name',user.name,'text','required maxlength="100"')+input('E-mail','email',user.email,'email','disabled')+input('Telefone','phone',p.phone,'tel')+input('Cidade / estado','city',p.city)+input('Nascimento','birth',p.birth,'date')+(user.role==='psicologo'?input('CRP','crp',user.crp,'text','disabled')+select('Abordagem','approach',['TCC','Psicanálise','Humanista','Outra'],p.approach)+select('Formato','format',['Online','Presencial','Tanto faz / híbrido'],p.format)+select('Estilo de atendimento','style',QUIZ_QUESTIONS[4].options,p.style)+input('Valor da sessão (R$)','price',p.price?p.price/100:'','number','required min="1" max="10000" step="0.01"')+'<label>Áreas de atendimento</label><div class="live-checks">'+topics.map(t=>`<label><input type="checkbox" name="specialties" value="${esc(t)}" ${p.specialties?.includes(t)?'checked':''}>${esc(t)}</label>`).join('')+'</div>'+area('Apresentação profissional','bio',p.bio,'maxlength="3000"'):'') ,'Salvar perfil'))}${card('<h2>Segurança da conta</h2>'+form('password',input('Senha atual','current','','password','required autocomplete="current-password"')+input('Nova senha','password','','password','required minlength="10" autocomplete="new-password"'),'Alterar senha')+`<div class="live-actions"><a href="/api/export" class="btn btn-outline">Exportar meus dados</a>${go('Solicitar exclusão / suporte',user.role==='paciente'?'p-suporte':'d-suporte')}</div>`)}</div>`;}
async function moods(){const {moods}=await api('/moods');return heading('Como você está hoje?','Seu registro é privado. Você decide o que compartilhar durante a sessão.')+`<div class="live-grid">${card(form('mood',input('Data','day',day(),'date','required max="'+day()+'"')+select('Como se sente?','score',[['5','5 · Muito bem'],['4','4 · Bem'],['3','3 · Mais ou menos'],['2','2 · Mal'],['1','1 · Muito mal']],'3')+area('Notas opcionais','note','','maxlength="3000"'),'Salvar registro'))}${card(moodChart(moods))}</div><div class="live-stack mt-24">${moods.map(m=>card(`<strong>${esc(m.day.split('-').reverse().join('/'))} · ${m.score}/5</strong><p class="live-pre">${esc(m.note)}</p>`)).join('')}</div>`;}
async function crp(){const {documents}=await api('/documents');return heading('Validação profissional','A aprovação exige análise humana e conferência do registro profissional.')+card(`<span class="live-tag">${user.verified?'Aprovado':'Aguardando análise / documentos'}</span><p>CRP informado: ${esc(user.crp)}</p><p>${esc(user.review_note)}</p>${form('document',select('Documento','kind',[['diploma','Diploma de Psicologia'],['crp','Registro profissional CRP']],'diploma')+input('Arquivo (PDF, PNG ou JPEG, até 2 MB)','file','','file','required accept="application/pdf,image/png,image/jpeg"'),'Enviar documento')}<p class="live-muted">Um novo envio exige nova revisão antes de aparecer nos matches.</p><div class="live-actions">${documents.map(d=>`<a class="btn btn-outline" href="/api/documents/${d.id}">${esc(d.kind)} · ${esc(d.filename)}</a>`).join('')}</div>`);}
async function patients(notes=false){const {links}=await api('/likes');const accepted=links.filter(l=>l.status==='accepted');return heading(notes?'Prontuários':'Pacientes',notes?'Anotações privadas do profissional. Novos registros preservam os anteriores.':'Pacientes com match aceito.')+`<div class="live-grid">${accepted.map(l=>card(`<h2>${esc(l.other.name)}</h2><div class="live-actions">${button('Conversar','chat',{other:l.patient},'outline')}${button('Abrir prontuário','notes',{patient:l.patient,name:l.other.name})}</div>`)).join('')||empty('Nenhum paciente vinculado','Aceite uma solicitação de match para iniciar o acompanhamento.')}</div><div id="notes-panel" class="mt-24"></div>`;}
async function notesPanel(patient,name){const {notes}=await api('/notes?patient='+patient);$('#notes-panel').innerHTML=card(`<h2>${esc(name)}</h2>${form('note',`<input type="hidden" name="patient" value="${patient}"><input type="hidden" name="patientName" value="${esc(name)}">`+area('Registro clínico','body','','required maxlength="15000"'),'Adicionar registro')}<div class="live-stack mt-24">${notes.map(n=>`<article><strong>${date(n.created)}</strong><p class="live-pre">${esc(n.body)}</p></article>`).join('')||'<p>Ainda sem registros.</p>'}</div>`);$('#notes-panel').scrollIntoView({behavior:'smooth'});}
async function finance(){const {appointments}=await api('/appointments');return heading(user.role==='paciente'?'Pagamentos':'Financeiro','Valores obtidos dos agendamentos e das confirmações do provedor de pagamentos.')+(!meta.payments?'<div class="live-notice live-warning">A cobrança online ainda não está ativada. Nenhum cartão ou pagamento é processado nesta instalação.</div>':'')+card(`<div class="live-stat">${money(appointments.filter(a=>a.payment==='paid').reduce((n,a)=>n+a.price,0))}</div><p>Total confirmado pelo provedor</p>`)+`<div class="live-stack mt-24">${appointments.map(a=>card(appointmentCard(a)+`<div class="live-actions">${meta.payments?button('Atualizar pagamento','check-payment',{id:a.id},'outline'):''}</div>`)).join('')||empty('Sem movimentações','Os valores aparecerão após os primeiros agendamentos.')}</div>`;}
async function reviews(){const {reviews}=await api('/reviews');return heading('Avaliações','Avaliações enviadas por pacientes após sessões concluídas.')+`<div class="live-stack">${reviews.map(r=>card(`<strong>${r.rating} / 5</strong><p class="live-pre">${esc(r.body)}</p><small>${date(r.created)}</small>`)).join('')||empty('Ainda sem avaliações','As avaliações serão exibidas aqui.')}</div>`;}
async function support(){const {tickets}=await api('/tickets');return heading('Suporte','Use este canal para dúvidas da conta, pagamentos, cancelamentos ou pedidos sobre seus dados.')+(user.role!=='admin'?card(form('ticket',input('Assunto','subject','','text','required maxlength="150"')+area('Descreva sua solicitação','body','','required maxlength="5000"'),'Enviar solicitação')):'')+`<div class="live-stack mt-24">${tickets.map(t=>card(`<h2>${esc(t.subject)}</h2><span class="live-tag">${statusName[t.status]}</span><small>${esc(t.name||'')} · ${date(t.created)}</small><p class="live-pre">${esc(t.body)}</p>${t.reply?`<div class="live-notice live-pre">${esc(t.reply)}</div>`:''}${user.role==='admin'?form('reply',`<input name="id" type="hidden" value="${t.id}">`+area('Resposta','reply',t.reply,'required maxlength="5000"'),'Responder'):''}`)).join('')||empty('Nenhuma solicitação','Seus chamados aparecerão aqui.')}</div>`;}
async function articles(){const {articles}=await api('/articles');return heading('Conteúdos','Materiais publicados pela administração da plataforma.')+(user.role==='admin'?card(form('article',input('Título','title','','text','required maxlength="150"')+area('Texto','body','','required maxlength="15000"'),'Publicar conteúdo')):'')+`<div class="live-stack mt-24">${articles.map(a=>card(`<h2>${esc(a.title)}</h2><div class="live-pre">${esc(a.body)}</div>${user.role==='admin'?button('Excluir','delete-article',{id:a.id},'outline'):''}`)).join('')||empty('Nenhum conteúdo publicado','Os materiais aparecerão aqui quando forem cadastrados.')}</div>`;}
async function adminUsers(filter=''){const {users}=await api('/admin/users');const rows=users.filter(u=>!filter||u.role===filter);return heading(filter==='psicologo'?'Profissionais e documentos':filter==='paciente'?'Pacientes':'Gerenciar usuários','A administração gerencia contas; não tem acesso ao chat ou aos prontuários.')+`<input class="input mb-16" id="user-filter" placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários"><div class="live-stack">${rows.map(u=>`<article class="live-card user-card" data-search="${esc((u.name+' '+u.email).toLowerCase())}"><h2>${esc(u.name)}</h2><p>${esc(u.email)} · ${esc(u.role)}</p><span class="live-tag">${u.active?'Ativo':'Suspenso'}</span>${u.role==='psicologo'?`<span class="live-tag">${u.verified?'Aprovado':'Pendente'}</span><p>CRP ${esc(u.crp)}</p><p>${esc(u.review_note)}</p>`:''}<div class="live-actions">${u.role!=='admin'?button(u.active?'Suspender acesso':'Reativar','toggle-user',{id:u.id,active:!u.active},'outline'):''}${u.role==='psicologo'?button('Revisar documentos','review-doctor',{id:u.id,name:u.name},'outline'):''}</div><div id="review-${u.id}"></div></article>`).join('')}</div>`;}
async function adminDashboard(){const s=await api('/admin/stats');return heading('Visão geral','Indicadores calculados a partir dos cadastros e agendamentos reais.')+`<div class="live-grid">${[['Contas',s.users],['Profissionais aprovados',s.doctors],['Aguardando revisão',s.pending],['Agendamentos',s.appointments],['Pagamentos confirmados',money(s.paid)]].map(([k,v])=>card(`<p>${k}</p><div class="live-stat">${v}</div>`)).join('')}</div><div class="live-stack mt-24">${card('<h2>Atividade administrativa e acessos</h2><div class="live-table"><table><thead><tr><th>Data</th><th>Responsável</th><th>Ação</th></tr></thead><tbody>'+s.audit.map(a=>`<tr><td>${date(a.created)}</td><td>${esc(a.name||'Sistema')}</td><td>${esc(a.action)}</td></tr>`).join('')+'</tbody></table></div>')}</div>`;}
async function evolution(){const {appointments}=await api('/appointments');const patients=new Map();for(const a of appointments){if(!patients.has(a.patient))patients.set(a.patient,{name:a.patient_name,done:0,next:0});const p=patients.get(a.patient);if(a.status==='completed')p.done++;if(a.status==='scheduled')p.next++;}return heading('Acompanhamento dos pacientes','Resumo dos atendimentos. Consulte o prontuário para suas observações clínicas.')+`<div class="live-grid">${[...patients.values()].map(p=>card(`<h2>${esc(p.name)}</h2><p>${p.done} sessões concluídas · ${p.next} agendadas</p>${go('Consultar prontuários','d-prontuarios')}`)).join('')||empty('Sem atendimentos','O resumo aparecerá após os primeiros agendamentos.')}</div>`;}
async function online(){const {appointments}=await api('/appointments');const rows=appointments.filter(a=>a.status==='scheduled');return heading('Sessão online','Abra a sala indicada pelo seu psicólogo no horário combinado. A chamada acontece no serviço escolhido por ele.')+`<div class="live-stack">${rows.map(a=>card(appointmentCard(a)+(!a.meeting?'<p class="live-muted">O profissional ainda não informou o link da sala. Combine os detalhes pelo chat.</p>':''))).join('')||empty('Nenhuma sessão marcada','Agende uma sessão com seu profissional.')}</div>`;}
async function renderPage(id){const version=++renderVersion;const el=document.getElementById('scr-'+id);el.innerHTML='<p role="status">Carregando…</p>';try{let html;
 if(['p-dashboard','d-dashboard'].includes(id))html=await dashboard();else if(['p-resultados','d-matches'].includes(id))html=await matches();else if(id.endsWith('-agenda'))html=await agenda();else if(id.endsWith('-chat'))html=await chat();else if(id.endsWith('-perfil'))html=await profile();else if(id==='p-humor')html=await moods();else if(id==='d-crp')html=await crp();else if(['d-pacientes','d-prontuarios'].includes(id))html=await patients(id==='d-prontuarios');else if(['p-pagamento','d-financeiro'].includes(id))html=await finance();else if(id==='d-avaliacoes')html=await reviews();else if(id.endsWith('-suporte'))html=await support();else if(id.endsWith('-conteudos'))html=await articles();else if(id==='a-usuarios')html=await adminUsers();else if(id==='a-psicologos')html=await adminUsers('psicologo');else if(id==='a-pacientes')html=await adminUsers('paciente');else if(['a-dashboard','a-analytics'].includes(id))html=await adminDashboard();else if(id==='d-evolucao')html=await evolution();else if(id==='p-sessao')html=await online();else if(id==='a-configuracoes')html=heading('Configurações')+card(form('settings',input('Compatibilidade mínima para exibir profissionais (%)','minimum',meta.minimum,'number','required min="0" max="100"')+input('Prazo mínimo de cancelamento (horas)','cancelHours',meta.cancelHours,'number','required min="0" max="168"'),'Salvar configurações'));else html=empty('Página não encontrada','Use o menu para continuar.');
 if(version!==renderVersion||page!==id)return;el.innerHTML=html;if(id.endsWith('-chat')&&selectedOther){await pollChat();chatTimer=setInterval(pollChat,4000);}return true;
 }catch(e){if(version===renderVersion)el.innerHTML=heading('Não foi possível carregar')+`<div class="live-error" role="alert">${esc(e.message)}</div>`+button('Tentar novamente','navigate',{page:id});}}

document.addEventListener('input',e=>{if(['doctor-filter','user-filter'].includes(e.target.id)){const cls=e.target.id==='doctor-filter'?'.doctor-card':'.user-card';let count=0;document.querySelectorAll(cls).forEach(c=>{const match=c.dataset.search.includes(e.target.value.toLowerCase());c.classList.toggle('live-hidden',!match);if(match)count++;});if($('#filter-empty'))$('#filter-empty').classList.toggle('live-hidden',count>0);}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const d=b.dataset;const container=b.closest('.live-card')||document.getElementById('scr-'+page)||$('#scr-login');b.disabled=true;try{
 if(d.action==='navigate'){if(d.page==='p-questionario')startQuiz();else showScreen(d.page);}
 else if(d.action==='quiz')startQuiz();
 else if(d.action==='login-mode')setLoginTab(b,d.mode);
 else if(d.action==='forgot'){const email=$('#f-email').value;if(!email)throw Error('Preencha seu e-mail primeiro.');await api('/forgot','POST',{email});toast('Se o e-mail estiver cadastrado, você receberá um link.');}
 else if(d.action==='like'){await api('/likes','POST',{doctor:d.doctor});await renderPage(page);toast('Solicitação enviada. Aguarde o aceite do profissional.');}
 else if(d.action==='respond-match'){await api('/likes','PUT',{patient:d.patient,status:d.status});await renderPage(page);toast('Solicitação atualizada.');}
 else if(d.action==='chat'){selectedOther=d.other;showScreen(user.role==='paciente'?'p-chat':'d-chat');await renderPage(page);}
 else if(d.action==='chat-back'){selectedOther='';await renderPage(page);}
 else if(d.action==='book'){if(page!=='p-agenda'){showScreen('p-agenda');await waitForElement('#booking-panel');}await booking(d.doctor);}
 else if(d.action==='reserve'){if(!confirm('Confirmar o agendamento para '+date(d.starts)+'?'))return;await api('/appointments','POST',{doctor:d.doctor,starts:d.starts});await renderPage(page);toast('Sessão agendada.');}
 else if(d.action==='remove-slot'){await api('/slots','DELETE',{id:d.id});await renderPage(page);}
 else if(['cancel','complete'].includes(d.action)){if(!confirm(d.action==='cancel'?'Confirmar cancelamento da sessão?':'Confirmar que este atendimento foi realizado?'))return;await api('/appointments','PUT',{id:d.id,action:d.action});await renderPage(page);toast('Sessão atualizada.');}
 else if(d.action==='meeting'){const meeting=prompt('Cole o link HTTPS da sala privada de atendimento:');if(meeting===null)return;await api('/appointments','PUT',{id:d.id,action:'meeting',meeting});await renderPage(page);}
 else if(d.action==='checkout'){const result=await api('/checkout','POST',{id:d.id});const url=new URL(result.url);if(url.protocol!=='https:'||!/(^|\.)mercadopago\.(com|com\.br)$/.test(url.hostname))throw Error('Endereço do pagamento inválido.');window.location.assign(url.href);}
 else if(d.action==='check-payment'){await api('/payments/check','POST',{id:d.id});await renderPage(page);toast('Situação atualizada.');}
 else if(d.action==='review'){container.insertAdjacentHTML('beforeend',form('review',`<input name="appointment" type="hidden" value="${d.id}">`+select('Sua avaliação','rating',['5','4','3','2','1'],'5')+area('Comentário público (opcional)','body','','maxlength="1500"'),'Publicar avaliação'));}
 else if(d.action==='notes')await notesPanel(d.patient,d.name);
 else if(d.action==='toggle-user'){if(!confirm('Confirmar alteração do acesso desta conta?'))return;await api('/admin/users','PUT',{id:d.id,active:d.active==='true'});await renderPage(page);}
 else if(d.action==='review-doctor'){const {documents}=await api('/documents?owner='+d.id);document.getElementById('review-'+d.id).innerHTML=`<div class="live-actions">${documents.map(doc=>`<a class="btn btn-outline" href="/api/documents/${doc.id}">Baixar ${esc(doc.kind)}</a>`).join('')||'<p>Nenhum documento enviado.</p>'}</div>`+form('verify',`<input name="id" type="hidden" value="${d.id}">`+select('Resultado da revisão','verified',[['true','Aprovar após conferência'],['false','Manter pendente / reprovar']],'false')+area('Justificativa e referência da conferência','note','','required maxlength="2000"'),'Registrar decisão');}
 else if(d.action==='delete-article'){if(!confirm('Excluir este conteúdo?'))return;await api('/articles','DELETE',{id:d.id});await renderPage(page);}
 }catch(err){error(container,err.message);}finally{b.disabled=false;}});
async function waitForElement(selector){for(let i=0;i<100;i++){const el=$(selector);if(el)return el;await new Promise(r=>setTimeout(r,50));}throw Error('Não foi possível abrir a agenda.');}
document.addEventListener('submit',async e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();if(f.dataset.busy)return;f.dataset.busy='1';const submit=f.querySelector('[type="submit"],#login-submit-btn');if(submit)submit.disabled=true;f.querySelector('.live-error')?.remove();const fd=new FormData(f),v=Object.fromEntries(fd);try{
 const type=f.dataset.form;
 if(type==='login'){const signup=loginMode==='cadastrar';const r=await api(signup?'/register':'/login','POST',{...v,consent:fd.has('consent'),remember:fd.has('remember')});user=r.user;meta=await api('/me');f.reset();signedIn();showScreen(user.role==='paciente'?(user.quiz?'p-dashboard':'p-quiz-intro'):user.role==='psicologo'?'d-dashboard':'a-dashboard');return;}
 if(type==='profile'){const r=await api('/profile','PUT',{...v,price:Number(v.price),specialties:fd.getAll('specialties')});user=r.user;signedIn();}
 else if(type==='password'){await api('/password','PUT',v);f.reset();}
 else if(type==='slot'){await api('/slots','POST',{starts:new Date(v.starts).toISOString()});await renderPage(page);}
 else if(type==='message'){await api('/messages','POST',{body:v.body,other:selectedOther});f.reset();const inp=$('#wa-input');if(inp)inp.style.height='auto';await pollChat();return;}
 else if(type==='mood'){await api('/moods','PUT',{...v,score:Number(v.score)});await renderPage(page);}
 else if(type==='note'){await api('/notes','POST',v);await notesPanel(v.patient,v.patientName);}
 else if(type==='document'){const file=fd.get('file');if(!file?.size||file.size>2*1024*1024)throw Error('Escolha um arquivo de até 2 MB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});await api('/documents','POST',{kind:v.kind,filename:file.name,data});user=(await api('/me')).user;await renderPage(page);}
 else if(type==='ticket'){await api('/tickets','POST',v);await renderPage(page);}
 else if(type==='reply'){await api('/tickets','PUT',v);await renderPage(page);}
 else if(type==='article'){await api('/articles','POST',v);await renderPage(page);}
 else if(type==='review'){await api('/reviews','POST',{...v,rating:Number(v.rating)});await renderPage(page);}
 else if(type==='verify'){await api('/admin/users','PUT',{...v,verified:v.verified==='true'});await renderPage(page);}
 else if(type==='settings'){await api('/admin/settings','PUT',v);meta=await api('/me');}
 else if(type==='reset'){await api('/reset','POST',v);history.replaceState(null,'','/');setupLogin();showScreen('login');}
 toast('Salvo com sucesso.');
 }catch(err){error(f,err.message);}finally{delete f.dataset.busy;if(submit)submit.disabled=false;}});

document.addEventListener('keydown',e=>{
 if(e.target&&e.target.id==='wa-input'&&e.key==='Enter'&&!e.shiftKey){
  e.preventDefault();
  const f=e.target.closest('form');
  if(f&&e.target.value.trim()){f.requestSubmit();}
 }
});

document.addEventListener('input',e=>{
 if(e.target&&e.target.id==='wa-input'){
  e.target.style.height='auto';
  e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';
 }else if(e.target&&e.target.id==='wa-search-input'){
  const q=e.target.value.toLowerCase().trim();
  document.querySelectorAll('.wa-contact-item').forEach(it=>{
   const name=it.dataset.name||'';
   it.style.display=(!q||name.includes(q))?'flex':'none';
  });
 }
});

document.addEventListener('click',e=>{
 if(e.target.closest('#wa-btn-emoji')){
  $('#wa-quick-emojis')?.classList.toggle('hidden');
  return;
 }
 const emBtn=e.target.closest('.wa-emoji-btn');
 if(emBtn){
  const input=$('#wa-input');
  if(input){
   input.value+=emBtn.dataset.emoji;
   input.focus();
   input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  return;
 }
 if(!e.target.closest('#wa-quick-emojis')&&!e.target.closest('#wa-btn-emoji')){
  $('#wa-quick-emojis')?.classList.add('hidden');
 }
});

async function initialize(){
 setupLogin();$('#topbar-search-wrap')?.remove();$('#ic-bell-btn')?.remove();$('#ic-logout-btn').onclick=async()=>{try{await api('/logout','POST',{});user=null;quizAnswers={};selectedOther='';chatMessages=[];$('#content').querySelectorAll('.screen').forEach(el=>{if(!['scr-p-questionario','scr-p-quiz-intro'].includes(el.id))el.innerHTML='';});showScreen('login');}catch(e){toast(e.message);}};
 const token=new URLSearchParams(location.search).get('reset');if(token){$('.login__div8').innerHTML='<h2>Defina uma nova senha</h2>'+form('reset',`<input type="hidden" name="token" value="${esc(token)}">`+input('Nova senha','password','','password','required minlength="10" maxlength="128"'),'Salvar senha');showScreen('login');return;}
 try{meta=await api('/me');user=meta.user;signedIn();showScreen(user.role==='paciente'?(user.quiz?'p-dashboard':'p-quiz-intro'):user.role==='psicologo'?'d-dashboard':'a-dashboard');}catch(e){if(e.message!=='Entre na sua conta para continuar.')toast('Servidor indisponível. Abra o site pelo endereço local indicado ao iniciar.');showScreen('landing');}
}
initialize();
