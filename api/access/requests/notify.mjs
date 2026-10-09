import {
  ADMIN_EMAIL, AccessError, bodyOf, decisionText, deliverEmail, handleError,
  methodOnly, requestText, requireOrigin, requireSession, sendJson, withVercelWebHandler,
} from '../../../server/access.mjs';

async function handler(req, res) {
  try {
    methodOnly(req, res, 'POST');
    requireOrigin(req);
    const { admin } = await requireSession(req, res, true);
    const id = String(req.query?.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new AccessError(400, 'Identificador da solicitação inválido.');
    const kind = bodyOf(req).kind;
    if (!['initial', 'decision'].includes(kind)) throw new AccessError(400, 'Tipo de notificação inválido.');

    const { data: profile, error: profileError } = await admin.from('access_profiles').select('*').eq('user_id', id).maybeSingle();
    if (profileError) throw new AccessError(503, 'Não foi possível localizar a conta.');
    if (!profile) throw new AccessError(404, 'Conta não encontrada.');
    if (kind === 'initial' && profile.initial_notification_status !== 'failed') throw new AccessError(409, 'Este aviso não está pendente de reenvio.');
    if (kind === 'decision' && (!['approved', 'denied'].includes(profile.access_status) || profile.decision_notification_status !== 'failed')) throw new AccessError(409, 'Este aviso não está pendente de reenvio.');

    const notification = await deliverEmail(kind === 'initial' ? {
      to: ADMIN_EMAIL,
      subject: 'Nova solicitação de acesso ao T-Sim',
      text: requestText(profile),
    } : {
      to: profile.email,
      subject: profile.access_status === 'approved' ? 'Acesso ao T-Sim aprovado' : 'Atualização da solicitação T-Sim',
      text: decisionText(profile, profile.access_status, profile.denial_reason),
    });
    const statusColumn = kind === 'initial' ? 'initial_notification_status' : 'decision_notification_status';
    const { error: updateError } = await admin.from('access_profiles').update({
      [statusColumn]: notification.sent ? 'sent' : 'failed',
      notification_error: notification.sent ? null : notification.reason,
      updated_at: new Date().toISOString(),
    }).eq('user_id', id);
    if (updateError) throw new AccessError(503, 'A mensagem foi processada, mas o estado do reenvio não foi salvo.');
    const { error: auditError } = await admin.from('access_audit_log').insert({
      target_user_id: id,
      action: 'notification_retried',
      details: { kind, status: notification.sent ? 'sent' : 'failed' },
    });
    if (auditError) throw new AccessError(503, 'O reenvio foi processado, mas não foi possível registrar a auditoria.');
    if (!notification.sent) throw new AccessError(503, notification.reason || 'O provedor não enviou a mensagem.');
    sendJson(res, 200, { status: 'sent', message: 'E-mail reenviado com sucesso.' });
  } catch (error) {
    handleError(res, error);
  }
}

export const POST = withVercelWebHandler(handler);
