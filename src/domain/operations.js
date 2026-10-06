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

function clamp(value, min = 0) {
  return Math.max(min, Number.isFinite(Number(value)) ? Number(value) : 0);
}

export function calculateDimensionCoverage(dimensions = [], quantity = 0) {
  const rows = Array.isArray(dimensions) ? dimensions : [];
  const totalCurrent = rows.reduce((sum, row) => sum + clamp(row.currentHeadcount), 0);
  const totalRequired = rows.reduce((sum, row) => sum + clamp(row.requiredHeadcount), 0);
  const movement = Math.min(clamp(quantity), totalCurrent);
  let allocated = 0;
  const details = rows.map((row, index) => {
    const currentHeadcount = clamp(row.currentHeadcount);
    const requiredHeadcount = clamp(row.requiredHeadcount);
    const capacityPerPerson = clamp(row.capacityPerPerson) || 1;
    const proportional = totalCurrent > 0 ? Math.floor((movement * currentHeadcount) / totalCurrent) : 0;
    const rowMovement = index === rows.length - 1 ? Math.max(0, movement - allocated) : Math.min(currentHeadcount, proportional);
    allocated += rowMovement;
    const currentCapacity = currentHeadcount * capacityPerPerson;
    const projectedCapacity = Math.max(0, currentHeadcount - rowMovement) * capacityPerPerson;
    const target = Math.min(100, Math.max(0, clamp(row.slaTarget) + clamp(row.safetyBuffer)));
    const current = requiredHeadcount > 0 ? (currentCapacity / requiredHeadcount) * 100 : 0;
    const afterMovement = requiredHeadcount > 0 ? (projectedCapacity / requiredHeadcount) * 100 : 0;
    const missingAllocation = [row.region, row.shift, row.activity].some((value) => !value || value === 'Não informado');
    const risk = afterMovement < clamp(row.slaTarget) ? 'Alto' : afterMovement < target ? 'Atenção' : 'Baixo';
    return {
      ...row,
      current,
      afterMovement,
      target,
      rowMovement,
      currentCapacity,
      projectedCapacity,
      risk,
      missingAllocation,
      approvalBlocked: missingAllocation || afterMovement < clamp(row.slaTarget),
    };
  });
  const missingAllocation = details.filter((row) => row.missingAllocation);
  return {
    rows: details,
    totalCurrent,
    totalRequired,
    movement,
    current: totalRequired > 0 ? (details.reduce((sum, row) => sum + row.currentCapacity, 0) / totalRequired) * 100 : 0,
    afterMovement: totalRequired > 0 ? (details.reduce((sum, row) => sum + row.projectedCapacity, 0) / totalRequired) * 100 : 0,
    missingAllocation,
    approvalBlocked: details.some((row) => row.approvalBlocked),
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
