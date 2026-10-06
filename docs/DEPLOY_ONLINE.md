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

O banco compartilhado já está preparado no Tconnect. Para usar uma conta, ela precisa estar vinculada a um registro de `public.colaborador` da empresa. A vinculação é uma etapa administrativa do Tconnect e não expõe a chave secreta no frontend.
