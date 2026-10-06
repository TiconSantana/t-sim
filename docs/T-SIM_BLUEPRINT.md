# T-Sim — Blueprint do produto

**Nome:** T-Sim  
**Descrição:** Simulador Inteligente de Gestão de Pessoas  
**Assinatura:** *Simular antes. Decidir melhor.*  
**Plataforma:** T-Sim  
**Módulos:** People, Budget, Ops, Analytics e AI

## 1. Objetivo do produto

Permitir que RH, Controladoria, Operações e Diretoria simulem movimentações de cargos e equipes, comparem cenários financeiros e operacionais e registrem uma decisão auditável.

O produto deve responder, para cada cenário:

1. Qual é a estrutura atual de cargos, headcount e custo?
2. Qual é o custo mensal e anual de cada cargo, incluindo encargos e benefícios configurados?
3. Quanto uma demissão, vaga ou substituição libera ou consome?
4. Quantas promoções a economia consegue financiar?
5. Qual é o saldo, a cobertura operacional e o risco após a movimentação?
6. Quais premissas são informadas, calculadas ou estimadas?
7. Qual recomendação pode ser submetida à aprovação?

## 2. Fontes consolidadas

| Fonte | Conteúdo aproveitado | Destino no app |
|---|---|---|
| `Analise_Gerencial_Cargos_Promocoes(1).xlsx` | Estrutura de cargos, simulador desligamento × promoção, cenários, dashboard e matriz de pares | People, Budget e Analytics |
| `Analise_Gerencial_Cargos_Promocoes_v2.xlsx` | Versão expandida com margem média de lucro e receita equivalente | Budget e indicadores financeiros |
| `Ferramenta_Planejamento_Promocoes.xlsx` | Cadastro de cargos, simulador de desligamentos, simulador de promoções e capacidade de absorção | Fluxos de entrada e planejamento |
| `Simulador_Promocoes_Tecnicos(1).xlsx` | Pares cargo origem → cargo destino e quantidade possível | Motor de simulação |
| `Cópia de Custos e Preço V3 ABR_2025_Encergos atualizados.xlsx` | Custos de campo, sala técnica, unitários, controle local, equipes, encargos, ADM, BDI e receita | Budget, Ops e cost allocation |
| `dashboard_gerencial_cargos_promocoes(2).html` | Fluxo visual atual, cards, abas de cenários, ranking, parecer e gráfico de custo | Referência de comportamento e conteúdo |

### Dados de referência do MVP

Os seis níveis de fibra óptica presentes nas fontes devem entrar como dados seed versionados, nunca como constantes no frontend:

| Nível | Cargo | Salário base de referência |
|---|---|---:|
| I | Auxiliar de Fibra Óptica | R$ 1.621,00 |
| II | Técnico de Fibra Óptica II | R$ 2.017,19 |
| III | Técnico de Fibra Óptica N/3 | R$ 2.410,94 |
| IV | Técnico de Fibra Óptica N/4 | R$ 2.634,70 |
| V | Técnico de Fibra Óptica V | R$ 3.028,25 |
| VI | Técnico de Fibra Óptica VI | R$ 3.214,85 |

Premissa de referência nas planilhas: **encargos de 113%**, resultando em custo empresa igual a `salário base × 2,13`. Essa premissa deve ter fonte, vigência, responsável e versão.

### Premissas por contexto encontradas nas fontes

Esses valores entram como configurações versionadas, não como uma regra global única:

| Contexto | Encargos observado | Outros componentes observados |
|---|---:|---|
| Grade de cargos e promoções | 113% | Horizonte de 12 meses |
| Campo / V.TAL 2025 | 128% | ADM de 10%, BDI de 35%, benefícios, veículo, combustível, EPI e ferramentas |
| Unitário / V.TAL 2024 | 98% | ADM de 10%, BDI de 35%, benefícios, veículo, combustível, EPI e ferramentas |
| Sala técnica | 128% | Rateio por headcount e área: manutenção, engenharia e projetos |
| Controle local FTTH | 128% | Estrutura por supervisor, coordenador, gerente, equipe de campo e headcount |
| Análise gerencial v2 | 113% | Margem média de lucro de 15% para receita equivalente |

O cadastro deve permitir múltiplos componentes por contexto, unidade de medida, periodicidade e método de rateio. O usuário precisa conseguir comparar uma simulação simplificada de cargo com uma simulação completa de custo operacional sem misturar as duas bases silenciosamente.

## 3. Módulos e escopo funcional

### T-Sim People

