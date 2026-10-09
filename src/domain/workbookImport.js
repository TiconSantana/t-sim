const normalize = (value) => String(value ?? '')
  .replace(/r\$/gi, '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

const number = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let text = String(value ?? '').trim().replace(/[\s\u00a0]/g, '');
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text);
  text = text.replace(/[()]/g, '').replace(/[^\d,.-]/g, '');
  if (!/^-?(?:\d+(?:[.,]\d+)*|[.,]\d+)$/.test(text)) return null;
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.';
    const thousands = decimal === ',' ? /\./g : /,/g;
    text = text.replace(thousands, '').replace(decimal, '.');
  } else if (comma >= 0 || dot >= 0) {
    const separator = comma >= 0 ? ',' : '.';
    const parts = text.split(separator);
    const thousandsOnly = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length > 0 && Number(parts[0]) !== 0);
    text = thousandsOnly ? parts.join('') : `${parts.slice(0, -1).join('')}.${parts.at(-1)}`;
  }
  let parsed = Number(text);
  if (negative) parsed *= -1;
  return Number.isFinite(parsed) ? parsed : null;
};

const firstColumn = (headers, ...names) => headers.findIndex((header) => names.includes(header));
const cell = (row, index, fallback = '') => index < 0 ? fallback : row[index] ?? fallback;
const text = (value) => String(value ?? '').trim();

export function retainExistingIfImportEmpty(imported, existing) {
  return imported.length ? imported : existing;
}

function table(rows, headerMatcher) {
  const headerIndex = rows.findIndex((row) => row.some((item) => headerMatcher.includes(normalize(item))));
  if (headerIndex < 0) return null;
  return { headerIndex, headers: rows[headerIndex].map(normalize), body: rows.slice(headerIndex + 1).filter((row) => row.some((item) => text(item))) };
}

const roleId = (label, cargos) => {
  const normalized = normalize(label);
  const exact = cargos.find((cargo) => normalize(cargo.name) === normalized || normalize(cargo.short) === normalized || normalize(cargo.level) === normalized);
  if (exact) return exact.id;
  if (normalized.includes('auxiliar')) return cargos.find((cargo) => cargo.id === 'auxiliar')?.id;
  const roman = normalized.match(/(?:nivel|n|tecnico)?(ii|iii|iv|vi|v|i|[1-6])$/)?.[1];
  const levelNumber = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 }[roman] ?? Number(roman);
  return cargos.find((cargo) => Number(cargo.level?.match(/\d+/)?.[0]) === levelNumber)?.id;
};

export function parseCargoSheet(rows, cargos) {
  const parsed = table(rows, ['cargo', 'funcao', 'nomecargo', 'salariobase', 'salariomensal', 'salario', 'remuneracao', 'remuneracaoatual', 'valor', 'valorsalario']);
  if (!parsed) return { cargos: null, encargos: null, count: 0, ids: [] };
  const { headers, body } = parsed;
  const nameCol = firstColumn(headers, 'cargo', 'funcao', 'nomecargo');
  const levelCol = firstColumn(headers, 'nivel', 'level');
  const salaryCol = firstColumn(headers, 'salariobase', 'salariomensal', 'salarioatual', 'salario', 'remuneracao', 'remuneracaoatual', 'valor', 'valorsalario');
  const burdenCol = firstColumn(headers, 'encargos', 'encargospercentual', 'percentualdeencargos', 'percentualencargos');
  const sourceCol = firstColumn(headers, 'fonte', 'origem', 'source');
  const validityCol = firstColumn(headers, 'vigencia', 'validade', 'versao');
  const ownerCol = firstColumn(headers, 'responsavel', 'proprietario');
  if (nameCol < 0 || salaryCol < 0) return { cargos: null, encargos: null, count: 0, ids: [] };
  const next = cargos.map((cargo) => ({ ...cargo }));
  let count = 0;
  const importedIds = new Set();
  let burden = null;
  for (const row of body) {
    const name = text(cell(row, nameCol));
    const salary = number(cell(row, salaryCol));
    if (!name || salary === null || salary <= 0) continue;
    let id = roleId(name, next);
    let index = next.findIndex((cargo) => cargo.id === id);
    if (!id && levelCol >= 0 && text(cell(row, levelCol))) {
      const slug = normalize(name);
      id = `cargo-${slug}`;
      index = next.findIndex((cargo) => cargo.id === id);
      if (index < 0) {
        next.push({ id, name, short: name, level: text(cell(row, levelCol)), salary, tone: 'slate' });
        index = next.length - 1;
      }
    }
    if (index < 0) continue;
    next[index] = {
      ...next[index], salary,
      name,
      short: next[index].short || name,
      level: text(cell(row, levelCol)) || next[index].level,
      source: text(cell(row, sourceCol)) || 'Planilha importada · fonte a validar',
      validity: text(cell(row, validityCol)) || 'Vigência a confirmar',
      responsible: text(cell(row, ownerCol)),
    };
    const rowBurden = number(cell(row, burdenCol));
    if (rowBurden !== null && rowBurden >= 0) burden = rowBurden > 10 ? rowBurden / 100 : rowBurden;
    count += 1;
    importedIds.add(id);
  }
  next.sort((a, b) => Number(a.level?.match(/\d+/)?.[0] || 0) - Number(b.level?.match(/\d+/)?.[0] || 0));
  return { cargos: count ? next : null, encargos: burden, count, ids: [...importedIds] };
}

