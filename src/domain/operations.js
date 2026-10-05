export function calculateCoverage({ teamHeadcount, requiredHeadcount, slaTarget, quantity }) {
  const current = requiredHeadcount > 0 ? (teamHeadcount / requiredHeadcount) * 100 : 0;
  const afterMovement = requiredHeadcount > 0
    ? ((teamHeadcount - Math.min(quantity, teamHeadcount)) / requiredHeadcount) * 100
    : 0;
  const risk = afterMovement >= slaTarget ? 'Baixo' : afterMovement >= slaTarget - 5 ? 'Atenção' : 'Alto';
  return {
    current,
    afterMovement,
    risk,
    approvalBlocked: requiredHeadcount > 0 && afterMovement < slaTarget,
  };
}

export function validateScenarioForApproval({ scenario, coverage }) {
  const missingSource = !scenario?.source;
  const insufficientCoverage = coverage?.approvalBlocked || scenario?.approvalBlocked;
  return {
    valid: !missingSource && !insufficientCoverage,
    missingSource,
    insufficientCoverage: Boolean(insufficientCoverage),
    message: missingSource
      ? 'Fonte da premissa não informada.'
      : insufficientCoverage
        ? 'Cobertura operacional abaixo do SLA alvo.'
        : '',
  };
}
