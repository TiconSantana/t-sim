# T-SIM — Fechamento visual

**Data:** 06/10/2026  ·  **Escopo:** identidade, entrada, workspace e saídas locais

## Entregue

- Logo transparente aplicada no cabeçalho e variantes claras/escuras organizadas em `public/brand/`.
- Favicon SVG, ícone PWA e `apple-touch-icon` apontando para o símbolo T-SIM.
- Tema claro e tema escuro com tokens semânticos, contraste de estados, foco visível e controle persistente.
- Entrada local, onboarding em três passos e página institucional com mockup do app.
- Skip link, `aria-current` na navegação, foco no conteúdo e mensagens de salvamento com `aria-live`.
- Relatório Excel `.xlsx` com abas de identidade, parecer e histórico da decisão.
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
| Primeira visita | A aplicação abre na tela de acesso local; o workspace compartilhado fica disponível após a sessão |
| Responsividade | Breakpoints de sidebar, hero, grades e entrada revisados no CSS |

### Revisão adicional — contraste do tema escuro (09/10/2026)

Foi corrigida a camada de contraste do tema escuro em todas as superfícies que ainda usavam
fundos claros do tema original. A revisão cobre o simulador de movimentação, leitura de economia,
comparação automático/manual, cenários salvos, People, Budget, Ops, Analytics, Pareceres,
histórico de auditoria, badges, trilhas de gráficos, controles de formulário e atalhos de teclado.

As superfícies agora usam os tokens escuros (`--surface`, `--surface-raised` e `--surface-muted`)
com texto principal em `--ink-950`, texto auxiliar em `--ink-700/800` e estados de ação em azul,
laranja e verde com contraste próprio. Isso evita texto claro sobre cartões brancos e preserva a
leitura de valores financeiros e status operacionais.

| Verificação | Resultado |
|---|---|
| Build após a revisão de contraste | Passou; somente avisos já conhecidos do `lucide-react` |
| Verificação de whitespace | `git diff --check` passou |
| Escopo funcional | Nenhuma regra de cálculo ou dado de domínio foi alterado |
| Limitação | O workspace local abre a tela de acesso; a validação visual interna não usa credenciais de produção |

### Ajustes de leitura e seleção no simulador (09/10/2026)

- Os quatro indicadores do simulador exibem um ícone informativo com abertura por foco, hover ou clique.
- O painel lateral “Compare caminhos” foi removido para concentrar a tela na montagem do cenário.
- A seleção de colaboradores usa nomes em destaque, matrícula e cargo, caixas de seleção e pesquisa por nome ou matrícula.
- A lista mantém a seleção mesmo quando o filtro de pesquisa é alterado e respeita o limite calculado de posições.

## Limitações conhecidas

- O projeto mantém o modo local sem login, sem sincronização externa e com base isolada por navegador; o deploy público já está ativo.
- A planilha usa a estrutura e metadados de identidade; o motor `xlsx` não aplica tema cromático às células sem uma camada adicional de escrita de estilos.
- O build ainda informa avisos do `lucide-react` sobre a diretiva `use client`; eles vêm da dependência e não bloqueiam a entrega visual.

## Estado aprovado

A revisão visual foi aprovada pelo responsável em 06/10/2026. A marca, os textos e a página
institucional passam a ser a referência visual do MVP e continuam editáveis no repositório para
evoluções futuras.