function parseCargoSalaryPairs(sheets, cargos) {
  const salaryCandidates = new Map();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const parsed = table(rows, ['cargoorigem', 'cargodestino']);
    if (!parsed) continue;
    const { headers, body } = parsed;
    const pairs = [
      [firstColumn(headers, 'cargoorigem'), firstColumn(headers, 'salarioorigem', 'salariobaseorigem')],
      [firstColumn(headers, 'cargodestino'), firstColumn(headers, 'salariodestino', 'salariobasedestino')],
    ];
    if (!pairs.some(([roleCol, salaryCol]) => roleCol >= 0 && salaryCol >= 0)) continue;
    for (const row of body) {
      for (const [roleCol, salaryCol] of pairs) {
        if (roleCol < 0 || salaryCol < 0) continue;
        const id = roleId(cell(row, roleCol), cargos);
        const salary = number(cell(row, salaryCol));
        if (!id || salary === null || salary <= 0) continue;
        if (!salaryCandidates.has(id)) salaryCandidates.set(id, new Map());
        const values = salaryCandidates.get(id);
        const key = salary.toFixed(2);
        values.set(key, { salary, source: sheetName });
      }
    }
  }

  const next = cargos.map((cargo) => ({ ...cargo }));
  const updatedIds = new Set();
  const ambiguousIds = [];
  for (const [id, candidates] of salaryCandidates) {
    // Salary pairs can repeat a role across many alternatives. Apply only a
    // single unambiguous value; conflicting workbook values need human review.
    if (candidates.size !== 1) { ambiguousIds.push(id); continue; }
    const candidate = [...candidates.values()][0];
    const index = next.findIndex((cargo) => cargo.id === id);
    if (index < 0) continue;
    next[index] = {
      ...next[index], salary: candidate.salary,
      source: `${candidate.source} · pares de salários importados`,
      validity: 'Vigência a confirmar',
    };
    updatedIds.add(id);
  }
  return { cargos: updatedIds.size ? next : null, count: updatedIds.size, ids: [...updatedIds], ambiguousIds };
}

