import test from 'node:test';
import assert from 'node:assert/strict';
import { cargos, ENCARGOS } from '../src/data/cargos.js';
import { operationalDimensions } from '../src/data/operacao.js';
import { calculateDimensionCoverage, calculateCoverage, validateScenarioForApproval } from '../src/domain/operations.js';
import { calculateSimulation } from '../src/domain/simulation.js';
import { bancoHorasSeed } from '../src/data/bancoHorasSeed.js';
import { escalaSeed } from '../src/data/escalaSeed.js';
import { buildFuelCreditCandidates, formatDateKey, generateEscala, parseBancoHorasSeed, parseEscalaSeed, validateEscala } from '../src/domain/escala.js';

test('calcula quatro promoções automáticas no cenário auxiliar para técnico II', () => {
  const result = calculateSimulation({
    dismissedRole: 'auxiliar',
    quantity: 1,
    originRole: 'tecnico-ii',
    destinationRole: 'tecnico-n3',
    activeScenario: 'balanced',
    manualMode: false,
    manualPromotions: 0,
    cargoList: cargos,
    encargos: ENCARGOS,
  });

  assert.equal(result.promotions, 4);
  assert.equal(result.appliedPromotions, 4);
  assert.ok(result.appliedBalance >= 0);
});

test('mantém a escolha manual e calcula a diferença para o automático', () => {
  const result = calculateSimulation({
    dismissedRole: 'auxiliar',
    quantity: 1,
    originRole: 'tecnico-ii',
    destinationRole: 'tecnico-n3',
    activeScenario: 'balanced',
    manualMode: true,
    manualPromotions: 3,
    cargoList: cargos,
    encargos: ENCARGOS,
  });

  assert.equal(result.promotions, 4);
  assert.equal(result.appliedPromotions, 3);
  assert.equal(result.manualDifference, -1);
  assert.ok(result.manualBalance > result.balance);
});

test('escala a economia com a quantidade desligada e mantém o limite automático pelo orçamento', () => {
  const onePosition = calculateSimulation({ dismissedRole: 'auxiliar', quantity: 1, originRole: 'tecnico-ii', destinationRole: 'tecnico-n3', activeScenario: 'balanced', manualMode: false, cargoList: cargos, encargos: ENCARGOS });
  const threePositions = calculateSimulation({ dismissedRole: 'auxiliar', quantity: 3, originRole: 'tecnico-ii', destinationRole: 'tecnico-n3', activeScenario: 'balanced', manualMode: false, cargoList: cargos, encargos: ENCARGOS });
  assert.equal(threePositions.economy, onePosition.economy * 3);
  assert.ok(threePositions.promotions >= onePosition.promotions);
  assert.ok(threePositions.economy - threePositions.promotions * threePositions.delta >= 0);
});

test('permite simular acima do automático e impede aprovação quando o saldo fica negativo', () => {
  const result = calculateSimulation({ dismissedRole: 'auxiliar', quantity: 1, originRole: 'tecnico-ii', destinationRole: 'tecnico-n3', activeScenario: 'balanced', manualMode: true, manualPromotions: 5, cargoList: cargos, encargos: ENCARGOS });
  assert.equal(result.promotions, 4);
  assert.equal(result.appliedPromotions, 5);
  assert.ok(result.appliedBalance < 0);
  const validation = validateScenarioForApproval({ scenario: { source: 'Base local', appliedBalance: result.appliedBalance, budgetBlocked: true, promotionBlocked: false } });
  assert.equal(validation.valid, false);
  assert.equal(validation.insufficientBudget, true);
});

test('bloqueia promoção para cargo de mesmo nível ou inferior', () => {
  const result = calculateSimulation({ dismissedRole: 'auxiliar', quantity: 1, originRole: 'tecnico-n3', destinationRole: 'tecnico-ii', activeScenario: 'balanced', manualMode: false, cargoList: cargos, encargos: ENCARGOS });
  assert.equal(result.promotionEligible, false);
  assert.equal(result.promotions, 0);
  assert.equal(result.appliedPromotions, 0);
});

test('dimensiona a base oficial de 672 e projeta o movimento', () => {
  const result = calculateDimensionCoverage(operationalDimensions, 1);
  assert.equal(result.totalCurrent, 672);
  assert.equal(result.totalRequired, 672);
  assert.equal(result.afterMovement.toFixed(1), '99.9');
  assert.equal(result.rows[0].missingAllocation, true);
  assert.equal(result.approvalBlocked, true);
});

test('bloqueia cobertura abaixo do SLA alvo', () => {
  const result = calculateCoverage({ teamHeadcount: 90, requiredHeadcount: 100, slaTarget: 95, safetyBuffer: 0, quantity: 0 });
  assert.equal(result.approvalBlocked, true);
  assert.equal(result.risk, 'Alto');
});

