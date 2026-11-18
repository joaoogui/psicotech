# PsicoTech

Aplicação com interface HTML/CSS/JavaScript, servidor Node.js e banco SQLite persistente. Requer Node 22.14 ou superior. Não precisa instalar pacotes para funcionar.

## Abrir no Windows

1. Clique duas vezes em **INICIAR.bat** e mantenha a janela aberta.
2. Abra **http://localhost:3000** no navegador. Abrir index.html diretamente não conecta o banco.
3. Cadastre pacientes e psicólogos pelo site.
4. Para criar sua conta administrativa, execute **CRIAR-ADMIN.bat**, informe e-mail, nome e uma senha com no mínimo 12 caracteres. O administrador entra pelo mesmo formulário de login.

Alternativa ao atalho administrativo: defina `ADMIN_PASSWORD` temporariamente no ambiente e execute `npm run admin -- create email "Nome"`. Não há senha padrão nem possibilidade de cadastrar administrador pelo site.

## Fluxo de uso

- Profissional: cadastra CRP, preenche perfil, valor, abordagem, estilo, formato e áreas; envia diploma e registro (PDF/PNG/JPEG até 2 MB cada).
- Administrador: consulta documentos, faz a conferência profissional fora do sistema e registra a decisão com referência da verificação. O site não consulta nem certifica automaticamente registros nos Conselhos.
- Paciente: responde o questionário; vê profissionais aprovados com perfil completo; solicita match.
- Profissional: aceita a solicitação e publica horários futuros, em horas cheias.
- Ambos: conversam por mensagens persistentes e acompanham agendamentos. O paciente reserva um horário disponível; o servidor impede conflitos de ambos os participantes.
- Profissional: informa um link HTTPS de sala privada (serviço de videoconferência escolhido por ele), conclui sessões passadas e registra prontuários privados.
- Paciente: registra humor privado, avalia sessões concluídas e exporta seus dados pessoais disponíveis.
- Administração: gerencia acessos, conteúdo, suporte, compatibilidade mínima, prazo de cancelamento e consulta indicadores reais.

Os testes e contas fictícias ficam fora do banco de uso. Uma instalação nova começa vazia. Nenhum dado de atendimento do protótipo é migrado como se fosse real.

## Banco, armazenamento e recuperação

O banco está em `data/psicotech.sqlite`. Mensagens, perfis, questionários, humor, documentos, chamados e prontuários usam AES-256-GCM. A chave local é gerada em `data/encryption.key`. Senhas usam scrypt com sal individual; sessões usam cookies HttpOnly e tokens aleatórios armazenados como hash.

**Nunca perca a chave:** ela é indispensável para ler um backup. Para cópia local consistente, pare o servidor e copie a pasta `data` inteira para armazenamento protegido. Não publique a pasta data, `.env`, backups ou a chave. A criptografia em disco não é ponta a ponta: o servidor processa os dados autorizados. O acesso à máquina e à chave deve ser restrito.

O servidor entrega apenas os arquivos públicos listados explicitamente. A autorização é conferida em cada operação, inclusive downloads. A administração não tem acesso por API ao chat, humor ou prontuários. Decisões administrativas e acesso a documentos/prontuários geram registros de auditoria.

## Integrações que exigem configuração externa

**Pagamentos:** há integração Checkout Pro via Preferences API do Mercado Pago, com criação de checkout, confirmação consultada na API do provedor e conferência de valor/moeda/referência. Configure `MERCADOPAGO_ACCESS_TOKEN` e `APP_URL` HTTPS. A situação só muda para pago após confirmação do provedor. Não há coleta local de cartão. A integração não foi validada com credenciais reais nesta entrega. A versão atual usa uma conta recebedora da plataforma: divisão automática entre profissionais, repasses e reembolsos não estão implementados. Sessões pagas não são canceladas automaticamente; o suporte deve conciliar cancelamento/reembolso no provedor.

**Recuperação por e-mail:** configure `RESEND_API_KEY` e `EMAIL_FROM` em domínio verificado. Links expiram em 30 minutos e são de uso único. Sem provedor, o administrador local pode gerar um link com `npm run admin -- reset email`. Trate o link como credencial e entregue apenas ao titular após verificação. Envio externo não foi testado nesta entrega.

**Vídeo:** abertura de link externo de sala privada, informado pelo profissional. Não há videoconferência embutida, gravação, provedor de salas ou verificação automática das regras de privacidade do serviço escolhido.

Google/Apple OAuth do protótipo foram removidos da tela porque não há credenciais configuradas. Não existe login social nesta implementação.

## Publicação

O sistema está pronto para execução local, **não publicado na internet**. Não é uma entrega liberada para atendimento clínico público sem preparação operacional.

Inclui Dockerfile para uma hospedagem que execute Node/container com **volume persistente**. Não coloque o banco em disco temporário nem em funções sem persistência. Use uma única instância deste servidor para o SQLite; expansão para múltiplas réplicas exige banco compartilhado e limitação de requisições centralizada.

Configuração de produção:

1. Defina `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT`, `APP_URL=https://endereco-publico` e `DATA_DIR=/data`.
2. Gere `DATA_KEY` com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e guarde em segredo na hospedagem. Se migrar dados locais, use a chave já existente, sem substituí-la.
3. Monte um volume persistente em `/data`. Termine TLS/HTTPS em um proxy ou no provedor; a porta interna do servidor não deve ser exposta diretamente.
4. Crie o administrador no ambiente hospedado; configure pagamentos/e-mail quando as respectivas contas estiverem disponíveis.
5. Configure backups protegidos e teste restauração. Defina responsável/organização, contato externo, retenção, rotina de revisão profissional e documentos legais adequados à operação. Os textos presentes descrevem o comportamento atual e precisam dessa complementação.
6. Faça homologação com contas de teste e credenciais de teste dos serviços externos antes de receber pacientes ou pagamentos reais. Revise segurança, controles operacionais e requisitos regulatórios com responsáveis qualificados.

Não foi contratada hospedagem, domínio ou conta de pagamentos. Sites foi avaliado, mas não foi usado para publicar uma vitrine desconectada: esta implementação precisa de um servidor Node e disco persistente, além do fluxo de contas próprio.

## Verificação

Execute `npm test`. A suíte cria banco temporário isolado e verifica cadastro/login, papéis, documentos e aprovação, cálculo de afinidade, isolamento de chat/prontuário/humor, criptografia em armazenamento, agenda e conflitos, avaliações, suporte, conteúdo, CSRF, arquivos privados, suspensão e logout.

Também foi conferido no navegador o login, questionário completo, resultados, solicitação e aceite de match e envio de mensagem entre contas locais fictícias. Os testes não equivalem a auditoria independente de segurança nem homologação financeira ou clínica.

O visual inicial foi preservado; as áreas internas passaram a exibir dados reais e estados vazios. Os arquivos originais estão em `original/`, que não é servida pelo aplicativo.

Documentação oficial da cobrança: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/overview