- Cadastro de cargos, níveis, faixas salariais, competências e pré-requisitos.
- Cadastro de colaboradores ou posições, lotação, centro de custo e status.
- Histórico de movimentações: promoção, desligamento, contratação, transferência e congelamento.
- Grade salarial com identificação de compressão entre níveis.
- Edição de salário base e encargos com recálculo imediato do custo empresa; no MVP local, salvar a configuração no navegador e exibir a origem da premissa.
- Importação de planilha com pré-visualização, validação e relatório de erros.

### T-Sim Budget

- Configuração de encargos, benefícios, custos recorrentes, custos rateados, ADM, BDI e margem.
- Simulação de desligamentos, vagas abertas, substituições e promoções.
- Mostrar a quantidade de promoções financiáveis automaticamente e permitir ajuste manual para menos, igual ou mais; comparar quantidade, custo, saldo mensal/anual e diferença entre automático e manual.
- Cálculo mensal, anualizado e por horizonte customizado.
- Comparação entre folha atual, folha projetada e delta do cenário.
- Receita equivalente para compensar o impacto, quando uma margem de lucro válida estiver configurada.

### T-Sim Ops

- Dimensionamento de equipes por classe, função, região, turno e atividade.
- Relação cargo → atividade → capacidade → cobertura operacional.
- Cobertura de SLA, headcount de campo, sala técnica e controle local.
- Impacto de uma movimentação na capacidade, supervisão e risco operacional.
- Dados provenientes das abas `Campo`, `Sala Ténica`, `Unitário`, `Controle Local` e `Custos Equipes`.

### T-Sim Analytics

- Dashboard executivo com visão financeira, pessoas e operação.
- Cenários Conservador, Equilibrado e Agressivo como presets editáveis.
- Matriz custo × impacto × risco.
- Waterfall da folha atual → desligamentos → promoções → encargos → folha projetada.
- Ranking de movimentos por retorno financeiro, retenção, produtividade e equilíbrio.
- Parecer executivo curto, rastreável às premissas.

### T-Sim AI

- Explicação textual dos resultados.
- Sugestão de cenários e perguntas de validação.
- Geração de resumo para aprovação.
- Nunca inventar valores, fontes, histórico, risco ou ROI. Quando faltar dado, declarar a lacuna e bloquear a recomendação final.

## 4. Motor de cálculo

Todos os cálculos devem viver em um domínio testável no backend ou em pacote compartilhado, com entradas e saídas tipadas.

### Fórmulas do MVP

```text
custo_encargos = salario_base × percentual_encargos
custo_empresa_mensal = salario_base + custo_encargos
custo_empresa_anual = custo_empresa_mensal × meses_do_periodo
delta_promocao_mensal = custo_destino_mensal − custo_origem_mensal
economia_desligamento_mensal = custo_cargo_desligado_mensal × quantidade
promocoes_financiaveis = floor(economia_desligamento_mensal / delta_promocao_mensal)
custo_promocoes_mensal = quantidade_promocoes × delta_promocao_mensal
saldo_mensal = economia_desligamento_mensal − custo_promocoes_mensal
saldo_anual = saldo_mensal × meses_do_periodo
receita_equivalente_mensal = impacto_mensal / margem_lucro
receita_equivalente_anual = impacto_anual / margem_lucro
roi_retencao_estimado = (multiplicador_substituicao × salario_base_origem) / delta_promocao_mensal
```

### Regras de segurança do cálculo

- Se `delta_promocao_mensal <= 0`, mostrar “sem custo adicional” e limitar a quantidade pela elegibilidade e pela capacidade operacional; não exibir infinito.
- Não permitir promoção para nível inferior sem uma regra explícita de exceção.
- Não permitir aprovação/exportação quando existir premissa sem fonte ou cenário com erro de validação.
- Manter precisão interna decimal; arredondar somente na apresentação.
- Toda métrica deve mostrar fórmula, unidade, período, arredondamento, origem e classificação: **informada**, **calculada** ou **estimada**.
- ROI, retenção, redução de turnover, ganho de produtividade e payback são estimativas até haver histórico suficiente da empresa.

## 5. Modelo de dados inicial

Entidades mínimas:

