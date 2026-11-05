import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Download, FileSpreadsheet, Gauge, RefreshCw, ShieldAlert, Upload, UsersRound, Save, Plus, Trash2 } from 'lucide-react';
import { bancoHorasSeed } from '../data/bancoHorasSeed';
import { escalaSeed } from '../data/escalaSeed';
import { applyScaleSuggestion, buildBankExportRows, buildFuelCreditExportRows, buildFuelCreditCandidates, buildScaleExportRows, buildScaleSuggestions, escalaAssumptions, formatDateKey, formatDateLabel, generateEscala, parseBancoHorasSeed, parseBancoHorasWorkbookRows, parseEscalaSeed, parseEscalaWorkbookRows } from '../domain/escala';

const initialScale = parseEscalaSeed(escalaSeed);
const initialBank = parseBancoHorasSeed(bancoHorasSeed);
const SCALE_STORAGE_KEY = 'tsim.escala.v1';
const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function readDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  return value ? new Date(String(value).slice(0, 10) + 'T00:00:00') : new Date(2026, 10, 2);
}
function formatHours(minutes) {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Number(minutes) || 0);
  return sign + Math.floor(abs / 60) + 'h' + String(abs % 60).padStart(2, '0');
}
function statusClass(status) {
  return 'scale-status scale-status-' + (String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '-') || 'empty');
}
function parseHolidayText(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
function isWeekend(date) { return date.getDay() === 0 || date.getDay() === 6; }
function cycleDsrTarget(scale, holidays) { return (scale.dates || []).map(readDate).filter((date) => date.getDay() === 0 || holidays.includes(formatDateKey(date))).length; }
function projectionCycleCount(startInput, endInput) { const start = readDate(startInput); const end = readDate(endInput); let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate() >= 16 ? 16 : 16); if (start.getDate() < 16) cursor.setMonth(cursor.getMonth() - 1); let count = 0; while (cursor <= end) { count += 1; cursor.setMonth(cursor.getMonth() + 1); } return Math.max(1, count); }
function teamLetter(team) { const match = String(team || '').match(/([ABC])$/i); return match ? match[1].toUpperCase() : 'A'; }
function groupRowClass(team) { return 'scale-row-group-' + teamLetter(team).toLowerCase(); }

function makeInitialState() {
  const holidays = ['2026-10-28'];
  const defaultScale = generateEscala({ scale: initialScale, bank: initialBank, generationStart: '2026-11-02', generationEnd: '2026-11-15', dsrTarget: cycleDsrTarget(initialScale, holidays), holidays });
  if (typeof window === 'undefined') return { sourceScale: initialScale, bank: initialBank, scale: defaultScale, vacationRanges: [], dsrTarget: defaultScale.dsrTarget, generationStart: defaultScale.generationStart, generationEnd: defaultScale.generationEnd, holidayText: holidays.join(',') };
  try {
    const saved = JSON.parse(window.localStorage.getItem(SCALE_STORAGE_KEY) || 'null');
    if (saved?.sourceScale?.employees?.length && saved?.bank?.rows?.length && saved?.scale?.employees?.length) {
      const dates = (saved.scale.dates || []).map(readDate);
      const holidayText = saved.holidayText || (saved.scale.holidays || []).join(',');
      const savedDsrTarget = Number(saved.dsrTarget ?? saved.scale.dsrTarget ?? dates.filter((date) => date.getDay() === 0 || parseHolidayText(holidayText).includes(formatDateKey(date))).length);
      const savedGenerationStart = saved.generationStart || saved.scale.generationStart || '2026-11-02';
      const savedGenerationEnd = saved.generationEnd || saved.scale.generationEnd || saved.scale.cycleEnd;
      const sourceDates = (saved.sourceScale.dates || []).map(readDate);
      const savedRanges = saved.vacationRanges || [];
      const savedHolidays = parseHolidayText(holidayText);
      const savedScale = saved.scale.assumptions?.version === escalaAssumptions.version
        ? { ...saved.scale, dates, dsrTarget: savedDsrTarget, generationStart: savedGenerationStart, generationEnd: savedGenerationEnd }
        : generateEscala({ scale: { ...saved.sourceScale, dates: sourceDates }, bank: saved.bank, generationStart: savedGenerationStart, generationEnd: savedGenerationEnd, dsrTarget: savedDsrTarget * projectionCycleCount(savedGenerationStart, savedGenerationEnd), vacationRanges: savedRanges, holidays: savedHolidays });
      return { ...saved, sourceScale: { ...saved.sourceScale, dates: sourceDates }, scale: savedScale, vacationRanges: savedRanges, dsrTarget: savedDsrTarget, generationStart: savedGenerationStart, generationEnd: savedGenerationEnd, holidayText };
    }
  } catch { /* volta à semente */ }
  return { sourceScale: initialScale, bank: initialBank, scale: defaultScale, vacationRanges: [], dsrTarget: defaultScale.dsrTarget, generationStart: defaultScale.generationStart, generationEnd: defaultScale.generationEnd, holidayText: holidays.join(',') };
}

