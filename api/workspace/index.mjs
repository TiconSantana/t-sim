import { bodyOf, handleError, methodOnly, requireOrigin, requireSession, sendJson, withVercelWebHandler } from '../../server/access.mjs';

const MAX_ROWS = 20000;
const validRows = (value) => Array.isArray(value) && value.length <= MAX_ROWS;

async function handler(req, res) {
  try {
    const { admin, profile } = await requireSession(req, res);
    if (req.method === 'GET') {
      methodOnly(req, res, 'GET');
      const [ownResult, referenceResult] = await Promise.all([
        admin.from('tsim_user_workspaces').select('headcount,scenarios,headcount_plan,updated_at').eq('user_id', profile.user_id).maybeSingle(),
        admin.from('tsim_reference_data').select('payload,updated_at,updated_by').eq('id', 'global').maybeSingle(),
      ]);
      if (ownResult.error || referenceResult.error) throw new Error('Não foi possível carregar os dados desta conta.');
      const response = {
        workspace: ownResult.data || { headcount: [], scenarios: [], headcount_plan: { campo: null, ga: null }, updated_at: null },
        reference: referenceResult.data || null,
      };
      if (profile.is_admin) {
        const [workspaceResult, profilesResult] = await Promise.all([
          admin.from('tsim_user_workspaces').select('user_id,headcount,scenarios,headcount_plan,updated_at'),
          admin.from('access_profiles').select('user_id,full_name,registration'),
        ]);
        if (workspaceResult.error || profilesResult.error) throw new Error('Não foi possível carregar as bases dos usuários.');
        const profiles = new Map((profilesResult.data || []).map((item) => [item.user_id, item]));
        response.workspaces = (workspaceResult.data || []).map((item) => ({
          ...item, full_name: profiles.get(item.user_id)?.full_name || 'Conta sem nome',
          registration: profiles.get(item.user_id)?.registration || '',
        }));
      }
      sendJson(res, 200, {
        ...response,
      });
      return;
    }

    methodOnly(req, res, 'PUT');
    requireOrigin(req);
    const body = bodyOf(req);
    if (Object.prototype.hasOwnProperty.call(body, 'reference')) {
      if (!profile.is_admin) {
        sendJson(res, 403, { message: 'Somente a conta administradora pode alterar cargos e salários.' });
        return;
      }
      if (!body.reference || !Array.isArray(body.reference.cargos) || !body.reference.cargos.length || body.reference.cargos.length > 300) {
        sendJson(res, 400, { message: 'A referência precisa conter até 300 cargos válidos.' });
        return;
      }
      const referenceValid = Number.isFinite(body.reference.encargos) && body.reference.encargos >= 0
        && body.reference.cargos.every((cargo) => cargo && typeof cargo.id === 'string' && typeof cargo.name === 'string'
          && typeof cargo.level === 'string' && Number.isFinite(cargo.salary) && cargo.salary > 0);
      if (!referenceValid) {
        sendJson(res, 400, { message: 'Revise cargo, nível, salário e taxa de encargos antes de salvar a referência.' });
        return;
      }
      const { error } = await admin.from('tsim_reference_data').upsert({
        id: 'global', payload: body.reference, updated_by: profile.user_id, updated_at: new Date().toISOString(),
      });
      if (error) throw new Error('Não foi possível salvar a referência salarial.');
      sendJson(res, 200, { saved: true });
      return;
    }

    const headcount = body.headcount;
    const scenarios = body.scenarios;
    const headcountPlan = body.headcountPlan || { campo: null, ga: null };
    const validPlanCount = (count) => count === null || (Number.isInteger(count) && count >= 0 && count <= 100000);
    if (!validRows(headcount) || !validRows(scenarios) || !headcountPlan || typeof headcountPlan !== 'object'
      || !validPlanCount(headcountPlan.campo) || !validPlanCount(headcountPlan.ga)) {
      sendJson(res, 400, { message: 'Confira as listas de Headcount e cenários e informe quantidades previstas inteiras entre 0 e 100.000.' });
      return;
    }
    const { error } = await admin.from('tsim_user_workspaces').upsert({
      user_id: profile.user_id, headcount, scenarios, headcount_plan: headcountPlan, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error('Não foi possível salvar os dados desta conta.');
    sendJson(res, 200, { saved: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    handleError(res, error);
  }
}

export const GET = withVercelWebHandler(handler);
export const PUT = withVercelWebHandler(handler);
