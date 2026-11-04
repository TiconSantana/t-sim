# T-Sim · Escala de plantão

## Objetivo e decisão

O módulo transforma a escala de campo e o banco de horas em uma proposta revisável para um ciclo de 16 a 15. A decisão apoiada é confirmar a cobertura diária e escolher quais saldos negativos precisam de trabalho em expediente para recuperação.

Público: Operações, GA e responsável pela aprovação da escala.

## Fontes e vigência

- `ESCALA_CAMPO_T_SA_FBH_DSR_16_10_26_A_15_11_26.xlsx`, aba `ESCALA CAMPO`: status diários, matrícula, dupla, carro, equipe, função e contato. O intervalo efetivo do ciclo é 16/10/2026 a 15/11/2026; a coluna 16/11 é ignorada.
- `BH_Oct_2026_Filtrado.xlsx`, aba `Banco_Horas`: saldo inicial, saldo atual (J), saldo BH total acumulado (K), redução, falta reduzir (M) e progresso.
- As sementes usadas no protótipo ficam em `src/data/escalaSeed.js` e `src/data/bancoHorasSeed.js`, com o nome do arquivo e a data de importação preservados.

## Regras implementadas

- O trecho anterior à data de geração permanece igual ao arquivo importado. O padrão inicial é gerar a partir de 02/11/2026.
- Um grupo de Fusão fica em `SA` por dia, seguindo a rotação base A→B→C. A rotação começa no grupo seguinte ao último grupo identificado em `SA` no trecho preservado e pode se adaptar em um dia para proteger o limite de seis dias consecutivos.
- Equipe L mantém duas duplas em `SA` por dia, preferindo duplas disponíveis quando existe férias.
- Nenhum colaborador pode receber `SA` em dois dias consecutivos. A geração evita repetir o sobreaviso do dia anterior e a validação bloqueia a exportação se a regra for violada.
- O status é aplicado à dupla inteira. O colaborador com carro é tratado como líder da dupla.
- `DSR` usa a quantidade de domingos e feriados do ciclo como meta padrão; a meta pode ser editada na tela e não ultrapassa seis dias consecutivos de trabalho.
- O campo de feriados aceita várias datas no mesmo ciclo. Cada data adicionada entra no cálculo de DSR e recebe destaque na grade e no Excel; feriados não são confundidos com o intervalo de geração.
- `FBH` representa 7h20 e só é alocado depois que a meta DSR do colaborador foi atingida. Se faltar DSR, a oportunidade de FBH é convertida em DSR.
- A negativação usa a coluna K (`Saldo BH Total (Acumulado)`). A coluna M (`Falta Reduzir (HR)`) orienta a recuperação no expediente e a priorização de T.
- A primeira carga preserva o histórico já ocorrido até a data escolhida; isso é específico do ciclo 16/10/2026→15/11/2026 e não vira regra fixa para futuras escalas.
- A janela de elaboração tem início e fim editáveis e pode atravessar três, quatro ou mais ciclos; cada ciclo continua organizado do dia 16 ao dia 15 seguinte.
- A rotação de SA mantém continuidade entre ciclos: se o último dia terminar com C, o próximo dia começa com A.
- A tela permite editar equipe A/B/C, dupla, carro agregado e períodos de férias. A exportação destaca dias de fim de semana/feriados, grupos, férias, dia abreviado e saldos K/M.
- A aba `ESCALA CAMPO` mantém as colunas `EQUIPE`, `CARRO`, `FUNÇÃO`, `MATRICULA`, `DUPLADO`, `NOME DO COLABORADOR` e `CONTATO`, aplica preenchimento ciano para A, amarelo para B, verde para C e usa bordas em toda a grade.
- A validação bloqueante apresenta uma recomendação por erro, permite escolher o status de correção e aplicar o ajuste com revalidação imediata. O painel de Banco de horas permite importar a base e exportar a aba `BANCO_ALERTAS` para alimentar a próxima programação.
- Correções aceitas são mantidas no estado atual ao salvar; o botão não reconstrói a escala por cima de uma correção aprovada. `DSR` e `FBH` reiniciam a contagem de dias consecutivos, enquanto `T` e `SA` continuam contando como trabalho.
- O botão `Salvar configurações` grava a base atual no armazenamento local e gera imediatamente o Excel usando a janela escolhida, com nome `T-SIM_ESCALA_AAAA-MM-DD_A_AAAA-MM-DD.xlsx`. A aba `VALIDACAO` registra a janela, feriados, meta DSR e os horários de importação.
- Sem uma nova planilha importada, a tela reutiliza a última base armazenada. Ao importar escala ou banco, a base local é substituída e a data/hora da última importação fica visível no rodapé da configuração e no Excel.
- Fins de semana e feriados têm validação de cobertura de grupo e de duas duplas L.
- Alertas de saldo são classificados por premissa versionada: alerta abaixo de 0h, crítico até -20h e extremo crítico até -40h. Os limiares ficam registrados no domínio e precisam de confirmação operacional antes de virar política da empresa.

## Estados e bloqueios

A tela apresenta vazio, erro de importação, fonte carregada, escala gerada, aviso de DSR, alerta de saldo e validação bloqueante. Erros de dupla, excesso de trabalho consecutivo, grupo de SA duplicado e Equipe L abaixo de duas duplas aparecem na aba `VALIDACAO` da exportação. A exportação é desabilitada enquanto houver erro estrutural.

## Limitações conhecidas

O gerador é uma proposta determinística para revisão humana. Não substitui conferência de acordo coletivo, férias, feriados oficiais ou alterações de última hora. O crédito de combustível continua disponível na exportação operacional, mas a pré-lista foi retirada da tela principal para manter o foco da revisão da escala.
