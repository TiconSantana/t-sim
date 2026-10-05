// Dados de referência extraídos da planilha de custos operacionais V.TAL 2025.
// Permanecem separados da grade salarial de People para evitar mistura silenciosa de contextos.
export const operationalCosts = [
  {
    id: 'campo',
    label: 'Campo FTTH',
    context: 'Controle Local FTTH',
    monthlyCost: 648972.87,
    headcount: 609,
    unitCost: 1065.63,
    source: 'Cópia de Custos e Preço V3 · Controle Local',
  },
  {
    id: 'sala-manutencao',
    label: 'Sala técnica · Manutenção',
    context: 'Sala Ténica',
    monthlyCost: 107885.07,
    headcount: 10,
    unitCost: 177.15,
    source: 'Cópia de Custos e Preço V3 · Sala Ténica',
  },
  {
    id: 'sala-engenharia',
    label: 'Sala técnica · Engenharia',
    context: 'Sala Ténica',
    monthlyCost: 178339.20,
    headcount: 14,
    unitCost: 292.84,
    source: 'Cópia de Custos e Preço V3 · Sala Ténica',
  },
  {
    id: 'sala-projetos',
    label: 'Sala técnica · Projetos',
    context: 'Sala Ténica',
    monthlyCost: 296030.44,
    headcount: 21,
    unitCost: 486.09,
    source: 'Cópia de Custos e Preço V3 · Sala Ténica',
  },
];

export const teamClasses = [
  { id: 'f', label: 'Classe F', headcount: 509, teamCount: 254.5, unitCost: 17954.75, source: 'Custos Equipes' },
  { id: 'l', label: 'Classe L', headcount: 48, teamCount: 16, unitCost: 13022.96, source: 'Custos Equipes' },
  { id: 'mini-l', label: 'Classe Mini L', headcount: 52, teamCount: 26, unitCost: 11084.69, source: 'Custos Equipes' },
];

export const costAssumptions = [
  { label: 'Encargos operacionais', value: 128, unit: '%', classification: 'Informada', source: 'Sala Ténica / Controle Local' },
  { label: 'ADM', value: 10, unit: '%', classification: 'Informada', source: 'Sala Ténica / Controle Local' },
  { label: 'BDI', value: 35, unit: '%', classification: 'Informada', source: 'Sala Ténica / Controle Local' },
  { label: 'Margem média', value: 15, unit: '%', classification: 'Informada', source: 'Análise Gerencial v2' },
];

export const operationalSource = {
  name: 'Cópia de Custos e Preço V3 ABR/2025 · Encargos atualizados',
  version: 'Abr/2025',
  owner: 'Controladoria / Operações',
  note: 'Valores de custo operacional permanecem separados da simulação simplificada de cargos.',
};
