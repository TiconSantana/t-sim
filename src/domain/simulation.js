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
  const originIndex = cargoList.findIndex((cargo) => cargo.id === originRole);
  const destinationIndex = cargoList.findIndex((cargo) => cargo.id === destinationRole);
  const promotionEligible = originIndex >= 0 && destinationIndex > originIndex;
  const economy = dismissedCost * Math.max(1, quantity);
  const delta = destinationCost - originCost;
  const promotions = promotionEligible && delta > 0 ? Math.floor(economy / delta) : 0;
  const selectedManualPromotions = promotionEligible ? Math.max(0, manualPromotions ?? promotions) : 0;
  const manualPromotionCost = promotionEligible ? Math.max(delta, 0) * selectedManualPromotions : 0;
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
    originIndex,
    destinationIndex,
    promotionEligible,
    promotionBlockReason: promotionEligible ? '' : 'Escolha um cargo de destino acima do nível de origem.',
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
