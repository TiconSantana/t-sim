export async function loadAccountWorkspace() {
  const response = await fetch('/api/workspace', { credentials: 'same-origin' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Não foi possível carregar a base da sua conta.');
  return result;
}

export async function saveAccountWorkspace({ headcount, scenarios, headcountPlan = { campo: null, ga: null } }) {
  const response = await fetch('/api/workspace', {
    method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headcount, scenarios, headcountPlan }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Não foi possível salvar a base desta conta.');
  return result;
}

export async function saveAdminReference(reference) {
  const response = await fetch('/api/workspace', {
    method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Não foi possível salvar a referência salarial.');
  return result;
}