function styleScaleSheet(sheet, scale, holidays, XLSX) {
  const dates = scale.dates.map(readDate);
  const headerStart = 7;
  const teamStyles = { A: { fill: '12B8E8', font: '003246' }, B: { fill: 'FFC400', font: '3D2B00' }, C: { fill: '12B66A', font: '003D2A' } };
  const border = { top: { style: 'thin', color: { rgb: '1D3B46' } }, bottom: { style: 'thin', color: { rgb: '1D3B46' } }, left: { style: 'thin', color: { rgb: '1D3B46' } }, right: { style: 'thin', color: { rgb: '1D3B46' } } };
  const totalColumns = headerStart + dates.length;
  for (let col = 0; col < totalColumns; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (!cell) continue;
    const date = dates[col - headerStart];
    const headerFill = col >= headerStart && date && holidays.includes(formatDateKey(date)) ? 'F59E0B' : col >= headerStart && date && isWeekend(date) ? 'CBD5E1' : '465761';
    cell.s = { fill: { patternType: 'solid', fgColor: { rgb: headerFill } }, font: { bold: true, color: { rgb: headerFill === 'CBD5E1' ? '173042' : 'FFFFFF' } }, alignment: { wrapText: true, horizontal: 'center', vertical: 'center' }, border };
  }
  scale.employees.forEach((person, rowIndex) => {
    const row = rowIndex + 1;
    const team = teamStyles[teamLetter(person.team)] || { fill: 'FFFFFF', font: '173042' };
    for (let col = 0; col < totalColumns; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (!cell) continue;
      const status = col >= headerStart ? person.assignments[formatDateKey(dates[col - headerStart])] : '';
      cell.s = { fill: { patternType: 'solid', fgColor: { rgb: team.fill } }, font: { color: { rgb: team.font }, bold: col >= headerStart && Boolean(status) }, alignment: { horizontal: col >= headerStart ? 'center' : 'left', vertical: 'center', wrapText: col === 5 }, border };
    }
  });
}

