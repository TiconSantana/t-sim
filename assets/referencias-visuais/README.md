# Referências visuais do T-SIM

Use esta pasta para guardar imagens de referência antes da criação ou adaptação de qualquer peça visual do projeto.

## Estrutura

| Pasta | Uso |
|---|---|
| `00-a-classificar` | Imagens recebidas que ainda não foram organizadas. |
| `01-logo-marca` | Logo principal, versões horizontal/vertical, símbolo e assinaturas. |
| `02-banners` | Banners para site, apresentações, campanhas e cabeçalhos. |
| `03-telas-app` | Capturas e referências de telas do aplicativo ou dashboard. |
| `04-icones-favicon` | Ícones, favicon, avatar e elementos quadrados. |
| `05-ilustracoes` | Ilustrações, diagramas e elementos gráficos autorais. |
| `06-fundos-texturas` | Fundos, gradientes, texturas e padrões visuais. |
| `07-mockups` | Mockups de dispositivos, telas, materiais e apresentações. |
| `08-redes-sociais` | Posts, capas, stories e demais formatos sociais. |
| `09-referencias-estruturais` | Referências usadas apenas para estrutura, proporção, silhueta e composição. |

## Convenção de nome

Use nomes descritivos neste formato:

`tipo_descricao_origem_versao.ext`

Exemplo: `logo-principal_tsim_interno_v01.svg`

## Regras rápidas

- Coloque primeiro os arquivos novos em `00-a-classificar`.
- Mova cada arquivo para a pasta correta depois da triagem.
- Preserve o arquivo original; versões editadas devem usar `_v02`, `_v03` etc.
- Registre a origem quando a imagem vier de referência externa.
- As referências estruturais não definem a paleta do T-SIM; elas orientam apenas forma, proporção e composição.

## Referências aprovadas e ativos gerados

- As duas imagens aprovadas ficam em `00-a-classificar` e são a fonte visual desta etapa.
- O Prompt Mestre está em `Prompt Mestre/Prompt_Detalhado_Logo_T-SIM_Versao_Final.md`.
- O logo transparente aplicado no cabeçalho está em `01-logo-marca/t-sim-logo-header-v01.png` e é servido pelo frontend em `public/brand/t-sim-logo-header.png`.
- O banner de fundo está em `02-banners/t-sim-hero-banner-v01.png`.
- A referência visual do dashboard está em `03-telas-app/t-sim-dashboard-reference-v01.png`.
- O símbolo quadrado está em `04-icones-favicon/t-sim-mark-v01.png`.
- O mockup do app está em `07-mockups/t-sim-app-mockup-v01.png`.
- As versões SVG escaláveis para fundos claro/escuro, assinatura vertical e favicon ficam em `public/brand/` e são listadas em `docs/brand-guidelines.md`.
- As cópias versionadas para aprovação ficam em `01-logo-marca/` e `04-icones-favicon/`.

Os ativos gerados são referências de direção visual. Textos, dados, unidades e controles do produto devem continuar em HTML/CSS/SVG editável no frontend.
