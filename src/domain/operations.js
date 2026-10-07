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

function allocateProportionally(rows, movement, totalCurrent) {
  const shares = rows.map((row, index) => {
    const headcount = clamp(row.currentHeadcount);
    const exact = totalCurrent > 0 ? (movement * headcount) / totalCurrent : 0;
    const base = Math.min(headcount, Math.floor(exact));
    return { index, headcount, base, remainder: exact - base };
  });
  let remaining = Math.max(0, movement - shares.reduce((sum, item) => sum + item.base, 0));
  const order = [...shares].sort((a, b) => b.remainder - a.remainder || String(rows[a.index].id ?? a.index).localeCompare(String(rows[b.index].id ?? b.index)));
  for (const item of order) {
    if (!remaining) break;
    if (item.base >= item.headcount) continue;
    item.base += 1;
    remaining -= 1;
  }
  return shares.sort((a, b) => a.index - b.index).map((item) => item.base);
}

export function calculateDimensionCoverage(dimensions = [], quantity = 0, allocationMode = 'auto') {
  const rows = Array.isArray(dimensions) ? dimensions : [];
  const totalCurrent = rows.reduce((sum, row) => sum + clamp(row.currentHeadcount), 0);
  const totalRequired = rows.reduce((sum, row) => sum + clamp(row.requiredHeadcount), 0);
  const requestedMovement = clamp(quantity);
  const movement = Math.min(requestedMovement, totalCurrent);
  const automaticAllocation = allocateProportionally(rows, movement, totalCurrent);
  const manualAllocation = allocationMode === 'manual';
  const proposedAllocations = rows.map((row, index) => manualAllocation ? clamp(row.scenarioMovement) : automaticAllocation[index]);
  const allocatedMovement = proposedAllocations.reduce((sum, value) => sum + value, 0);
  const allocationOverCapacity = proposedAllocations.some((value, index) => value > clamp(rows[index].currentHeadcount));
  const allocationMismatch = manualAllocation && (allocatedMovement !== requestedMovement || allocationOverCapacity);
  const details = rows.map((row, index) => {
    const currentHeadcount = clamp(row.currentHeadcount);
    const requiredHeadcount = clamp(row.requiredHeadcount);
    const capacityPerPerson = clamp(row.capacityPerPerson) || 1;
    const rowMovement = Math.min(currentHeadcount, proposedAllocations[index] ?? 0);
    const currentCapacity = currentHeadcount * capacityPerPerson;
    const projectedCapacity = Math.max(0, currentHeadcount - rowMovement) * capacityPerPerson;
    const target = Math.min(100, Math.max(0, clamp(row.slaTarget) + clamp(row.safetyBuffer)));
    const current = requiredHeadcount > 0 ? (currentCapacity / requiredHeadcount) * 100 : 0;
    const afterMovement = requiredHeadcount > 0 ? (projectedCapacity / requiredHeadcount) * 100 : 0;
    const missingFields = Array.isArray(row.missingFields) ? row.missingFields : [];
    const missingSource = !row.source || /^(a informar|fonte pendente)$/i.test(String(row.source).trim());
    const missingValidity = !row.validity || /^(a informar|vig.ncia a confirmar)$/i.test(String(row.validity).trim());
    const missingAllocation = [row.region, row.shift, row.activity].some((value) => !value || value === 'Não informado') || missingFields.length > 0 || missingSource || missingValidity;
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
      missingSource,
      missingValidity,
      approvalBlocked: missingAllocation || afterMovement < clamp(row.slaTarget) || allocationMismatch,
    };
  });
  const missingAllocation = details.filter((row) => row.missingAllocation);
  return {
    rows: details,
    totalCurrent,
    totalRequired,
    movement,
    requestedMovement,
    allocatedMovement,
    allocationMode: manualAllocation ? 'manual' : 'auto',
    allocationMismatch,
    allocationOverCapacity,
    current: totalRequired > 0 ? (details.reduce((sum, row) => sum + row.currentCapacity, 0) / totalRequired) * 100 : 0,
    afterMovement: totalRequired > 0 ? (details.reduce((sum, row) => sum + row.projectedCapacity, 0) / totalRequired) * 100 : 0,
    missingAllocation,
    approvalBlocked: details.some((row) => row.approvalBlocked) || allocationMismatch || requestedMovement > totalCurrent,
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