test('distribui movimentos inteiros proporcionalmente sem concentrar arredondamento na última dimensão', () => {
  const result = calculateDimensionCoverage([
    { id: 'a', region: 'BA', shift: 'Dia', activity: 'Instalação', currentHeadcount: 10, requiredHeadcount: 8, capacityPerPerson: 1, slaTarget: 90, source: 'Ops', validity: '2026' },
    { id: 'b', region: 'PE', shift: 'Noite', activity: 'Manutenção', currentHeadcount: 10, requiredHeadcount: 8, capacityPerPerson: 1, slaTarget: 90, source: 'Ops', validity: '2026' },
  ], 1);
  assert.deepEqual(result.rows.map((row) => row.rowMovement), [1, 0]);
  assert.equal(result.allocatedMovement, 1);
});

test('bloqueia aprovação quando a distribuição manual não corresponde ao movimento simulado', () => {
  const dimensions = [
    { id: 'a', region: 'BA', shift: 'Dia', activity: 'Instalação', currentHeadcount: 10, requiredHeadcount: 8, capacityPerPerson: 1, slaTarget: 90, source: 'Ops', validity: '2026', scenarioMovement: 1 },
    { id: 'b', region: 'PE', shift: 'Noite', activity: 'Manutenção', currentHeadcount: 10, requiredHeadcount: 8, capacityPerPerson: 1, slaTarget: 90, source: 'Ops', validity: '2026', scenarioMovement: 0 },
  ];
  assert.equal(calculateDimensionCoverage(dimensions, 2, 'manual').approvalBlocked, true);
  dimensions[1].scenarioMovement = 1;
  const result = calculateDimensionCoverage(dimensions, 2, 'manual');
  assert.equal(result.approvalBlocked, false);
  assert.equal(result.allocatedMovement, 2);
});

test('importa a escala do ciclo 16→15 e classifica as famílias conforme as linhas da fonte', () => {
  const scale = parseEscalaSeed(escalaSeed);
  assert.equal(scale.employees.length, 56);
  assert.equal(scale.cycleStart, '2026-10-16');
  assert.equal(scale.cycleEnd, '2026-11-15');
  assert.equal(scale.employees.find((person) => person.registration === '523191').className, 'Fusão');
  assert.equal(scale.employees.find((person) => person.registration === '524070').className, 'Equipe L');
  assert.equal(Object.keys(scale.employees[0].assignments).at(-1), '2026-11-15');
});

test('gera a nova escala preservando até 01/11 e sincronizando duplas', () => {
  const scale = parseEscalaSeed(escalaSeed);
  const bank = parseBancoHorasSeed(bancoHorasSeed);
  const generated = generateEscala({ scale, bank, generationStart: '2026-11-02', holidays: ['2026-10-28'] });
  assert.equal(generated.generationStart, '2026-11-02');
  assert.equal(generated.employees.find((person) => person.registration === '523191').assignments['2026-11-01'], 'SA');
  const pair = generated.employees.filter((person) => person.pair === 'F-20');
  assert.equal(pair[0].assignments['2026-11-02'], pair[1].assignments['2026-11-02']);
  assert.equal(generated.validation.errors.some((error) => error.includes('mais de um grupo de fusão')), false);
});

test('distribui o descanso de fim de semana entre grupos sem repetir o mesmo grupo', () => {
  const generated = generateEscala({ scale: parseEscalaSeed(escalaSeed), bank: parseBancoHorasSeed(bancoHorasSeed), generationStart: '2026-11-02', generationEnd: '2026-11-15', dsrTarget: 6 });
  const groupsFor = (dateKey, predicate) => new Set(generated.employees.filter((person) => person.className === 'Fusão' && predicate(person.assignments[dateKey])).map((person) => String(person.team).match(/([ABC])$/)?.[1]).filter(Boolean));
  const weekends = ['2026-11-07', '2026-11-14'].map((satKey) => {
    const sun = new Date(satKey + 'T00:00:00'); sun.setDate(sun.getDate() + 1); const sunKey = formatDateKey(sun);
    const restGroups = ['A', 'B', 'C'].filter((group) => generated.employees.some((person) => person.className === 'Fusão' && String(person.team).endsWith(group) && ['DSR', 'FBH'].includes(person.assignments[satKey])) && generated.employees.some((person) => person.className === 'Fusão' && String(person.team).endsWith(group) && ['DSR', 'FBH'].includes(person.assignments[sunKey])));
    const satSa = groupsFor(satKey, (status) => status === 'SA'); const sunSa = groupsFor(sunKey, (status) => status === 'SA');
    assert.equal(satSa.size, 1); assert.equal(sunSa.size, 1); assert.notEqual([...satSa][0], [...sunSa][0]); assert.equal(restGroups.length, 1);
    return restGroups[0];
  });
  assert.notEqual(weekends[0], weekends[1]);
  assert.equal(generated.validation.errors.some((error) => error.includes('somente um grupo pode ter FBH/DSR')), false);
});

