const STORAGE_KEY = 'tsim.saved-scenarios.v1';
const CONFIG_KEY = 'tsim.configuration.v1';
const OPS_KEY = 'tsim.operations.v1';
const APPROVALS_KEY = 'tsim.approvals.v1';
const PEOPLE_KEY = 'tsim.people.v1';
const ASSUMPTIONS_KEY = 'tsim.imported-assumptions.v1';
const PROFILES_KEY = 'tsim.local-profiles.v1';
const ACTIVE_PROFILE_KEY = 'tsim.active-profile.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function loadLocalProfiles() {
  if (!canUseStorage()) return [{ id: 'default', name: 'Base principal' }];
  try {
    const profiles = JSON.parse(window.localStorage.getItem(PROFILES_KEY) || '[]');
    const safeProfiles = Array.isArray(profiles) ? profiles.filter((profile) => profile?.id && profile?.name) : [];
    return safeProfiles.length ? safeProfiles : [{ id: 'default', name: 'Base principal' }];
  } catch {
    return [{ id: 'default', name: 'Base principal' }];
  }
}

export function getActiveProfileId() {
  if (!canUseStorage()) return 'default';
  const id = window.localStorage.getItem(ACTIVE_PROFILE_KEY) || 'default';
  return loadLocalProfiles().some((profile) => profile.id === id) ? id : 'default';
}

export function workspaceStorageKey(key, profileId = getActiveProfileId()) {
  return profileId === 'default' ? key : `tsim.profile.${profileId}.${key}`;
}

export function createLocalProfile(name) {
  if (!canUseStorage()) return null;
  const cleanName = String(name ?? '').trim().slice(0, 60);
  if (!cleanName) return null;
  const profiles = loadLocalProfiles();
  const id = `local-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
  const next = [...profiles, { id, name: cleanName, createdAt: new Date().toISOString() }];
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
  return next.find((profile) => profile.id === id);
}

export function setActiveProfile(profileId) {
  if (!canUseStorage() || !loadLocalProfiles().some((profile) => profile.id === profileId)) return false;
  window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  return true;
}

export function loadPeople() {
  if (!canUseStorage()) return [];
  try { return JSON.parse(window.localStorage.getItem(workspaceStorageKey(PEOPLE_KEY)) || '[]'); } catch { return []; }
}

export function savePeople(people) {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(workspaceStorageKey(PEOPLE_KEY), JSON.stringify(people));
  return true;
}

export function loadImportedAssumptions() {
  if (!canUseStorage()) return [];
  try { return JSON.parse(window.localStorage.getItem(workspaceStorageKey(ASSUMPTIONS_KEY)) || '[]'); } catch { return []; }
}

export function saveImportedAssumptions(assumptions) {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(workspaceStorageKey(ASSUMPTIONS_KEY), JSON.stringify(assumptions));
  return true;
}

export function loadSavedScenarios() {
  if (!canUseStorage()) return [];
  try {
    const stored = window.localStorage.getItem(workspaceStorageKey(STORAGE_KEY));
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
  if (canUseStorage()) window.localStorage.setItem(workspaceStorageKey(STORAGE_KEY), JSON.stringify(next));
  return saved;
}

export function saveScenarioList(scenarios) {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(workspaceStorageKey(STORAGE_KEY), JSON.stringify(Array.isArray(scenarios) ? scenarios : []));
  return true;
}

export function loadConfiguration(defaults) {
  if (!canUseStorage()) return defaults;
  try {
    const stored = window.localStorage.getItem(workspaceStorageKey(CONFIG_KEY));
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
  window.localStorage.setItem(workspaceStorageKey(CONFIG_KEY), JSON.stringify(configuration));
  return true;
}

export function loadOperations(defaults) {
  if (!canUseStorage()) return defaults;
  try {
    const stored = window.localStorage.getItem(workspaceStorageKey(OPS_KEY));
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
      dimensions: defaults.dimensions,
    };
  }
  return { ...merged, dimensions: Array.isArray(merged.dimensions) ? merged.dimensions : defaults.dimensions };
}

export function saveOperations(operations) {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(workspaceStorageKey(OPS_KEY), JSON.stringify(operations));
  return true;
}

export function loadApprovals() {
  if (!canUseStorage()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(workspaceStorageKey(APPROVALS_KEY)) || '{}');
  } catch {
    return {};
  }
}

export function saveApproval(scenarioId, approval) {
  const current = loadApprovals();
  const next = { ...current, [scenarioId]: { ...approval, updatedAt: new Date().toISOString() } };
  if (canUseStorage()) window.localStorage.setItem(workspaceStorageKey(APPROVALS_KEY), JSON.stringify(next));
  return next;
}