export function parsePeopleSheet(rows) {
  const parsed = table(rows, ['nome', 'nomecompleto', 'colaborador', 'funcionario', 'matricula', 'email']);
  if (!parsed) return [];
  const { headers, body } = parsed;
  const cols = {
    name: firstColumn(headers, 'nome', 'nomecompleto', 'colaborador', 'funcionario'),
    employeeId: firstColumn(headers, 'matricula', 'matriculaid', 'id', 'registro', 'registrofuncional'),
    email: firstColumn(headers, 'email', 'e-mail'),
    role: firstColumn(headers, 'cargo', 'funcao'),
    level: firstColumn(headers, 'nivel', 'level'),
    region: firstColumn(headers, 'regiao', 'regional', 'regionaloperacional', 'areaoperacional', 'polo', 'uf'),
    shift: firstColumn(headers, 'turno', 'jornada', 'periodo'),
    activity: firstColumn(headers, 'atividade', 'atividadeoperacional', 'tipoatividade', 'servico', 'operacao'),
    status: firstColumn(headers, 'status', 'statusatual', 'situacao', 'situacaoatual'),
    admissionDate: firstColumn(headers, 'dataadmissao', 'admissao', 'datadeadmissao'),
    salary: firstColumn(headers, 'salariobase', 'salario', 'remuneracao'),
    notes: firstColumn(headers, 'observacao', 'observacoes', 'notas'),
  };
  if (cols.name < 0) return [];
  return body.map((row, index) => ({
    id: text(cell(row, cols.employeeId)) || text(cell(row, cols.email)) || `person-${Date.now()}-${index}`,
    name: text(cell(row, cols.name)), employeeId: text(cell(row, cols.employeeId)), email: text(cell(row, cols.email)),
    role: text(cell(row, cols.role)), level: text(cell(row, cols.level)), region: text(cell(row, cols.region)),
    shift: text(cell(row, cols.shift)), activity: text(cell(row, cols.activity)), status: text(cell(row, cols.status)),
    admissionDate: text(cell(row, cols.admissionDate)), salary: number(cell(row, cols.salary)), notes: text(cell(row, cols.notes)),
  })).filter((person) => person.name);
}

export function parseAssumptionsSheet(rows) {
  const parsed = table(rows, ['parametro', 'valor', 'unidade']);
  if (!parsed) return [];
  const { headers, body } = parsed;
  const cols = {
    key: firstColumn(headers, 'parametro', 'premissa', 'nome'), value: firstColumn(headers, 'valor'),
    unit: firstColumn(headers, 'unidade', 'unit'), source: firstColumn(headers, 'fonte', 'origem'),
    validity: firstColumn(headers, 'vigencia', 'validade'), owner: firstColumn(headers, 'responsavel'),
    notes: firstColumn(headers, 'observacao', 'notas'),
  };
  if (cols.key < 0 || cols.value < 0) return [];
  return body.map((row) => ({ key: text(cell(row, cols.key)), value: cell(row, cols.value), unit: text(cell(row, cols.unit)), source: text(cell(row, cols.source)), validity: text(cell(row, cols.validity)), owner: text(cell(row, cols.owner)), notes: text(cell(row, cols.notes)) })).filter((item) => item.key && item.value !== '');
}

export function applyAssumptions({ assumptions, configuration, operations }) {
  let nextConfiguration = configuration;
  let nextOperations = operations;
  for (const item of assumptions) {
    const key = normalize(item.key);
    const value = number(item.value);
    if (value === null) continue;
    if (key.includes('encargo') || key.includes('folha')) {
      nextConfiguration = { ...nextConfiguration, encargos: value > 10 || normalize(item.unit).includes('percent') || normalize(item.unit) === 'porcentagem' ? value / 100 : value };
    } else if (key.includes('sla')) {
      nextOperations = { ...nextOperations, slaTarget: value };
    } else if (key.includes('margem') || key.includes('seguranca')) {
      nextOperations = { ...nextOperations, safetyBuffer: value };
    } else if (key.includes('headcount') || key === 'hcbase') {
      nextOperations = { ...nextOperations, teamHeadcount: value };
    }
  }
  return { configuration: nextConfiguration, operations: nextOperations };
}

