# T-Sim — Diretrizes de identidade visual

**Versão:** 1.2 · **Vigência:** 06/10/2026 · **Responsável:** Produto T-Sim / TConnect

**Status:** pacote visual aprovado pelo responsável do projeto em 06/10/2026. Os ativos canônicos
em `public/brand/` e o conteúdo institucional desta versão podem ser usados no frontend e na
publicação do MVP.

## Ideia central

**T-Sim — Simular antes. Decidir melhor.**

O T-Sim é uma bancada de decisão para RH, Controladoria, Operações e Diretoria. A identidade visual deve permitir que uma pessoa reconheça, em poucos segundos, três coisas: a base de dados que está sendo usada, a movimentação simulada e a consequência financeira ou operacional.

O símbolo combina:

- **T estrutural:** cargo, nível, base de referência e governança.
- **Traço de rota:** passagem entre origem, destino e cenário.
- **Nós de sinal:** dado informado, cálculo e aprovação rastreável.

O desenho é técnico e funcional. Não representa fibra óptica literalmente e não deve ser usado como ilustração documental de equipamento.

## Arquitetura da marca

| Ativo | Uso | Arquivo |
|---|---|---|
| Logo principal | Sidebar, cabeçalho, PDFs e apresentações | `public/brand/t-sim-logo-header.png` (aplicação atual); SVGs mantidos como fallback |
| Logo para fundo escuro | Sidebar e telas com fundo `ink-950` | `public/brand/t-sim-logo-light.svg` |
| Logo para fundo claro | PDFs, relatórios e fundos brancos | `public/brand/t-sim-logo-dark.svg` |
| Símbolo | Favicon, avatar, PWA e espaços quadrados | `public/brand/t-sim-mark.png` (aplicação atual); `public/brand/t-sim-mark.svg` como fallback |
| Símbolo sobre fundo claro | Avatar, relatório e instalação em superfícies claras | `public/brand/t-sim-mark-on-light.svg` |
| Símbolo sobre fundo escuro | Favicon, sidebar, avatar e instalação em superfícies escuras | `public/brand/t-sim-mark-on-dark.svg` / `public/brand/t-sim-favicon.svg` |
| Assinatura vertical clara | Apresentação institucional, onboarding e fundos claros | `public/brand/t-sim-lockup-stacked-light.svg` |
| Assinatura vertical escura | Login, capa institucional e fundos escuros | `public/brand/t-sim-lockup-stacked-dark.svg` |


## Paleta semântica

| Token | Hex | Função |
|---|---|---|
| `ink-950` | `#071B30` | fundo estrutural, sidebar e fórmula |
| `ink-900` | `#0A2541` | títulos, painel de cenário e texto forte |
| `blue-600` | `#1769AA` | ação primária, dados e navegação |
| `orange-500` | `#E4762D` | decisão, movimento, alerta e foco |
| `green-600` | `#167D62` | cobertura válida, saldo positivo e persistência local |
| `violet-600` | `#6C5BD4` | análise e indicadores derivados |
| `paper` | `#F4F7F9` | fundo de trabalho |

As cores das referências externas nunca são copiadas. Estrutura, proporção, silhueta e disposição podem ser usadas como referência, conforme o Reference Lock do T-Vision.

### Tema escuro

| Token | Hex | Função |
|---|---|---|
| `dark-paper` | `#050A12` | fundo de trabalho OLED |
| `dark-surface` | `#0D1724` | superfície principal |
| `dark-surface-raised` | `#111F2E` | card elevado, tabela e painel |
| `dark-text` | `#ECF7FF` | título e valor principal |
| `dark-muted` | `#7694A9` | texto auxiliar e metadado |
| `dark-blue` | `#47C9FF` | ação, link e dado destacado |
| `dark-orange` | `#FF9A45` | decisão, alerta e movimento |
| `dark-green` | `#44D3A1` | validação, saldo e estado persistido |
| `dark-violet` | `#A69BFF` | análise e métricas derivadas |

## Tipografia

- **Space Grotesk:** marca, títulos, números de KPI e fórmulas curtas.
- **DM Sans:** navegação, corpo, tabelas, estados e instruções.
- Usar números tabulares em métricas para facilitar comparação entre cenários.

## Regras de uso

- Área de respiro mínima: a altura do nó de sinal ao redor do logo.
- Não inclinar, esticar, trocar o azul estrutural ou aplicar sombra no símbolo.
- Em fundo escuro, usar `t-sim-logo-light.svg`; em fundo claro, usar `t-sim-logo-dark.svg`.
- O tagline pode ser omitido abaixo de 160 px de largura e nunca deve ser reduzido a ponto de perder leitura.
- A arte cromada `t-sim-logo-header.png` é a assinatura expressiva principal; as versões SVG são alternativas escaláveis para impressão, instalação e fundos controlados.
- O favicon usa somente o símbolo, sem texto, para preservar leitura em 16–32 px.

### Tamanhos mínimos

| Aplicação | Largura mínima | Ativo recomendado |
|---|---:|---|
| Favicon e atalho | 16 px | `t-sim-favicon.svg` |
| Avatar e ícone quadrado | 32 px | `t-sim-mark-on-dark.svg` ou `t-sim-mark-on-light.svg` |
| Assinatura vertical | 120 px | `t-sim-lockup-stacked-*.svg` |
| Cabeçalho do workspace | 176 px | `t-sim-logo-header.png` |
| Material institucional | 260 px | `t-sim-logo-header.png` ou lockup SVG |

### Espaçamento e composição

- Usar uma escala base de 4 px; os intervalos de interface mais frequentes são 8, 12, 16, 24 e 32 px.
- Manter pelo menos uma altura do nó de sinal de respiro ao redor do símbolo.
- Reservar azul/ciano para ação e leitura de dado; laranja deve indicar decisão, movimento ou alerta.
- Não usar mais de um gradiente expressivo na mesma superfície; o gradiente deve reforçar profundidade ou direção.
- Cards precisam carregar rótulo, valor, unidade e origem quando apresentarem uma métrica.

### Tom de interface

- Preferir verbos de decisão: **Simular**, **Validar**, **Comparar**, **Revisar**, **Aprovar**.
- Exibir fonte, vigência e classificação perto de valores que sustentam uma decisão.
- Evitar promessas absolutas; ROI, retenção, produtividade e payback permanecem estimativas até haver histórico.

### Movimento e acessibilidade

- Hover pode deslocar ou iluminar uma superfície em até 2 px; não usar tremor, pulso contínuo ou brilho decorativo.
- Toda ação precisa de `:focus-visible` perceptível em claro e escuro.
- Respeitar `prefers-reduced-motion` e manter transições abaixo de 220 ms.
- A informação transmitida por cor deve aparecer também em texto, rótulo ou ícone.


## Direção para as telas

Cada tela deve declarar objetivo, decisão, público, unidade e fonte dos dados, estados vazio/carregando/erro/alerta, responsividade e limitações. A composição usa superfícies densas, linhas de relação, tabelas e callouts editáveis. A marca reforça a hierarquia; não substitui rótulos, unidades ou fontes.

## Limitações

Os ativos são uma identidade vetorial de produto e não substituem a validação final da marca TConnect. Ilustrações futuras devem ser identificadas como representação didática quando não forem documentação de campo.
