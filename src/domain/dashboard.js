import { custo } from '../data/cargos';
import { operationalCosts, operationalSource } from '../data/operacao';
import { calculateCoverage, calculateDimensionCoverage } from './operations';

const normalize = (value) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const ACTIVE_STATUSES = new Set(['ATIVO', 'ATIVA', 'EMATIVIDADE']);

function isActivePerson(person) {
  return ACTIVE_STATUSES.has(normalize(person?.status));
}

function scenarioStatus(scenario, approvals) {
  return approvals?.[scenario.id]?.status || 'Rascunho';
}

export function buildExecutiveDashboard({
  cargoList = [],
  encargos = 0,
  people = [],
  operations = {},
  headcountPlan = {},
  savedScenarios = [],
  approvals = {},
}) {
  const activePeople = people.filter(isActivePerson);
  const referenceMonthly = cargoList.reduce((sum, cargo) => sum + custo(cargo, encargos), 0);
  const operationalRows = operations.costs?.length ? operations.costs : operationalCosts;
  const operationalMonthly = operationalRows.reduce((sum, item) => sum + (Number(item.monthlyCost) || 0), 0);
  const operationalHeadcount = Number(operations.teamHeadcount) || operationalSource.headcountBases[0]?.headcount || 0;
  const requiredHeadcount = Number(operations.requiredHeadcount) || operationalHeadcount;
  const coverage = calculateCoverage({
    teamHeadcount: operationalHeadcount,
    requiredHeadcount,
    slaTarget: Number(operations.slaTarget) || 0,
    safetyBuffer: Number(operations.safetyBuffer) || 0,
    quantity: 0,
  });
  const dimensionCoverage = operations.dimensions?.length
    ? calculateDimensionCoverage(operations.dimensions, 0, operations.allocationMode)
    : null;
  const effectiveCoverage = dimensionCoverage?.current ?? coverage.current;
  const effectiveTarget = dimensionCoverage?.rows?.[0]?.target ?? coverage.safetyTarget;
  const plannedHeadcount = [headcountPlan.campo, headcountPlan.ga]
    .filter((value) => Number.isInteger(value))
    .reduce((sum, value) => sum + value, 0);
  const scenarios = savedScenarios.map((scenario) => ({
    ...scenario,
    status: scenarioStatus(scenario, approvals),
  }));
  const approvedScenarios = scenarios.filter((scenario) => /aprov/i.test(scenario.status));
  const pendingScenarios = scenarios.filter((scenario) => !/aprov|negad/i.test(scenario.status));
  const positiveScenarios = scenarios.filter((scenario) => Number(scenario.appliedBalance) >= 0);
  const roleCounts = new Map();
  activePeople.forEach((person) => {
    const role = person.role || 'Cargo não informado';
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
  });
  const headcountByRole = [...roleCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 6);
  const salaryLadder = cargoList.map((cargo) => ({
    label: cargo.short || cargo.name,
    level: cargo.level,
    base: Number(cargo.salary) || 0,
    total: custo(cargo, encargos),
  }));
  const maxSalary = Math.max(...salaryLadder.map((item) => item.total), 1);
  const maxOperationalCost = Math.max(...operationalRows.map((item) => Number(item.monthlyCost) || 0), 1);
  const priorities = [];
  if (!activePeople.length) priorities.push({ tone: 'orange', title: 'Headcount ainda não importado', detail: 'Carregue a base da conta para ativar a leitura de pessoas por cargo.', action: 'Planilhas da conta' });
  if (pendingScenarios.length) priorities.push({ tone: 'blue', title: `${pendingScenarios.length} cenário(s) aguardam decisão`, detail: 'Revise saldo, cobertura e premissas antes de enviar para aprovação.', action: 'Pareceres' });
  if (effectiveCoverage < (Number(operations.slaTarget) || 0)) priorities.push({ tone: 'orange', title: 'Cobertura abaixo do SLA', detail: `A leitura atual está em ${effectiveCoverage.toFixed(1)}%, abaixo da meta de ${Number(operations.slaTarget) || 0}%.`, action: 'Operação' });
  if (!priorities.length) priorities.push({ tone: 'green', title: 'Base pronta para análise', detail: 'Não há bloqueios executivos identificados nos dados carregados.', action: 'Abrir simulador' });
  return {
    activePeople,
    totalPeople: people.length,
    referenceMonthly,
    operationalRows,
    operationalMonthly,
    operationalHeadcount,
    requiredHeadcount,
    coverage: { ...coverage, current: effectiveCoverage, target: effectiveTarget },
    plannedHeadcount,
    scenarios,
    approvedScenarios,
    pendingScenarios,
    positiveScenarios,
    headcountByRole,
    salaryLadder,
    maxSalary,
    maxOperationalCost,
    priorities,
    sourceLabel: operations.basisSource || operationalSource.basisSource,
  };
}
