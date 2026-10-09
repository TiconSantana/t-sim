# Acesso e contas do T-Sim

**Atualizado:** 08/10/2026  
**Estado:** deploy de produção pronto em `https://t-sim.vercel.app`; variáveis Supabase e Gmail já configuradas na Vercel. Falta provisionar o primeiro administrador para liberar a gestão das solicitações.

## Fluxo

1. A pessoa solicita acesso com matrícula, nome completo, e-mail, telefone, empresa, cargo/função e PIN numérico de seis dígitos confirmado.
2. O T-Sim cria um usuário no Supabase Auth e uma solicitação com estado `pending`. O PIN só é enviado ao serviço Auth para ser armazenado como hash.
3. O responsável em `tconnectsuporte@gmail.com` recebe a solicitação por e-mail e a revisa na área **Contas de acesso**.
4. Aprovação ou negativa fica registrada com autor, horário, resultado e motivo. A pessoa recebe o resultado por e-mail, sem envio de senha.
5. A conta aprovada entra com matrícula e PIN. Usuários comuns chegam a **Planilhas da conta**; a administração chega à **Configuração de Ambiente**.

## Implementação

- `api/access` contém as funções Vercel para sessão, login, logout, cadastro, decisões administrativas, reenvio de e-mail e provisionamento inicial do admin.
- `supabase/migrations/20261008225200_access_accounts_and_rate_limits.sql` cria perfis, auditoria, tabela de limites e funções RPC. RLS está ativo; apenas o papel server-side pode acessar os registros.
- `supabase/migrations/20261009001801_user_workspaces_and_reference_data.sql` cria a referência global de cargos e os workspaces isolados por conta; já aplicada ao projeto Supabase T-Sim. O código usa `/api/workspace`.
- Sessões usam cookie `HttpOnly`, `SameSite=Strict`, `Secure` em produção e criptografia AES-256-GCM. A API confere no banco se a conta continua aprovada.
- A matrícula é convertida em um endereço sintético interno para a autenticação do Supabase. E-mails de contato ficam separados e recebem as notificações do produto.
- Limites de tentativas são aplicados no banco: até cinco logins por matrícula a cada 15 minutos, além de limite por origem; cadastro também tem limite por origem e matrícula.
- E-mails são enviados por `tconnectsuporte@gmail.com` via SMTP TLS do Gmail. As respostas também retornam a esse endereço pelo cabeçalho `Reply-To`. Falhas são registradas e podem ser reenviadas no painel administrativo.
- Matrícula e PIN nunca são registrados em logs; PIN nunca é enviado à administração ou por e-mail.
- A conta administradora tem acesso a todas as áreas e pode alterar a referência de cargos e salários. Usuários comuns acessam a base Headcount própria, o simulador e os próprios cenários; não podem abrir as áreas de gestão.
- A planilha Headcount e a planilha Cenário recebem apenas os dados da conta autenticada. A planilha Cargos e Salário não é oferecida para download a usuários comuns.
- Nesta fase, operações administrativas fora da referência salarial ainda dependem do navegador utilizado pelo administrador; não estão sincronizadas por conta no servidor.

## Pendências de infraestrutura

O projeto Supabase `T-SIM` (`izancfemcwtkoykwskgf`) está ativo em `sa-east-1`, e a migração de contas está aplicada. A conta administrativa foi provisionada e autenticou com sucesso. As variáveis de conexão e Gmail estão configuradas na Vercel. O acesso e a fila usam o domínio `t-sim.vercel.app`.

### Variáveis privadas na Vercel

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (a chave legada `SUPABASE_ANON_KEY` também é aceita)
- `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY` legado; nunca exponha ao navegador)
- `TSIM_SESSION_ENCRYPTION_KEY` (32 bytes aleatórios em hex, 64 caracteres)
- `PUBLIC_APP_URL` (por exemplo `https://t-sim.vercel.app`)
- `GMAIL_SMTP_USER` (conta Gmail remetente; padrão `tconnectsuporte@gmail.com`)
- `GMAIL_APP_PASSWORD` (senha de app do Google; secreta, nunca use a senha normal da conta)
- `TSIM_ADMIN_BOOTSTRAP_SECRET` (segredo aleatório de uso único com pelo menos 32 caracteres)
- `TSIM_ADMIN_REGISTRATION` (matrícula definida pelo responsável)
- `TSIM_ADMIN_PIN` (PIN inicial de seis dígitos, definido pelo responsável)

Não use prefixo `VITE_` em segredos. Não grave credenciais no Git. Gere a chave de sessão com:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

### Ativação restante