export function parseOperationalWorkbook(sheets, currentOperations) {
  const sheetEntries = Object.entries(sheets);
  const dimensionRows = [];
  const costs = [];
  const headcountBases = [];
  for (const [sheetName, rows] of sheetEntries) {
    if (/custosequipes|campo|salatecnica|salatenica|controlelocal/.test(normalize(sheetName))) continue;
    const parsed = table(rows, ['regiao', 'regional', 'regionaloperacional', 'areaoperacional', 'polo', 'turno', 'periodo', 'atividade', 'atividadeoperacional', 'tipoatividade', 'servico', 'hcatual', 'headcountatual', 'headcount']);
    if (!parsed) continue;
    const { headers, body } = parsed;
    const col = {
      region: firstColumn(headers, 'regiao', 'regional', 'regionaloperacional', 'areaoperacional', 'polo', 'uf'), shift: firstColumn(headers, 'turno', 'jornada', 'periodo'),
      activity: firstColumn(headers, 'atividade', 'atividadeoperacional', 'tipoatividade', 'tipodeatividade', 'funcao', 'servico', 'operacao'), teamClass: firstColumn(headers, 'classe', 'classeequipe', 'classedeequipe', 'equipe', 'tipodeequipe'),
      current: firstColumn(headers, 'hcatual', 'headcountatual', 'quantidadeatual', 'quantidadehc', 'qtdhc', 'qtdcolaboradores', 'equipeatual', 'headcount', 'hc'), required: firstColumn(headers, 'hcrequerido', 'headcountrequerido', 'headcountnecessario', 'hcdemandado', 'hcideal', 'necessidadehc', 'qtdnecessaria', 'requerido', 'necessario'),
      capacity: firstColumn(headers, 'capacidadeporhc', 'capacidadeporpessoa', 'capacidade', 'producao'), sla: firstColumn(headers, 'sla', 'slaalvo'), safety: firstColumn(headers, 'margemseguranca', 'margemdeseguranca'),
      monthlyCost: firstColumn(headers, 'customensal', 'custototalmensal', 'custoequipe', 'custototal'), unitCost: firstColumn(headers, 'custoporhc', 'custounitario', 'custoporheadcount', 'valorunitario'),
      teamCount: firstColumn(headers, 'quantidadedeequipes', 'numeroequipes', 'equipes'), teamUnitCost: firstColumn(headers, 'custoporequipe', 'valorporequipe'),
      movement: firstColumn(headers, 'movimentoalocado', 'hcmovimento', 'quantidademovimentada'), source: firstColumn(headers, 'fonte', 'source', 'origem'), validity: firstColumn(headers, 'vigencia', 'validade', 'versao'),
    };
    const source = text(cell(body.find((row) => text(cell(row, col.source))), col.source)) || sheetName;
    for (const [index, row] of body.entries()) {
      const label = text(cell(row, col.teamClass)) || text(cell(row, col.activity)) || sheetName;
      const current = number(cell(row, col.current)) ?? 0;
      const required = number(cell(row, col.required)) ?? current;
      const rowSource = text(cell(row, col.source)) || source;
      const validity = text(cell(row, col.validity)) || 'A informar';
      if (col.region >= 0 && col.shift >= 0 && col.activity >= 0 && (current > 0 || required > 0)) {
        const currentValue = number(cell(row, col.current));
        const requiredValue = number(cell(row, col.required));
        dimensionRows.push({
          id: `imported-${Date.now()}-${dimensionRows.length}`, region: text(cell(row, col.region)), shift: text(cell(row, col.shift)), activity: text(cell(row, col.activity)), teamClass: label,
          currentHeadcount: current, requiredHeadcount: required, capacityPerPerson: number(cell(row, col.capacity)) ?? 1,
          slaTarget: number(cell(row, col.sla)) ?? currentOperations.slaTarget, safetyBuffer: number(cell(row, col.safety)) ?? currentOperations.safetyBuffer,
          source: rowSource, validity, classification: 'Informada', capacityClassification: col.capacity >= 0 ? 'Informada' : 'Estimada', allocationStatus: 'Importada · revisar antes de salvar',
          scenarioMovement: number(cell(row, col.movement)) ?? 0,
          missingFields: [currentValue === null && 'HC atual', requiredValue === null && 'HC requerido'].filter(Boolean),
        });
      }
      const monthlyCost = number(cell(row, col.monthlyCost));
      const unitCost = number(cell(row, col.unitCost));
      const teamCount = number(cell(row, col.teamCount));
      const teamUnitCost = number(cell(row, col.teamUnitCost));
      if (monthlyCost !== null || unitCost !== null || teamUnitCost !== null) {
        costs.push({ id: `cost-${Date.now()}-${costs.length}`, label, context: text(cell(row, col.region)) || sheetName, monthlyCost: monthlyCost ?? (unitCost !== null ? unitCost * current : teamUnitCost * teamCount), headcount: current, unitCost: unitCost ?? (current ? (monthlyCost ?? 0) / current : 0), teamCount: teamCount ?? 0, teamUnitCost: teamUnitCost ?? 0, unit: 'R$/mês', classification: 'Informada', validity, source: rowSource });
      }
      if (current > 0 && /custos|controle|headcount|equipe/i.test(`${sheetName} ${label}`)) headcountBases.push({ id: `hc-${index}-${Date.now()}`, label: `${sheetName} · ${label}`, headcount: current, basis: sheetName, classification: 'Informada' });
    }
  }
  const legacy = parseLegacyOperationalSheets(sheets);
  const allCosts = [...costs, ...legacy.costs];
  const allHeadcountBases = [...headcountBases, ...legacy.headcountBases];
  return {
    dimensions: dimensionRows,
    costs: allCosts,
    headcountBases: allHeadcountBases,
    operations: dimensionRows.length ? { ...currentOperations, dimensions: dimensionRows, allocationMode: dimensionRows.some((row) => row.scenarioMovement > 0) ? 'manual' : 'auto', teamHeadcount: dimensionRows.reduce((sum, row) => sum + row.currentHeadcount, 0), requiredHeadcount: dimensionRows.reduce((sum, row) => sum + row.requiredHeadcount, 0), costs: allCosts, headcountBases: allHeadcountBases, basisSource: 'Importação local · planilha operacional' } : (allCosts.length || allHeadcountBases.length ? { ...currentOperations, costs: allCosts.length ? allCosts : currentOperations.costs ?? [], headcountBases: allHeadcountBases.length ? allHeadcountBases : currentOperations.headcountBases ?? [], basisSource: 'Importação local · planilha operacional' } : null),
  };
}

