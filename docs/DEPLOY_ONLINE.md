# T-Sim — Publicação online

## Endereço público

O T-Sim está publicado em [https://t-sim.vercel.app](https://t-sim.vercel.app) e pode ser aberto em desktop, tablet ou celular.

## Arquitetura atual

- **Vercel:** hospedagem gratuita da aplicação estática.
- **GitHub:** repositório oficial em `TiconSantana/t-sim`.
- **Sessão e contas:** login, cadastro pendente, revisão administrativa e notificações usam as rotas Vercel e Supabase descritas em [`ACESSO_E_CONTAS.md`](ACESSO_E_CONTAS.md).
- **Headcount e cenários:** rotas autenticadas guardam cada base e seus cenários sob o `user_id` da sessão. Usuários só veem e alteram os próprios registros; o administrador pode consultar as bases pelo endpoint administrativo.
- **Referência salarial:** uma linha global guarda cargos, encargos, fonte, vigência, versão e responsável. A gravação exige sessão administrativa.
- **Planilhas:** Headcount e Cenário são arquivos independentes, nomeados com o nome do perfil. O modelo Headcount tem uma aba e apenas os 12 cabeçalhos. Cargos e Salário não é disponibilizada para download a usuários comuns. Veja [`PLANILHA_PADRAO_TSIM.md`](PLANILHA_PADRAO_TSIM.md).
- **Operação administrativa:** módulos fora de Headcount e Cenários continuam armazenados localmente no navegador do administrador nesta fase. A autenticação do portal não os sincroniza entre aparelhos.
- **Variáveis externas atuais:** verifique [`ACESSO_E_CONTAS.md`](ACESSO_E_CONTAS.md) para o estado de configuração e implantação das variáveis do Supabase e do Gmail.
- **Cabeçalhos de segurança:** a Vercel envia `nosniff`, política de referência restrita, bloqueio de enquadramento e desativa câmera, microfone e geolocalização.
- **Planilhas enviadas:** o app usa o espelho npm comunitário `@e965/xlsx@0.20.3`, que publica a versão corrigida do SheetJS e não tem dependências próprias. O leitor Excel é carregado sob demanda ao abrir ou exportar `.xlsx`.

## Portal de acesso

Em 08/10/2026 foram implementadas as rotas de API e a migração da base de contas. O banco Supabase exclusivo do T-Sim foi criado e recebeu a migração de contas. As variáveis do Supabase e o SMTP do Gmail foram configurados na Vercel; falta publicar as alterações de código e provisionar o primeiro administrador. Cadastro, aprovação, login e notificações só passam a funcionar no endereço público após o deploy e o provisionamento administrativo.

Detalhes e contrato esperado: [`ACESSO_E_CONTAS.md`](ACESSO_E_CONTAS.md).

`supabase/migrations/20261009001801_user_workspaces_and_reference_data.sql` já foi aplicada ao projeto Supabase T-Sim. As rotas `/api/workspace` usam as tabelas criadas pela migração. A interface será publicada pelo deploy da branch `main`.

## Publicação

Cada atualização enviada para a branch `main` gera um novo deploy automático na Vercel. O build de produção é executado com `pnpm build`.

## Limite atual

Os dados de Headcount e Cenário são isolados por conta após a migração de workspace ser aplicada. Os módulos administrativos restantes continuam locais ao navegador do administrador. O sistema gera arquivos para download; não envia e-mails nem submete pedidos de aprovação externos automaticamente.
