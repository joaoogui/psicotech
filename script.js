/* ==========================================================================
   PSICOTECH — SCRIPT (JAVASCRIPT)
   Aqui fica toda a parte "viva" do site: trocar de tela, montar o menu,
   preencher cards/tabelas com dados de exemplo e abrir/fechar modais.
   O arquivo está dividido em blocos numerados — use Ctrl+F para achar rápido.
   ========================================================================== */


/* ======================================================
   1. ÍCONES (desenhos SVG usados no lugar de imagens)
   -> Cada ícone é um desenho vetorial simples (outline)
   ====================================================== */
const ICONS = {
  logo:'<path d="M8 12a4 4 0 1 1 4 4H8v4l-4-4a8 8 0 1 1 4 0z"/><path d="M9 12l2 2 4-4" stroke-width="2"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.6 3-6 7-6s7 2.4 7 6"/><circle cx="18" cy="9" r="3"/><path d="M15.5 14.2c2.7.3 5 2.1 5.5 5.8"/>',
  heart:'<path d="M12 20s-7-4.4-9.4-8.8C1 8 2.6 5 5.7 5c1.8 0 3.2 1 4.3 2.5C11.1 6 12.5 5 14.3 5c3.1 0 4.7 3 3.1 6.2C15 15.6 12 20 12 20z"/>',
  chat:'<path d="M4 5h16v11H8l-4 4V5z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  dollar:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2.2-3-2.2s-3 .8-3 2.2c0 3 6 1.4 6 4.3 0 1.4-1.3 2.2-3 2.2s-3-.8-3-2.2"/>',
  chart:'<path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2 20h20"/>',
  chartline:'<path d="M3 17l5-6 4 3 6-8 3 3"/><path d="M3 21h18"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.2-1.3L14 2.6h-4l-.3 2.8a7 7 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.2 1.3l.3 2.8h4l.3-2.8a7 7 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3z"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M9.5 20a2.5 2.5 0 0 0 5 0"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  x:'<path d="M18 6L6 18M6 6l12 12"/>',
  star:'<path d="M12 2.5l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7L2 9.8l7-.8z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  video:'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  send:'<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  lock:'<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  shield:'<path d="M12 2l8 3.5v6c0 4.6-3.4 8.2-8 10.5-4.6-2.3-8-5.9-8-10.5v-6L12 2z"/>',
  file:'<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  filter:'<path d="M4 5h16M7 12h10M10 19h4"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  clipboard:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="M9 11h6M9 15h6"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 6l9 7 9-7"/>',
  map:'<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevdown:'<path d="M6 9l6 6 6-6"/>',
  chevright:'<path d="M9 6l6 6-6 6"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  grid:'<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  activity:'<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  award:'<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/>',
  headset:'<path d="M4 13a8 8 0 0 1 16 0"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/>',
  crp:'<path d="M12 2l8 3.5v6c0 4.6-3.4 8.2-8 10.5-4.6-2.3-8-5.9-8-10.5v-6L12 2z"/><path d="M9 12l2 2 4-4"/>',
  building:'<rect x="4" y="3" width="16" height="18"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/>',
  frown:'<circle cx="12" cy="12" r="9"/><path d="M8 16s1.5-2 4-2 4 2 4 2M9 9h.01M15 9h.01"/>',
  meh:'<circle cx="12" cy="12" r="9"/><path d="M8 15h8M9 9h.01M15 9h.01"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.7"/>',
  paperclip:'<path d="M21 11.5l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/>',
  qr:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2"/>'
};
function iconSvg(name, size=20){ return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}">${ICONS[name]||''}</svg>`; }
function mountIcon(id,name,size){ const el=document.getElementById(id); if(el) el.innerHTML=iconSvg(name,size); }

