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
| Orçamento | Custos operacionais por contexto | R$ / mês | `operationalCosts` ou importação do perfil |
| Cobertura | HC atual, requerido e meta | HC / % | Configuração de Operação |
| Decisões | Cenários, saldo e aprovação | R$ / mês / estado | Cenários e aprovações da conta |
| Cargos | Salário base + encargos | R$ / cargo / mês | Referência salarial versionada |

## Estados da tela

- **Base carregada:** barras e distribuição por cargo usam somente pessoas ativas.
- **Base vazia:** o painel orienta importar o headcount e não fabrica distribuição.
- **Cobertura em atenção:** a meta aparece junto ao valor atual e aponta a tela Operação.
- **Sem cenários:** o painel orienta abrir o Simulador.
- **Dados incompletos:** a nota de rodapé informa que as referências permanecem separadas.

## Responsividade e acessibilidade

- Grade com uma coluna em telas estreitas e tabela de cenários refluída para leitura vertical.
- Indicadores com `aria-label` e explicação acionável por foco, hover e clique.
- Barras acompanhadas por valores textuais; não dependem somente de cor.
- Ações prioritárias usam botões com rótulo de destino e foco visível.

## Limitações

- O custo operacional continua separado da simulação simplificada de cargos.
- ROI, retenção, produtividade e payback são estimativas até existir histórico validado.
- A distribuição por cargo depende da importação de headcount e considera somente status ativo.
