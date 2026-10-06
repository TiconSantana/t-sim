export function calculateCoverage({ teamHeadcount, requiredHeadcount, slaTarget, safetyBuffer = 0, quantity }) {
  const current = requiredHeadcount > 0 ? (teamHeadcount / requiredHeadcount) * 100 : 0;
  const afterMovement = requiredHeadcount > 0
    ? ((teamHeadcount - Math.min(quantity, teamHeadcount)) / requiredHeadcount) * 100
    : 0;
  const effectiveTarget = Math.min(100, Math.max(0, slaTarget + safetyBuffer));
  const risk = afterMovement >= effectiveTarget ? 'Baixo' : afterMovement >= effectiveTarget - 5 ? 'Atenção' : 'Alto';
  return {
    current,
    afterMovement,
    risk,
    effectiveTarget,
    approvalBlocked: requiredHeadcount > 0 && afterMovement < effectiveTarget,
  };
}

export function validateScenarioForApproval({ scenario, coverage }) {
  const missingSource = !scenario?.source;
  const insufficientCoverage = coverage?.approvalBlocked || scenario?.approvalBlocked;
  const insufficientBudget = scenario?.budgetBlocked || Number(scenario?.appliedBalance) < 0;
  return {
    valid: !missingSource && !insufficientCoverage && !insufficientBudget,
    missingSource,
    insufficientCoverage: Boolean(insufficientCoverage),
    insufficientBudget: Boolean(insufficientBudget),
    message: missingSource
      ? 'Fonte da premissa não informada.'
      : insufficientCoverage
        ? 'Cobertura operacional abaixo do SLA alvo.'
        : insufficientBudget
          ? 'Saldo mensal negativo: ajuste as promoções antes de aprovar.'
        : '',
  };
}