export function parseDimensionSheet(rows, { sheetName = 'Operação', fileName = 'Planilha importada', slaTarget = 95, safetyBuffer = 0 } = {}) {
  const aliases = {
    region: ['regiao', 'regional', 'regionaloperacional', 'areaoperacional', 'polo', 'uf'], shift: ['turno', 'jornada', 'periodo'], activity: ['atividade', 'atividadeoperacional', 'tipoatividade', 'tipodeatividade', 'funcao', 'servico', 'operacao'],
    teamClass: ['classe', 'classeequipe', 'classedeequipe', 'equipe', 'tipodeequipe'], current: ['hcatual', 'headcountatual', 'quantidadeatual', 'atual', 'qtdhc', 'qtdcolaboradores', 'equipeatual', 'hc', 'quantidadehc'],
    required: ['hcrequerido', 'headcountrequerido', 'headcountnecessario', 'hcdemandado', 'hcideal', 'necessidadehc', 'qtdnecessaria', 'requerido', 'necessario'], capacity: ['capacidadeporhc', 'capacidadeporpessoa', 'capacidade', 'producao'],
    movement: ['movimentoalocado', 'hcmovimento', 'quantidademovimentada'], sla: ['sla', 'slaalvo'], safety: ['margemseguranca', 'margemdeseguranca'], source: ['fonte', 'source', 'origem'], validity: ['vigencia', 'validade', 'versao'],
  };
  const headerRowIndex = rows.findIndex((row) => {
    const normalized = row.map(normalize);
    return aliases.region.some((name) => normalized.includes(name)) && aliases.shift.some((name) => normalized.includes(name))
      && aliases.activity.some((name) => normalized.includes(name)) && aliases.current.some((name) => normalized.includes(name))
      && aliases.required.some((name) => normalized.includes(name));
  });
  if (headerRowIndex < 0) throw new Error('Colunas obrigatórias não encontradas: Região, Turno, Atividade, HC atual e HC requerido.');
  const headers = rows[headerRowIndex].map(normalize);
  const columns = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, headers.findIndex((header) => names.includes(header))]));
  const rowsWithData = rows.slice(headerRowIndex + 1).filter((row) => row.some((value) => text(value)));
  const imported = [];
  let skippedRows = 0;
  let pendingRows = 0;
  for (const [index, row] of rowsWithData.entries()) {
    const current = number(cell(row, columns.current));
    const required = number(cell(row, columns.required));
    if (current === null && required === null) { skippedRows += 1; continue; }
    const region = text(cell(row, columns.region));
    const shift = text(cell(row, columns.shift));
    const activity = text(cell(row, columns.activity));
    const source = text(cell(row, columns.source)) || fileName;
    const validity = text(cell(row, columns.validity)) || 'A informar';
    const incomplete = !region || !shift || !activity || current === null || required === null;
    if (incomplete) pendingRows += 1;
    imported.push({
      id: `dimension-import-${Date.now()}-${index}`, region, shift, activity,
      teamClass: text(cell(row, columns.teamClass)) || 'A informar',
      currentHeadcount: current ?? 0, requiredHeadcount: required ?? 0,
      scenarioMovement: number(cell(row, columns.movement)) ?? 0,
      capacityPerPerson: number(cell(row, columns.capacity)) ?? 1,
      slaTarget: number(cell(row, columns.sla)) ?? slaTarget,
      safetyBuffer: number(cell(row, columns.safety)) ?? safetyBuffer,
      source, validity, classification: 'Informada',
      capacityClassification: columns.capacity >= 0 ? 'Informada' : 'Estimada',
      allocationStatus: incomplete ? 'Importada · dados pendentes' : 'Importada · revisar antes de salvar',
      missingFields: [!region && 'região', !shift && 'turno', !activity && 'atividade', current === null && 'HC atual', required === null && 'HC requerido'].filter(Boolean),
    });
  }
  return { rows: imported, skippedRows, pendingRows, sheetName, allocationMode: columns.movement >= 0 && imported.some((row) => row.scenarioMovement > 0) ? 'manual' : 'auto' };
}

