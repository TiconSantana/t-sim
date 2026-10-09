import {
  AccessError, bodyOf, decisionText, deliverEmail, handleError, methodOnly,
  requireOrigin, requireSession, sendJson, withVercelWebHandler,
} from '../../../server/access.mjs';

async function handler(req, res) {
  try {
    methodOnly(req, res, 'POST');
    requireOrigin(req);
    const { admin, profile: actor } = await requireSession(req, res, true);
    const id = String(req.query?.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new AccessError(400, 'Identificador da solicitação inválido.');
    const body = bodyOf(req);
    const decision = body.decision === 'approved' || body.decision === 'denied' ? body.decision : '';
    const reason = String(body.reason || '').trim().slice(0, 1000);
    if (!decision) throw new AccessError(400, 'Escolha aprovar ou negar a solicitação.');
    if (decision === 'denied' && reason.length < 3) throw new AccessError(400, 'Informe o motivo para negar a solicitação.');

    const { data, error } = await admin.rpc('review_access_request', {
      p_target_user_id: id,
      p_actor_user_id: actor.user_id,
      p_decision: decision,
      p_reason: decision === 'denied' ? reason : null,
    });
    if (error) {
      if (error.code === 'P0002') throw new AccessError(409, 'A solicitação não está mais pendente. Atualize a fila.');
      if (error.code === '42501') throw new AccessError(403, 'Esta ação exige uma conta administrativa.');
      if (error.code === '22023') throw new AccessError(400, 'A decisão enviada não é válida.');
      throw new AccessError(503, 'Não foi possível registrar a decisão administrativa.');
    }
    const reviewed = data && !Array.isArray(data) ? data : data?.[0];
    if (!reviewed?.user_id) throw new AccessError(503, 'A decisão não retornou um registro válido.');

    const notification = await deliverEmail({
      to: reviewed.email,
      subject: decision === 'approved' ? 'Acesso ao T-Sim aprovado' : 'Atualização da solicitação T-Sim',
      text: decisionText(reviewed, decision, reason),
    });
    const { error: notificationUpdateError } = await admin.from('access_profiles').update({
      decision_notification_status: notification.sent ? 'sent' : 'failed',
      notification_error: notification.sent ? null : notification.reason,
      updated_at: new Date().toISOString(),
    }).eq('user_id', id);
    if (notificationUpdateError) throw new AccessError(503, 'Decisão registrada, mas não foi possível salvar o estado do e-mail. Atualize a fila administrativa.');

    sendJson(res, 200, {
      status: decision,
      notificationStatus: notification.sent ? 'sent' : 'failed',
      message: notification.sent
        ? 'Decisão registrada e enviada por e-mail.'
        : 'Decisão registrada, mas o e-mail não foi enviado. Configure o provedor e reenvie a notificação.',
    });
  } catch (error) {
    handleError(res, error);
  }
}

export const POST = withVercelWebHandler(handler);
