import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDimensionSheet, parseTsimWorkbook, retainExistingIfImportEmpty } from '../src/domain/workbookImport.js';
import { cargos } from '../src/data/cargos.js';

test('importa a planilha padrão nas áreas do perfil local', () => {
  const sheets = {
    Cargos: [
      ['Cargo', 'Nível', 'Salário base', 'Encargos (%)', 'Fonte', 'Vigência', 'Responsável'],
      ['Auxiliar de Fibra Óptica', 'Nível I', 1700, 113, 'RH', '2026', 'Gestão'],
    ],
    Pessoas: [
      ['Nome', 'Matrícula', 'Cargo', 'Região', 'Status', 'Salário base'],
      ['Ana Silva', '001', 'Auxiliar de Fibra Óptica', 'BA', 'Ativo', 1700],
    ],
    Premissas: [
      ['Parâmetro', 'Valor', 'Unidade', 'Fonte', 'Vigência', 'Responsável'],
      ['Encargos', 113, '%', 'Política interna', '2026', 'Gestão'],
    ],
    Operação: [
      ['Região', 'Turno', 'Atividade', 'HC atual', 'HC requerido', 'Capacidade por HC', 'SLA alvo (%)'],
      ['BA', 'Comercial', 'Instalação', 10, 12, 1, 95],
    ],
    Cenários: [
      ['Nome do cenário', 'Cargo desligado', 'Quantidade desligada', 'Cargo origem', 'Cargo destino', 'Promoções automáticas'],
      ['Base', 'Auxiliar de Fibra Óptica', 1, 'Técnico de Fibra Óptica II', 'Técnico de Fibra Óptica N/3', 4],
    ],
  };
  const result = parseTsimWorkbook(sheets, { configuration: { cargos, encargos: 1.13 }, operations: { slaTarget: 95, safetyBuffer: 0.1, dimensions: [] } });
  assert.equal(result.counts.cargos, 1);
  assert.equal(result.counts.people, 1);
  assert.equal(result.counts.assumptions, 1);
  assert.equal(result.counts.dimensions, 1);
  assert.equal(result.counts.scenarios, 1);
  assert.equal(result.configuration.encargos, 1.13);
  assert.equal(result.operations.dimensions[0].requiredHeadcount, 12);
});

test('reconhece headcount oficial e comparativo da planilha operacional legada', () => {
  const sheets = {
    'Custos Equipes': [
      [null, null, null, null, null, null, 'TIPO DE CLASSE', 'CUSTO UNITARIO', 'QNT HC'],
      [null, null, null, null, null, null, 'HC CLASSE F', 17954.75, 558],
      [null, null, null, null, null, null, null, null, 'ORÇADO (HC)'],
      [null, null, null, null, null, null, null, null, 672],
    ],
    'Controle Local': [
      [null, 'EQUIPE CAMPO', 609],
      [null, 'BDI', 100],
      [null, null, 200],
    ],
  };
  const result = parseTsimWorkbook(sheets, { configuration: { cargos, encargos: 1.13 }, operations: {} });
  assert.deepEqual(result.headcountBases.map((item) => item.headcount), [672, 609]);
  assert.ok(result.counts.costs >= 1);
});

test('usa as linhas de custo total da Sala Técnica sem somar novamente seus componentes', () => {
  const sheets = {
    'Sala Técnica': [
      ['SALA TÉCNICA - MANUTENÇÃO', null, null, null, null, null, 'SALA TÉCNICA - ENGENHARIA', null, null, null, null, null, 'SALA TÉCNICA - PROJETOS'],
      ['COORDENADOR', 1, 21570, null, null, null, 'COORDENADOR', 1, 27410, null, null, null, 'PROJETISTA', 9, 103174],
      ['ASSISTENTE', 6, 56566, null, null, null, 'ANALISTA', 5, 74042, null, null, null, 'PROJETISTA II', 4, 58564],
      ['CUSTO TOTAL SL - MANUTENÇÃO', 10, 107885, null, null, null, 'CUSTO TOTAL SL - ENGENHARIA', 14, 178339, null, null, null, 'CUSTO TOTAL SL - PROJETOS', 21, 296030],
    ],
  };
  const result = parseTsimWorkbook(sheets, { configuration: { cargos, encargos: 1.13 }, operations: {} });
  assert.deepEqual(result.costs.map(({ label, headcount, monthlyCost }) => [label, headcount, monthlyCost]), [
    ['SALA TÉCNICA - MANUTENÇÃO', 10, 107885],
    ['SALA TÉCNICA - ENGENHARIA', 14, 178339],
    ['SALA TÉCNICA - PROJETOS', 21, 296030],
  ]);
});

