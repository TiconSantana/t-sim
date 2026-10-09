const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const FIELD_ROLES = new Set([
  'AUXILIARDEFIBRAOPTICA',
  'OFICIALDEREDE',
  'LIDERDEOBRAS',
  'TECNICODEFIBRAOPTICAII',
  'TECNICODEFIBRAOPTICAN3',
  'TECNICODEFIBRAOPTICAN4',
  'TECNICODEFIBRAOPTICAV',
  'TECNICODEFIBRAOPTICAVI',
]);
const GA_ROLE = 'GESTORDEAREAFIBRAOPTICAI';
const ACTIVE_STATUSES = new Set(['ATIVO', 'ATIVA', 'EMATIVIDADE']);

export function normalizeHeadcountPlan(value = {}) {
  const toCount = (count) => {
    if (count === '' || count === null || count === undefined) return null;
    const parsed = Number(count);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  };
  return { campo: toCount(value.campo), ga: toCount(value.ga) };
}

export function calculateHeadcountPlan(people, cargos, encargos, plan) {
  const salaryByRole = new Map(cargos.map((cargo) => [normalize(cargo.name), Number(cargo.salary) * (1 + Number(encargos || 0))]));
  const categories = {
    campo: { label: 'Campo', matches: FIELD_ROLES },
    ga: { label: 'GA', matches: new Set([GA_ROLE]) },
  };
  const result = {};
  const activePeople = people.filter((person) => ACTIVE_STATUSES.has(normalize(person.status)));
  const excludedPeople = people.length - activePeople.length;

  for (const [key, category] of Object.entries(categories)) {
    const current = activePeople.filter((person) => category.matches.has(normalize(person.role)));
    const missingSalary = current.filter((person) => !salaryByRole.has(normalize(person.role)));
    const currentCost = current.reduce((sum, person) => sum + (salaryByRole.get(normalize(person.role)) || 0), 0);
    const completeCost = missingSalary.length === 0;
    const planned = normalizeHeadcountPlan(plan)[key];
    const averageCost = current.length > 0 && completeCost ? currentCost / current.length : null;
    result[key] = {
      label: category.label,
      current: current.length,
      planned,
      difference: planned === null ? null : current.length - planned,
      currentCost: completeCost ? currentCost : null,
      plannedCost: planned !== null && averageCost !== null ? planned * averageCost : null,
      costDifference: planned !== null && averageCost !== null ? (current.length - planned) * averageCost : null,
      missingSalary: missingSalary.length,
    };
  }
  result.total = {
    label: 'Total',
    current: result.campo.current + result.ga.current,
    planned: result.campo.planned === null || result.ga.planned === null ? null : result.campo.planned + result.ga.planned,
    difference: result.campo.difference === null || result.ga.difference === null ? null : result.campo.difference + result.ga.difference,
    currentCost: result.campo.currentCost === null || result.ga.currentCost === null ? null : result.campo.currentCost + result.ga.currentCost,
    plannedCost: result.campo.plannedCost === null || result.ga.plannedCost === null ? null : result.campo.plannedCost + result.ga.plannedCost,
    costDifference: result.campo.costDifference === null || result.ga.costDifference === null ? null : result.campo.costDifference + result.ga.costDifference,
  };
  result.excludedPeople = excludedPeople;
  result.unclassifiedPeople = activePeople.length - result.total.current;
  return result;
}

export function isHeadcountPlanValid(plan) {
  return ['campo', 'ga'].every((key) => plan?.[key] === null || (Number.isInteger(plan?.[key]) && plan[key] >= 0 && plan[key] <= 100000));
}
