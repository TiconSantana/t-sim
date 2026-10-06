# T-SIM — Fechamento visual

**Data:** 06/10/2026  ·  **Escopo:** identidade, entrada, workspace e saídas locais

## Entregue

- Logo transparente aplicada no cabeçalho e variantes claras/escuras organizadas em `public/brand/`.
- Favicon SVG, ícone PWA e `apple-touch-icon` apontando para o símbolo T-SIM.
- Tema claro e tema escuro com tokens semânticos, contraste de estados, foco visível e controle persistente.
- Entrada local, onboarding em três passos e página institucional com mockup do app.
- Skip link, `aria-current` na navegação, foco no conteúdo e mensagens de salvamento com `aria-live`.
- Relatório JSON com assinatura e identificação do ambiente.
- Planilha Excel com aba `Identidade`, metadados, larguras de coluna e aba `Parecer`.
- Impressão/PDF com cabeçalho T-SIM e regras para remover controles de interface.
- Service worker pré-carregando logo, favicon, símbolo, hero e mockup para o shell offline.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `npm run build` | Passou; apenas avisos do bundler sobre `use client` e tamanho do chunk |
| `git diff --check` | Passou; somente avisos de normalização CRLF do Git |
| Preview local | Navegação, Budget, Pareceres, tema e skip link conferidos no navegador |
| Fluxos visuais | Acesso local, onboarding e Apresentação já conferidos nesta etapa |
| Primeira visita | A aplicação abre direto no workspace local; o acesso compartilhado fica em Configurações |
| Responsividade | Breakpoints de sidebar, hero, grades e entrada revisados no CSS |

## Limitações conhecidas

- O projeto mantém o modo local sem login, sem sincronização externa e com base isolada por navegador; o deploy público já está ativo.
- A planilha usa a estrutura e metadados de identidade; o motor `xlsx` não aplica tema cromático às células sem uma camada adicional de escrita de estilos.
- O build ainda informa avisos do `lucide-react` sobre a diretiva `use client`; eles vêm da dependência e não bloqueiam a entrega visual.

## Estado aprovado

A revisão visual foi aprovada pelo responsável em 06/10/2026. A marca, os textos e a página
institucional passam a ser a referência visual do MVP e continuam editáveis no repositório para
evoluções futuras.
