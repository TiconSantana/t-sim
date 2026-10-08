// Dados de referência extraídos da planilha de custos operacionais V.TAL 2025.
// Permanecem separados da grade salarial de People para evitar mistura silenciosa de contextos.
export const operationalCosts = [
  {
    id: 'campo',
    label: 'Campo FTTH',
    context: 'Controle Local FTTH',
    monthlyCost: 648972.87,
    headcount: 672,
    unitCost: 965.73,
    unit: 'R$/HC/mês',
    classification: 'Informada',
    validity: 'Abr/2025',
    source: 'Cópia de Custos e Preço V3 · Controle Local',
  },
  {
    id: 'sala-manutencao',
    label: 'Sala técnica · Manutenção',
    context: 'Sala Ténica',
    monthlyCost: 107885.07,
    headcount: 10,
    unitCost: 160.54,
    unit: 'R$/HC/mês',
    classification: 'Calculada',
    validity: 'Abr/2025',
    source: 'Cópia de Custos e Preço V3 · Sala Ténica',
  },
  {
    id: 'sala-engenharia',
    label: 'Sala técnica · Engenharia',
    context: 'Sala Ténica',
    monthlyCost: 178339.20,
    headcount: 14,
    unitCost: 265.39,
    unit: 'R$/HC/mês',
    classification: 'Calculada',
    validity: 'Abr/2025',
    source: 'Cópia de Custos e Preço V3 · Sala Ténica',
  },
  {
    id: 'sala-projetos',
    label: 'Sala técnica · Projetos',
    context: 'Sala Ténica',
    monthlyCost: 296030.44,
    headcount: 21,
    unitCost: 440.52,
    unit: 'R$/HC/mês',
    classification: 'Calculada',
    validity: 'Abr/2025',
    source: 'Cópia de Custos e Preço V3 · Sala Ténica',
  },
];

export const teamClasses = [
  { id: 'f', label: 'Classe F', headcount: 558, teamCount: 279, unitCost: 17954.75, unit: 'R$/equipe/mês', classification: 'Calculada', validity: 'Abr/2025', source: 'Custos Equipes · distribuição orçada' },
  { id: 'l', label: 'Classe L', headcount: 12, teamCount: 4, unitCost: 13022.96, unit: 'R$/equipe/mês', classification: 'Calculada', validity: 'Abr/2025', source: 'Custos Equipes · distribuição orçada' },
  { id: 'mini-l', label: 'Classe Mini L', headcount: 102, teamCount: 51, unitCost: 11084.69, unit: 'R$/equipe/mês', classification: 'Calculada', validity: 'Abr/2025', source: 'Custos Equipes · distribuição orçada' },
];

export const costAssumptions = [
  { label: 'Encargos operacionais', value: 128, unit: '%', classification: 'Informada', validity: 'Abr/2025', source: 'Sala Ténica / Controle Local' },
  { label: 'ADM', value: 10, unit: '%', classification: 'Informada', validity: 'Abr/2025', source: 'Sala Ténica / Controle Local' },
  { label: 'BDI', value: 35, unit: '%', classification: 'Informada', validity: 'Abr/2025', source: 'Sala Ténica / Controle Local' },
  { label: 'Margem média', value: 15, unit: '%', classification: 'Informada', validity: 'Abr/2025', source: 'Análise Gerencial v2' },
];

export const operationalSource = {
  name: 'Cópia de Custos e Preço V3 ABR/2025 · Encargos atualizados',
  version: 'Abr/2025',
  owner: 'Controladoria / Operações',
  confirmedAt: '08/10/2026',
  confirmedBy: 'Responsável do projeto',
  confirmationNote: 'Valores da referência Abr/2025 e base de 672 HC confirmados como válidos pelo responsável em 08/10/2026. A data original da fonte permanece Abr/2025.',
  basisSource: 'Cópia de Custos e Preço V3 · Custos Equipes',
  headcountBases: [
    { id: 'custos-equipes', label: 'Custos Equipes · oficial', headcount: 672, basis: 'Distribuição orçada da aba Custos Equipes', classification: 'Informada' },
    { id: 'controle-local', label: 'Controle Local FTTH · comparação', headcount: 609, basis: 'Base alternativa da aba Controle Local', classification: 'Informada' },
  ],
  reconciliation: 'Base operacional oficial: 672 HC. Os 609 HC do Controle Local permanecem como comparação e não são somados.',
  note: 'Valores de custo operacional permanecem separados da simulação simplificada de cargos.',
};

// A fonte informa Bahia e a atividade de operador, mas não apresenta rateio
// confiável por turno e atividade. A linha inicial preserva essa lacuna para
// edição/importação sem fabricar uma distribuição operacional.
export const operationalDimensions = [
  {
    id: 'bahia-campo-operador',
    region: 'Bahia',
    shift: 'Não informado',
    activity: 'Operador multifunções',
    teamClass: 'Campo FTTH',
    currentHeadcount: 672,
    requiredHeadcount: 672,
    capacityPerPerson: 1,
    slaTarget: 95,
    safetyBuffer: 10,
    source: 'Custos Equipes + Controle Local',
    validity: 'Abr/2025',
    classification: 'Informada',
    capacityClassification: 'Estimada',
    allocationStatus: 'Pendente de rateio por turno e atividade',
  },
];

export const operationsDefaults = {
  teamHeadcount: 672,
  requiredHeadcount: 672,
  slaTarget: 95,
  safetyBuffer: 10,
  basisId: 'custos-equipes-672',
  basisVersion: 'Abr/2025',
  basisSource: 'Cópia de Custos e Preço V3 · Custos Equipes',
  dimensions: operationalDimensions,
};
