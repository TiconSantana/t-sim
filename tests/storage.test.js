import test from 'node:test';
import assert from 'node:assert/strict';
import { appendApprovalAuditEvent, createApprovalAuditEvent, loadApprovalHistory, saveApproval, saveApprovalHistory } from '../src/storage/scenarios.js';

test('histórico de aprovação registra transição e snapshot do cenário', () => {
  const scenario = { id: 'scenario-1', name: 'Auxiliar → Técnico II', quantity: 2, appliedBalance: 1250 };
  const event = createApprovalAuditEvent({ scenario, previousStatus: 'Enviado', nextStatus: 'Aprovado', recordedAt: '2026-10-07T10:00:00.000Z', profileId: 'default' });
  scenario.appliedBalance = -1;
  assert.equal(event.previousStatus, 'Enviado');
  assert.equal(event.nextStatus, 'Aprovado');
  assert.equal(event.scenarioSnapshot.appliedBalance, 1250);
  assert.equal(event.profileId, 'default');
  assert.equal(appendApprovalAuditEvent([event], null).length, 1);
  assert.equal(appendApprovalAuditEvent([event], { id: 'older' }, 1).length, 1);
  assert.equal(createApprovalAuditEvent({ scenario, previousStatus: 'Enviado', nextStatus: 'Enviado' }), null);
});

test('salvar uma aprovação persiste o status e acrescenta o evento no perfil local', () => {
  const previousWindow = globalThis.window;
  const data = new Map();
  globalThis.window = { localStorage: { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) } };
  try {
    const scenario = { id: 'scenario-2', name: 'Técnico II → III', quantity: 1, appliedBalance: 540 };
    saveApproval('scenario-2', { status: 'Enviado' }, scenario);
    const next = saveApproval('scenario-2', { status: 'Aprovado' }, scenario);
    assert.equal(next['scenario-2'].status, 'Aprovado');
    const history = loadApprovalHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].previousStatus, 'Enviado');
    assert.equal(history[0].nextStatus, 'Aprovado');
    assert.equal(history[0].scenarioSnapshot.appliedBalance, 540);
    saveApprovalHistory([{ type: 'unsupported', scenarioId: 'bad', nextStatus: 'Aprovado' }]);
    assert.equal(loadApprovalHistory().length, 0);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
