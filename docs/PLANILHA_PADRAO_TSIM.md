# Contrato das planilhas do T-Sim

O fluxo usa três arquivos independentes. Cada arquivo tem uma finalidade e uma permissão própria; não há uma planilha geral com várias abas para alimentar o ambiente.

## Headcount Base Operacional Atual

**Finalidade:** carregar a base de colaboradores que uma conta acompanha e alimentar a configuração operacional da própria conta.

**Estrutura:** uma aba (`BASE OPERACIONAL`), uma linha de cabeçalho e exatamente 12 colunas nesta ordem:

| Coluna | Campo | Preenchimento |
|---|---|---|
| 1 | `REGIONAL` | Nome da regional |
| 2 | `UF` | Sigla do estado |
| 3 | `MATRÍCULA` | Identificador tratado como texto; preserve zeros à esquerda |
| 4 | `NOME` | Nome do colaborador |
| 5 | `CARGO` | Cargo atual |
| 6 | `NÍVEL` | Nível do cargo |
| 7 | `GESTOR RESPONSÁVEL` | Nome do gestor |
| 8 | `DATA ADMISSÃO` | Data válida do Excel |
| 9 | `SEGUIMENTO` | Seguimento informado pela operação |
| 10 | `TURNO ` | Turno; o cabeçalho mantém o espaço final do arquivo de referência |
| 11 | `CARRO AGREGADO` | Informar o veículo ou `Não se aplica` |
| 12 | `STATUS` | Situação do colaborador |

O modelo para download contém somente esses cabeçalhos, sem linhas de exemplo. Todas as 12 células de cada colaborador são obrigatórias. Cada matrícula deve aparecer uma única vez. A importação exige uma única aba e substitui a base da conta somente quando todas as linhas passam na validação; uma planilha inválida não altera os dados já salvos.

Cada conta pode baixar o modelo vazio e exportar a base preenchida. Ambos os arquivos usam o nome `HEADCOUNT BASE OPERACIONAL ATUAL-{Nome do Perfil}.xlsx`. O conteúdo fica vinculado à conta autenticada, sem compartilhamento com outros usuários. Na exportação preenchida, as 12 colunas são mantidas na ordem acima.

## Cenário

**Finalidade:** documento com os cenários que a própria conta salvou, para análise, envio por e-mail ou pedido de aprovação.

**Estrutura:** uma aba (`CENÁRIO`) com as 12 colunas do arquivo de referência:

`NOME DO CENÁRIO`, `DATA`, `CARGO DESLIGADO`, `QUANTIDADE DESLIGADA`, `MATRÍCULA DESLIGAMENTO`, `NOME DESLIGAMENTO`, `CARGO ORIGEM`, `CARGO DESTINO`, `MATRÍCULA A PROMOVER`, `NOME A PROMOVER`, `SALDO MENSAL`, `OBSERVAÇÃO`.

O download `CENÁRIO-{Nome do Perfil}.xlsx` contém uma linha por cenário salvo. Matrículas e nomes aparecem quando foram associados a pessoas da base Headcount. A observação registra promoções aplicadas, saldo anual, cobertura disponível, situação e a fonte, vigência, versão e responsável da referência salarial. Cenários com bloqueio orçamentário/operacional ou metadados de premissa incompletos ficam fora do arquivo. Se a conta ainda não salvou cenários, o arquivo contém apenas o cabeçalho.

## Cargos e Salário

**Finalidade:** referência do sistema para cargos, níveis, salário base, taxa de encargos, fonte, vigência e observações.

Somente a conta administradora pode importar, editar, salvar ou restaurar essa referência. Usuários comuns não recebem link nem arquivo para baixar. A importação aceita uma única aba. Fonte e vigência acompanham cada cargo; a versão, data de alteração e responsável autenticado ficam no registro global do sistema.

## Permissões

| Recurso | Administrador | Usuário comum |
|---|---|---|
| Navegação e recursos do T-Sim | Acesso a todas as áreas | Planilhas da conta, Simulador e Cenários próprios |
| Headcount | Administração e consulta | Importa, consulta e exporta apenas a própria base |
| Cenários | Acesso aos recursos de administração | Cria, salva, consulta e exporta apenas os próprios |
| Cargos e Salário | Consulta, importação e edição da referência global | Sem arquivo para download e sem permissão de alteração |
| Operação, Budget, Analytics, Pareceres e Contas | Acesso administrativo | Sem acesso |

## Tela de planilhas da conta

- **Objetivo:** importar a base operacional própria e obter arquivos de trabalho separados.
- **Decisões:** substituir a própria base Headcount depois da validação e baixar a versão vazia, a preenchida ou os cenários salvos.
- **Público:** contas aprovadas não administrativas.
- **Dados, unidades e fontes:** os 12 campos do Headcount são informados pelo usuário; os cenários são calculados no T-Sim; cargos e encargos vêm da referência global.
- **Estados:** base vazia, validação em andamento, erro de planilha, inconsistência por linha, sucesso de importação e cenários ainda inexistentes.
- **Responsividade e acessibilidade:** tabela com rolagem horizontal em telas estreitas, cabeçalho fixo, controles com nomes acessíveis e mensagens anunciadas por leitor de tela.
- **Limitações:** a matrícula precisa ser única na importação; campos do Headcount não aceitam vazio; o envio de e-mail não é automático; o arquivo exportado é uma cópia no momento do download.

### Planejamento de Headcount por categoria

Na mesma tela da base Headcount, cada usuário registra o teto previsto para duas categorias: **Campo** (Auxiliar de Fibra Óptica, Oficial de Rede, Líder de Obras e os cinco cargos de Técnico de Fibra Óptica informados) e **GA** (Gestor de Área Fibra Óptica I). O previsto é salvo no workspace da própria conta.

O atual é contado automaticamente apenas para colaboradores com status `Ativo`, `Ativa` ou `Em atividade`. Outros status aparecem como excluídos do cálculo; cargos fora dessas duas categorias são identificados e não entram no total. A tabela mostra Campo, GA e total, com atual, previsto e variação textual.

O comparativo mensal é uma **estimativa** baseada no custo mensal com encargos da composição de cargos atual de cada categoria: `(HC atual − HC previsto) × custo médio atual por pessoa`. Valor positivo indica custo atual acima do teto estimado; valor negativo indica custo atual abaixo do teto estimado. Se não houver base ou correspondência salarial completa, o financeiro é informado como indisponível, nunca como zero. Benefícios, veículo, ADM, BDI e outros custos não estão incluídos. Fonte salarial e percentual de encargos vêm da referência global administrada; o mix atual é mantido como hipótese para estimar o previsto.

O previsto é uma quantidade, sem período de projeção. A estimativa compara o retrato atual importado com essa quantidade e não projeta admissões, desligamentos ou mudanças de composição de cargos.

## Armazenamento e ativação

Headcount e cenários são armazenados no Supabase por `user_id`. As tabelas não concedem acesso direto às chaves `anon` ou `authenticated`; as rotas Vercel validam a sessão e determinam o escopo antes de ler ou gravar. A referência salarial fica em uma linha global e só pode ser alterada por sessão administrativa.

A migração `20261009001801_user_workspaces_and_reference_data.sql` já está aplicada ao projeto Supabase T-Sim. A carga inicial registra a referência do arquivo `Cargos e Salário.xlsx` fornecido pelo responsável, com a vigência indicada conforme o próprio arquivo e o responsável ainda marcado como `A confirmar`.
