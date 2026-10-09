// Dados históricos extraídos da planilha de custos operacionais V.TAL 2025.
// Permanecem separados da grade salarial de People e nunca são aplicados automaticamente
// como headcount de uma conta. Só entram após importação ou configuração explícita.
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
  confirmationNote: 'A referência Abr/2025 é histórica e serve apenas para consulta. Ela não define o headcount de nenhuma conta; cada conta deve importar sua própria HEADCOUNT BASE OPERACIONAL ATUAL.',
  basisSource: 'Cópia de Custos e Preço V3 · Custos Equipes',
  headcountBases: [
    { id: 'custos-equipes-historico', label: 'Custos Equipes · referência histórica', headcount: 672, basis: 'Distribuição orçada da aba Custos Equipes', classification: 'Referência histórica' },
    { id: 'controle-local-historico', label: 'Controle Local FTTH · referência histórica', headcount: 609, basis: 'Base alternativa da aba Controle Local', classification: 'Referência histórica' },
  ],
  reconciliation: 'As bases de 672 HC e 609 HC permanecem somente como referências históricas e não são aplicadas automaticamente às contas.',
  note: 'Valores de custo operacional permanecem separados da simulação simplificada de cargos e só entram após importação ou configuração explícita da conta.',
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
  teamHeadcount: 0,
  requiredHeadcount: 0,
  slaTarget: 95,
  safetyBuffer: 10,
  basisId: 'account-headcount',
  basisVersion: null,
  basisSource: 'Aguardando HEADCOUNT BASE OPERACIONAL ATUAL da conta',
  dimensions: [],
  costs: [],
  headcountBases: [],
};
