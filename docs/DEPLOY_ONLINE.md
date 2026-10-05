# T-Sim — Publicação online

## Endereço público

O T-Sim está publicado em [https://t-sim.vercel.app](https://t-sim.vercel.app) e pode ser aberto em desktop, tablet ou celular.

## Arquitetura atual

- **Vercel:** hospedagem gratuita da aplicação estática.
- **GitHub:** repositório oficial em `TiconSantana/t-sim`.
- **Persistência local:** cenários, premissas, operações e aprovações ficam no `localStorage` do navegador atual.
- **Backup manual:** a tela Configurações exporta e restaura um arquivo JSON.
- **Sem login nesta fase:** o produto permanece focado no simulador local e não depende de Supabase ou outro serviço de autenticação.

## Publicação

Cada atualização enviada para a branch `main` gera um novo deploy automático na Vercel. O build de produção é executado com `pnpm build`.

## Próxima evolução

Uma camada de contas e sincronização entre aparelhos poderá ser adicionada futuramente quando o fluxo do simulador estiver validado com usuários reais.
