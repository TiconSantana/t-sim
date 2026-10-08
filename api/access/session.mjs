import { handleError, methodOnly, publicAccount, requireSession, sendJson, clearSessionCookie, withVercelWebHandler } from '../../server/access.mjs';

async function handler(req, res) {
  try {
    methodOnly(req, res, 'GET');
    const { profile } = await requireSession(req, res);
    sendJson(res, 200, { status: 'approved', user: publicAccount(profile) });
  } catch (error) {
    if (error.status === 401) {
      clearSessionCookie(res);
      sendJson(res, 401, { status: 'unauthenticated' });
    }
    else handleError(res, error);
  }
}

export const GET = withVercelWebHandler(handler);
