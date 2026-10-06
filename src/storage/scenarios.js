const STORAGE_KEY = 'tsim.saved-scenarios.v1';
const CONFIG_KEY = 'tsim.configuration.v1';
const OPS_KEY = 'tsim.operations.v1';
const APPROVALS_KEY = 'tsim.approvals.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function loadSavedScenarios() {
  if (!canUseStorage()) return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveScenario(snapshot) {
  const current = loadSavedScenarios();
  const saved = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    savedAt: new Date().toISOString(),
    ...snapshot,
  };
  const next = [saved, ...current].slice(0, 12);
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return saved;
}

export function loadConfiguration(defaults) {
  if (!canUseStorage()) return defaults;
  try {
    const stored = window.localStorage.getItem(CONFIG_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    const cargoMap = new Map((parsed.cargos ?? []).map((cargo) => [cargo.id, cargo]));
    return {
      encargos: Number.isFinite(parsed.encargos) ? parsed.encargos : defaults.encargos,
      cargos: defaults.cargos.map((cargo) => ({ ...cargo, ...cargoMap.get(cargo.id) })),
    };
  } catch {
    return defaults;
  }
}

export function saveConfiguration(configuration) {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(configuration));
  return true;
}

export function loadOperations(defaults) {
  if (!canUseStorage()) return defaults;
  try {
    const stored = window.localStorage.getItem(OPS_KEY);
    if (!stored) return defaults;
    return normalizeOperations(JSON.parse(stored), defaults);
  } catch {
    return defaults;
  }
}

export function normalizeOperations(value, defaults) {
  const merged = { ...defaults, ...(value || {}) };
  if (value?.basisId !== defaults.basisId) {
    return {
      ...merged,
      teamHeadcount: defaults.teamHeadcount,
      requiredHeadcount: defaults.requiredHeadcount,
      basisId: defaults.basisId,
      basisVersion: defaults.basisVersion,
      basisSource: defaults.basisSource,
    };
  }
  return merged;
}

export function saveOperations(operations) {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(OPS_KEY, JSON.stringify(operations));
  return true;
}

export function loadApprovals() {
  if (!canUseStorage()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(APPROVALS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveApproval(scenarioId, approval) {
  const current = loadApprovals();
  const next = { ...current, [scenarioId]: { ...approval, updatedAt: new Date().toISOString() } };
  if (canUseStorage()) window.localStorage.setItem(APPROVALS_KEY, JSON.stringify(next));
  return next;
}
