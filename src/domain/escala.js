const MINUTES_PER_FBH = 7 * 60 + 20;
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = {
  jan: 0, janeiro: 0, feb: 1, fevereiro: 1, mar: 2, marco: 2, março: 2, apr: 3, abril: 3,
  may: 4, maio: 4, jun: 5, junho: 5, jul: 6, julho: 6, aug: 7, agosto: 7,
  sep: 8, setembro: 8, oct: 9, outubro: 9, nov: 10, novembro: 10, dec: 11, dezembro: 11,
};

export const escalaAssumptions = {
  source: 'Instruções do responsável · T-Sim',
  version: 'escala-v1.2',
  validity: 'Ciclo 16/10/2026 a 15/11/2026',
  responsible: 'A confirmar',
  fbhMinutes: MINUTES_PER_FBH,
  maxConsecutiveWorkDays: 6,
  maxConsecutiveSaDays: 1,
  negativeAlertHours: { alert: 0, critical: -20, extremeCritical: -40 },
  weekdayLimits: { fusionMorning: 1, fusionNight: 1, equipeL: 1 },
  weekendMorningTechnicianLimit: 3,
  weekendGroupRule: 'Sábado e domingo usam grupos de SA diferentes; um único grupo pode concentrar FBH/DSR nos dois dias e esse grupo não se repete no fim de semana seguinte.',
};

function clean(value) { return String(value ?? '').trim(); }
function normalize(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function toLocalDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const text = clean(value);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(value);
}

export function parseDateLabel(value, fallbackYear = 2026, previousDate = null) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const text = clean(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const match = text.match(/(\d{1,2})[\s/-]+([A-Za-zÀ-ÿ]+)/);
  if (!match) return null;
  const month = MONTHS[normalize(match[2])];
  if (month === undefined) return null;
  let year = fallbackYear;
  if (previousDate && month < previousDate.getMonth()) year = previousDate.getFullYear() + 1;
  return new Date(year, month, Number(match[1]));
}

