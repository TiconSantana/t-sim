# Prompt matriz para criar o T-Sim com o Codex

Copie o bloco abaixo como a mensagem inicial de um novo trabalho de implementação. O arquivo `docs/T-SIM_BLUEPRINT.md` deve permanecer como contrato funcional do projeto.

```text
Você é o agente principal responsável por construir o T-Sim, uma plataforma SaaS B2B de simulação inteligente de gestão de pessoas, orçamento e operação.

CONTEXTO DO PRODUTO
- Nome: T-Sim.
- Assinatura: “Simular antes. Decidir melhor.”
- Módulos: T-Sim People, Budget, Ops, Analytics e AI.
- Usuários: RH, Controladoria, gestores de Operações e Diretoria.
- Objetivo: transformar dados de cargos, salários, encargos, custos operacionais e headcount em cenários comparáveis e decisões auditáveis.
- Fontes de referência: planilhas de cargos/promoções, simulador de técnicos, planilha de custos e preços e dashboard HTML fornecidos no workspace.

ORDEM DE AUTORIDADE
1. Requisitos do usuário e dados das fontes.
2. docs/T-SIM_BLUEPRINT.md.
3. AGENTS.md do projeto.
4. Convenções da stack detectada.
5. Decisões de implementação justificadas no ADR.

REGRA DE EXECUÇÃO
1. Inspecione o repositório antes de criar arquivos.
2. Se faltar uma decisão técnica, escolha a opção simples e documente a decisão; não bloqueie o trabalho por preferência estética.
3. Faça um plano executável por fase e mantenha o plano atualizado.
4. Implemente primeiro o domínio de cálculo e os schemas; depois telas e integrações.
5. Não coloque regras financeiras em componentes visuais.
6. Não hardcode cargos, salários ou percentuais no frontend. Use banco, seed e configuração versionada.
7. Entregue código funcional por fatias verticais, mantendo o app executável após cada fase.

STACK PADRÃO SE NÃO HOUVER UMA EXISTENTE
- Next.js App Router + TypeScript.
- PostgreSQL com ORM e migrações.
- Schema de validação compartilhado.
- Motor de cálculo puro e testável.
- Componentes próprios acessíveis em HTML/CSS/SVG.
- Testes unitários, integração e fluxo crítico.

REGRAS DE NEGÓCIO DO MVP
- custo_encargos = salario_base × percentual_encargos.
- custo_empresa_mensal = salario_base + custo_encargos.
- custo_empresa_anual = custo_empresa_mensal × meses_do_periodo.
- delta_promocao_mensal = custo_destino_mensal − custo_origem_mensal.
- economia_desligamento_mensal = custo_cargo_desligado_mensal × quantidade.
- promocoes_financiaveis = floor(economia_desligamento_mensal / delta_promocao_mensal), limitada por elegibilidade e capacidade.
- custo_promocoes_mensal = quantidade_promocoes × delta_promocao_mensal.
- saldo_mensal = economia_desligamento_mensal − custo_promocoes_mensal.
- receita_equivalente = impacto / margem_lucro, apenas quando a margem tiver fonte válida.
- ROI, retenção, turnover, produtividade e payback são ESTIMATIVAS até existir histórico suficiente.
- Se o delta for zero ou negativo, mostrar “sem custo adicional” e limitar pela operação; nunca mostrar infinito.
- Precisão interna decimal; arredondamento apenas na apresentação.

BASE SEED INICIAL
Criar uma versão de dados com os seis cargos das fontes: Auxiliar de Fibra Óptica; Técnico de Fibra Óptica II; Técnico de Fibra Óptica N/3; Técnico de Fibra Óptica N/4; Técnico de Fibra Óptica V; Técnico de Fibra Óptica VI. Os salários e o encargo de referência devem ficar em seed versionado, com origem e vigência.

FLUXOS OBRIGATÓRIOS
1. Dashboard executivo: folha atual/projetada, economia, promoções, saldo, headcount, cobertura e risco.
2. People: cargos, salários, componentes de custo, posições, elegibilidade e importação.
3. Simulador: desligamento/vaga, cargo origem, destino, quantidade, delta, saldo e impacto operacional.
   - Mostrar a quantidade automática financiável sempre.
   - Permitir quantidade manual menor, igual ou maior.
   - Comparar automático × manual com custo incremental, saldo mensal/anual e diferença.
   - Alertar quando o ajuste manual gerar saldo negativo, sem ocultar o cálculo automático.
4. Cenários: Conservador, Equilibrado e Agressivo como presets editáveis; comparação de até três cenários; waterfall e sensibilidade.
5. Ops: equipe, região, turno, atividade, capacidade e SLA.
6. Analytics: matriz custo × impacto × risco, ranking e parecer curto.
7. Aprovação: premissas, fontes, versão, responsável, decisão e auditoria.

MODELO DE DADOS MÍNIMO
organizations, users, memberships, roles, cost_centers, job_levels, jobs, job_cost_components, people_positions, assumptions, scenarios, scenario_inputs, scenario_results, scenario_movements, operational_requirements, approvals, audit_events, imports e import_rows.

APLICAÇÃO DO T-VISION TELECOM LAB
- Para cada tela declare objetivo e decisão de campo, público, dados/unidades/fontes, composição/hierarquia, componentes e estados, desktop/tablet/mobile/PDF, revisão técnica, ativos e limitações.
- Preserve reconhecimento técnico, materialidade, proporções e contexto operacional.
- Use composição de infográfico técnico, engineering notebook ou diagrama científico somente quando isso ensina uma relação.
- Texto, medidas, unidades e callouts devem ficar em HTML/CSS/SVG editável e acessível.
- Use azul e laranja TConnect e tokens semânticos para financeiro, atenção e risco.
- Referências travam estrutura e silhueta, nunca cores.
- Sem evidência, marque a representação como genérica e mantenha a conclusão em rascunho.
- Não use minimalismo genérico, ícone clip-art, card vazio ou decoração sem função.
- Toda métrica mostra fórmula, unidade, período, arredondamento, origem e se é informada, calculada ou estimada.

QUALIDADE E SEGURANÇA
- Validar entradas e mensagens de erro de forma explícita.
- Bloquear aprovação/exportação quando existir premissa sem fonte, erro de cálculo ou cobertura insuficiente sem justificativa.
- Registrar alterações críticas e versão aprovada.
- Não expor dados de uma organização para outra.
- Gráficos devem ter alternativa textual, contraste, foco por teclado e unidades visíveis.

MODO DE ENTREGA
Fase 0: inspeção e fundação.
Fase 1: domínio, schemas, migrações e seed.
Fase 2: People e simulador vertical.
Fase 3: Budget e cenários.
Fase 4: Ops e custos operacionais.
Fase 5: Analytics, aprovação, auditoria e exportação.
Fase 6: AI, hardening e documentação.

Ao concluir cada fase:
- liste arquivos criados/alterados;
- explique a regra de negócio entregue;
- registre riscos e lacunas de dados;
- execute a verificação proporcional ao que foi alterado;
- mantenha o projeto executável;
- não declare números como exatos quando forem estimativas.

Comece agora pela inspeção do repositório, leitura do blueprint e proposta do plano da Fase 0. Não implemente a fase seguinte até que a fase atual esteja coerente, executável e documentada.
```

## Comandos de continuação

Use estas mensagens após a primeira execução:

### Fase 0

```text
Execute a Fase 0 do blueprint. Inspecione o repositório, defina a arquitetura, crie a fundação, os tokens visuais, o ADR inicial e o checklist de dados. Não invente integrações que não estejam disponíveis.
```

### Domínio e seed

```text
Implemente o domínio de cálculo do T-Sim com schemas, testes e seed dos seis cargos de fibra óptica. Reproduza os resultados de referência das planilhas, documente o arredondamento e classifique cada saída como informada, calculada ou estimada.
```

### Simulador vertical

```text
Implemente o fluxo completo People → Simulador → Resultado. Inclua validações, estados vazios/erro/alerta, fórmula visível, impacto financeiro, cobertura operacional e trilha de premissas.
```

### Cenários e dashboard

```text
Implemente comparação de até três cenários, waterfall, matriz custo × impacto × risco e dashboard executivo. Preserve densidade técnica e acessibilidade em desktop, tablet, mobile e exportação.
```

### Auditoria e aceite

```text
Faça uma revisão de aceite do T-Sim: regras de negócio, rastreabilidade de premissas, isolamento multiempresa, acessibilidade, estados de interface, exportação e coerência entre valores do motor e os valores exibidos.
```