// Coloca os ícones fixos que aparecem na Landing Page, no Login e no cabeçalho do app
mountIcon('ic-nav-logo','logo',20);
mountIcon('ic-login-logo','logo',20);
mountIcon('ic-topbar-logo','logo',20);
mountIcon('ic-arrow','arrow',16);
mountIcon('ic-shield1','shield',16);
mountIcon('ic-check1','check',16);
mountIcon('ic-step1','clipboard',26);
mountIcon('ic-step2','heart',26);
mountIcon('ic-step3','calendar',26);
mountIcon('ic-mail','mail',18);
mountIcon('ic-lock','lock',18);
mountIcon('ic-menu-btn','menu',20);
mountIcon('ic-search-top','search',16);
mountIcon('ic-bell-btn','bell',18);
mountIcon('ic-logout-btn','logout',18);
mountIcon('ic-heart-modal','heart',30);
// Ícones da nova experiência "Como funciona"
mountIcon('ic-cf-logo','logo',20);
mountIcon('ic-cf-back','arrow',14);
mountIcon('ic-cf-step1','user',26);
mountIcon('ic-cf-step2','clipboard',26);
mountIcon('ic-cf-step3','heart',26);
mountIcon('ic-cf-step4','calendar',26);
// Ícones da tela de boas-vindas do questionário automático
mountIcon('ic-quizintro','clipboard',28);
mountIcon('ic-quizintro-check1','check',16);
mountIcon('ic-quizintro-check2','shield',16);
// Ícones da tela "Para psicólogos"
mountIcon('ic-pp-logo','logo',20);
mountIcon('ic-pp-back','arrow',14);
mountIcon('ic-pp-step1','crp',26);
mountIcon('ic-pp-step2','heart',26);
mountIcon('ic-pp-step3','calendar',26);
mountIcon('ic-pp-step4','dollar',26);
// Ícones da tela "Sobre"
mountIcon('ic-sb-logo','logo',20);
mountIcon('ic-sb-back','arrow',14);
mountIcon('ic-sb-team','users',30);
mountIcon('ic-sb-val1','shield',26);
mountIcon('ic-sb-val2','chart',26);
mountIcon('ic-sb-val3','heart',26);

/* ======================================================
   2. MENU LATERAL (essa parte monta o menu diferente para
      Paciente, Psicólogo e Admin)
   ====================================================== */
const NAV = {
  paciente:[
    {label:'Principal', items:[
      {id:'p-dashboard', icon:'chart', label:'Dashboard de evolução'},
      {id:'p-resultados', icon:'grid', label:'Meus matches'},
      {id:'p-agenda', icon:'calendar', label:'Agenda'},
      {id:'p-chat', icon:'chat', label:'Chat'},
    ]},
    {label:'Cuidado', items:[
      {id:'p-humor', icon:'smile', label:'Registro de humor'},
      {id:'p-sessao', icon:'video', label:'Sessão online'},
      {id:'p-questionario', icon:'clipboard', label:'Questionário'},
    ]},
    {label:'Conta', items:[
      {id:'p-perfil', icon:'user', label:'Meu perfil'},
      {id:'p-pagamento', icon:'card', label:'Pagamento'},
    ]},
  ],
  psicologo:[
    {label:'Principal', items:[
      {id:'d-dashboard', icon:'chart', label:'Dashboard'},
      {id:'d-matches', icon:'heart', label:'Matches'},
      {id:'d-agenda', icon:'calendar', label:'Agenda'},
      {id:'d-pacientes', icon:'users', label:'Pacientes'},
    ]},
    {label:'Clínico', items:[
      {id:'d-prontuarios', icon:'file', label:'Prontuários'},
      {id:'d-evolucao', icon:'chartline', label:'Evolução dos pacientes'},
    ]},
    {label:'Conta', items:[
      {id:'d-perfil', icon:'user', label:'Meu perfil'},
      {id:'d-crp', icon:'crp', label:'Validação de CRP'},
      {id:'d-financeiro', icon:'dollar', label:'Financeiro'},
      {id:'d-avaliacoes', icon:'star', label:'Avaliações'},
    ]},
  ],
  admin:[
    {label:'Visão geral', items:[
      {id:'a-dashboard', icon:'chart', label:'Dashboard'},
      {id:'a-analytics', icon:'activity', label:'Analytics'},
    ]},
    {label:'Gestão', items:[
      {id:'a-usuarios', icon:'users', label:'Usuários'},
      {id:'a-psicologos', icon:'crp', label:'Psicólogos'},
      {id:'a-pacientes', icon:'user', label:'Pacientes'},
      {id:'a-conteudos', icon:'book', label:'Conteúdos'},
    ]},
    {label:'Operação', items:[
      {id:'a-suporte', icon:'headset', label:'Suporte'},
      {id:'a-configuracoes', icon:'settings', label:'Configurações'},
    ]},
  ]
};
let currentRole='paciente';

