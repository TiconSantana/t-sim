# Dashboard executivo — Visão geral

## Objetivo

Dar à administração uma leitura única de pessoas, orçamento de referência, cobertura
operacional e decisões salvas antes de abrir um cenário específico.

## Decisões apoiadas

- Identificar se a base de headcount está pronta para análise.
- Verificar cobertura atual contra a meta operacional configurada.
- Localizar cenários com saldo positivo, pendentes ou já aprovados.
- Priorizar a próxima ação entre base de pessoas, operação, simulador e pareceres.

## Público

Conta administrativa do T-Sim. Usuários comuns continuam na tela de Planilhas da conta e
não recebem os indicadores administrativos.

## Dados, unidades e fontes

| Bloco | Dados | Unidade | Fonte |
| --- | --- | --- | --- |
| Pessoas | Pessoas ativas e total importado | HC / pessoas | Headcount da conta |
| Orçamento | Custos por contexto e custo calculado da base ativa | R$ / mês | Planilha operacional da conta ou cargos/encargos da referência administrativa aplicados ao headcount da conta |
| Cobertura | HC atual, requerido e meta | HC / % | Configuração de Operação |
| Decisões | Cenários, saldo e aprovação | R$ / mês / estado | Cenários e aprovações da conta |
| Cargos | Salário base + encargos | R$ / cargo / mês | Referência salarial versionada |

## Estados da tela

- **Base carregada:** barras e distribuição por cargo usam somente pessoas ativas da conta; o custo é calculado com a referência salarial administrativa quando não há custos operacionais importados.
- **Base vazia:** o painel orienta importar o headcount e não fabrica distribuição.
- **Cobertura em atenção:** a meta aparece junto ao valor atual e aponta a tela Operação. Sem headcount requerido configurado, a cobertura fica pendente em vez de assumir 100%.
- **Sem cenários:** o painel orienta abrir o Simulador.
- **Dados incompletos:** a nota de rodapé informa que as referências permanecem separadas.

## Responsividade e acessibilidade

- Grade com uma coluna em telas estreitas e tabela de cenários refluída para leitura vertical.
- Indicadores com `aria-label` e explicação acionável por foco, hover e clique.
- Barras acompanhadas por valores textuais; não dependem somente de cor.
- Ações prioritárias usam botões com rótulo de destino e foco visível.

## Limitações

- O custo operacional importado continua separado da simulação simplificada de cargos; na ausência dele, o painel calcula somente o custo dos colaboradores ativos com cargos e encargos administrativos.
- As referências históricas de 672 HC e 609 HC não são aplicadas automaticamente. Cada conta mantém sua própria HEADCOUNT BASE OPERACIONAL ATUAL.
- ROI, retenção, produtividade e payback são estimativas até existir histórico validado.
- A distribuição por cargo depende da importação de headcount e considera somente status ativo.