export function formatDateKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function formatDateLabel(date) {
  const value = date instanceof Date ? date : new Date(date);
  return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}`;
}

export function buildCycleDates(startInput, endInput) {
  const start = toLocalDate(startInput);
  const end = toLocalDate(endInput);
  const result = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) result.push(new Date(cursor));
  return result;
}

export function inferCycleFromLabels(labels = [], fallbackStart = new Date(2026, 9, 16)) {
  const parsed = [];
  let previous = null;
  labels.forEach((label) => { const date = parseDateLabel(label, fallbackStart.getFullYear(), previous); if (date) { parsed.push(date); previous = date; } });
  const start = parsed[0] || new Date(fallbackStart);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 15);
  return { start, end, dates: buildCycleDates(start, end), parsedLabels: parsed };
}

function classifyRow(rowNumber, role, pair) {
  if ([54, 55, 56, 57, 60, 61, 62].includes(rowNumber) || /^L-/i.test(pair)) return { className: 'Equipe L', shift: [58, 59].includes(rowNumber) ? 'Noite' : 'Manhã' };
  if (rowNumber >= 44 && rowNumber <= 53) return { className: 'Fusão', shift: 'Noite' };
  if (rowNumber >= 7 && rowNumber <= 43) return { className: 'Fusão', shift: 'Manhã' };
  const normalizedRole = normalize(role);
  return { className: normalizedRole.includes('oficial') ? 'Equipe L' : 'Fusão', shift: normalizedRole.includes('aux') ? 'Noite' : 'Manhã' };
}

export function parseEscalaSeed(seed) {
  const cycle = inferCycleFromLabels(seed?.dateLabels || []);
  const dates = cycle.dates;
  const employees = (seed?.rows || []).map((row, index) => {
    const values = row.values || [];
    const rowNumber = Number(row.rowNumber) || index + 7;
    const classification = classifyRow(rowNumber, values[2], values[4]);
    const assignments = {};
    (row.assignments || []).forEach((status, dateIndex) => { const date = cycle.parsedLabels[dateIndex]; if (date && date <= cycle.end) assignments[formatDateKey(date)] = clean(status); });
    return {
      id: clean(values[3]) || `row-${rowNumber}`,
      registration: clean(values[3]), team: clean(values[0]), car: clean(values[1]).toUpperCase() === 'S',
      role: clean(values[2]), pair: clean(values[4]), name: clean(values[5]), contact: clean(values[6]), rowNumber,
      className: classification.className, shift: classification.shift, assignments,
    };
  });
  return { sourceFile: seed?.sourceFile || 'A informar', sheetName: seed?.sheetName || 'ESCALA CAMPO', cycleStart: formatDateKey(cycle.start), cycleEnd: formatDateKey(cycle.end), dates, employees };
}

export function parseEscalaWorkbookRows(rows, sourceFile = 'A informar') {
  const values = Array.isArray(rows) ? rows : [];
  const dateLabels = values[0]?.slice(7) || [];
  const header = values[5] || [];
  const dataRows = values.slice(6).filter((row) => row?.[3] || row?.[5]);
  return parseEscalaSeed({ sourceFile, sheetName: 'ESCALA CAMPO', dateLabels, header, rows: dataRows.map((row, index) => ({ rowNumber: index + 7, values: row.slice(0, 7), assignments: row.slice(7) })) });
}

function parseHours(value) {
  if (typeof value === 'number') return Math.round(value * 24 * 60);
  const text = clean(value);
  const match = text.match(/^(-?)(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]) + Math.round(Number(match[4] || 0) / 60));
}

export function classifyBankAlert(minutes, thresholds = escalaAssumptions.negativeAlertHours) {
  const hours = Number(minutes || 0) / 60;
  if (hours <= thresholds.extremeCritical) return { level: 'Extremo crítico', tone: 'extreme', message: 'Priorizar trabalho em expediente e revisar a escala imediatamente.' };
  if (hours <= thresholds.critical) return { level: 'Crítico', tone: 'critical', message: 'Evitar FBH e folga opcional; reservar T para recuperação do saldo.' };
  if (hours < thresholds.alert) return { level: 'Alerta', tone: 'alert', message: 'Saldo negativo; acompanhar a recuperação no ciclo.' };
  return { level: 'Sem alerta', tone: 'ok', message: 'Saldo não está negativo na fonte importada.' };
}

export function parseBancoHorasSeed(seed) {
  const rows = (seed?.rows || []).map((item) => {
    const values = item.values || [];
    const saldoAtualMinutes = parseHours(values[9]);
    const saldoTotalMinutes = parseHours(values[10]);
    const faltareduzirMinutes = parseHours(values[12]);
    return { cycle: clean(values[0]), registration: clean(values[1]), teamCode: clean(values[2]), name: clean(values[3]), role: clean(values[4]), ga: clean(values[5]), go: clean(values[6]), manager: clean(values[7]), initialMinutes: parseHours(values[8]), saldoAtualMinutes, saldoTotalMinutes, reducedMinutes: parseHours(values[11]), faltareduzirMinutes, daysToReduce: Number(values[13]) || 0, progress: clean(values[14]), status: clean(values[15]), alert: classifyBankAlert(saldoTotalMinutes), alertBasis: 'Saldo BH Total (Acumulado)' };
  });
  return { sourceFile: seed?.sourceFile || 'A informar', sheetName: seed?.sheetName || 'Banco_Horas', rows };
}

export function parseBancoHorasWorkbookRows(rows, sourceFile = 'A informar') {
  const values = Array.isArray(rows) ? rows : [];
  return parseBancoHorasSeed({ sourceFile, sheetName: 'Banco_Horas', header: values[0] || [], rows: values.slice(1).filter((row) => row?.[1] || row?.[3]).map((row) => ({ values: row })) });
}

function statusIsWork(status) { return status === 'T' || status === 'SA'; }
function isWeekend(date) { return date.getDay() === 0 || date.getDay() === 6; }
function groupFromTeam(team) { const match = clean(team).match(/EQUIPE\s+([ABC])/i); return match ? match[1].toUpperCase() : null; }
function keyForPerson(person) { return person.pair || person.id; }
function unitsForEmployees(employees) {
  const groups = new Map();
  employees.forEach((person) => { const key = keyForPerson(person); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(person); });
  return [...groups.values()];
}

function countStatuses(person, dates, status) { return dates.reduce((sum, date) => sum + (person.assignments[formatDateKey(date)] === status ? 1 : 0), 0); }
function workStreak(person, date, assignments) {
  let streak = 0; const cursor = new Date(date); cursor.setDate(cursor.getDate() - 1);
  while (assignments[formatDateKey(cursor)] && statusIsWork(assignments[formatDateKey(cursor)])) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

function setUnitStatus(unit, dateKey, status) { unit.forEach((person) => { if (person.assignments[dateKey] !== 'FÉRIAS') person.assignments[dateKey] = status; }); }
function unitStatus(unit, dateKey) { return unit.find((person) => person.assignments[dateKey] !== 'FÉRIAS')?.assignments[dateKey] || 'FÉRIAS'; }
function previousDateKey(date) { const previous = new Date(date); previous.setDate(previous.getDate() - 1); return formatDateKey(previous); }
function unitHadStatusOnPreviousDay(unit, date, status) { const key = previousDateKey(date); return unit.some((person) => person.assignments[key] === status); }
function groupHadStatusOnPreviousDay(employees, group, date, status) { const key = previousDateKey(date); return employees.some((person) => person.className === 'Fusão' && groupFromTeam(person.team) === group && person.assignments[key] === status); }
function isRestStatus(status) { return status === 'DSR' || status === 'FBH'; }
function fusionPeopleForGroup(employees, group) { return employees.filter((person) => person.className === 'Fusão' && groupFromTeam(person.team) === group); }
function groupHasWeekendRest(employees, group, satKey, sunKey) {
  const people = fusionPeopleForGroup(employees, group);
  return people.length > 0 && [satKey, sunKey].every((key) => people.some((person) => isRestStatus(person.assignments[key])));
}
function previousWeekendRestGroup(employees, startDate, rotation) {
  const cursor = new Date(startDate);
  while (cursor.getDay() !== 6) cursor.setDate(cursor.getDate() - 1);
  if (cursor >= startDate) cursor.setDate(cursor.getDate() - 7);
  const satKey = formatDateKey(cursor);
  const sun = new Date(cursor); sun.setDate(sun.getDate() + 1);
  const sunKey = formatDateKey(sun);
  return rotation.find((group) => groupHasWeekendRest(employees, group, satKey, sunKey)) || null;
}
function buildWeekendPlans(employees, cycleDates, startDate, endDate, rotation, startRotationIndex) {
  const plans = new Map(); let previousRest = previousWeekendRestGroup(employees, startDate, rotation);
  const saturdays = cycleDates.filter((date) => date.getDay() === 6 && date >= startDate && date <= endDate).filter((date) => { const sun = new Date(date); sun.setDate(sun.getDate() + 1); return sun <= endDate; });
  saturdays.forEach((sat, index) => {
    const restCandidates = rotation.map((_, offset) => rotation[(startRotationIndex + index + offset) % rotation.length]);
    const restGroup = restCandidates.find((group) => group !== previousRest) || restCandidates[0];
    const saGroups = rotation.filter((group) => group !== restGroup);
    const sun = new Date(sat); sun.setDate(sun.getDate() + 1);
    const weekend = { satKey: formatDateKey(sat), sunKey: formatDateKey(sun), restGroup, satSaGroup: saGroups[0], sunSaGroup: saGroups[1] };
    plans.set(weekend.satKey, { ...weekend, saGroup: weekend.satSaGroup });
    plans.set(weekend.sunKey, { ...weekend, saGroup: weekend.sunSaGroup });
    previousRest = restGroup;
  });
  return plans;
}
function weekendRestStatus(unit, dateKey, cycleDates, bankMap, targetDsr) {
  const needsDsr = unit.some((person) => countStatuses(person, cycleDates, 'DSR') < targetDsr);
  if (needsDsr) return 'DSR';
  const canFbh = unit.every((person) => (bankMap.get(String(person.registration))?.saldoTotalMinutes || 0) >= MINUTES_PER_FBH);
  return canFbh ? 'FBH' : 'DSR';
}
function enforceWeekendGroupPattern(employees, units, weekendPlans, cycleDates, bankMap, targetDsr) {
  const handled = new Set();
  [...weekendPlans.values()].forEach((plan) => {
    if (handled.has(plan.satKey)) return;
    handled.add(plan.satKey);
    const groups = [...new Set(employees.filter((person) => person.className === 'Fusão').map((person) => groupFromTeam(person.team)).filter(Boolean))];
    const dayKeys = [plan.satKey, plan.sunKey];
    const restUnits = (group, key) => units.filter((unit) => unit[0].className === 'Fusão' && groupFromTeam(unit[0].team) === group && unit.some((person) => person.assignments[key] !== 'FÉRIAS') && isRestStatus(unitStatus(unit, key)));
    dayKeys.forEach((key) => {
      if (!restUnits(plan.restGroup, key).length) {
        const unit = units.find((item) => item[0].className === 'Fusão' && groupFromTeam(item[0].team) === plan.restGroup && item.some((person) => person.assignments[key] !== 'FÉRIAS') && unitStatus(item, key) === 'T');
        if (unit) setUnitStatus(unit, key, weekendRestStatus(unit, key, cycleDates, bankMap, targetDsr));
      }
    });
    groups.filter((group) => group !== plan.restGroup).forEach((group) => {
      if (!groupHasWeekendRest(employees, group, plan.satKey, plan.sunKey)) return;
      const satUnits = restUnits(group, plan.satKey); const sunUnits = restUnits(group, plan.sunKey);
      const clearKey = satUnits.length <= sunUnits.length ? plan.satKey : plan.sunKey;
      restUnits(group, clearKey).forEach((unit) => setUnitStatus(unit, clearKey, 'T'));
    });
  });
}

function applyVacationRanges(employees, vacationRanges = [], cycleStart, cycleEnd) {
  const cycleDates = buildCycleDates(cycleStart, cycleEnd);
  const byRegistration = new Map(employees.map((person) => [String(person.registration || person.id), person]));
  vacationRanges.forEach((range) => {
    const person = byRegistration.get(String(range.registration));
    if (!person || !range.start || !range.end) return;
    const start = toLocalDate(range.start); const end = toLocalDate(range.end);
    cycleDates.filter((date) => date >= start && date <= end).forEach((date) => { person.assignments[formatDateKey(date)] = 'FÉRIAS'; });
  });
}

export function generateEscala({ scale, bank, generationStart = '2026-11-02', generationEnd = null, dsrTarget = null, vacationRanges = [], holidays = ['2026-10-28'], rotation = ['A', 'B', 'C'] } = {}) {
  const source = scale || { employees: [], dates: [] };
  const dates = (source.dates || []).map((date) => new Date(date));
  const startDate = toLocalDate(generationStart);
  const referenceCycleStart = toLocalDate(source.cycleStart || dates[0] || startDate);
  const referenceCycleEnd = toLocalDate(source.cycleEnd || dates.at(-1) || startDate);
  const endDate = generationEnd ? toLocalDate(generationEnd) : referenceCycleEnd;
  const scheduleStart = startDate < referenceCycleStart ? startDate : referenceCycleStart;
  const scheduleEnd = endDate > referenceCycleEnd ? endDate : referenceCycleEnd;
  const cycleDates = buildCycleDates(scheduleStart, scheduleEnd);
  const employees = (source.employees || []).map((person) => ({ ...person, assignments: { ...(person.assignments || {}) } }));
  applyVacationRanges(employees, vacationRanges, scheduleStart, scheduleEnd);
  const bankMap = new Map((bank?.rows || []).map((row) => [String(row.registration), row]));
  const units = unitsForEmployees(employees);
  const preservedDates = cycleDates.filter((date) => date < startDate);
  const targetDsr = Number.isFinite(Number(dsrTarget)) ? Math.max(0, Math.min(cycleDates.length, Number(dsrTarget))) : cycleDates.filter((date) => date.getDay() === 0 || holidays.includes(formatDateKey(date))).length;
  const lastPreserved = preservedDates.at(-1);
  const priorGroup = lastPreserved ? employees.filter((person) => groupFromTeam(person.team) && person.assignments[formatDateKey(lastPreserved)] === 'SA').reduce((acc, person) => { const group = groupFromTeam(person.team); acc[group] = (acc[group] || 0) + 1; return acc; }, {}) : {};
  const priorGroupName = Object.entries(priorGroup).sort((a, b) => b[1] - a[1])[0]?.[0];
  const startRotationIndex = priorGroupName ? (rotation.indexOf(priorGroupName) + 1) % rotation.length : 0;
  const weekendPlans = buildWeekendPlans(employees, cycleDates, startDate, endDate, rotation, startRotationIndex);
  const validation = [];

  cycleDates.filter((date) => date >= startDate && date <= endDate).forEach((date, dayIndex) => {
    const dateKey = formatDateKey(date);
    const weekendPlan = weekendPlans.get(dateKey);
    let saGroup = weekendPlan?.saGroup || rotation[(startRotationIndex + dayIndex) % rotation.length];
    const groupPressure = rotation.map((group) => ({ group, due: employees.filter((person) => person.className === 'Fusão' && groupFromTeam(person.team) === group && person.assignments[dateKey] !== 'FÉRIAS' && workStreak(person, date, person.assignments) >= escalaAssumptions.maxConsecutiveWorkDays).length }));
    if (!weekendPlan && (groupPressure.find((item) => item.group === saGroup)?.due || 0) > 0) saGroup = [...groupPressure].sort((a, b) => a.due - b.due || rotation.indexOf(a.group) - rotation.indexOf(b.group))[0]?.group || saGroup;
    if (weekendPlan) {
      const weekendCandidates = [saGroup, ...rotation.filter((group) => group !== weekendPlan.restGroup && group !== saGroup)];
      saGroup = weekendCandidates.find((group) => !groupHadStatusOnPreviousDay(employees, group, date, 'SA')) || saGroup;
    } else if (groupHadStatusOnPreviousDay(employees, saGroup, date, 'SA')) {
      const rotationOrder = rotation.map((_, offset) => rotation[(startRotationIndex + dayIndex + offset) % rotation.length]);
      saGroup = rotationOrder.find((group) => !groupHadStatusOnPreviousDay(employees, group, date, 'SA')) || saGroup;
    }
    const availableLPairs = units.filter((unit) => unit[0].className === 'Equipe L' && !unit.some((person) => person.assignments[dateKey] === 'FÉRIAS')).map((unit) => unit[0].pair || unit[0].id);
    const lPairs = [...new Set(availableLPairs)];
    const eligibleLPairs = lPairs.filter((pair) => {
      const unit = units.find((item) => (item[0].pair || item[0].id) === pair);
      return unit ? !unitHadStatusOnPreviousDay(unit, date, 'SA') : false;
    });
    const orderedLPairs = [...eligibleLPairs].sort((a, b) => {
      const dueA = units.find((unit) => (unit[0].pair || unit[0].id) === a)?.some((person) => workStreak(person, date, person.assignments) >= escalaAssumptions.maxConsecutiveWorkDays) ? 1 : 0;
      const dueB = units.find((unit) => (unit[0].pair || unit[0].id) === b)?.some((person) => workStreak(person, date, person.assignments) >= escalaAssumptions.maxConsecutiveWorkDays) ? 1 : 0;
      return dueA - dueB || ((dayIndex + lPairs.indexOf(a)) % Math.max(lPairs.length, 1)) - ((dayIndex + lPairs.indexOf(b)) % Math.max(lPairs.length, 1));
    });
    const lSaPairs = new Set(orderedLPairs.slice(0, 2));
    units.forEach((unit) => {
      const lead = unit.find((person) => person.car) || unit[0];
      const activeMembers = unit.filter((person) => person.assignments[dateKey] !== 'FÉRIAS');
      if (!activeMembers.length) return;
      const canReceiveSa = !unitHadStatusOnPreviousDay(unit, date, 'SA');
      const base = lead.className === 'Equipe L' ? (canReceiveSa && lSaPairs.has(lead.pair || lead.id) ? 'SA' : 'T') : (canReceiveSa && groupFromTeam(lead.team) === saGroup ? 'SA' : 'T');
      setUnitStatus(activeMembers, dateKey, base);
    });

    const weekday = date.getDay();
    const isHoliday = holidays.includes(dateKey);
    const candidates = units.filter((unit) => unitStatus(unit, dateKey) === 'T' && unit.some((person) => person.assignments[dateKey] !== 'FÉRIAS'));
    const weekendRestGroup = weekendPlan?.restGroup;
    const eligibleWeekendCandidates = weekendRestGroup ? candidates.filter((unit) => unit[0].className !== 'Fusão' || groupFromTeam(unit[0].team) === weekendRestGroup) : candidates;
    const due = candidates.filter((unit) => unit.some((person) => {
      const row = bankMap.get(String(person.registration));
      const target = row?.saldoTotalMinutes < 0 ? Math.max(1, targetDsr) : targetDsr;
      return countStatuses(person, cycleDates, 'DSR') < target && workStreak(person, date, person.assignments) >= escalaAssumptions.maxConsecutiveWorkDays - 1;
    }));
    const preferred = isHoliday || weekday === 0 ? eligibleWeekendCandidates : due.filter((unit) => !weekendRestGroup || unit[0].className !== 'Fusão' || groupFromTeam(unit[0].team) === weekendRestGroup);
    const capFor = (unit) => {
      if (unit[0].className === 'Equipe L') return escalaAssumptions.weekdayLimits.equipeL;
      if (unit[0].shift === 'Noite') return isWeekend(date) ? 2 : escalaAssumptions.weekdayLimits.fusionNight;
      if (isWeekend(date)) return escalaAssumptions.weekendMorningTechnicianLimit;
      return weekday >= 2 && weekday <= 4 ? 3 : escalaAssumptions.weekdayLimits.fusionMorning;
    };
    const capByClass = new Map();
    const forcedDue = candidates.filter((unit) => unit.some((person) => workStreak(person, date, person.assignments) >= escalaAssumptions.maxConsecutiveWorkDays));
    forcedDue.forEach((unit) => { setUnitStatus(unit, dateKey, 'DSR'); });
    const remainingPreferred = preferred.filter((unit) => !forcedDue.includes(unit));
    remainingPreferred.sort((a, b) => Math.max(...b.map((person) => workStreak(person, date, person.assignments))) - Math.max(...a.map((person) => workStreak(person, date, person.assignments))));
    remainingPreferred.forEach((unit) => { const label = `${unit[0].className}-${unit[0].shift}`; const used = capByClass.get(label) || 0; if (used < capFor(unit)) { setUnitStatus(unit, dateKey, 'DSR'); capByClass.set(label, used + 1); } });

    const fbhCandidates = units.filter((unit) => unitStatus(unit, dateKey) === 'T' && (!weekendRestGroup || unit[0].className !== 'Fusão' || groupFromTeam(unit[0].team) === weekendRestGroup));
    fbhCandidates.sort((a, b) => (bankMap.get(String(b[0].registration))?.saldoAtualMinutes || 0) - (bankMap.get(String(a[0].registration))?.saldoAtualMinutes || 0));
    fbhCandidates.forEach((unit) => {
      const shouldReduce = unit.every((person) => countStatuses(person, cycleDates, 'DSR') >= targetDsr)
        && unit.some((person) => (bankMap.get(String(person.registration))?.saldoTotalMinutes || 0) >= MINUTES_PER_FBH && countStatuses(person, cycleDates, 'FBH') < 2);
      const label = `${unit[0].className}-${unit[0].shift}`; const used = capByClass.get(`${label}-fbh`) || 0;
      if (shouldReduce && used < capFor(unit)) { setUnitStatus(unit, dateKey, 'FBH'); capByClass.set(`${label}-fbh`, used + 1); }
    });
  });

  // DSR tem prioridade no ciclo: quando uma pessoa ainda não alcançou a meta,
  // converta FBH gerado na janela em DSR antes de manter qualquer FBH restante.
  employees.forEach((person) => {
    let missing = Math.max(0, targetDsr - countStatuses(person, cycleDates, 'DSR'));
    cycleDates.filter((date) => date >= startDate && date <= endDate).reverse().forEach((date) => {
      if (!missing) return;
      const key = formatDateKey(date);
      if (person.assignments[key] === 'FBH') { person.assignments[key] = 'DSR'; missing -= 1; }
    });
  });
  enforceWeekendGroupPattern(employees, units, weekendPlans, cycleDates, bankMap, targetDsr);

  const result = { ...source, cycleStart: formatDateKey(referenceCycleStart), cycleEnd: formatDateKey(referenceCycleEnd), scheduleStart: formatDateKey(scheduleStart), scheduleEnd: formatDateKey(scheduleEnd), dates: cycleDates, generationStart: formatDateKey(startDate), generationEnd: formatDateKey(endDate), dsrTarget: targetDsr, vacationRanges, holidays, employees, assumptions: escalaAssumptions, generatedAt: new Date().toISOString() };
  result.validation = validateEscala(result);
  return result;
}

function dateKeyFromShortLabel(dates, label) {
  return dates.find((date) => formatDateLabel(date) === label) ? formatDateKey(dates.find((date) => formatDateLabel(date) === label)) : null;
}

export function buildScaleSuggestions(scale) {
  const dates = (scale?.dates || []).map((date) => new Date(date));
  const people = scale?.employees || [];
  return (scale?.validation?.errors || []).map((error, index) => {
    const shortLabel = error.match(/até (\d{2}\/\d{2})/)?.[1] || error.match(/^(\d{2}\/\d{2})/)?.[1] || '';
    const dateKey = dateKeyFromShortLabel(dates, shortLabel);
    const name = error.split(' · ')[0];
    const person = people.find((item) => item.name === name);
    const base = { id: `scale-correction-${index}-${dateKey || 'unknown'}`, error, dateKey, name, kind: 'review', title: 'Revisão manual necessária', detail: 'Analise o alerta e confirme a alteração antes de continuar.', action: 'A validação será recalculada após a alteração.', canApply: false };
    if (error.includes('mais de 6 dias consecutivos')) {
      const unitKey = person ? keyForPerson(person) : null;
      return { ...base, kind: 'work-streak', unitKey, title: 'Quebrar sequência de trabalho', detail: `${name} ultrapassou seis dias consecutivos até ${shortLabel}. A sugestão prioriza DSR para reiniciar a contagem e manter a regra do ciclo.`, action: `Aplicar DSR em ${shortLabel}${unitKey ? ` para a dupla ${unitKey}` : ''}.`, defaultStatus: 'DSR', options: ['DSR', 'FBH', 'T'], canApply: Boolean(unitKey && dateKey) };
    }
    if (error.includes('SA em dias consecutivos')) {
      const unitKey = person ? keyForPerson(person) : null;
      return { ...base, kind: 'sa-streak', unitKey, title: 'Separar dias de sobreaviso', detail: `${name} recebeu SA no dia anterior e novamente em ${shortLabel}. A recomendação é retirar o segundo SA e usar DSR para preservar a regra.`, action: `Aplicar DSR em ${shortLabel}${unitKey ? ` para a dupla ${unitKey}` : ''}.`, defaultStatus: 'DSR', options: ['DSR', 'T'], canApply: Boolean(unitKey && dateKey) };
    }
    if (error.includes('mais de um grupo de fusão em SA')) {
      const groups = error.match(/\(([^)]+)\)/)?.[1]?.split(',').map((item) => item.trim()).filter(Boolean) || [];
      const keepGroup = groups[0] || '';
      return { ...base, kind: 'fusion-duplicate', keepGroup, title: 'Manter um único grupo de Fusão', detail: `Há mais de um grupo em SA em ${shortLabel}. A sugestão mantém ${keepGroup || 'o primeiro grupo identificado'} e devolve os demais para T.`, action: `Manter ${keepGroup || 'um grupo'} em SA em ${shortLabel}.`, canApply: Boolean(keepGroup && dateKey) };
    }
    if (error.includes('Equipe L com')) {
      return { ...base, kind: 'equipe-l-coverage', title: 'Completar cobertura da Equipe L', detail: `A Equipe L ficou abaixo de duas duplas em SA em ${shortLabel}. A sugestão procura duplas disponíveis sem repetir SA no dia anterior.`, action: `Selecionar até duas duplas elegíveis em ${shortLabel}.`, canApply: Boolean(dateKey) };
    }
    if (error.includes('dupla ') && error.includes('status divergente')) {
      const pair = error.match(/dupla ([^ ]+) com/)?.[1] || '';
      return { ...base, kind: 'pair-align', unitKey: pair, title: 'Alinhar o status da dupla', detail: `Os integrantes da dupla ${pair} estão com status diferentes em ${shortLabel}. A sugestão copia o status predominante para os integrantes ativos.`, action: `Sincronizar a dupla ${pair} em ${shortLabel}.`, canApply: Boolean(pair && dateKey) };
    }
    return base;
  });
}

export function applyScaleSuggestion(scale, suggestion) {
  const employees = (scale?.employees || []).map((person) => ({ ...person, assignments: { ...(person.assignments || {}) } }));
  const dates = (scale?.dates || []).map((date) => new Date(date));
  const units = unitsForEmployees(employees);
  const unitFor = (unitKey) => units.find((unit) => (unit[0].pair || unit[0].id) === unitKey);
  const selectedDate = suggestion?.dateKey;
  if (!selectedDate) return { ...scale, employees, validation: validateEscala({ ...scale, employees }) };
  if (suggestion.kind === 'work-streak' || suggestion.kind === 'sa-streak') {
    const unit = unitFor(suggestion.unitKey);
    if (unit) setUnitStatus(unit, selectedDate, suggestion.status || suggestion.defaultStatus || 'DSR');
  } else if (suggestion.kind === 'fusion-duplicate') {
    employees.forEach((person) => { if (person.className === 'Fusão' && person.assignments[selectedDate] === 'SA' && groupFromTeam(person.team) !== suggestion.keepGroup) person.assignments[selectedDate] = 'T'; });
  } else if (suggestion.kind === 'equipe-l-coverage') {
    const lUnits = units.filter((unit) => unit[0].className === 'Equipe L' && !unit.some((person) => person.assignments[selectedDate] === 'FÉRIAS'));
    const current = lUnits.filter((unit) => unitStatus(unit, selectedDate) === 'SA');
    const eligible = lUnits.filter((unit) => !unitHadStatusOnPreviousDay(unit, dates.find((date) => formatDateKey(date) === selectedDate), 'SA'));
    const chosen = [...current, ...eligible.filter((unit) => !current.includes(unit))].slice(0, 2);
    lUnits.forEach((unit) => setUnitStatus(unit, selectedDate, chosen.includes(unit) ? 'SA' : 'T'));
  } else if (suggestion.kind === 'pair-align') {
    const unit = unitFor(suggestion.unitKey);
    if (unit) {
      const statuses = unit.map((person) => person.assignments[selectedDate]).filter((status) => status && status !== 'FÉRIAS');
      const status = statuses.sort((a, b) => statuses.filter((item) => item === b).length - statuses.filter((item) => item === a).length)[0] || 'T';
      setUnitStatus(unit, selectedDate, status);
    }
  }
  const next = { ...scale, employees };
  next.validation = validateEscala(next);
  return next;
}

export function validateEscala(scale) {
  const dates = (scale?.dates || []).map((date) => new Date(date));
  const validationStart = scale?.generationStart ? toLocalDate(scale.generationStart) : dates[0];
  const errors = []; const warnings = []; const daySummary = [];
  for (const date of dates) {
    if (validationStart && date < validationStart) continue;
    const key = formatDateKey(date); const people = scale.employees || [];
    const saGroups = new Set(people.filter((person) => person.assignments[key] === 'SA' && person.className === 'Fusão').map((person) => groupFromTeam(person.team)).filter(Boolean));
    const dups = new Map(); people.forEach((person) => { const pair = keyForPerson(person); if (!dups.has(pair)) dups.set(pair, []); dups.get(pair).push(person.assignments[key]); });
    dups.forEach((statuses, pair) => { const comparable = statuses.filter((status) => status && status !== 'FÉRIAS'); if (new Set(comparable).size > 1) errors.push(`${formatDateLabel(date)} · dupla ${pair} com status divergente.`); });
    if (saGroups.size > 1) errors.push(`${formatDateLabel(date)} · mais de um grupo de fusão em SA (${[...saGroups].join(', ')}).`);
    if ((date.getDay() === 0 || date.getDay() === 6) && saGroups.size === 0) warnings.push(`${formatDateLabel(date)} · fim de semana sem grupo de fusão em SA.`);
    const lSaPairs = new Set(people.filter((person) => person.className === 'Equipe L' && person.assignments[key] === 'SA').map((person) => keyForPerson(person)));
    if (lSaPairs.size < 2) errors.push(`${formatDateLabel(date)} · Equipe L com ${lSaPairs.size} dupla(s) em SA; mínimo 2.`);
    daySummary.push({ date: key, weekday: WEEKDAYS[date.getDay()], saGroups: [...saGroups], lSaPairs: [...lSaPairs], dsr: people.filter((person) => person.assignments[key] === 'DSR').length, fbh: people.filter((person) => person.assignments[key] === 'FBH').length });
  }
  const fusionGroups = [...new Set((scale?.employees || []).map((person) => groupFromTeam(person.team)).filter(Boolean))];
  const weekendRestGroups = [];
  dates.filter((date) => date.getDay() === 6 && (!validationStart || date >= validationStart)).forEach((sat) => {
    const sun = new Date(sat); sun.setDate(sun.getDate() + 1);
    const sunKey = formatDateKey(sun);
    if (!dates.some((date) => formatDateKey(date) === sunKey)) return;
    const satKey = formatDateKey(sat);
    const satSaGroups = new Set((scale.employees || []).filter((person) => person.className === 'Fusão' && person.assignments[satKey] === 'SA').map((person) => groupFromTeam(person.team)).filter(Boolean));
    const sunSaGroups = new Set((scale.employees || []).filter((person) => person.className === 'Fusão' && person.assignments[sunKey] === 'SA').map((person) => groupFromTeam(person.team)).filter(Boolean));
    if (satSaGroups.size !== 1) errors.push(`${formatDateLabel(sat)} · sábado deve ter exatamente um grupo de Fusão em SA.`);
    if (sunSaGroups.size !== 1) errors.push(`${formatDateLabel(sun)} · domingo deve ter exatamente um grupo de Fusão em SA.`);
    if (satSaGroups.size === 1 && sunSaGroups.size === 1 && [...satSaGroups][0] === [...sunSaGroups][0]) errors.push(`${formatDateLabel(sat)}–${formatDateLabel(sun)} · os grupos de SA do sábado e domingo devem ser diferentes.`);
    const restGroups = fusionGroups.filter((group) => groupHasWeekendRest(scale.employees || [], group, satKey, sunKey));
    if (restGroups.length !== 1) errors.push(`${formatDateLabel(sat)}–${formatDateLabel(sun)} · somente um grupo pode ter FBH/DSR nos dois dias do fim de semana (encontrados: ${restGroups.join(', ') || 'nenhum'}).`);
    weekendRestGroups.push({ satKey, sunKey, groups: restGroups });
  });
  weekendRestGroups.forEach((weekend, index) => {
    const previous = weekendRestGroups[index - 1];
    if (previous && previous.groups.length === 1 && weekend.groups.length === 1 && previous.groups[0] === weekend.groups[0]) errors.push(`${formatDateLabel(toLocalDate(weekend.satKey))} · o grupo ${weekend.groups[0]} não pode repetir a folga de sábado e domingo em dois finais de semana consecutivos.`);
  });
  const preservedRestGroup = validationStart ? previousWeekendRestGroup(scale?.employees || [], validationStart, fusionGroups) : null;
  if (preservedRestGroup && weekendRestGroups[0]?.groups.length === 1 && preservedRestGroup === weekendRestGroups[0].groups[0]) errors.push(`${formatDateLabel(toLocalDate(weekendRestGroups[0].satKey))} · o grupo ${preservedRestGroup} repete a folga de sábado e domingo do fim de semana anterior.`);
  (scale?.employees || []).forEach((person) => {
    let streak = 0; let dsrCount = 0; let previousStatus = null;
    dates.forEach((date) => { const status = person.assignments[formatDateKey(date)]; if (status === 'SA' && previousStatus === 'SA' && (!validationStart || date >= validationStart)) errors.push(`${person.name} · SA em dias consecutivos até ${formatDateLabel(date)}.`); if (status === 'DSR') { dsrCount += 1; streak = 0; } else if (status === 'FBH') { streak = 0; } else if (statusIsWork(status)) { streak += 1; if ((!validationStart || date >= validationStart) && streak > escalaAssumptions.maxConsecutiveWorkDays) errors.push(`${person.name} · mais de 6 dias consecutivos até ${formatDateLabel(date)}.`); } previousStatus = status; });
    const target = Number.isFinite(Number(scale?.dsrTarget)) ? Number(scale.dsrTarget) : dates.filter((date) => date.getDay() === 0 || (scale.holidays || []).includes(formatDateKey(date))).length;
    if (dsrCount < target) warnings.push(`${person.name} · ${dsrCount}/${target} DSR no ciclo.`);
  });
  return { valid: errors.length === 0, errors, warnings, daySummary };
}

export function buildScaleExportRows(scale) {
  const dates = (scale?.dates || []).map((date) => new Date(date));
  const header = ['EQUIPE', 'CARRO', 'FUNÇÃO', 'MATRICULA', 'DUPLADO', 'NOME DO COLABORADOR', 'CONTATO', ...dates.map((date) => `${formatDateLabel(date)}${WEEKDAYS[date.getDay()]}`)];
  return [header, ...(scale?.employees || []).map((person) => [person.team, person.car ? 'S' : 'N', person.role, person.registration, person.pair, person.name, person.contact, ...dates.map((date) => person.assignments[formatDateKey(date)] || '')])];
}

export function buildBankExportRows(bank) {
  return [['Matrícula', 'Nome', 'Função', 'Saldo Atual (J)', 'Saldo BH Total (K)', 'Falta Reduzir (M)', 'Alerta por K', 'Orientação'], ...(bank?.rows || []).map((row) => [row.registration, row.name, row.role, formatMinutes(row.saldoAtualMinutes), formatMinutes(row.saldoTotalMinutes), formatMinutes(row.faltareduzirMinutes), row.alert.level, row.alert.message])];
}

function formatMinutes(minutes) {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Number(minutes) || 0);
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

export function buildFuelCreditCandidates(scale) {
  const candidates = [];
  (scale?.dates || []).map((date) => new Date(date)).filter(isWeekend).forEach((date) => {
    const dateKey = formatDateKey(date); const seenPairs = new Set();
    (scale?.employees || []).forEach((person) => {
      const pair = keyForPerson(person); const status = person.assignments[dateKey];
      if (!person.car || seenPairs.has(pair) || !['T', 'SA'].includes(status)) return;
      seenPairs.add(pair);
      candidates.push({ date: dateKey, weekday: WEEKDAYS[date.getDay()], team: person.team, pair, registration: person.registration, name: person.name, status, shift: person.shift, reason: status === 'SA' ? 'Sobreaviso no fim de semana' : 'Trabalho no fim de semana' });
    });
  });
  return candidates;
}

export function buildFuelCreditExportRows(scale) {
  return [['Data', 'Dia', 'Equipe', 'Dupla', 'Matrícula', 'Responsável com carro', 'Turno', 'Status', 'Motivo'], ...buildFuelCreditCandidates(scale).map((row) => [row.date, row.weekday, row.team, row.pair, row.registration, row.name, row.shift, row.status, row.reason])];
}
