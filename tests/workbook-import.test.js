import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTsimWorkbook } from '../src/domain/workbookImport.js';
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