export default function ScalePlanningView() {
  const initial = useMemo(makeInitialState, []);
  const [sourceScale, setSourceScale] = useState(initial.sourceScale);
  const [bank, setBank] = useState(initial.bank);
  const [scale, setScale] = useState(initial.scale);
  const [generationStart, setGenerationStart] = useState(initial.generationStart || '2026-11-02');
  const [generationEnd, setGenerationEnd] = useState(initial.generationEnd || initial.scale.cycleEnd);
  const [holidayText, setHolidayText] = useState(initial.holidayText || '2026-10-28');
  const [holidayDraft, setHolidayDraft] = useState('');
  const [dsrTarget, setDsrTarget] = useState(Number(initial.dsrTarget || initial.scale.dsrTarget || 0));
  const [vacationRanges, setVacationRanges] = useState(initial.vacationRanges || []);
  const [vacationDraft, setVacationDraft] = useState({ registration: initial.sourceScale.employees[0]?.registration || '', start: initial.generationStart || '2026-11-02', end: initial.generationEnd || initial.scale.cycleEnd });
  const [message, setMessage] = useState('Escala carregada. Edite premissas e colaboradores antes de exportar.');
  const [editorMessage, setEditorMessage] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(initial.lastSavedAt || '');
  const [suggestionChoices, setSuggestionChoices] = useState({});
  const scaleInputRef = useRef(null);
  const bankInputRef = useRef(null);
  const holidays = useMemo(() => parseHolidayText(holidayText), [holidayText]);
  const alerts = useMemo(() => bank.rows.filter((row) => row.alert.tone !== 'ok').sort((a, b) => a.saldoTotalMinutes - b.saldoTotalMinutes), [bank]);
  const fuelCredits = useMemo(() => buildFuelCreditCandidates(scale), [scale]);
  const generatedDates = useMemo(() => scale.dates.map(readDate).filter((date) => date >= readDate(generationStart) && date <= readDate(generationEnd)), [scale.dates, generationStart, generationEnd]);
  const generatedDateKeys = useMemo(() => new Set(generatedDates.map(formatDateKey)), [generatedDates]);
  const changedAssignments = useMemo(() => scale.employees.reduce((sum, person) => sum + Object.keys(person.assignments).filter((key) => generatedDateKeys.has(key)).length, 0), [scale.employees, generatedDateKeys]);
  const projectionCycles = projectionCycleCount(generationStart, generationEnd);
  const cycleDsr = cycleDsrTarget(sourceScale, holidays);
  const correctionSuggestions = useMemo(() => buildScaleSuggestions(scale), [scale]);

  useEffect(() => {
    try { window.localStorage.setItem(SCALE_STORAGE_KEY, JSON.stringify({ sourceScale, bank, scale, vacationRanges, dsrTarget, generationStart, generationEnd, holidayText, lastSavedAt })); } catch { /* armazenamento local pode estar cheio */ }
  }, [sourceScale, bank, scale, vacationRanges, dsrTarget, generationStart, generationEnd, holidayText, lastSavedAt]);

  function buildNext(nextSource = sourceScale, nextBank = bank, nextRanges = vacationRanges, overrides = {}) {
    return generateEscala({ scale: nextSource, bank: nextBank, generationStart: overrides.generationStart ?? generationStart, generationEnd: overrides.generationEnd ?? generationEnd, dsrTarget: overrides.dsrTarget ?? (dsrTarget * projectionCycleCount(overrides.generationStart ?? generationStart, overrides.generationEnd ?? generationEnd)), vacationRanges: nextRanges, holidays: overrides.holidays ?? holidays });
  }
  function regenerate() {
    const next = buildNext();
    setScale(next);
    setMessage(next.validation.errors.length ? 'Há erros estruturais; corrija-os antes de exportar.' : 'Escala recalculada com as premissas atuais.');
  }
  function applyCorrection(suggestion) {
    const status = suggestionChoices[suggestion.id] || suggestion.defaultStatus;
    const next = applyScaleSuggestion(scale, { ...suggestion, status });
    setScale(next);
    setMessage(next.validation.errors.length ? 'Correção aplicada. A validação foi recalculada e ainda há pontos para revisar.' : 'Correção aplicada. A escala está válida para exportação.');
  }
  function addHoliday() {
    const value = holidayDraft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { setMessage('Informe o feriado no formato AAAA-MM-DD.'); return; }
    const next = [...new Set([...holidays, value])].sort();
    setHolidayText(next.join(',')); setHolidayDraft(''); setMessage(next.length + ' feriado(s) configurado(s). Clique em Salvar configurações para recalcular.');
  }
  function removeHoliday(value) {
    const next = holidays.filter((item) => item !== value);
    setHolidayText(next.join(',')); setMessage(next.length ? next.length + ' feriado(s) mantido(s).' : 'Nenhum feriado adicional configurado.');
  }
  async function saveConfiguration() {
    const expectedDsrTarget = dsrTarget * projectionCycles;
    const currentHolidays = [...(scale.holidays || [])].sort().join(',');
    const configuredHolidays = [...holidays].sort().join(',');
    const currentRanges = JSON.stringify(scale.vacationRanges || []);
    const configuredRanges = JSON.stringify(vacationRanges || []);
    const currentMatchesConfiguration = scale.generationStart === generationStart
      && scale.generationEnd === generationEnd
      && Number(scale.dsrTarget) === Number(expectedDsrTarget)
      && currentHolidays === configuredHolidays
      && currentRanges === configuredRanges;
    const next = currentMatchesConfiguration ? scale : buildNext();
    const savedAt = new Date().toISOString();
    setScale(next); setLastSavedAt(savedAt); setMessage(currentMatchesConfiguration ? 'Correções e configurações salvas. A escala foi revalidada para exportação.' : 'Configurações salvas. A planilha será gerada com a janela selecionada.');
    await exportWorkbook(next);
  }
  function validateRange(start, end) {
    const cycleStart = readDate(scale.scheduleStart || scale.cycleStart); const cycleEnd = readDate(generationEnd);
    const parsedStart = readDate(start); const parsedEnd = readDate(end);
    return parsedStart >= cycleStart && parsedEnd <= cycleEnd && parsedStart <= parsedEnd;
  }

  async function importScale(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames.find((name) => /escala|campo/i.test(name)) || workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
      const parsed = parseEscalaWorkbookRows(rows, file.name);
      if (!parsed.employees.length) throw new Error('Nenhum colaborador foi encontrado.');
      const importedScale = { ...parsed, importedAt: new Date().toISOString() };
      setSourceScale(importedScale);
      const nextDsr = cycleDsrTarget(parsed, holidays);
      setDsrTarget(nextDsr);
      const next = generateEscala({ scale: importedScale, bank, generationStart, generationEnd: parsed.cycleEnd, dsrTarget: nextDsr * projectionCycleCount(generationStart, parsed.cycleEnd), vacationRanges, holidays });
      setScale(next); setGenerationEnd(parsed.cycleEnd); setMessage(parsed.employees.length + ' colaboradores importados. O ciclo fixo permanece ' + parsed.cycleStart + ' a ' + parsed.cycleEnd + '.');
    } catch (error) { setMessage(error.message || 'Não foi possível ler a escala.'); }
    event.target.value = '';
  }
  async function importBank(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames.find((name) => /banco|hora/i.test(name)) || workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
      const parsed = parseBancoHorasWorkbookRows(rows, file.name);
      if (!parsed.rows.length) throw new Error('Nenhum saldo de banco de horas foi encontrado.');
      const importedBank = { ...parsed, importedAt: new Date().toISOString() };
      setBank(importedBank); setScale(buildNext(sourceScale, importedBank));
      setMessage(parsed.rows.length + ' saldos importados. Alertas usam K (Saldo BH Total acumulado); M orienta a recuperação.');
    } catch (error) { setMessage(error.message || 'Não foi possível ler o banco de horas.'); }
    event.target.value = '';
  }
  function updateEmployee(id, field, value) {
    const nextSource = { ...sourceScale, employees: sourceScale.employees.map((person) => {
      if (String(person.id) !== String(id)) return person;
      if (field === 'team') return { ...person, team: 'EQUIPE ' + value, assignments: { ...person.assignments } };
      if (field === 'car') return { ...person, car: Boolean(value) };
      return { ...person, [field]: value };
    }) };
    setSourceScale(nextSource); setScale(buildNext(nextSource)); setEditorMessage('Ajuste aplicado à escala. Salve/exporte quando terminar.');
  }
  function addVacationRange() {
    if (!vacationDraft.registration || !validateRange(vacationDraft.start, vacationDraft.end)) { setEditorMessage('Férias devem estar dentro do ciclo e o início não pode ser depois do fim.'); return; }
    const person = sourceScale.employees.find((item) => String(item.registration) === String(vacationDraft.registration));
    const nextRanges = [...vacationRanges.filter((range) => !(String(range.registration) === String(vacationDraft.registration) && range.start === vacationDraft.start && range.end === vacationDraft.end)), { registration: vacationDraft.registration, name: person?.name || '', start: vacationDraft.start, end: vacationDraft.end }];
    setVacationRanges(nextRanges); setScale(buildNext(sourceScale, bank, nextRanges)); setEditorMessage('Férias de ' + (person?.name || vacationDraft.registration) + ' adicionadas.');
  }
  function removeVacationRange(index) {
    const nextRanges = vacationRanges.filter((_, rangeIndex) => rangeIndex !== index);
    setVacationRanges(nextRanges); setScale(buildNext(sourceScale, bank, nextRanges)); setEditorMessage('Período de férias removido.');
  }
  async function exportWorkbook(scaleToExport = scale) {
    if (scaleToExport.validation.errors.length) { setMessage('Exportação bloqueada: corrija os erros estruturais.'); return; }
    const XLSX = (await import('xlsx-js-style')).default;
    const workbook = XLSX.utils.book_new();
    const start = readDate(generationStart); const end = readDate(generationEnd);
    const selectedDates = scaleToExport.dates.map(readDate).filter((date) => date >= start && date <= end);
    const historicalDates = scaleToExport.dates.map(readDate).filter((date) => date < start);
    const selectedScale = { ...scaleToExport, dates: selectedDates };
    const scaleSheet = XLSX.utils.aoa_to_sheet(buildScaleExportRows(selectedScale));
    scaleSheet['!cols'] = [18, 9, 22, 12, 12, 38, 19, ...selectedDates.map(() => 10)].map((wch) => ({ wch }));
    styleScaleSheet(scaleSheet, selectedScale, holidays, XLSX);
    XLSX.utils.book_append_sheet(workbook, scaleSheet, 'ESCALA CAMPO');
    if (historicalDates.length) {
      const historicalScale = { ...scaleToExport, dates: historicalDates };
      const historicalSheet = XLSX.utils.aoa_to_sheet(buildScaleExportRows(historicalScale));
      historicalSheet['!cols'] = [18, 9, 22, 12, 12, 38, 19, ...historicalDates.map(() => 10)].map((wch) => ({ wch }));
      styleScaleSheet(historicalSheet, historicalScale, holidays, XLSX);
      XLSX.utils.book_append_sheet(workbook, historicalSheet, 'HISTORICO_PRESERVADO');
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(buildBankExportRows(bank)), 'BANCO_ALERTAS');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(buildFuelCreditExportRows(selectedScale)), 'CREDITO_COMBUSTIVEL');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Regra', 'Resultado'],
      ['Ciclo de referência', scaleToExport.cycleStart + ' a ' + scaleToExport.cycleEnd],
      ['Janela selecionada', generationStart + ' a ' + generationEnd],
      ['Janela projetada', scaleToExport.scheduleStart + ' a ' + scaleToExport.scheduleEnd],
      ['Meta DSR por ciclo', dsrTarget],
      ['Meta DSR total da janela', scaleToExport.dsrTarget],
      ['Feriados configurados', holidays.join(', ') || 'Nenhum'],
      ['Última configuração salva', lastSavedAt || 'Nesta exportação'],
      ['Última importação de escala', sourceScale.importedAt || 'Base armazenada'],
      ['Última importação de banco', bank.importedAt || 'Base armazenada'],
      ['Validação', scaleToExport.validation.valid ? 'Válida' : 'Bloqueada'],
      ['Erros', scaleToExport.validation.errors.join(' | ') || 'Nenhum'],
      ['Avisos', scaleToExport.validation.warnings.join(' | ') || 'Nenhum'],
    ]), 'VALIDACAO');
    XLSX.writeFile(workbook, 'T-SIM_ESCALA_' + generationStart + '_A_' + generationEnd + '.xlsx', { cellStyles: true });
  }
  async function exportBankWorkbook() {
    const XLSX = (await import('xlsx-js-style')).default;
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(buildBankExportRows(bank));
    sheet['!cols'] = [14, 38, 24, 17, 19, 18, 16, 62].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, 'BANCO_ALERTAS');
    XLSX.writeFile(workbook, 'T-SIM_BANCO_HORAS_' + new Date().toISOString().slice(0, 10) + '.xlsx', { cellStyles: true });
    setMessage('Banco de horas exportado para alimentar a próxima programação.');
  }

  const statusCounts = scale.employees.reduce((acc, person) => { generatedDates.forEach((date) => { const status = person.assignments[formatDateKey(date)] || '—'; acc[status] = (acc[status] || 0) + 1; }); return acc; }, {});
  return <>
    <section className="hero-intro scale-hero"><div><div className="eyebrow"><span className="eyebrow-line" /> PLANEJAMENTO DE PLANTÃO</div><h1>Escala com<br /><em>cobertura editável.</em></h1><p>Edite meta DSR, janela de geração, férias, equipes, duplas e carro. O ciclo continua fixo no formato 16→15.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Ciclo ativo</div><strong>{formatDateLabel(readDate(scale.scheduleStart || scale.cycleStart))} → {formatDateLabel(readDate(scale.scheduleEnd || scale.cycleEnd))}</strong><span>Ciclo de referência: {formatDateLabel(readDate(scale.cycleStart))} → {formatDateLabel(readDate(scale.cycleEnd))}</span><span>Elaboração: {formatDateLabel(readDate(generationStart))} → {formatDateLabel(readDate(generationEnd))}</span><button type="button" onClick={regenerate}><RefreshCw size={14} /> Recalcular escala</button></div></section>
    <section className="metric-grid scale-metrics"><article className="metric metric-blue"><div className="metric-topline"><span>Colaboradores</span><UsersRound size={15} /></div><strong>{scale.employees.length}</strong><small>Fusão + Equipe L</small></article><article className="metric metric-violet"><div className="metric-topline"><span>Dias gerados</span><CalendarDays size={15} /></div><strong>{generatedDates.length}</strong><small>{changedAssignments} células recalculadas</small></article><article className={'metric ' + (alerts.length ? 'metric-orange' : 'metric-green')}><div className="metric-topline"><span>Negativados por K</span><ShieldAlert size={15} /></div><strong>{alerts.length}</strong><small>{alerts.length ? 'Saldo BH Total abaixo de zero' : 'nenhum saldo K negativo importado'}</small></article><article className="metric metric-orange"><div className="metric-topline"><span>Meta DSR</span><CalendarDays size={15} /></div><strong>{scale.dsrTarget}</strong><small>{dsrTarget} por ciclo · {projectionCycles} ciclo(s) · calculada: {cycleDsr}</small></article></section>
    <section className="panel-surface scale-controls"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Fontes, ciclo e regras</h2><p>A primeira carga preserva o histórico já ocorrido; a janela pode atravessar vários ciclos 16→15.</p></div></div><div className="panel-heading-actions"><input id="scale-file" name="scaleFile" ref={scaleInputRef} hidden type="file" accept=".xlsx" onChange={importScale} /><input id="bank-file" name="bankFile" ref={bankInputRef} hidden type="file" accept=".xlsx" onChange={importBank} /><button className="secondary-button" type="button" onClick={() => scaleInputRef.current?.click()}><Upload size={14} /> Importar escala</button><button className="secondary-button" type="button" onClick={() => bankInputRef.current?.click()}><Upload size={14} /> Importar banco</button><button className="primary-button scale-export" type="button" onClick={exportWorkbook} disabled={scale.validation.errors.length > 0}><Download size={14} /> Baixar Excel</button></div></div><div className="scale-input-grid scale-input-grid-four"><label className="field"><span>Gerar a partir de</span><input id="scale-generation-start" name="generationStart" type="date" min={scale.scheduleStart || scale.cycleStart} value={generationStart} onChange={(event) => setGenerationStart(event.target.value)} /><small>O primeiro ciclo começa no dia 16 e termina no dia 15.</small></label><label className="field"><span>Gerar até</span><input id="scale-generation-end" name="generationEnd" type="date" min={scale.scheduleStart || scale.cycleStart} value={generationEnd} onChange={(event) => setGenerationEnd(event.target.value)} /><small>Pode atravessar vários ciclos; cada ciclo continua 16→15.</small></label><label className="field"><span>Meta DSR por ciclo</span><input id="scale-dsr-target" name="dsrTarget" type="number" min="0" max={scale.dates.length} value={dsrTarget} onChange={(event) => setDsrTarget(Math.max(0, Number(event.target.value) || 0))} /><small>Calculada: {cycleDsr}. Total projetado: {dsrTarget * projectionCycles}. DSR vem antes de FBH.</small></label><div className="scale-holiday-editor"><span className="scale-holiday-label">Feriados do ciclo</span><div className="scale-holiday-add"><input id="scale-holiday-draft" name="holidayDraft" type="date" value={holidayDraft} onChange={(event) => setHolidayDraft(event.target.value)} /><button className="secondary-button" type="button" onClick={addHoliday}><Plus size={14} /> Adicionar</button></div><small>Opcional: cada data informada conta como DSR e recebe destaque. Não é a data de geração.</small><div className="scale-holiday-list">{holidays.map((holiday) => <span key={holiday}>{holiday}<button type="button" aria-label={'Remover feriado ' + holiday} onClick={() => removeHoliday(holiday)}><Trash2 size={12} /></button></span>)}{!holidays.length && <em>Nenhum feriado cadastrado</em>}</div></div></div><div className="scale-config-footer"><span>Última escala: {sourceScale.importedAt ? new Date(sourceScale.importedAt).toLocaleString('pt-BR') : 'base armazenada'} · Banco: {bank.importedAt ? new Date(bank.importedAt).toLocaleString('pt-BR') : 'base armazenada'}{lastSavedAt ? ' · Salvo: ' + new Date(lastSavedAt).toLocaleString('pt-BR') : ''}</span><button className="primary-button scale-save-config" type="button" onClick={saveConfiguration}><Save size={14} /> Salvar configurações</button></div><div className="panel-note"><FileSpreadsheet size={16} /><span role="status">{message}</span></div>{scale.validation.errors.length > 0 && <div className="scale-validation-panel scale-validation-inline"><div className="panel-heading compact"><div><span className="section-index">07</span><div><h2>Validação bloqueante</h2><p>Corrija as inconsistências antes de exportar.</p></div></div></div><ul>{scale.validation.errors.slice(0, 12).map((error) => <li key={error}>{error}</li>)}</ul><div className="scale-correction-list"><div className="scale-correction-intro"><strong>Recomendações automáticas</strong><span>Analise cada caso. Você pode escolher o status sugerido, aplicar a correção e revalidar a escala antes de exportar.</span></div>{correctionSuggestions.slice(0, 12).map((suggestion) => <article className="scale-correction-card" key={suggestion.id}><div><strong>{suggestion.title}</strong><span>{suggestion.detail}</span><small>{suggestion.action}</small></div>{suggestion.canApply ? <div className="scale-correction-actions"><select aria-label={'Status sugerido para ' + suggestion.name} value={suggestionChoices[suggestion.id] || suggestion.defaultStatus || ''} onChange={(event) => setSuggestionChoices((current) => ({ ...current, [suggestion.id]: event.target.value }))}>{(suggestion.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select><button className="secondary-button" type="button" onClick={() => applyCorrection(suggestion)}>Aceitar e aplicar</button></div> : <span className="scale-correction-manual">Revisão manual</span>}</article>)}</div></div>}</section>
    <section className="panel-surface scale-table-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Escala gerada</h2><p>Data, dia abreviado, grupo, férias e status ficam visíveis na mesma grade.</p></div></div><div className="scale-legend"><span className={statusClass('T')}>T</span><span className={statusClass('SA')}>SA</span><span className={statusClass('DSR')}>DSR</span><span className={statusClass('FBH')}>FBH</span><span className={statusClass('FÉRIAS')}>Férias</span></div></div><div className="scale-table-wrap"><table className="scale-table"><caption className="sr-only">Escala diária por colaborador</caption><thead><tr><th>Colaborador</th><th>Equipe</th><th>Dupla / carro</th>{scale.dates.map((dateValue) => { const date = readDate(dateValue); const key = formatDateKey(date); return <th className={(date >= readDate(generationStart) && date <= readDate(generationEnd) ? 'is-generated ' : '') + (isWeekend(date) ? 'is-weekend ' : '') + (holidays.includes(key) ? 'is-holiday' : '')} key={key}>{formatDateLabel(date)}<small>{weekdayLabels[date.getDay()]}</small></th>; })}</tr></thead><tbody>{scale.employees.map((person) => <tr className={groupRowClass(person.team) + (Object.values(person.assignments).includes('FÉRIAS') ? ' has-vacation' : '')} key={person.id}><td><strong>{person.name}</strong><small>{person.registration} · {person.role}</small></td><td>{person.team}<small>{person.className} · {person.shift}</small></td><td>{person.pair}<small>{person.car ? 'Líder com carro' : 'Auxiliar / sem carro'}</small></td>{scale.dates.map((dateValue) => { const date = readDate(dateValue); const key = formatDateKey(date); const status = person.assignments[key] || '—'; return <td className={(date >= readDate(generationStart) && date <= readDate(generationEnd) ? 'is-generated ' : '') + (isWeekend(date) ? 'is-weekend ' : '') + (holidays.includes(key) ? 'is-holiday ' : '') + (status === 'FÉRIAS' ? 'is-vacation' : '')} key={key}><span className={statusClass(status)}>{status}</span></td>; })}</tr>)}</tbody></table></div><div className="scale-footer-summary"><span><b>T</b> {statusCounts.T || 0} · <b>SA</b> {statusCounts.SA || 0} · <b>DSR</b> {statusCounts.DSR || 0} · <b>FBH</b> {statusCounts.FBH || 0}</span><span>Meta DSR: {scale.dsrTarget} · {scale.validation.errors.length ? scale.validation.errors.length + ' erro(s)' : 'Sem erro estrutural'} · {scale.validation.warnings.length} aviso(s)</span></div></section>
    <section className="scale-work-grid scale-rules-only"><div className="panel-surface scale-rules-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Regras aplicadas</h2><p>Prioridade operacional explícita.</p></div></div></div><div className="scale-rule-list"><div><strong>DSR</strong><span>Meta {dsrTarget} por ciclo; total projetado {scale.dsrTarget}, validada antes de FBH.</span></div><div><strong>FBH</strong><span>Só entra depois da meta DSR; se faltar DSR, o descanso é convertido em DSR.</span></div><div><strong>Saldo</strong><span>K define negativação; M orienta recuperação e prioridade em T.</span></div><div><strong>SA</strong><span>Um grupo Fusão por dia; Equipe L mantém duas duplas.</span></div><div><strong>FIM DE SEMANA</strong><span>O grupo de SA do sábado é diferente do grupo de SA do domingo. O terceiro grupo pode concentrar FBH/DSR nos dois dias, sem repetir essa folga no fim de semana seguinte.</span></div></div></div></section>
    <section className="scale-editor-grid"><div className="panel-surface scale-vacation-panel"><div className="panel-heading compact"><div><span className="section-index">04</span><div><h2>Férias por colaborador</h2><p>Selecione a pessoa e o intervalo dentro da janela projetada.</p></div></div></div><div className="scale-vacation-form"><label className="field"><span>Colaborador</span><select value={vacationDraft.registration} onChange={(event) => setVacationDraft((current) => ({ ...current, registration: event.target.value }))}>{sourceScale.employees.map((person) => <option key={person.registration} value={person.registration}>{person.name} · {person.registration}</option>)}</select></label><label className="field"><span>Início</span><input type="date" min={scale.scheduleStart || scale.cycleStart} max={generationEnd} value={vacationDraft.start} onChange={(event) => setVacationDraft((current) => ({ ...current, start: event.target.value }))} /></label><label className="field"><span>Fim</span><input type="date" min={scale.scheduleStart || scale.cycleStart} max={generationEnd} value={vacationDraft.end} onChange={(event) => setVacationDraft((current) => ({ ...current, end: event.target.value }))} /></label><button className="secondary-button" type="button" onClick={addVacationRange}><Plus size={14} /> Adicionar férias</button></div>{vacationRanges.length ? <div className="scale-vacation-list">{vacationRanges.map((range, index) => <div key={range.registration + '-' + range.start + '-' + range.end}><span><strong>{range.name || range.registration}</strong><small>{range.start} → {range.end}</small></span><button className="icon-button" type="button" aria-label="Remover férias" onClick={() => removeVacationRange(index)}><Trash2 size={14} /></button></div>)}</div> : <div className="scale-empty scale-empty-inline"><CalendarDays size={18} /><span>Nenhum intervalo adicional. Férias já existentes na fonte continuam preservadas.</span></div>}</div><div className="panel-surface scale-editor-panel"><div className="panel-heading compact"><div><span className="section-index">05</span><div><h2>Equipe, dupla e carro</h2><p>Edite a formação e salve a proposta antes de baixar.</p></div></div><div className="panel-heading-actions"><span className="source-chip">{editorMessage || 'Edição local'}</span><button className="primary-button scale-editor-save" type="button" onClick={() => setEditorMessage('Ajustes salvos no ambiente local.')}><Save size={14} /> Salvar ajustes</button></div></div><div className="scale-editor-table-wrap"><table className="scale-editor-table"><caption className="sr-only">Colaboradores editáveis</caption><thead><tr><th>Colaborador</th><th>Equipe</th><th>Dupla</th><th>Carro</th></tr></thead><tbody>{sourceScale.employees.map((person) => <tr key={person.id}><td><strong>{person.name}</strong><small>{person.registration} · {person.role}</small></td><td><select id={'team-' + person.id} name={'team-' + person.id} value={teamLetter(person.team)} onChange={(event) => updateEmployee(person.id, 'team', event.target.value)}><option>A</option><option>B</option><option>C</option></select></td><td><input id={'pair-' + person.id} name={'pair-' + person.id} value={person.pair || ''} aria-label={'Dupla de ' + person.name} onChange={(event) => updateEmployee(person.id, 'pair', event.target.value)} /></td><td><label className="scale-car-toggle"><input id={'car-' + person.id} name={'car-' + person.id} type="checkbox" checked={Boolean(person.car)} onChange={(event) => updateEmployee(person.id, 'car', event.target.checked)} /><span>{person.car ? 'Sim' : 'Não'}</span></label></td></tr>)}</tbody></table></div><div className="panel-note"><Save size={16} /><span>{editorMessage || 'As alterações são salvas no ambiente local e aplicadas ao próximo recálculo.'}</span></div></div></section>
    <section className="scale-work-grid scale-bank-only"><div className="panel-surface scale-bank-panel"><div className="panel-heading compact"><div><span className="section-index">06</span><div><h2>Banco de horas</h2><p>K é o saldo total acumulado; M é o que ainda falta reduzir no ciclo.</p></div></div><div className="panel-heading-actions scale-bank-actions"><span className="source-chip">{bank.rows.length} registros · {alerts.length} negativado(s)</span><button className="secondary-button" type="button" onClick={() => bankInputRef.current?.click()}><Upload size={14} /> Importar banco</button><button className="secondary-button" type="button" onClick={exportBankWorkbook}><Download size={14} /> Exportar banco</button></div></div><div className="scale-bank-table-wrap"><table className="scale-bank-table"><caption className="sr-only">Saldos de banco de horas por colaborador</caption><thead><tr><th>Colaborador</th><th>Saldo K acumulado</th><th>Falta M reduzir</th><th>Alerta</th></tr></thead><tbody>{[...bank.rows].sort((a, b) => a.saldoTotalMinutes - b.saldoTotalMinutes).map((row) => <tr className={row.alert.tone !== 'ok' ? 'is-negative' : ''} key={row.registration}><td><strong>{row.name}</strong><small>{row.registration} · {row.role}</small></td><td>{formatHours(row.saldoTotalMinutes)}</td><td>{formatHours(row.faltareduzirMinutes)}</td><td><span className={'scale-alert-badge scale-alert-' + row.alert.tone}>{row.alert.level}</span></td></tr>)}</tbody></table></div></div></section>
  </>;
}