test('preserva linhas operacionais incompletas para correção, sem descartá-las silenciosamente', () => {
  const parsed = parseDimensionSheet([
    ['Região', 'Turno', 'Atividade', 'HC atual', 'HC requerido', 'Capacidade por HC', 'Movimento alocado', 'Fonte', 'Vigência'],
    ['BA', 'Diurno', 'Instalação', '1.234', '1.300', 1, 1, 'Operações', '2026'],
    ['', 'Noturno', 'Manutenção', 8, 10, 1, 0, 'Operações', '2026'],
    ['BA', 'Diurno', '', '', '', 1, '', 'Operações', '2026'],
  ], { sheetName: 'Operação', fileName: 'rateio.xlsx' });
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.pendingRows, 1);
  assert.equal(parsed.skippedRows, 1);
  assert.equal(parsed.rows[0].currentHeadcount, 1234);
  assert.deepEqual(parsed.rows[1].missingFields, ['região']);
  assert.equal(parsed.allocationMode, 'manual');
});

test('importação sem registros válidos em uma seção preserva a base existente', () => {
  const existing = [{ id: 'existing-1' }];
  assert.strictEqual(retainExistingIfImportEmpty([], existing), existing);
  assert.deepEqual(retainExistingIfImportEmpty([{ id: 'imported-1' }], existing), [{ id: 'imported-1' }]);
});

test('reconhece nomes alternativos de colunas e valores monetários nos padrões BR e US', () => {
  const workbook = {
    Cargos: [
      ['Função', 'Salário mensal', 'Percentual encargos', 'Origem', 'Validade'],
      ['Auxiliar de Fibra Óptica', 'R$ 1.234,56', '113%', 'Acordo coletivo', '2026'],
    ],
    Operação: [
      ['Regional Operacional', 'Período', 'Tipo de Atividade', 'Headcount atual', 'HC ideal', 'Capacidade por Pessoa'],
      ['BA', 'Noturno', 'Instalação', '1,234.50', '1.300', '0,75'],
    ],
  };
  const result = parseTsimWorkbook(workbook, { configuration: { cargos, encargos: 1.13 }, operations: { slaTarget: 95, safetyBuffer: 0, dimensions: [] } });
  assert.equal(result.configuration.cargos.find((cargo) => cargo.id === 'auxiliar').salary, 1234.56);
  assert.equal(result.configuration.encargos, 1.13);
  assert.equal(result.operations.dimensions[0].currentHeadcount, 1234.5);
  assert.equal(result.operations.dimensions[0].requiredHeadcount, 1300);
  assert.equal(result.operations.dimensions[0].capacityPerPerson, 0.75);
  const invalidNumbers = parseDimensionSheet([
    ['Região', 'Turno', 'Atividade', 'HC atual', 'HC requerido'],
    ['BA', 'Dia', 'Instalação', 'N/A', '—'],
  ]);
  assert.equal(invalidNumbers.rows.length, 0);
  assert.equal(invalidNumbers.skippedRows, 1);
});

test('importa cadastro de cargos com cabeçalho Salário Base (R$) e linhas após título', () => {
  const workbook = {
    'Cadastro de Cargos': [
      ['FERRAMENTA DE PLANEJAMENTO DE PROMOÇÕES'],
      ['Cargo', 'Salário Base (R$)'],
      ['Auxiliar de Fibra Óptica', 'R$ 1.850,50'],
    ],
  };
  const result = parseTsimWorkbook(workbook, { configuration: { cargos, encargos: 1.13 }, operations: {} });
  assert.equal(result.counts.cargos, 1);
  assert.equal(result.configuration.cargos.find((cargo) => cargo.id === 'auxiliar').salary, 1850.5);
});

