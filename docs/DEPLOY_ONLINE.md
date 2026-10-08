# T-Sim — Publicação online

## Endereço público

O T-Sim está publicado em [https://t-sim.vercel.app](https://t-sim.vercel.app) e pode ser aberto em desktop, tablet ou celular.

## Arquitetura atual

- **Vercel:** hospedagem gratuita da aplicação estática.
- **GitHub:** repositório oficial em `TiconSantana/t-sim`.
- **Persistência local:** cenários, premissas, operações, pessoas e aprovações ficam no `localStorage` do navegador atual.
- **Perfis locais:** Configurações permite organizar e alternar bases no mesmo navegador, sem login ou compartilhamento externo. Eles não são contas nem uma barreira de acesso para pessoas que usam o mesmo navegador.
- **Backup manual:** a tela Configurações exporta e importa o backup completo em Excel `.xlsx`.
- **Portal de acesso:** interface e funções Vercel para matrícula, cadastro pendente, revisão administrativa e notificações; a ativação depende da configuração de Supabase e Gmail SMTP.
- **Base própria por navegador:** os dados importados e calculados continuam no `localStorage` e não são isolados por usuário autenticado.
- **Planilha padrão:** o arquivo `.xlsx` pode ser baixado em Configurações, preenchido pelo usuário e importado pela opção **Importar planilha completa**. As abas Cargos, Pessoas, Premissas, Operação e Cenários são lidas localmente; a importação também reconhece a estrutura operacional da planilha de custos V.TAL.
- **Variáveis externas atuais:** nenhuma variável de Supabase ou TConnect está configurada no projeto Vercel; isso mantém a aplicação em modo sem backend.
- **Cabeçalhos de segurança:** a Vercel envia `nosniff`, política de referência restrita, bloqueio de enquadramento e desativa câmera, microfone e geolocalização.
- **Planilhas enviadas:** o app usa o espelho npm comunitário `@e965/xlsx@0.20.3`, que publica a versão corrigida do SheetJS e não tem dependências próprias. O leitor Excel é carregado sob demanda ao abrir ou exportar `.xlsx`.

## Portal de acesso

Em 08/10/2026 foram implementadas as rotas de API e a migração da base de contas. O banco Supabase exclusivo do T-Sim foi criado e recebeu a migração de contas. As variáveis do Supabase e o SMTP do Gmail foram configurados na Vercel; falta publicar as alterações de código e provisionar o primeiro administrador. Cadastro, aprovação, login e notificações só passam a funcionar no endereço público após o deploy e o provisionamento administrativo.

Detalhes e contrato esperado: [`ACESSO_E_CONTAS.md`](ACESSO_E_CONTAS.md).

## Publicação

Cada atualização enviada para a branch `main` gera um novo deploy automático na Vercel. O build de produção é executado com `pnpm build`.

## Limite atual

O deploy público disponibiliza a aplicação em qualquer aparelho conectado, mas cada navegador mantém sua própria base local. A autenticação controla o portal e a administração de contas; não protege nem sincroniza os dados de gestão salvos localmente. Para levar dados a outro aparelho, exporte o backup Excel `.xlsx` ou a planilha preenchida e importe no novo ambiente. A persistência compartilhada de cenários e cadastros continua dependendo de APIs de gestão próprias.