test('validação bloqueia dois grupos com descanso nos dois dias do fim de semana', () => {
  const generated = generateEscala({ scale: parseEscalaSeed(escalaSeed), bank: parseBancoHorasSeed(bancoHorasSeed), generationStart: '2026-11-02', generationEnd: '2026-11-15', dsrTarget: 6 });
  const invalid = { ...generated, employees: generated.employees.map((person) => ({ ...person, assignments: { ...person.assignments } })) };
  invalid.employees.filter((person) => person.className === 'Fusão' && String(person.team).endsWith('A')).forEach((person) => { person.assignments['2026-11-07'] = 'DSR'; person.assignments['2026-11-08'] = 'DSR'; });
  assert.equal(validateEscala(invalid).errors.some((error) => error.includes('somente um grupo pode ter FBH/DSR')), true);
});

test('validação da escala exige duas duplas de Equipe L em SA', () => {
  const scale = parseEscalaSeed(escalaSeed);
  const generated = generateEscala({ scale, bank: parseBancoHorasSeed(bancoHorasSeed), generationStart: '2026-11-02' });
  assert.equal(validateEscala(generated).errors.some((error) => error.includes('Equipe L')), false);
});

test('gera pré-lista de combustível somente para líder com carro em T ou SA no fim de semana', () => {
  const generated = generateEscala({ scale: parseEscalaSeed(escalaSeed), bank: parseBancoHorasSeed(bancoHorasSeed), generationStart: '2026-11-02' });
  const credits = buildFuelCreditCandidates(generated);
  assert.ok(credits.length > 0);
  assert.equal(credits.every((row) => ['T', 'SA'].includes(row.status)), true);
  assert.equal(new Set(credits.map((row) => `${row.date}:${row.pair}`)).size, credits.length);
});

test('classifica negativação pelo saldo BH total acumulado da coluna K', () => {
  const bank = parseBancoHorasSeed({ rows: [{ values: ['16/10/2026', '1', 'F', 'Pessoa', 'TECNICO', '', '', '', '00:00:00', '08:00:00', '-25:00:00', '00:00:00', '08:00:00', '0', '0%', 'Reduzindo'] }] });
  assert.equal(bank.rows[0].alert.level, 'Crítico');
  assert.equal(bank.rows[0].alertBasis, 'Saldo BH Total (Acumulado)');
});

test('usa meta DSR editável antes de permitir FBH e respeita janela final de geração', () => {
  const scale = parseEscalaSeed(escalaSeed);
  const bank = parseBancoHorasSeed(bancoHorasSeed);
  const generated = generateEscala({ scale, bank, generationStart: '2026-11-02', generationEnd: '2026-11-05', dsrTarget: 2 });
  assert.equal(generated.generationEnd, '2026-11-05');
  assert.equal(generated.dsrTarget, 2);
  const generatedKeys = generated.dates.filter((date) => date >= new Date(2026, 10, 2) && date <= new Date(2026, 10, 5)).map((date) => date.toISOString().slice(0, 10));
  assert.equal(generatedKeys.length, 4);
});

test('aplica período de férias editável sem sobrescrever o restante da dupla', () => {
  const scale = parseEscalaSeed(escalaSeed);
  const generated = generateEscala({ scale, bank: parseBancoHorasSeed(bancoHorasSeed), generationStart: '2026-11-02', vacationRanges: [{ registration: '523191', name: 'ANDERSON CERQUEIRA MORAES', start: '2026-11-03', end: '2026-11-04' }] });
  const person = generated.employees.find((item) => item.registration === '523191');
  assert.equal(person.assignments['2026-11-03'], 'FÉRIAS');
  assert.equal(person.assignments['2026-11-04'], 'FÉRIAS');
});

test('continua a rotação de SA no ciclo seguinte sem reiniciar no grupo anterior', () => {
  const generated = generateEscala({ scale: parseEscalaSeed(escalaSeed), bank: parseBancoHorasSeed(bancoHorasSeed), generationStart: '2026-11-16', generationEnd: '2026-12-15', dsrTarget: 6 });
  const nextDayGroups = new Set(generated.employees.filter((person) => person.className === 'Fusão' && person.assignments['2026-11-16'] === 'SA').map((person) => person.team));
  assert.deepEqual([...nextDayGroups], ['EQUIPE A']);
  assert.equal(generated.scheduleEnd, '2026-12-15');
});
