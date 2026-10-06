# Planilha padrão de alimentação do T-Sim

Arquivo para download: [`public/templates/tsim-planilha-padrao.xlsx`](../public/templates/tsim-planilha-padrao.xlsx)

## Fluxo do usuário

1. Baixe a planilha padrão em **Configurações**, **Base de pessoas** ou **Operação**.
2. Substitua os exemplos pelos dados do ambiente do próprio usuário.
3. Preencha a fonte, a vigência e o responsável em cada premissa usada.
4. Importe a aba **Cargos** em **Base de pessoas**.
5. Importe a aba **Operação** em **Dimensionamento por contexto**.
6. Revise os alertas de cobertura e salve as premissas localmente.

## Abas e colunas

| Aba | Uso | Colunas principais |
|---|---|---|
| Cargos | Grade salarial usada pelo motor | Cargo, Nível, Salário base, Encargos (%), Fonte, Vigência, Responsável, Observação |
| Operação | Cobertura por região, turno e atividade | Região, Turno, Atividade, Classe de equipe, HC atual, HC requerido, Capacidade por HC, SLA alvo (%), Margem segurança (%), Fonte, Vigência, Responsável, Observação |
| Pessoas | Cadastro opcional para a evolução do módulo People | Nome, Matrícula, E-mail, Cargo, Nível, Região, Turno, Atividade, Status, Data admissão, Salário base, Observação |
| Premissas | Parâmetros rastreáveis | Parâmetro, Valor, Unidade, Fonte, Vigência, Responsável, Observação |
| Cenários | Registro e transporte de simulações | Nome do cenário, Data, cargos, quantidades, promoções automáticas e manuais, saldo e status |
| Leia-me | Instruções de preenchimento e privacidade | Fluxo, unidades, validações e limitações |

## Regras de importação

- A importação de cargos usa a primeira aba da planilha, identifica a coluna **Salário base** (ou **Remuneração**) e associa o cargo pelo texto da primeira coluna. A aba **Cargos** da planilha padrão já vem com o formato completo e seis linhas de referência.
- A importação de dimensões procura a aba **Operação** e reconhece os cabeçalhos de região, turno, atividade, HC atual, HC requerido e capacidade por HC.
- Linhas incompletas ficam visíveis como pendência; a cobertura pode ser calculada, mas uma aprovação deve permanecer bloqueada até que o rateio seja informado.
- Encargos, ROI, retenção, turnover, produtividade e payback permanecem classificados conforme a origem: informado, calculado ou estimado.

## Privacidade e armazenamento

O T-Sim não envia o conteúdo para TConnect, Supabase ou outro sistema. O arquivo é processado no navegador e os resultados ficam no `localStorage` do ambiente atual. Para levar uma base a outro aparelho, exporte o backup JSON ou a planilha preenchida e faça a importação manual no novo navegador.