function parseLegacyOperationalSheets(sheets) {
  const costs = [];
  const headcountBases = [];
  const entry = (fragment) => Object.entries(sheets).find(([name]) => normalize(name).includes(fragment));
  const addCost = (label, monthlyCost, headcount, source, unitCost = null) => {
    if (monthlyCost === null || monthlyCost === undefined || !Number.isFinite(Number(monthlyCost))) return;
    costs.push({ id: `legacy-cost-${costs.length}`, label, context: source, monthlyCost: Number(monthlyCost), headcount: Number(headcount) || 0, unitCost: unitCost ?? ((Number(headcount) || 0) ? Number(monthlyCost) / Number(headcount) : 0), unit: 'R$/mês', classification: 'Informada', validity: 'Abr/2025', source: `Importado · ${source}` });
  };
  const [teamsName, teamsRows] = entry('custosequipes') || [];
  if (teamsRows) {
    for (const row of teamsRows) {
      const label = text(row[6]);
      const unitCost = number(row[7]);
      const headcount = number(row[8]);
      if (label && normalize(label).startsWith('hcclasse') && unitCost !== null && headcount !== null) {
        addCost(label, unitCost * headcount, headcount, teamsName, unitCost);
      }
    }
    const officialIndex = teamsRows.findIndex((row) => /orcado/i.test(normalize(row[8])));
    const officialHeadcount = officialIndex >= 0 ? number(teamsRows[officialIndex + 1]?.[8]) : null;
    if (officialHeadcount !== null) headcountBases.push({ id: 'legacy-custos-equipes', label: 'Custos Equipes · oficial', headcount: officialHeadcount, basis: teamsName, classification: 'Informada' });
  }
  const [fieldName, fieldRows] = entry('campo') || [];
  if (fieldRows) {
    let section = '';
    for (let index = 0; index < fieldRows.length; index += 1) {
      const first = text(fieldRows[index][0]);
      const normalizedFirst = normalize(first);
      if (first && fieldRows[index][1] == null && fieldRows[index][2] == null && !/operadormultifuncoes|quantidade|salario|periculosidade|premiacao|horaextra|encargos|vale|plano|epi|aluguel|combustivel|gasto|material|fardamento|ferramental|custo|bdi/i.test(normalizedFirst)) section = first;
      if (normalizedFirst === 'bdi' && section) {
        const total = number(fieldRows[index + 1]?.[2]);
        if (total !== null) addCost(section, total, 1, fieldName, total);
      }
    }
  }
  const [roomName, roomRows] = entry('salatecnica') || entry('salatenica') || [];
  if (roomRows) {
    [0, 6, 12].forEach((start) => {
      const label = text(roomRows[0]?.[start]);
      if (!label) return;
      const totalRow = roomRows.find((row) => normalize(row[start]).includes('custototal'));
      const total = number(totalRow?.[start + 2]);
      const headcount = number(totalRow?.[start + 1]);
      if (total !== null && total > 0) addCost(label, total, headcount, roomName);
    });
  }
  const [localName, localRows] = entry('controlelocal') || [];
  if (localRows) {
    const totalRow = localRows.find((row, index) => normalize(row[1]) === 'bdi' && number(localRows[index + 1]?.[2]) !== null);
    const total = totalRow ? number(localRows[localRows.indexOf(totalRow) + 1]?.[2]) : null;
    const headcountRow = localRows.find((row) => /equipecampo/i.test(normalize(row[1])));
    const headcount = headcountRow ? number(headcountRow[2]) : null;
    if (total !== null) addCost('Controle Local FTTH', total, headcount, localName, headcount ? total / headcount : null);
    if (headcount !== null) headcountBases.push({ id: 'legacy-controle-local', label: 'Controle Local FTTH · comparação', headcount, basis: localName, classification: 'Informada' });
  }
  return { costs, headcountBases };
}

