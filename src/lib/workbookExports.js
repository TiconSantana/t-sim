import { HEADCOUNT_HEADERS, headcountRecordToRow, safeProfileFileName } from '../domain/headcount';

const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value ?? '') : date.toLocaleDateString('pt-BR');
};

async function saveWorkbook(sheetName, rows, fileName, widths) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  for (let row = 2; row <= rows.length; row += 1) {
    if (sheetName === 'BASE OPERACIONAL' && sheet[`H${row}`]) sheet[`H${row}`].z = 'dd/mm/yyyy';
    if (sheetName === 'CENÁRIO' && sheet[`K${row}`]) sheet[`K${row}`].z = '"R$" #,##0.00';
  }
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

export async function exportHeadcountTemplate(profileName) {
  const name = safeProfileFileName(profileName);
  await saveWorkbook('BASE OPERACIONAL', [HEADCOUNT_HEADERS], `HEADCOUNT BASE OPERACIONAL ATUAL-${name}.xlsx`, [18, 9, 18, 30, 34, 15, 30, 18, 20, 16, 20, 16]);
}

export async function exportHeadcountBase(people, profileName) {
  const name = safeProfileFileName(profileName);
  const rows = [HEADCOUNT_HEADERS, ...people.map((person) => {
    const row = headcountRecordToRow(person);
    const [year, month, day] = String(person.admissionDate || '').split('-').map(Number);
    if (year && month && day) row[7] = new Date(year, month - 1, day);
    return row;
  })];
  await saveWorkbook('BASE OPERACIONAL', rows, `HEADCOUNT BASE OPERACIONAL ATUAL-${name}.xlsx`, [18, 9, 18, 30, 34, 15, 30, 18, 20, 16, 20, 16]);
}

export async function exportScenarios(scenarios, cargos, approvals, profileName) {
  const name = safeProfileFileName(profileName);
  const findCargoName = (id) => cargos.find((cargo) => cargo.id === id)?.name || id || '';
  const headers = ['NOME DO CENÁRIO', 'DATA', 'CARGO DESLIGADO', 'QUANTIDADE DESLIGADA', 'MATRÍCULA DESLIGAMENTO', 'NOME DESLIGAMENTO', 'CARGO ORIGEM', 'CARGO DESTINO', 'MATRÍCULA A PROMOVER', 'NOME A PROMOVER', 'SALDO MENSAL', 'OBSERVAÇÃO'];
  const eligibleScenarios = scenarios.filter((scenario) => {
    const involved = [scenario.dismissedRole, scenario.originRole, scenario.destinationRole]
      .map((id) => cargos.find((cargo) => cargo.id === id));
    const reference = scenario.salaryReference || {};
    return !scenario.approvalBlocked && !scenario.budgetBlocked && !scenario.promotionBlocked
      && involved.every((cargo) => cargo?.source && cargo?.validity)
      && reference.source && reference.validity && reference.version && reference.responsible && reference.responsible !== 'A confirmar';
  });
  const rows = eligibleScenarios.map((scenario) => [
    scenario.name, dateLabel(scenario.savedAt), findCargoName(scenario.dismissedRole), scenario.quantity,
    (scenario.dismissedEmployees || []).map((person) => person.employeeId).filter(Boolean).join('; '),
    (scenario.dismissedEmployees || []).map((person) => person.name).filter(Boolean).join('; '),
    findCargoName(scenario.originRole), findCargoName(scenario.destinationRole),
    (scenario.promotedEmployees || []).map((person) => person.employeeId).filter(Boolean).join('; '),
    (scenario.promotedEmployees || []).map((person) => person.name).filter(Boolean).join('; '),
    Number(scenario.appliedBalance ?? 0),
    [
      `${scenario.manualMode ? 'Promoções manuais' : 'Promoções aplicadas'}: ${scenario.appliedPromotions ?? 0}`,
      `Saldo anual: ${Number(scenario.appliedAnnualBalance ?? 0).toFixed(2)}`,
      Number.isFinite(scenario.operationalCoverage) ? `Cobertura: ${scenario.operationalCoverage.toFixed(1)}%` : '',
      `Fonte: ${scenario.source || 'Informada pelo usuário'}`,
      `Referência salarial: ${scenario.salaryReference?.source || 'Não informada'}`,
      `Vigência: ${scenario.salaryReference?.validity || 'Não informada'}`,
      `Versão: ${scenario.salaryReference?.version || 'Não informada'}`,
      `Responsável: ${scenario.salaryReference?.responsible || 'Não informado'}`,
      `Status: ${approvals[scenario.id]?.status || scenario.status || 'Rascunho'}`,
      scenario.importedNotes || '',
    ].filter(Boolean).join(' · '),
  ]);
  await saveWorkbook('CENÁRIO', [headers, ...rows], `CENÁRIO-${safeProfileFileName(profileName)}.xlsx`, [30, 15, 34, 20, 22, 28, 34, 34, 22, 28, 18, 90]);
  return { exported: eligibleScenarios.length, omitted: scenarios.length - eligibleScenarios.length };
}