// Troca entre os 3 tipos de usuário (paciente / psicólogo / admin) no topo da tela
// O segundo parâmetro (initialId) é opcional: permite abrir uma tela específica
// (em vez da tela padrão do perfil) logo depois da troca — usado no fluxo de
// cadastro do paciente, que deve cair direto no questionário automático.
function switchRole(role, initialId){
  currentRole=role;
  document.querySelectorAll('.role-switch button').forEach(b=>b.classList.toggle('active', b.dataset.role===role));
  document.getElementById('topbar-avatar').textContent = role==='paciente' ? 'VC' : role==='psicologo' ? 'LC' : 'AD';
  renderSidebar();
  const first = initialId || NAV[role][0].items[0].id;
  showScreen(first);
}
// Desenha o menu lateral (sidebar) de acordo com o usuário logado
function renderSidebar(){
  const sb = document.getElementById('sidebar');
  sb.innerHTML='';
  NAV[currentRole].forEach(group=>{
    const lbl=document.createElement('div'); lbl.className='side-label'; lbl.textContent=group.label; sb.appendChild(lbl);
    group.items.forEach(it=>{
      const b=document.createElement('button');
      b.className='side-link'; b.id='side-'+it.id;
      b.innerHTML = iconSvg(it.icon,18)+'<span>'+it.label+'</span>';
      b.onclick=()=>showScreen(it.id);
      sb.appendChild(b);
    });
  });
}
// Volta para a Landing Page (página inicial pública)
function goHome(){ showScreen('landing'); }

function toggleSidebar(force){
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if(!sb) return;
  const shouldOpen = force !== undefined ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', shouldOpen);
  if(bd) bd.classList.toggle('open', shouldOpen);
}

function toggleLandingNav(force){
  const dr = document.getElementById('landing-mobile-drawer');
  if(!dr) return;
  const shouldOpen = force !== undefined ? force : !dr.classList.contains('open');
  dr.classList.toggle('open', shouldOpen);
}

/* ======================================================
   3. NAVEGAÇÃO ENTRE TELAS
   -> Essa função troca qual "tela" fica visível na página
      (mostra uma e esconde todas as outras)
   ====================================================== */
