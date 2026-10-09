export const HEADCOUNT_HEADERS = [
  'REGIONAL', 'UF', 'MATRÍCULA', 'NOME', 'CARGO', 'NÍVEL',
  'GESTOR RESPONSÁVEL', 'DATA ADMISSÃO', 'SEGUIMENTO', 'TURNO ', 'CARRO AGREGADO', 'STATUS',
];

const normalize = (value) => String(value ?? '').trim().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const text = (value) => String(value ?? '').trim();
const dateValue = (value) => {
  let year, month, day;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    year = value.getFullYear(); month = value.getMonth() + 1; day = value.getDate();
  } else {
    const source = text(value);
    const iso = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const br = source.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (iso) [, year, month, day] = iso.map((part) => Number(part));
    else if (br) [, day, month, year] = br.map((part) => Number(part));
    else return '';
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export function parseHeadcountRows(rows) {
  const header = rows?.[0] ?? [];
  const indexes = HEADCOUNT_HEADERS.map((expected) => header.findIndex((cell) => normalize(cell) === normalize(expected)));
  const headerOk = indexes.every((index, position) => index === position);
  if (!headerOk) return { records: [], errors: ['O cabeçalho precisa conter as 12 colunas da planilha padrão, na mesma ordem.'] };

  const errors = [];
  const records = [];
  const seen = new Set();
  for (let rowIndex = 1; rowIndex < (rows?.length ?? 0); rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (!row.some((cell) => text(cell))) continue;
    const values = indexes.map((index) => row[index]);
    const missing = HEADCOUNT_HEADERS.filter((_, index) => !text(values[index]));
    if (missing.length) {
      errors.push(`Linha ${rowIndex + 1}: preencha ${missing.join(', ')}.`);
      continue;
    }
    const admissionDate = dateValue(values[7]);
    if (!admissionDate) {
      errors.push(`Linha ${rowIndex + 1}: DATA ADMISSÃO precisa ser uma data válida.`);
      continue;
    }
    const employeeId = text(values[2]);
    const duplicateKey = normalize(employeeId);
    if (seen.has(duplicateKey)) {
      errors.push(`Linha ${rowIndex + 1}: matrícula ${employeeId} repetida na planilha.`);
      continue;
    }
    seen.add(duplicateKey);
    records.push({
      id: employeeId,
      region: text(values[0]), state: text(values[1]).toUpperCase(), employeeId,
      name: text(values[3]), role: text(values[4]), level: text(values[5]),
      manager: text(values[6]), admissionDate, segment: text(values[8]),
      shift: text(values[9]), assignedVehicle: text(values[10]), status: text(values[11]),
    });
  }
  if (!records.length && !errors.length) errors.push('A planilha não contém colaboradores preenchidos.');
  if (errors.length) return { records: [], errors };
  return { records, errors: [] };
}

export function headcountRecordToRow(person) {
  return [person.region, person.state, person.employeeId, person.name, person.role, person.level,
    person.manager, person.admissionDate, person.segment, person.shift, person.assignedVehicle, person.status];
}

export function safeProfileFileName(name) {
  return String(name || 'Perfil').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '').replace(/\s+/g, ' ').slice(0, 80) || 'Perfil';
}
