import test from 'node:test';
import assert from 'node:assert/strict';
import { cargos, ENCARGOS } from '../src/data/cargos.js';
import { operationalDimensions } from '../src/data/operacao.js';
import { calculateDimensionCoverage, calculateCoverage } from '../src/domain/operations.js';
import { calculateSimulation } from '../src/domain/simulation.js';

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