function showScreen(id){
  toggleSidebar(false);
  toggleLandingNav(false);
  // full-bleed screens
  const fb = ['landing','login','como-funciona','para-psicologos','sobre','privacy','terms'];
  if(fb.includes(id)){
    document.getElementById('app-shell').style.display='none';
    document.getElementById('fullbleed-wrap').style.display='block';
    document.querySelectorAll('.full-bleed').forEach(s=>s.classList.remove('active'));
    document.getElementById('scr-'+id).classList.add('active');
    window.scrollTo(0,0);
    return;
  }
  document.getElementById('fullbleed-wrap').style.display='none';
  document.getElementById('app-shell').style.display='flex';
  document.querySelectorAll('#content .screen').forEach(s=>s.classList.remove('active'));
  const el = document.getElementById('scr-'+id);
  if(el) el.classList.add('active');
  if(id==='p-questionario' && !document.getElementById('quiz-title').textContent){ renderQuizQuestion(); }
  document.querySelectorAll('.side-link').forEach(b=>b.classList.remove('active'));
  const sl = document.getElementById('side-'+id); if(sl) sl.classList.add('active');
  window.scrollTo(0,0);
}
// Abre e fecha janelas flutuantes (modais), como o "Deu match!"
function openModal(id){ document.getElementById(id).classList.add('active'); }
function closeModal(id){ document.getElementById(id).classList.remove('active'); }
// Guarda se a pessoa está na aba "Entrar" ou "Cadastrar"
let loginMode = 'entrar';
// Controla as abas "Entrar" / "Cadastrar" da tela de login
function setLoginTab(btn,mode){
  document.querySelectorAll('#scr-login .tabs .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loginMode = mode;
  document.getElementById('login-title').textContent = mode==='entrar' ? 'Bem-vindo(a) de volta' : 'Crie sua conta gratuita';
  document.getElementById('login-submit-btn').textContent = mode==='entrar' ? 'Entrar na conta' : 'Criar conta';
  document.getElementById('login-remember-row').classList.toggle('hidden', mode==='cadastrar');
  updateCrpFieldsVisibility();
}
// Controla se a pessoa está entrando como "paciente" ou "psicólogo" no login
function setUserType(t){
  document.getElementById('chip-paciente').classList.toggle('selected', t==='paciente');
  document.getElementById('chip-psicologo').classList.toggle('selected', t==='psicologo');
  updateCrpFieldsVisibility();
}
// Mostra os campos de validação de CRP só quando for cadastro de psicólogo
function updateCrpFieldsVisibility(){
  const isPsi = document.getElementById('chip-psicologo').classList.contains('selected');
  const show = isPsi && loginMode==='cadastrar';
  document.getElementById('psi-crp-fields').classList.toggle('hidden', !show);
}
// Atalho usado pelo botão "Quero atender"/"Criar cadastro profissional" da tela "Para psicólogos":
// já abre a tela de login com a aba "Cadastrar" e o tipo "Sou psicólogo" pré-selecionados.
function startPsiSignup(){
  setUserType('psicologo');
  const cadastrarBtn = document.querySelectorAll('#scr-login .tabs .tab-btn')[1];
  if(cadastrarBtn){ setLoginTab(cadastrarBtn,'cadastrar'); }
  showScreen('login');
}
const QUIZ_QUESTIONS = [
  {category:'Seu momento', title:'O que fez você procurar terapia neste momento?', help:'Você pode selecionar até 3 opções.', type:'multiple', max:3, options:['Ansiedade','Estresse ou sobrecarga','Problemas nos relacionamentos','Autoestima','Família','Trabalho ou estudos','Autoconhecimento','Estou passando por uma fase difícil','Outro']},
  {category:'Objetivos', title:'Quais áreas da sua vida você gostaria de trabalhar?', help:'Selecione até 3 áreas que são prioridade para você.', type:'multiple', max:3, options:['Ansiedade','Autoestima','Relacionamentos','Família','Trabalho ou estudos','Sono e rotina','Autoconhecimento','Questões emocionais','Outro']},
  {category:'Bem-estar', title:'Como você tem se sentido ultimamente?', help:'Escolha a alternativa que mais representa seu momento.', type:'single', options:['Bem','Mais ou menos','Sobrecarregado(a)','Ansioso(a)','Triste ou desanimado(a)','Com dificuldade para lidar com minhas emoções']},
  {category:'Experiência', title:'Você já fez terapia antes?', help:'Escolha uma opção.', type:'single', options:['Sim, faço atualmente','Sim, já fiz anteriormente','Não, será minha primeira vez','Prefiro não responder']},
  {category:'Preferências', title:'Que tipo de profissional combinaria mais com você?', help:'Escolha o estilo de atendimento que parece mais confortável.', type:'single', options:['Mais acolhedor e que saiba ouvir','Mais direto e prático','Que me ajude a entender meus pensamentos','Que me ajude a trabalhar minhas emoções','Ainda não sei']},
  {category:'Abordagem', title:'Você tem preferência por alguma abordagem terapêutica?', help:'Não tem problema se você ainda não souber.', type:'single', options:['Não tenho preferência','TCC','Psicanálise','Humanista','Outra','Não sei qual escolher']},
  {category:'Formato', title:'Como você prefere realizar suas sessões?', help:'Escolha o formato mais adequado para sua rotina.', type:'single', options:['Online','Presencial','Tanto faz / híbrido']},
  {category:'Conte sobre você', title:'Existe algo que você gostaria de registrar sobre seu momento?', help:'Esta anotação é privada e opcional. Você pode compartilhar o que desejar pelo chat depois do match.', type:'text', optional:true, placeholder:'Escreva aqui, se quiser...'}
];
let quizIndex = 0;
let quizAnswers = {};

function startQuiz(){}
function renderQuizQuestion(){
  const q = QUIZ_QUESTIONS[quizIndex];
  const progress = Math.round(((quizIndex + 1) / QUIZ_QUESTIONS.length) * 100);
  document.getElementById('quiz-counter').textContent = `Pergunta ${quizIndex + 1} de ${QUIZ_QUESTIONS.length}`;
  document.getElementById('quiz-percent').textContent = `${progress}%`;
  document.getElementById('quiz-progress').style.width = `${progress}%`;
  document.getElementById('quiz-category').textContent = q.category;
  document.getElementById('quiz-title').textContent = q.title;
  document.getElementById('quiz-help').textContent = q.help;
  document.getElementById('quiz-error').textContent = '';
  document.getElementById('quiz-back').disabled = quizIndex === 0;
  document.getElementById('quiz-next').textContent = quizIndex === QUIZ_QUESTIONS.length - 1 ? 'Finalizar questionário' : 'Continuar';

  const options = document.getElementById('quiz-options');
  const saved = quizAnswers[quizIndex];
  if(q.type === 'text'){
    options.innerHTML = `<textarea class="textarea quiz-textarea" id="quiz-text-answer" maxlength="600" placeholder="${q.placeholder}"></textarea><div class="quiz-char-count"><span id="quiz-char-current">0</span>/600</div>`;
    const textarea = document.getElementById('quiz-text-answer');
    textarea.value = typeof saved === 'string' ? saved : '';
    document.getElementById('quiz-char-current').textContent = textarea.value.length;
    textarea.addEventListener('input', ()=>{
      quizAnswers[quizIndex] = textarea.value;
      document.getElementById('quiz-char-current').textContent = textarea.value.length;
      saveQuizDraft();
    });
    return;
  }

  const selected = Array.isArray(saved) ? saved : (saved ? [saved] : []);
  options.innerHTML = q.options.map(option => `<button type="button" class="quiz-option${selected.includes(option) ? ' selected' : ''}" aria-pressed="${selected.includes(option)}">${option}<span class="quiz-option-check">${iconSvg('check',16)}</span></button>`).join('');
  options.querySelectorAll('.quiz-option').forEach((button, optionIndex)=>{
    button.addEventListener('click', ()=>selectQuizOption(optionIndex));
  });
}

function selectQuizOption(optionIndex){
  const q = QUIZ_QUESTIONS[quizIndex];
  const option = q.options[optionIndex];
  const error = document.getElementById('quiz-error');
  error.textContent = '';
  if(q.type === 'single'){
    quizAnswers[quizIndex] = option;
  } else {
    const selected = Array.isArray(quizAnswers[quizIndex]) ? [...quizAnswers[quizIndex]] : [];
    const current = selected.indexOf(option);
    if(current >= 0) selected.splice(current, 1);
    else if(selected.length < q.max) selected.push(option);
    else { error.textContent = `Selecione no máximo ${q.max} opções.`; return; }
    quizAnswers[quizIndex] = selected;
  }
  saveQuizDraft();
  renderQuizQuestion();
}

function saveQuizDraft(){}

function nextQuizQuestion(){
  const q = QUIZ_QUESTIONS[quizIndex];
  const answer = quizAnswers[quizIndex];
  const answered = q.type === 'text' ? Boolean((answer || '').trim()) : (Array.isArray(answer) ? answer.length > 0 : Boolean(answer));
  if(!q.optional && !answered){
    document.getElementById('quiz-error').textContent = 'Selecione uma resposta antes de continuar.';
    return;
  }
  saveQuizDraft();
  if(quizIndex < QUIZ_QUESTIONS.length - 1){ quizIndex++; renderQuizQuestion(); window.scrollTo(0,0); return; }
  finishQuiz();
}

function previousQuizQuestion(){
  if(quizIndex === 0) return;
  saveQuizDraft();
  quizIndex--;
  renderQuizQuestion();
  window.scrollTo(0,0);
}

function finishQuiz(){}
showScreen("landing");
