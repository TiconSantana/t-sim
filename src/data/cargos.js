export const ENCARGOS = 1.13;
export const MESES = 12;
export const cargoSourceConfirmation = {
  confirmedAt: '08/10/2026',
  confirmedBy: 'Responsável do projeto',
  note: 'Valores da fonte de referência confirmados como válidos pelo responsável do projeto.',
};

export const cargos = [
  { id: 'auxiliar', short: 'Auxiliar', name: 'Auxiliar de Fibra Óptica', level: 'Nível I', salary: 1621.00, tone: 'slate', source: 'Análise Gerencial de Cargos e Promoções · base de referência', validity: 'Confirmado em 08/10/2026' },
  { id: 'tecnico-ii', short: 'Técnico II', name: 'Técnico de Fibra Óptica II', level: 'Nível II', salary: 2017.19, tone: 'blue', source: 'Análise Gerencial de Cargos e Promoções · base de referência', validity: 'Confirmado em 08/10/2026' },
  { id: 'tecnico-n3', short: 'Técnico N/3', name: 'Técnico de Fibra Óptica N/3', level: 'Nível III', salary: 2410.94, tone: 'teal', source: 'Análise Gerencial de Cargos e Promoções · base de referência', validity: 'Confirmado em 08/10/2026' },
  { id: 'tecnico-n4', short: 'Técnico N/4', name: 'Técnico de Fibra Óptica N/4', level: 'Nível IV', salary: 2634.70, tone: 'violet', source: 'Análise Gerencial de Cargos e Promoções · base de referência', validity: 'Confirmado em 08/10/2026' },
  { id: 'tecnico-v', short: 'Técnico V', name: 'Técnico de Fibra Óptica V', level: 'Nível V', salary: 3028.25, tone: 'amber', source: 'Análise Gerencial de Cargos e Promoções · base de referência', validity: 'Confirmado em 08/10/2026' },
  { id: 'tecnico-vi', short: 'Técnico VI', name: 'Técnico de Fibra Óptica VI', level: 'Nível VI', salary: 3214.85, tone: 'orange', source: 'Análise Gerencial de Cargos e Promoções · base de referência', validity: 'Confirmado em 08/10/2026' },
];

export function findCargo(id, cargoList = cargos) {
  return cargoList.find((cargo) => cargo.id === id) ?? cargoList[0];
}

export function custo(cargo, encargos = ENCARGOS) {
  return cargo.salary * (1 + encargos);
}
