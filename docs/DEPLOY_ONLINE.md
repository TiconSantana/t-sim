# T-Sim — Publicação online

## Endereço público

O T-Sim está publicado em [https://t-sim.vercel.app](https://t-sim.vercel.app) e pode ser aberto em desktop, tablet ou celular.

## Arquitetura atual

- **Vercel:** hospedagem gratuita da aplicação estática.
- **GitHub:** repositório oficial em `TiconSantana/t-sim`.
- **Persistência local:** cenários, premissas, operações, pessoas e aprovações ficam no `localStorage` do navegador atual.
- **Perfis locais:** Configurações permite criar e alternar bases isoladas no mesmo navegador, sem login e sem compartilhamento entre usuários.
- **Backup manual:** a tela Configurações exporta e restaura um arquivo JSON.
- **Modo local sem login:** o produto abre direto no simulador e continua funcional sem conta ou conexão externa.
- **Base própria por usuário:** os dados importados e calculados ficam isolados no navegador do usuário atual.
- **Planilha padrão:** o arquivo `.xlsx` pode ser baixado em Configurações, preenchido pelo usuário e importado pela opção **Importar planilha completa**. As abas Cargos, Pessoas, Premissas, Operação e Cenários são lidas localmente; a importação também reconhece a estrutura operacional da planilha de custos V.TAL.
- **Variáveis externas:** nenhuma variável de Supabase ou TConnect é necessária no projeto Vercel.

## Publicação

Cada atualização enviada para a branch `main` gera um novo deploy automático na Vercel. O build de produção é executado com `pnpm build`.

## Limite atual

O deploy público disponibiliza a aplicação em qualquer aparelho conectado, mas cada navegador mantém sua própria base local. Para levar dados a outro aparelho, exporte o backup JSON ou a planilha preenchida e importe no novo ambiente. Uma base online própria do T-Sim pode ser adicionada futuramente como uma evolução separada.