export function parseScenarioSheet(rows, cargos) {
  const parsed = table(rows, ['nomedocenario', 'cargodesligado', 'promocoesautomaticas']);
  if (!parsed) return [];
  const { headers, body } = parsed;
  const col = {
    id: firstColumn(headers, 'id', 'identificador'),
    name: firstColumn(headers, 'nomedocenario', 'cenario', 'nome'), date: firstColumn(headers, 'data', 'datacriacao'),
    dismissedRole: firstColumn(headers, 'cargodesligado', 'origemdesligamento'), quantity: firstColumn(headers, 'quantidadedesligada', 'quantidade'),
    originRole: firstColumn(headers, 'cargoorigem', 'origemdapromocao'), destinationRole: firstColumn(headers, 'cargodestino', 'destinodapromocao'),
    automatic: firstColumn(headers, 'promocoesautomaticas', 'automaticas'), manual: firstColumn(headers, 'promocoesmanuais', 'manuais'),
    balance: firstColumn(headers, 'saldomensal', 'saldo'), annualBalance: firstColumn(headers, 'saldoanual'),
    delta: firstColumn(headers, 'deltaporpromocao'), coverage: firstColumn(headers, 'coberturaoperacional'),
    encargos: firstColumn(headers, 'encargos'), scenario: firstColumn(headers, 'tipocenario', 'recomendacao'),
    source: firstColumn(headers, 'fonte'), status: firstColumn(headers, 'status', 'situacao'), notes: firstColumn(headers, 'observacao', 'notas'),
  };
  if (col.name < 0) return [];
  return body.map((row, index) => {
    const dismissed = roleId(cell(row, col.dismissedRole), cargos);
    const origin = roleId(cell(row, col.originRole), cargos);
    const destination = roleId(cell(row, col.destinationRole), cargos);
    const automaticPromotions = number(cell(row, col.automatic)) ?? 0;
    const manualValue = number(cell(row, col.manual));
    const statusText = normalize(cell(row, col.status));
    return {
      id: text(cell(row, col.id)) || `imported-scenario-${Date.now()}-${index}`, name: text(cell(row, col.name)) || `Cenário importado ${index + 1}`,
      savedAt: text(cell(row, col.date)) || new Date().toISOString(), dismissedRole: dismissed || cargos[0]?.id, quantity: number(cell(row, col.quantity)) ?? 1,
      originRole: origin || cargos[1]?.id, destinationRole: destination || cargos[2]?.id, activeScenario: 'balanced', manualMode: manualValue !== null,
      manualPromotions: manualValue, automaticPromotions, appliedPromotions: manualValue ?? automaticPromotions,
      appliedBalance: number(cell(row, col.balance)) ?? 0, appliedAnnualBalance: number(cell(row, col.annualBalance)) ?? (number(cell(row, col.balance)) ?? 0) * 12,
      delta: number(cell(row, col.delta)) ?? 0, operationalCoverage: number(cell(row, col.coverage)),
      encargos: number(cell(row, col.encargos)), activeScenario: text(cell(row, col.scenario)) || 'balanced',
      source: text(cell(row, col.source)) || 'Importado da planilha', importedNotes: text(cell(row, col.notes)), importedStatus: statusText,
    };
  }).filter((scenario) => scenario.name);
}

