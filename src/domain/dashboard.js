import { custo } from '../data/cargos';
import { operationalSource } from '../data/operacao';
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

function roleMatches(role, cargo) {
  const normalizedRole = normalize(role);
  return [cargo.name, cargo.short, cargo.level].some((label) => normalize(label) === normalizedRole);
}

function buildHeadcountCostRows(activePeople, cargoList, encargos) {
  const grouped = new Map();
  activePeople.forEach((person) => {
    const cargo = cargoList.find((item) => roleMatches(person.role, item));
    const key = cargo?.id || `unknown:${normalize(person.role) || 'SEM-CARGO'}`;
    const current = grouped.get(key) || { cargo, label: person.role || 'Cargo não informado', headcount: 0 };
    current.headcount += 1;
    grouped.set(key, current);
  });
  return [...grouped.values()].map(({ cargo, label, headcount }) => ({
    id: cargo?.id || `headcount-${normalize(label)}`,
    label: cargo?.name || label,
    context: 'HEADCOUNT BASE OPERACIONAL ATUAL',
    monthlyCost: cargo ? custo(cargo, encargos) * headcount : 0,
    headcount,
    unitCost: cargo ? custo(cargo, encargos) : 0,
    unit: 'R$/pessoa/mês',
    classification: cargo ? 'Calculada' : 'Pendente de cargo correspondente',
    validity: cargo?.validity || 'A informar',
    source: cargo?.source || 'HEADCOUNT BASE OPERACIONAL ATUAL',
  }));
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
  const hasImportedOperations = operations.basisSource === 'Importação local · planilha operacional'
    || Boolean(operations.costs?.length || operations.dimensions?.length);
  const operationalRows = hasImportedOperations
    ? (operations.costs || [])
    : buildHeadcountCostRows(activePeople, cargoList, encargos);
  const operationalMonthly = operationalRows.reduce((sum, item) => sum + (Number(item.monthlyCost) || 0), 0);
  const operationalHeadcount = activePeople.length || (hasImportedOperations ? Number(operations.teamHeadcount) || 0 : 0);
  const requiredHeadcount = hasImportedOperations ? Number(operations.requiredHeadcount) || 0 : 0;
  const coverageConfigured = requiredHeadcount > 0;
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
  const effectiveCoverage = coverageConfigured ? (dimensionCoverage?.current ?? coverage.current) : null;
  const effectiveTarget = coverageConfigured ? (dimensionCoverage?.rows?.[0]?.target ?? coverage.safetyTarget) : null;
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
  if (!coverageConfigured) priorities.push({ tone: 'orange', title: 'Cobertura ainda não configurada', detail: 'Informe o headcount requerido e o SLA da operação da conta antes de interpretar a cobertura.', action: 'Operação' });
  else if (effectiveCoverage < (Number(operations.slaTarget) || 0)) priorities.push({ tone: 'orange', title: 'Cobertura abaixo do SLA', detail: `A leitura atual está em ${effectiveCoverage.toFixed(1)}%, abaixo da meta de ${Number(operations.slaTarget) || 0}%.`, action: 'Operação' });
  if (!priorities.length) priorities.push({ tone: 'green', title: 'Base pronta para análise', detail: 'Não há bloqueios executivos identificados nos dados carregados.', action: 'Abrir simulador' });
  return {
    activePeople,
    totalPeople: people.length,
    referenceMonthly,
    operationalRows,
    operationalMonthly,
    operationalHeadcount,
    requiredHeadcount,
    coverage: { ...coverage, configured: coverageConfigured, current: effectiveCoverage, target: effectiveTarget },
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
    sourceLabel: activePeople.length ? 'HEADCOUNT BASE OPERACIONAL ATUAL · conta' : hasImportedOperations ? operations.basisSource : 'Aguardando dados da conta',
    costBasis: activePeople.length ? 'headcount' : hasImportedOperations ? 'operations' : 'none',
    hasImportedOperations,
  };
}
