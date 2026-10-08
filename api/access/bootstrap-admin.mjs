import { timingSafeEqual } from 'node:crypto';
import {
  ADMIN_EMAIL, AccessError, getAdminClient, handleError, methodOnly,
  normalizeRegistration, requireOrigin, sendJson, syntheticAuthEmail, validRegistration, withVercelWebHandler,
} from '../../server/access.mjs';

function secretMatches(expected, received) {
  const left = Buffer.from(String(expected || ''));
  const right = Buffer.from(String(received || ''));
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

async function handler(req, res) {
  try {
    methodOnly(req, res, 'POST');
    requireOrigin(req);
    const expectedSecret = process.env.TSIM_ADMIN_BOOTSTRAP_SECRET;
    if (String(expectedSecret || '').length < 32) throw new AccessError(503, 'Configure um segredo administrativo aleatório de pelo menos 32 caracteres.');
    if (!secretMatches(expectedSecret, req.headers['x-tsim-bootstrap-secret'])) throw new AccessError(403, 'Chave de provisionamento inválida.');
    const registration = normalizeRegistration(process.env.TSIM_ADMIN_REGISTRATION);
    const pin = String(process.env.TSIM_ADMIN_PIN || '');
    if (!validRegistration(registration) || !/^\d{6}$/.test(pin)) throw new AccessError(503, 'Configure uma matrícula administrativa e um PIN inicial de seis dígitos.');

    const admin = getAdminClient();
    const { count, error: countError } = await admin.from('access_profiles').select('user_id', { count: 'exact', head: true }).eq('is_admin', true);
    if (countError) throw new AccessError(503, 'Não foi possível verificar o provisionamento administrativo.');
    if (count > 0) throw new AccessError(409, 'A conta administrativa já foi provisionada.');

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: syntheticAuthEmail(registration), password: pin, email_confirm: true,
      app_metadata: { provider: 'email', providers: ['email'] },
    });
    if (createError || !created.user) throw new AccessError(503, 'Não foi possível criar a conta administrativa.');

    const { error: insertError } = await admin.from('access_profiles').insert({
      user_id: created.user.id,
      registration,
      registration_normalized: registration,
      full_name: 'Administração T-Sim',
      email: ADMIN_EMAIL,
      email_normalized: ADMIN_EMAIL,
      phone: 'Não informado',
      company: 'TConnect',
      job_title: 'Administração da plataforma',
      access_status: 'approved',
      is_admin: true,
      initial_notification_status: 'sent',
    });
    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new AccessError(503, 'Não foi possível salvar o perfil administrativo.');
    }
    const { error: auditError } = await admin.from('access_audit_log').insert({
      target_user_id: created.user.id, action: 'admin_bootstrapped', details: { channel: 'protected_setup_endpoint' },
    });
    if (auditError) {
      await admin.from('access_profiles').delete().eq('user_id', created.user.id);
      await admin.auth.admin.deleteUser(created.user.id);
      throw new AccessError(503, 'Não foi possível registrar a auditoria do provisionamento.');
    }
    sendJson(res, 201, { status: 'created', registration, email: ADMIN_EMAIL });
  } catch (error) {
    handleError(res, error);
  }
}

export const POST = withVercelWebHandler(handler);
