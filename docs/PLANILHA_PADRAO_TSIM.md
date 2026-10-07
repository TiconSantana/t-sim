# Planilha padrão de alimentação do T-Sim

Arquivo para download: [`public/templates/tsim-planilha-padrao.xlsx`](../public/templates/tsim-planilha-padrao.xlsx)

## Fluxo do usuário

1. Baixe a planilha padrão em **Configurações**, **Base de pessoas** ou **Operação**.
2. Substitua os exemplos pelos dados do ambiente do próprio usuário.
3. Preencha a fonte, a vigência e o responsável em cada premissa usada.
4. Use **Configurações → Importar planilha completa** para carregar Cargos, Pessoas, Premissas, Operação e Cenários de uma vez.
5. Ou importe somente a aba Cargos em **Base de pessoas** e a aba Operação em **Dimensionamento por contexto**.
6. Revise os alertas de cobertura e salve as premissas localmente.
7. Se o mesmo navegador for usado por mais de uma pessoa, crie um **perfil local** separado em Configurações antes de importar.

## Abas e colunas

| Aba | Uso | Colunas principais |
|---|---|---|
| Cargos | Grade salarial usada pelo motor | Cargo, Nível, Salário base, Encargos (%), Fonte, Vigência, Responsável, Observação |
| Operação | Cobertura por região, turno e atividade | Região, Turno, Atividade, Classe de equipe, HC atual, HC requerido, Capacidade por HC, SLA alvo (%), Margem segurança (%), Fonte, Vigência, Responsável, Observação |
| Pessoas | Cadastro local exibido em Cargos e pessoas | Nome, Matrícula, E-mail, Cargo, Nível, Região, Turno, Atividade, Status, Data admissão, Salário base, Observação |
| Premissas | Parâmetros rastreáveis aplicados ao ambiente | Parâmetro, Valor, Unidade, Fonte, Vigência, Responsável, Observação |
| Cenários | Registro local de simulações reabríveis | Nome do cenário, Data, cargos, quantidades, promoções automáticas e manuais, saldo e status |
| Leia-me | Instruções de preenchimento e privacidade | Fluxo, unidades, validações e limitações |

## Regras de importação

- A importação de cargos usa a primeira aba da planilha, identifica a coluna **Salário base** (ou **Remuneração**) e associa o cargo pelo texto da primeira coluna. A aba **Cargos** da planilha padrão já vem com o formato completo e seis linhas de referência.
- A importação de dimensões procura uma aba operacional e reconhece Região, Turno, Atividade, HC atual, HC requerido, Capacidade por HC, SLA, Margem de segurança, Fonte e Vigência. Linhas incompletas com headcount são preservadas para correção; linhas sem valores de HC são ignoradas e contabilizadas no retorno.
- Para trazer um rateio manual do movimento simulado, inclua a coluna opcional **Movimento alocado** (ou **HC movimento**) na aba Operação. Na tela Operação, o usuário também pode editar manualmente a quantidade por dimensão; o total precisa corresponder à quantidade selecionada no simulador.
- A importação completa também grava Pessoas, Premissas e Cenários no perfil local selecionado; os custos e bases de headcount operacionais importados passam a alimentar o módulo Analytics quando as colunas forem reconhecidas.
- Ao importar um arquivo parcial, as áreas sem registros válidos (Pessoas, Premissas e Cenários) preservam os dados já existentes no perfil. Para substituir uma dessas áreas, importe dados válidos nela; para apagar o workspace, use a opção de limpeza em Configurações.
- Na planilha operacional V.TAL, os custos da Sala Técnica são obtidos pelas linhas identificadas como custo total de Manutenção, Engenharia e Projetos, mantendo o HC e o valor mensal da fonte sem somar novamente seus componentes detalhados.
- Linhas incompletas ficam visíveis como pendência; cobertura, fonte e vigência podem ser revisadas por dimensão, mas uma aprovação permanece bloqueada até que os campos obrigatórios e o rateio do movimento estejam consistentes.
- Encargos, ROI, retenção, turnover, produtividade e payback permanecem classificados conforme a origem: informado, calculado ou estimado.

## Privacidade e armazenamento

O T-Sim não envia o conteúdo para TConnect, Supabase ou outro sistema. O arquivo é processado no navegador e os resultados ficam no `localStorage` do ambiente atual. Perfis locais organizam bases no mesmo navegador, mas não são contas nem barreiras de acesso. Para levar uma base a outro aparelho, exporte o backup JSON ou a planilha preenchida e faça a importação manual no novo navegador.

O histórico local de decisões registra transições de status com data e snapshot do cenário, por perfil, e pode ser incluído no backup JSON. A autoria não é verificada; qualquer pessoa com acesso ao navegador pode alterar ou apagar esses dados. Esse registro é informativo e não substitui auditoria independente ou persistência em servidor.