export function parseApprovalHistorySheet(rows) {
  const parsed = table(rows, ['idevento', 'statusanterior', 'statusnovo']);
  if (!parsed) return [];
  const { headers, body } = parsed;
  const col = {
    id: firstColumn(headers, 'idevento', 'iddoevento', 'id'), scenarioId: firstColumn(headers, 'idcenario', 'iddocenario', 'cenarioid'),
    scenarioName: firstColumn(headers, 'cenario', 'nomedocenario'), previousStatus: firstColumn(headers, 'statusanterior'),
    nextStatus: firstColumn(headers, 'statusnovo', 'status'), recordedAt: firstColumn(headers, 'registradoem', 'data'),
    profile: firstColumn(headers, 'perfil'), source: firstColumn(headers, 'fonte'), quantity: firstColumn(headers, 'quantidade', 'posicoes'),
    automatic: firstColumn(headers, 'promocoesautomaticas'), appliedPromotions: firstColumn(headers, 'promocoesaplicadas'),
    balance: firstColumn(headers, 'saldomensal'), annualBalance: firstColumn(headers, 'saldoanual'),
    coverage: firstColumn(headers, 'coberturaoperacional'), encargos: firstColumn(headers, 'encargos'),
    delta: firstColumn(headers, 'deltaporpromocao'),
  };
  if (col.scenarioId < 0 || col.nextStatus < 0) return [];
  return body.map((row, index) => {
    const scenarioId = text(cell(row, col.scenarioId));
    const status = text(cell(row, col.nextStatus));
    if (!scenarioId || !status) return null;
    return {
      id: text(cell(row, col.id)) || `imported-audit-${Date.now()}-${index}`,
      type: 'approval-status-change',
      scenarioId, scenarioName: text(cell(row, col.scenarioName)) || 'Cenário importado',
      previousStatus: text(cell(row, col.previousStatus)) || 'Rascunho', nextStatus: status,
      recordedAt: text(cell(row, col.recordedAt)) || new Date().toISOString(), profileId: text(cell(row, col.profile)),
      source: text(cell(row, col.source)), scenarioSnapshot: {
        id: scenarioId, name: text(cell(row, col.scenarioName)), source: text(cell(row, col.source)),
        quantity: number(cell(row, col.quantity)), automaticPromotions: number(cell(row, col.automatic)),
        appliedPromotions: number(cell(row, col.appliedPromotions)), appliedBalance: number(cell(row, col.balance)),
        appliedAnnualBalance: number(cell(row, col.annualBalance)), operationalCoverage: number(cell(row, col.coverage)),
        encargos: number(cell(row, col.encargos)), delta: number(cell(row, col.delta)),
      },
    };
  }).filter(Boolean);
}

export function parseTsimWorkbook(sheets, { configuration, operations }) {
  const find = (name) => Object.entries(sheets).find(([sheetName]) => normalize(sheetName) === normalize(name))?.[1];
  const cargoResult = parseCargoSheet(find('Cargos') ?? find('Cadastro de Cargos') ?? find('Estrutura de Cargos') ?? Object.values(sheets)[0] ?? [], configuration.cargos);
  const pairResult = parseCargoSalaryPairs(sheets, cargoResult.cargos ?? configuration.cargos);
  const mergedCargos = pairResult.cargos ?? cargoResult.cargos;
  const cargoIds = new Set([...cargoResult.ids, ...pairResult.ids]);
  const warnings = pairResult.ambiguousIds.length
    ? [`Salários divergentes ignorados para: ${pairResult.ambiguousIds.map((id) => configuration.cargos.find((cargo) => cargo.id === id)?.short ?? id).join(', ')}. Revise a planilha antes de importar esses cargos.`]
    : [];
  const people = parsePeopleSheet(find('Pessoas') ?? []);
  const assumptions = parseAssumptionsSheet(find('Premissas') ?? []);
  const operational = parseOperationalWorkbook(sheets, operations);
  const assumed = applyAssumptions({ assumptions, configuration: { ...configuration, cargos: mergedCargos ?? configuration.cargos, encargos: cargoResult.encargos ?? configuration.encargos }, operations: operational.operations ?? operations });
  const scenarios = parseScenarioSheet(find('Cenários') ?? [], assumed.configuration.cargos);
  const auditHistory = parseApprovalHistorySheet(find('Histórico') ?? find('Historico') ?? []);
  return { configuration: assumed.configuration, operations: assumed.operations, people, assumptions, scenarios, auditHistory, costs: operational.costs, headcountBases: operational.headcountBases, warnings, counts: { cargos: cargoIds.size, people: people.length, assumptions: assumptions.length, dimensions: operational.dimensions.length, costs: operational.costs.length, scenarios: scenarios.length, auditEvents: auditHistory.length } };
}