test('importa salários de origem e destino da tabela do simulador de promoções', () => {
  const workbook = {
    'Simulador Promoções': [
      ['Cargo Origem', 'Salário Origem', 'Cargo Destino', 'Salário Destino', 'Diferença Salarial', 'Qtd. Promoções Possíveis'],
      ['Auxiliar de Fibra Óptica', 1621, 'Técnico de Fibra Óptica II', 2017.19, 396.19, 4],
      ['Auxiliar de Fibra Óptica', 1621, 'Técnico de Fibra Óptica N/3', 2410.94, 789.94, 3],
      ['Auxiliar de Fibra Óptica', 1621, 'Técnico de Fibra Óptica N/4', 2634.7, 1013.7, 2],
      ['Auxiliar de Fibra Óptica', 1621, 'Técnico de Fibra Óptica V', 3028.25, 1407.25, 1],
      ['Auxiliar de Fibra Óptica', 1621, 'Técnico de Fibra Óptica VI', 3214.85, 1593.85, 1],
    ],
  };
  const result = parseTsimWorkbook(workbook, { configuration: { cargos, encargos: 1.13 }, operations: {} });
  assert.equal(result.counts.cargos, 6);
  assert.deepEqual(result.configuration.cargos.map(({ id, salary }) => [id, salary]), cargos.map(({ id, salary }) => [id, salary]));
  assert.ok(result.configuration.cargos.every((cargo) => cargo.source.includes('pares de salários importados')));
});

test('não escolhe silenciosamente salário divergente na tabela de promoções', () => {
  const workbook = {
    'Simulador Promoções': [
      ['Cargo Origem', 'Salário Origem', 'Cargo Destino', 'Salário Destino'],
      ['Auxiliar de Fibra Óptica', 1600, 'Técnico de Fibra Óptica II', 2017.19],
      ['Auxiliar de Fibra Óptica', 1621, 'Técnico de Fibra Óptica N/3', 2410.94],
    ],
  };
  const result = parseTsimWorkbook(workbook, { configuration: { cargos, encargos: 1.13 }, operations: {} });
  assert.equal(result.configuration.cargos.find((cargo) => cargo.id === 'auxiliar').salary, 1621);
  assert.deepEqual(result.warnings, ['Salários divergentes ignorados para: Auxiliar. Revise a planilha antes de importar esses cargos.']);
});

test('restaura abas de custo, headcount, cenário e histórico do backup Excel', () => {
  const workbook = {
    Cargos: [['Cargo', 'Salário base', 'Encargos (%)'], ['Auxiliar de Fibra Óptica', 1800, 113]],
    Operação: [['Região', 'Turno', 'Atividade', 'HC atual', 'HC requerido'], ['BA', 'Dia', 'Instalação', 672, 672]],
    Custos: [['Classe de equipe', 'HC atual', 'Custo mensal', 'Custo por HC', 'Fonte', 'Vigência'], ['Equipe FTTH', 12, 120000, 10000, 'Controladoria', '2026']],
    Headcount: [['Classe de equipe', 'HC atual', 'Fonte'], ['Base oficial', 672, 'Custos Equipes']],
    Cenários: [['ID', 'Nome do cenário', 'Data', 'Cargo desligado', 'Quantidade', 'Cargo origem', 'Cargo destino', 'Promoções automáticas', 'Promoções manuais', 'Saldo mensal', 'Status'], ['scenario-original', 'Promoção BA', '2026-10-07', 'Auxiliar de Fibra Óptica', 1, 'Técnico de Fibra Óptica II', 'Técnico de Fibra Óptica N/3', 4, '', 2500, 'Aprovado']],
    Histórico: [['ID do evento', 'ID do cenário', 'Cenário', 'Status anterior', 'Status novo', 'Registrado em', 'Quantidade', 'Promoções automáticas', 'Promoções aplicadas', 'Saldo mensal', 'Saldo anual', 'Cobertura operacional', 'Encargos', 'Delta por promoção', 'Fonte'], ['event-1', 'scenario-original', 'Promoção BA', 'Enviado', 'Aprovado', '2026-10-07T10:00:00.000Z', 1, 4, 4, 2500, 30000, 99.5, 1.13, 100, 'MVP local']],
  };
  const result = parseTsimWorkbook(workbook, { configuration: { cargos, encargos: 1.13 }, operations: { dimensions: [] } });
  assert.equal(result.scenarios[0].id, 'scenario-original');
  assert.equal(result.scenarios[0].importedStatus, 'aprovado');
  assert.equal(result.counts.costs, 1);
  assert.equal(result.costs[0].monthlyCost, 120000);
  assert.ok(result.headcountBases.some((row) => row.headcount === 672));
  assert.equal(result.auditHistory[0].type, 'approval-status-change');
  assert.equal(result.auditHistory[0].id, 'event-1');
  assert.equal(result.auditHistory[0].scenarioSnapshot.appliedAnnualBalance, 30000);
});