1. Na Vercel, abra **t-sim → Settings → Environment Variables** e crie as três variáveis abaixo para **Production**. Escolha a matrícula administrativa e um PIN inicial de seis dígitos. Não envie esses valores por chat.
2. Gere um segredo de bootstrap no PowerShell com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Salve-o num gerenciador de senhas e adicione-o à Vercel como variável sensível.
3. Faça um novo deploy de produção para as variáveis chegarem às funções.
4. Execute o bloco PowerShell abaixo e cole o segredo quando solicitado. Ele não será exibido na tela.
5. A resposta esperada é `{ "status": "created", ... }`. Se receber erro, confira os nomes e ambientes das variáveis antes de tentar novamente.
6. Remova `TSIM_ADMIN_BOOTSTRAP_SECRET` e `TSIM_ADMIN_PIN` da Vercel e faça outro deploy. Mantenha `TSIM_ADMIN_REGISTRATION` se desejar; ela não é usada no login após a criação da conta.
7. Entre em `https://t-sim.vercel.app` com matrícula e PIN. Teste uma solicitação de acesso e confirme que a notificação chegou ao Gmail.

Variáveis para criar em Production:

- `TSIM_ADMIN_REGISTRATION`: matrícula escolhida para a conta administrativa.
- `TSIM_ADMIN_PIN`: PIN numérico inicial de seis dígitos.
- `TSIM_ADMIN_BOOTSTRAP_SECRET`: segredo aleatório com pelo menos 32 caracteres, criado no PowerShell.

Provisionamento pelo PowerShell:

```powershell
$secret = Read-Host 'Cole o segredo de bootstrap da Vercel' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  Invoke-RestMethod -Method Post `
    -Uri 'https://t-sim.vercel.app/api/access/bootstrap-admin' `
    -Headers @{ 'x-tsim-bootstrap-secret' = $plain; Origin = 'https://t-sim.vercel.app' }
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Variable plain, secret -ErrorAction SilentlyContinue
}
```
O SMTP usa `smtp.gmail.com` na porta 465 com TLS. O Gmail exige uma senha de app, disponível para contas com verificação em duas etapas e sujeita às restrições da conta Google. Não use a senha normal da conta. As funções aguardam o envio e têm timeouts de conexão para concluir a mensagem dentro da execução serverless.

O Vite (`pnpm dev`) serve a interface, mas não executa funções Vercel. Para executar interface e API localmente, use `vercel dev` com as mesmas variáveis em ambiente protegido.

## Rotas

- `GET /api/access/session`: valida sessão e perfil aprovado.
- `POST /api/access/requests`: valida e cria solicitação, notifica o admin.
- `POST /api/access/login`: autentica matrícula e PIN, aplica limites e cria sessão só para conta aprovada.
- `POST /api/access/logout`: remove a sessão segura.
- `GET /api/access/requests?status=pending`: lista pendências e e-mails que precisam de reenvio, apenas para admin.
- `POST /api/access/requests/review?id={id}`: registra aprovação ou negativa e envia a decisão.
- `POST /api/access/requests/notify?id={id}`: reenvia uma notificação marcada como falha, apenas para admin.
- `POST /api/access/bootstrap-admin`: cria a primeira conta administrativa uma única vez, usando segredo de provisionamento.
- `GET /api/workspace`: carrega headcount e cenários da própria conta; uma sessão administrativa também pode listar as bases e cenários das contas.
- `PUT /api/workspace`: salva headcount e cenários da própria conta; somente a sessão administrativa pode gravar a referência salarial global.

## Objetivo e limites das telas

### Portal de acesso

- **Objetivo/decisão:** autenticar uma pessoa aprovada ou abrir solicitação de acesso.
- **Público:** equipe solicitante e administração.
- **Dados e fonte:** matrícula, nome, contato, empresa, cargo e PIN informados pela pessoa; estado e autorização ficam no Supabase.
- **Estados:** login, cadastro, pendente, validação, indisponibilidade e erro de serviço.
- **Responsividade/acessibilidade:** formulário empilhado em tela estreita, rótulos explícitos, teclado numérico, erros anunciados e foco visível.
- **Limitação:** PIN com seis dígitos tem apenas um milhão de combinações; os limites de tentativa são obrigatórios. Recomenda-se migrar para senha longa ou MFA.

### Administração de contas

- **Objetivo/decisão:** aprovar ou negar solicitações, com motivo obrigatório para negativa, e acompanhar e-mails com falha.
- **Público:** conta `is_admin` aprovada e validada no servidor.
- **Dados e fonte:** dados profissionais informados no cadastro e datas/decisões gravadas no banco; PIN nunca é mostrado.
- **Estados:** fila carregando/vazia, pendências, decisão, falha de notificação e reenvio.
- **Responsividade/acessibilidade:** solicitações se empilham em telas estreitas; botões textuais, labels, foco e mensagens anunciadas.

## Proteção do workspace existente

O portal restringe a entrada e as ações de conta. Cenários, premissas, operações, aprovações e demais dados de gestão continuam no `localStorage` de cada navegador, sem sincronização ou isolamento por matrícula. A autenticação não transforma esses dados locais em base compartilhada nem os protege de alguém que tenha acesso ao mesmo navegador. Migrar os dados de gestão exige APIs e políticas server-side próprias.
