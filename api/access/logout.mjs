import { clearSessionCookie, handleError, methodOnly, requireOrigin, sendJson, withVercelWebHandler } from '../../server/access.mjs';

async function handler(req, res) {
  try {
    methodOnly(req, res, 'POST');
    requireOrigin(req);
    clearSessionCookie(res);
    sendJson(res, 200, { status: 'signed_out' });
  } catch (error) {
    handleError(res, error);
  }
}

export const POST = withVercelWebHandler(handler);
