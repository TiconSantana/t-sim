# T-Sim — Publicação online

## Endereço público

O T-Sim está publicado em [https://t-sim.vercel.app](https://t-sim.vercel.app) e pode ser aberto em desktop, tablet ou celular.

## Arquitetura atual

- **Vercel:** hospedagem gratuita da aplicação estática.
- **GitHub:** repositório oficial em `TiconSantana/t-sim`.
- **Persistência local:** cenários, premissas, operações e aprovações ficam no `localStorage` do navegador atual.
- **Backup manual:** a tela Configurações exporta e restaura um arquivo JSON.
- **Modo local sem login:** o produto abre direto no simulador e continua funcional sem conta ou conexão externa.
- **Workspace compartilhado opcional:** a tela Configurações pode conectar uma conta do Supabase Tconnect para salvar e carregar cenários entre aparelhos.

## Publicação

Cada atualização enviada para a branch `main` gera um novo deploy automático na Vercel. O build de produção é executado com `pnpm build`.

## Próxima evolução

O banco compartilhado já está preparado no Tconnect. Depois da confirmação do e-mail, o T-Sim tenta vincular automaticamente a conta ao único registro ativo de `public.colaborador` com o mesmo e-mail. Se não houver correspondência única, o sistema bloqueia o acesso compartilhado e informa o motivo.
