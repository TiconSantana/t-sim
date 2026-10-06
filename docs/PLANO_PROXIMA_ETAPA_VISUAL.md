# T-SIM — Plano da próxima etapa visual

**Versão:** 1.0 · **Data:** 06/10/2026 · **Responsável:** Produto T-SIM / TConnect

## Objetivo

Consolidar a identidade visual do T-SIM em todos os pontos de contato: instalação do app,
comunicação da marca, entrada do usuário e apresentação institucional. O trabalho preserva o
motor de cálculo e a separação entre domínio e interface.

## Sequência de entrega

**Status atual:** Fases 1–5 concluídas; pacote visual e página institucional aprovados pelo responsável em 06/10/2026. Validação registrada em `docs/VISUAL_QA_TSIM.md`.

### Fase 1 — Sistema de marca e ícones

- Consolidar logo principal, símbolo, versões para fundo claro e fundo escuro.
- Criar favicon, ícone PWA, avatar e ícone de atalho.
- Registrar nomes, proporções, área de respiro, usos permitidos e usos proibidos.
- Validar contraste e leitura em 16, 32, 64 e 192 px.

**Saída:** arquivos em `public/brand/`, referências em `assets/referencias-visuais/` e guia de marca atualizado.

### Fase 2 — Guia de identidade visual

- Documentar paleta semântica clara e escura.
- Documentar tipografia, escala, espaçamento, raios, sombras e estados de interação.
- Definir uso de azul elétrico, ciano, laranja de decisão, verde de validação e violeta analítico.
- Registrar o Reference Lock: as imagens recebidas orientam estrutura e acabamento; não são fonte de cor.

**Saída:** `docs/brand-guidelines.md` e tokens sincronizados em `assets/design-tokens.json` e `assets/design-tokens.css`.

### Fase 3 — Login e onboarding

- Criar uma entrada visual coerente com a bancada de decisão.
- Explicar ambiente, fonte de dados, premissas e próximo passo antes do primeiro cenário.
- Cobrir estados vazio, carregando, erro e ambiente local.
- Manter textos, unidades e alertas editáveis em HTML/CSS.

**Saída:** telas navegáveis em modo local, sem inventar autenticação ou integração externa.

### Fase 4 — Página institucional e mockup

- Criar uma apresentação curta do T-SIM com proposta, módulos e fluxo de decisão.
- Usar o mockup do app como ativo visual de apoio, sem substituir dados reais da aplicação.
- Incluir chamadas para People, Budget, Ops, Analytics e T-Sim AI.
- Garantir adaptação desktop, tablet e mobile.

**Saída:** página institucional acessível dentro do projeto, separada do workspace operacional.

## Contratos das novas telas

### Acesso local

- **Objetivo:** explicar o ambiente disponível e abrir o fluxo local.
- **Decisão:** continuar no ambiente Base T-Sim · Bahia.
- **Público:** RH, Controladoria, Operações e Diretoria em avaliação do MVP.
- **Dados e fonte:** nome do ambiente e indicação de persistência local; nenhum dado financeiro é criado nesta tela.
- **Estados:** padrão, foco, tema claro/escuro e viewport mobile.
- **Acessibilidade:** campo somente leitura identificado, botão com nome acessível e foco visível.
- **Limitação:** não representa autenticação de produção nem envia dados externos.

### Onboarding

- **Objetivo:** preparar o usuário para a sequência de decisão do T-Sim.
- **Decisão:** abrir o workspace depois de reconhecer base, premissas e simulação.
- **Público:** primeira visita ou usuário que revisita o ambiente local.
- **Dados e fonte:** fluxo editorial baseado no Blueprint; sem valores financeiros novos.
- **Estados:** três passos, retorno ao acesso, tema claro/escuro e viewport mobile.
- **Acessibilidade:** ordem semântica de títulos, botões acionáveis e textos editáveis.
- **Limitação:** a conclusão é registrada apenas como preferência local do navegador.

### Apresentação institucional

- **Objetivo:** explicar o produto e os módulos antes do uso operacional.
- **Decisão:** abrir o simulador a partir da proposta de valor.
- **Público:** Diretoria, parceiros e novos usuários do T-Sim.
- **Dados e fonte:** módulos e princípios do Blueprint; mockup é representação visual didática.
- **Estados:** carregado, tema claro/escuro, responsivo e CTA para o simulador.
- **Acessibilidade:** imagem com texto alternativo, CTA identificado e conteúdo textual equivalente.
- **Limitação:** não substitui documentação técnica, fonte de dados ou parecer de aprovação.

### Fase 5 — Revisão e aprovação

- Conferir visualmente os temas claro e escuro.
- Conferir favicon, logo em fundos claro/escuro e ícones PWA.
- Executar build e revisão de contraste, foco, teclado e responsividade.
- Apresentar um checkpoint visual para aprovação antes de publicar ou trocar a marca definitiva.

**Saída:** `docs/VISUAL_QA_TSIM.md`, revisão de exportações, impressão/PDF, shell offline e acessibilidade de navegação.

## Registro de aprovação

O responsável aprovou em 06/10/2026:

- **Pacote final da marca:** logo principal, símbolo, favicon, variantes de fundo claro/escuro e assinaturas verticais.
- **Texto de login/onboarding:** nome do ambiente, assinatura e tom da primeira experiência.
- **Publicação institucional:** conteúdo, mockup e chamada para o simulador.

Os arquivos canônicos em `public/brand/` e a página `Apresentação` passam a ser a referência visual
aprovada do MVP.

## Critérios de conclusão

- A logo continua legível e reconhecível em todos os tamanhos previstos.
- A navegação operacional não perde contexto ao alternar entre claro e escuro.
- Login e onboarding não afirmam capacidades ainda inexistentes.
- O mockup é claramente uma representação visual e não uma fonte de dados.
- O build passa sem erro e as regras de cálculo permanecem inalteradas.