- `organizations`: empresa, moeda, timezone, período fiscal.
- `users`, `memberships`, `roles`: acesso, perfil e aprovação.
- `cost_centers`: centro de custo, área, região, operação.
- `job_levels`: nível, nome, ordem, pré-requisitos, status.
- `jobs`: cargo, nível, família, salário base, vigência.
- `job_cost_components`: encargos, benefícios, EPI, veículo, combustível, celular, material, ADM, BDI e rateios.
- `people_positions`: posição, colaborador opcional, cargo, centro de custo, localidade, status.
- `assumptions`: nome, valor, unidade, fonte, vigência, versão, responsável e classificação.
- `scenarios`: nome, tipo, horizonte, status, autor, versão e descrição.
- `scenario_inputs`: desligamentos, admissões, promoções, movimentações e restrições.
- `scenario_results`: custos, deltas, saldos, headcount, cobertura, risco e indicadores.
- `scenario_movements`: origem, destino, quantidade, motivo e elegibilidade.
- `operational_requirements`: atividade, região, turno, capacidade, SLA e headcount requerido.
- `approvals`: decisão, aprovador, data, comentário e versão aprovada.
- `audit_events`: ação, entidade, antes, depois, usuário e timestamp.
- `imports` e `import_rows`: arquivo, aba, mapeamento, validações e erros.

## 6. Arquitetura técnica recomendada

Se o repositório não trouxer uma decisão anterior, iniciar com:

- Next.js App Router + TypeScript.
- PostgreSQL com ORM tipado e migrações versionadas.
- Validação de payloads com schema compartilhado.
- Motor de cálculo em pacote de domínio puro, sem dependência de UI.
- Autenticação multiempresa e controle de permissões.
- Componentes próprios em HTML/CSS/SVG acessíveis; evitar biblioteca de componentes que imponha estética genérica.
- Gráficos com alternativa textual e dados exportáveis.
- Testes unitários do motor e testes de fluxo para simulação e aprovação.
- Exportação de cenário em PDF e planilha.

### Estrutura de pastas

```text
src/
  app/
    (auth)/
    (workspace)/
      dashboard/
      people/
      budget/
      ops/
      analytics/
      settings/
      scenarios/[scenarioId]/
  components/
    ui/
    charts/
    data-state/
    scenario/
  domain/
    calculations/
    assumptions/
    scenarios/
    approvals/
  lib/
    auth/
    db/
    imports/
    exports/
  styles/
  types/
db/
  migrations/
  seed/
docs/
  T-SIM_BLUEPRINT.md
  T-SIM_CODEX_MASTER_PROMPT.md
tests/
  unit/
  integration/
  e2e/
```

## 7. Telas e decisões

### Dashboard executivo

- **Decisão:** aprovar, editar ou rejeitar o cenário recomendado.
- KPIs: folha atual/projetada, economia, custo de promoções, saldo, headcount, cobertura e risco.
- Cada KPI deve abrir a fórmula e as premissas.

### Base People

- **Decisão:** confirmar a base de cargos, salários, posições e elegibilidade.
- Tabela densa, filtros, edição em linha, importação e histórico.

### Simulador

- **Decisão:** escolher movimentação e entender o impacto.
- Workspace antes/depois com desligado, origem, destino, quantidade, custo, delta, saldo, elegibilidade e cobertura.
- O resultado automático permanece visível como referência. O ajuste manual deve permitir reduzir ou ampliar a quantidade, recalcular o saldo e indicar quando a escolha manual ultrapassa a verba disponível.

### Cenários

- **Decisão:** comparar até três alternativas.
- Colunas lado a lado no desktop; abas no tablet/mobile; waterfall, sensibilidade e copiar cenário.

### Ops

- **Decisão:** verificar se a economia compromete SLA e capacidade.
- Mostrar impacto por equipe, região, atividade, turno e centro de custo.

### Parecer e aprovação

- **Decisão:** registrar aprovação com evidência.
- Resumo curto, premissas, fontes, alertas, responsável, versão e trilha de auditoria.

## 8. Direção visual obrigatória

Aplicar T-Vision Telecom Lab em toda tela, conteúdo e visualização:

- Visual detalhado de laboratório técnico, com azul e laranja TConnect e tokens semânticos para financeiro, atenção e risco.
- Não usar minimalismo genérico, cards vazios, clip-art, equipamento fictício ou holografia decorativa.
- Preferir infográfico técnico, engineering notebook e diagramas editáveis quando explicarem relações reais.
- Referências visuais travam estrutura, silhueta, proporção, portas, controles e disposição; nunca copiar cores das referências.
- Texto, unidades e callouts ficam em HTML/CSS/SVG acessível.
- Cada tela deve documentar objetivo, público, dados/unidades/fontes, hierarquia, estados, desktop/tablet/mobile/PDF, revisão técnica, ativos e limitações.
- Estados obrigatórios: vazio, carregando, erro, alerta de inconsistência, dado estimado, dado calculado e dado informado.

## 9. Roadmap de entrega

### Fase 0 — Fundação

- Criar projeto, autenticação opcional, organização, banco, migrações, tokens e seed dos seis cargos.
- Critério: usuário consegue acessar um workspace vazio e importar a base seed.

