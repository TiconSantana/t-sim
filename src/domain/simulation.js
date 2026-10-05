import { custo, findCargo, MESES } from '../data/cargos';

export function calculateSimulation({
  dismissedRole,
  quantity,
  originRole,
  destinationRole,
  activeScenario,
  manualMode,
  manualPromotions,
  cargoList,
  encargos,
}) {
  const dismissed = findCargo(dismissedRole, cargoList);
  const origin = findCargo(originRole, cargoList);
  const destination = findCargo(destinationRole, cargoList);
  const dismissedCost = custo(dismissed, encargos);
  const originCost = custo(origin, encargos);
  const destinationCost = custo(destination, encargos);
  const economy = dismissedCost * Math.max(1, quantity);
  const delta = destinationCost - originCost;
  const promotions = delta > 0 ? Math.floor(economy / delta) : 0;
  const selectedManualPromotions = Math.max(0, manualPromotions ?? promotions);
  const manualPromotionCost = Math.max(delta, 0) * selectedManualPromotions;
  const manualBalance = economy - manualPromotionCost;
  const conservativePromotions = 0;
  const balancedPromotions = Math.min(promotions, 4);
  const aggressivePromotions = Math.min(promotions + (delta > 0 ? 1 : 0), 5);
  const activePromotions = activeScenario === 'conservative' ? conservativePromotions : activeScenario === 'aggressive' ? aggressivePromotions : balancedPromotions;
  const promotionCost = Math.max(delta, 0) * activePromotions;
  const balance = economy - promotionCost;
  const appliedPromotions = manualMode ? selectedManualPromotions : activePromotions;
  const appliedBalance = manualMode ? manualBalance : balance;
  const roi = delta > 0 ? (origin.salary * 3) / delta : 0;

  return {
    dismissed,
    origin,
    destination,
    dismissedCost,
    originCost,
    destinationCost,
    economy,
    delta,
    promotions,
    selectedManualPromotions,
    manualPromotionCost,
    manualBalance,
    manualDifference: selectedManualPromotions - promotions,
    conservativePromotions,
    balancedPromotions,
    aggressivePromotions,
    activePromotions,
    promotionCost,
    balance,
    appliedPromotions,
    appliedBalance,
    roi,
    annualBalance: balance * MESES,
    appliedAnnualBalance: appliedBalance * MESES,
    annualEconomy: economy * MESES,
    operationalRisk: activeScenario === 'aggressive' ? 'Médio' : activeScenario === 'balanced' ? 'Baixo' : 'Atenção',
  };
}
