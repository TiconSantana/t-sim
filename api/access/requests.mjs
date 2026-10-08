import {
  ADMIN_EMAIL, AccessError, bodyOf, deliverEmail, enforceRateLimit, getAdminClient,
  handleError, hashKey, methodOnly,
  requestIp, requestText, requireOrigin, requireSession, sendJson,
  syntheticAuthEmail, validateRequest, withVercelWebHandler,
} from '../../server/access.mjs';

async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { admin } = await requireSession(req, res, true);
      if (req.query?.status && req.query.status !== 'pending') throw new AccessError(400, 'Status de fila inválido.');
      const { data, error } = await admin.from('access_profiles')
        .select('user_id,registration,full_name,email,phone,company,job_title,created_at,initial_notification_status')
        .eq('access_status', 'pending').order('created_at', { ascending: true }).limit(200);
      if (error) throw new AccessError(503, 'Não foi possível carregar a fila de solicitações.');
      const { data: failed, error: failedError } = await admin.from('access_profiles')
        .select('user_id,registration,full_name,email,company,job_title,access_status,initial_notification_status,decision_notification_status,created_at')
        .or('initial_notification_status.eq.failed,decision_notification_status.eq.failed')
        .order('created_at', { ascending: true }).limit(200);
      if (failedError) throw new AccessError(503, 'Não foi possível carregar os e-mails pendentes.');
      sendJson(res, 200, { requests: (data || []).map((item) => ({
        id: item.user_id, registration: item.registration, fullName: item.full_name,
        email: item.email, phone: item.phone, company: item.company, role: item.job_title,
        createdAt: item.created_at, notificationStatus: item.initial_notification_status,
      })), failedNotifications: (failed || []).flatMap((item) => [
        ...(item.initial_notification_status === 'failed' ? [{
          id: item.user_id, kind: 'initial', accessStatus: item.access_status,
          registration: item.registration, fullName: item.full_name, email: item.email,
          company: item.company, role: item.job_title, createdAt: item.created_at,
        }] : []),
        ...(item.decision_notification_status === 'failed' ? [{
          id: item.user_id, kind: 'decision', accessStatus: item.access_status,
          registration: item.registration, fullName: item.full_name, email: item.email,
          company: item.company, role: item.job_title, createdAt: item.created_at,
        }] : []),
      ]) });
      return;
    }
    methodOnly(req, res, 'POST');
    requireOrigin(req);
    const payload = validateRequest(bodyOf(req));
    const admin = getAdminClient();
    await enforceRateLimit(admin, hashKey('register-ip', requestIp(req)), 8, 60 * 60);
    await enforceRateLimit(admin, hashKey('register-matricula', payload.registration), 3, 60 * 60);

    const [{ data: matchingRegistration, error: registrationError }, { data: matchingEmail, error: emailError }] = await Promise.all([
      admin.from('access_profiles').select('user_id').eq('registration_normalized', payload.registration).limit(1),
      admin.from('access_profiles').select('user_id').eq('email_normalized', payload.email).limit(1),
    ]);
    const lookupError = registrationError || emailError;
    if (lookupError) throw new AccessError(503, 'Não foi possível validar os dados da solicitação.');
    if (matchingRegistration?.length || matchingEmail?.length) throw new AccessError(409, 'Já existe uma solicitação ou conta com estes dados.');

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: syntheticAuthEmail(payload.registration),
      password: payload.pin,
      email_confirm: true,
      app_metadata: { provider: 'email', providers: ['email'] },
    });
    if (createError || !created.user) {
      if (createError?.message?.toLowerCase().includes('already')) throw new AccessError(409, 'Já existe uma solicitação ou conta com estes dados.');
      throw new AccessError(503, 'Não foi possível registrar a solicitação de acesso.');
    }

    const profile = {
      user_id: created.user.id,
      registration: payload.registration,
      registration_normalized: payload.registration,
      full_name: payload.fullName,
      email: payload.email,
      email_normalized: payload.email,
      phone: payload.phone,
      company: payload.company,
      job_title: payload.jobTitle,
      access_status: 'pending',
      is_admin: false,
    };
    const { data: inserted, error: insertError } = await admin.from('access_profiles').insert(profile).select('*').single();
    if (insertError || !inserted) {
      await admin.auth.admin.deleteUser(created.user.id);
      if (insertError?.code === '23505') throw new AccessError(409, 'Já existe uma solicitação ou conta com estes dados.');
      throw new AccessError(503, 'Não foi possível registrar a solicitação de acesso.');
    }

    const { error: auditError } = await admin.from('access_audit_log').insert({ target_user_id: created.user.id, action: 'request_created', details: { channel: 'web' } });
    if (auditError) {
      await admin.from('access_profiles').delete().eq('user_id', created.user.id);
      await admin.auth.admin.deleteUser(created.user.id);
      throw new AccessError(503, 'Não foi possível registrar a trilha da solicitação.');
    }

    const notification = await deliverEmail({
      to: ADMIN_EMAIL,
      subject: 'Nova solicitação de acesso ao T-Sim',
      text: requestText(inserted),
    });
    const { error: notificationUpdateError } = await admin.from('access_profiles').update({
      initial_notification_status: notification.sent ? 'sent' : 'failed',
      notification_error: notification.sent ? null : notification.reason,
      updated_at: new Date().toISOString(),
    }).eq('user_id', created.user.id);
    if (notificationUpdateError) throw new AccessError(503, 'Solicitação registrada, mas não foi possível salvar o estado do aviso por e-mail. A administração deve conferir a fila.');

    sendJson(res, 201, {
      status: 'pending',
      notificationStatus: notification.sent ? 'sent' : 'failed',
      message: notification.sent
        ? 'Solicitação enviada para análise. A decisão chegará no e-mail informado.'
        : 'Solicitação registrada, mas o aviso por e-mail está pendente de configuração. O suporte deverá revisar a fila administrativa do T-Sim.',
    });
  } catch (error) {
    handleError(res, error);
  }
}

export const GET = withVercelWebHandler(handler);
export const POST = withVercelWebHandler(handler);
