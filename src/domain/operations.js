export function calculateCoverage({ teamHeadcount, requiredHeadcount, slaTarget, safetyBuffer = 0, quantity }) {
  const current = requiredHeadcount > 0 ? (teamHeadcount / requiredHeadcount) * 100 : 0;
  const afterMovement = requiredHeadcount > 0
    ? ((teamHeadcount - Math.min(quantity, teamHeadcount)) / requiredHeadcount) * 100
    : 0;
  const safetyTarget = Math.min(100, Math.max(0, slaTarget + safetyBuffer));
  const risk = afterMovement < slaTarget ? 'Alto' : afterMovement < safetyTarget ? 'Atenção' : 'Baixo';
  return {
    current,
    afterMovement,
    risk,
    safetyTarget,
    approvalBlocked: requiredHeadcount > 0 && afterMovement < slaTarget,
  };
}

export function validateScenarioForApproval({ scenario, coverage }) {
  const missingSource = !scenario?.source;
  const insufficientCoverage = coverage?.approvalBlocked || scenario?.approvalBlocked;
  const insufficientBudget = scenario?.budgetBlocked || Number(scenario?.appliedBalance) < 0;
  const ineligiblePromotion = scenario?.promotionBlocked;
  return {
    valid: !missingSource && !insufficientCoverage && !insufficientBudget && !ineligiblePromotion,
    missingSource,
    insufficientCoverage: Boolean(insufficientCoverage),
    insufficientBudget: Boolean(insufficientBudget),
    ineligiblePromotion: Boolean(ineligiblePromotion),
    message: missingSource
      ? 'Fonte da premissa não informada.'
      : insufficientCoverage
        ? 'Cobertura operacional abaixo do SLA alvo.'
        : insufficientBudget
          ? 'Saldo mensal negativo: ajuste as promoções antes de aprovar.'
        : ineligiblePromotion
          ? 'Cargo de destino sem elegibilidade para progressão.'
        : '',
  };
}
