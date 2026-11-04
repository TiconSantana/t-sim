const MINUTES_PER_FBH = 7 * 60 + 20;
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = {
  jan: 0, janeiro: 0, feb: 1, fevereiro: 1, mar: 2, marco: 2, março: 2, apr: 3, abril: 3,
  may: 4, maio: 4, jun: 5, junho: 5, jul: 6, julho: 6, aug: 7, agosto: 7,
  sep: 8, setembro: 8, oct: 9, outubro: 9, nov: 10, novembro: 10, dec: 11, dezembro: 11,
};

export const escalaAssumptions = {
  source: 'Instruções do responsável · T-Sim',
  version: 'escala-v1.1',
  validity: 'Ciclo 16/10/2026 a 15/11/2026',
  responsible: 'A confirmar',
  fbhMinutes: MINUTES_PER_FBH,
  maxConsecutiveWorkDays: 6,
  maxConsecutiveSaDays: 1,
  negativeAlertHours: { alert: 0, critical: -20, extremeCritical: -40 },
  weekdayLimits: { fusionMorning: 1, fusionNight: 1, equipeL: 1 },
  weekendMorningTechnicianLimit: 3,
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
  const validation = [];

  cycleDates.filter((date) => date >= startDate && date <= endDate).forEach((date, dayIndex) => {
    const dateKey = formatDateKey(date);
    let saGroup = rotation[(startRotationIndex + dayIndex) % rotation.length];
    const groupPressure = rotation.map((group) => ({ group, due: employees.filter((person) => person.className === 'Fusão' && groupFromTeam(person.team) === group && person.assignments[dateKey] !== 'FÉRIAS' && workStreak(person, date, person.assignments) >= escalaAssumptions.maxConsecutiveWorkDays).length }));
    if ((groupPressure.find((item) => item.group === saGroup)?.due || 0) > 0) saGroup = [...groupPressure].sort((a, b) => a.due - b.due || rotation.indexOf(a.group) - rotation.indexOf(b.group))[0]?.group || saGroup;
    if (groupHadStatusOnPreviousDay(employees, saGroup, date, 'SA')) {
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
    const due = candidates.filter((unit) => unit.some((person) => {
      const row = bankMap.get(String(person.registration));
      const target = row?.saldoTotalMinutes < 0 ? Math.max(1, targetDsr) : targetDsr;
      return countStatuses(person, cycleDates, 'DSR') < target && workStreak(person, date, person.assignments) >= escalaAssumptions.maxConsecutiveWorkDays - 1;
    }));
    const preferred = isHoliday || weekday === 0 ? candidates : due;
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

    const fbhCandidates = units.filter((unit) => unitStatus(unit, dateKey) === 'T');
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

  const result = { ...source, cycleStart: formatDateKey(referenceCycleStart), cycleEnd: formatDateKey(referenceCycleEnd), scheduleStart: formatDateKey(scheduleStart), scheduleEnd: formatDateKey(scheduleEnd), dates: cycleDates, generationStart: formatDateKey(startDate), generationEnd: formatDateKey(endDate), dsrTarget: targetDsr, vacationRanges, holidays, employees, assumptions: escalaAssumptions, generatedAt: new Date().toISOString() };
  result.validation = validateEscala(result);
  return result;
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
  (scale?.employees || []).forEach((person) => {
    let streak = 0; let dsrCount = 0; let previousStatus = null;
    dates.forEach((date) => { const status = person.assignments[formatDateKey(date)]; if (status === 'SA' && previousStatus === 'SA' && (!validationStart || date >= validationStart)) errors.push(`${person.name} · SA em dias consecutivos até ${formatDateLabel(date)}.`); if (status === 'DSR') { dsrCount += 1; streak = 0; } else if (statusIsWork(status)) { streak += 1; if ((!validationStart || date >= validationStart) && streak > escalaAssumptions.maxConsecutiveWorkDays) errors.push(`${person.name} · mais de 6 dias consecutivos até ${formatDateLabel(date)}.`); } previousStatus = status; });
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