### Fase 1 — People + motor

- Cadastro de cargos, componentes de custo, posições e premissas.
- Editor inicial de salários e encargos com persistência local. O workspace compartilhado do Tconnect é opcional e pode ser ativado em Configurações.
- Implementar e testar o motor de custo, delta, economia, promoções e saldo.
- Critério: reproduzir os resultados de referência do cenário Auxiliar → Técnico II com arredondamento documentado.

### Fase 2 — Budget + cenários

- Simulador, três presets editáveis, comparação, matriz e waterfall.
- Critério: simular múltiplos desligamentos, promoções e horizontes sem alterar a base.

### Fase 3 — Ops

- Importar custos de equipes e estruturas operacionais; incluir cobertura e SLA.
- Critério: toda recomendação mostra impacto financeiro e operacional.

### Fase 4 — Analytics + aprovação

- Dashboard, ranking, parecer, aprovação, exportação e auditoria.
- Critério: aprovação só ocorre com premissas rastreáveis e versão congelada.

### Fase 5 — AI e hardening

- Explicações, perguntas de validação, observabilidade, permissões avançadas e performance.
- Critério: IA nunca fabrica dados e sempre aponta a origem dos números.

## 10. Aceite do MVP

- Usuário cria um cenário em menos de cinco minutos.
- Resultado numérico reproduz a base de referência, com regras visíveis.
- Mudança no encargo atualiza todos os resultados dependentes.
- Promoção sem elegibilidade ou com cobertura insuficiente gera alerta e exige justificativa.
- Cenários são versionados, comparáveis e auditáveis.
- Dashboard é acessível por teclado, tem alternativa textual para gráficos e funciona em desktop, tablet e mobile.
- Exportação contém resumo, fórmula, premissas, fonte, período e data de geração.

## 11. Status da implementação local

O protótipo executável atual cobre as fatias locais de People, Simulador, Cenários, Visão Geral,
Ops e Pareceres:

- a grade dos seis cargos e os encargos podem ser editados, restaurados e importados de `.xlsx`, `.xls` ou `.csv`;
- a quantidade automática financiável permanece visível junto do ajuste manual, com comparação e saldo mensal/anual;
- cenários são salvos e reabertos no navegador, com snapshot de salários e encargos;
- a Visão Geral consolida a estrutura e os cenários salvos;
- Ops permite editar headcount, requisito, SLA e margem de segurança, calculando cobertura e risco projetado;
- Pareceres registra os estados Rascunho, Enviado e Aprovado e exporta um resumo JSON local.
- Budget apresenta waterfall da folha e separa as premissas de encargos, ADM, BDI e margem.
- Analytics apresenta os custos de Campo, Sala Técnica e classes de equipe extraídos da fonte operacional.
- Analytics e Ops usam 672 HC da aba Custos Equipes como base operacional oficial. Os 609 HC do Controle Local permanecem visíveis apenas como referência comparativa, sem soma automática.
- Ops permite dimensionar linhas por região, turno e atividade, com capacidade por HC, cobertura projetada, fonte, vigência e bloqueio explícito quando o rateio necessário não foi informado.
- T-Sim AI apresenta um parecer local baseado em regras, perguntas de validação e classificação explícita como estimativa.
- Pareceres oferece impressão/PDF pelo navegador, além de JSON e Excel; Configurações oferece backup e restauração do workspace em JSON.
- Configurações permite recuperar a grade e limpar os dados locais do ambiente demonstrativo.
- O shell web inclui manifesto PWA, ícone instalável, service worker com fallback offline e configuração de rewrite para hospedagem estática.
- O deploy público está conectado ao GitHub `TiconSantana/t-sim` e à Vercel `t-sim`.
- O modo local continua disponível: o navegador guarda o workspace em `localStorage` e a tela Configurações permite exportar ou restaurar um backup JSON. Quando o usuário opta pelo modo compartilhado, o T-Sim grava o payload no Supabase Tconnect.
- O workspace compartilhado permite criar/carregar o payload, listar membros, atribuir papel de visualizador, revisor ou editor e revogar acessos não proprietários.

O deploy público serve a mesma aplicação em `https://t-sim.vercel.app`. O modo local abre sem login. O modo compartilhado opcional usa `tsim_workspace`, `tsim_workspace_member` e `tsim_audit_event` no Supabase Tconnect, com RLS por empresa e papel (`owner`, `editor`, `reviewer`, `viewer`). A auditoria registra autor, operação, versão e payload anterior/novo; a chave `service_role` nunca é enviada ao navegador. Após a confirmação do e-mail, a vinculação da conta ao colaborador ativo é automática quando o e-mail é único.
