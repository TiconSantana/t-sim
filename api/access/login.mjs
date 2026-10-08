import {
  AccessError, bodyOf, enforceRateLimit, getAdminClient, getPublicClient, handleError,
  clearSessionCookie, hashKey, methodOnly, normalizeRegistration, publicAccount, requestIp,
  requireOrigin, sendJson, setSessionCookie, syntheticAuthEmail, validRegistration, withVercelWebHandler,
} from '../../server/access.mjs';

async function handler(req, res) {
  try {
    methodOnly(req, res, 'POST');
    requireOrigin(req);
    const body = bodyOf(req);
    const registration = normalizeRegistration(body.registration);
    const pin = String(body.pin || '');
    if (!validRegistration(registration) || !/^\d{6}$/.test(pin)) throw new AccessError(400, 'Informe uma matrícula e senha válidas.');

    const admin = getAdminClient();
    await enforceRateLimit(admin, hashKey('login-registration', registration), 5, 15 * 60);
    await enforceRateLimit(admin, hashKey('login-origin', requestIp(req)), 30, 15 * 60);

    const auth = getPublicClient();
    const { data, error } = await auth.auth.signInWithPassword({ email: syntheticAuthEmail(registration), password: pin });
    if (error || !data.session || !data.user) throw new AccessError(401, 'Matrícula ou senha inválida.');

    const { data: profile, error: profileError } = await admin.from('access_profiles')
      .select('user_id,registration,full_name,email,company,job_title,access_status,is_admin')
      .eq('user_id', data.user.id).maybeSingle();
    if (profileError) throw new AccessError(503, 'Não foi possível confirmar o status desta conta.');
    if (!profile || profile.access_status === 'denied' || profile.access_status === 'suspended') {
      await auth.auth.signOut({ scope: 'global' });
      throw new AccessError(401, 'Matrícula ou senha inválida.');
    }
    if (profile.access_status === 'pending') {
      await auth.auth.signOut({ scope: 'global' });
      sendJson(res, 200, { status: 'pending' });
      return;
    }
    if (profile.access_status !== 'approved') throw new AccessError(401, 'Matrícula ou senha inválida.');

    setSessionCookie(res, data.session);
    sendJson(res, 200, { status: 'approved', user: publicAccount(profile) });
  } catch (error) {
    if (error.status === 401) clearSessionCookie(res);
    handleError(res, error);
  }
}

export const POST = withVercelWebHandler(handler);
