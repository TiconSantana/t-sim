import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const ADMIN_EMAIL = 'tconnectsuporte@gmail.com';
export const COOKIE_NAME = 'tsim_access_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export class AccessError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function withVercelWebHandler(handler) {
  return async function webHandler(request) {
    const url = new URL(request.url);
    const headers = Object.fromEntries(request.headers.entries());
    const responseHeaders = new Headers();
    const query = Object.fromEntries(url.searchParams.entries());
    const segments = url.pathname.split('/').filter(Boolean);
    if (!query.id && ['review', 'notify'].includes(segments.at(-1)) && segments.at(-2) !== 'requests') {
      query.id = decodeURIComponent(segments.at(-2) || '');
    }
    let body;
    let bodyError = false;
    if (!['GET', 'HEAD'].includes(request.method)) {
      try { body = await request.json(); } catch { bodyError = true; }
    }
    let response;
    const res = {
      statusCode: 200,
      setHeader(name, value) { responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : String(value)); },
      end(payload = '') {
        response = new Response(payload || null, { status: this.statusCode, headers: responseHeaders });
      },
    };
    const req = {
      method: request.method,
      url: request.url,
      headers,
      query,
      body,
      bodyError,
      socket: { remoteAddress: headers['x-real-ip'] || '' },
    };
    await handler(req, res);
    return response || new Response(null, { status: 204, headers: responseHeaders });
  };
}

export function methodOnly(req, res, method) {
  if (req.method !== method) {
    res.setHeader('Allow', method);
    throw new AccessError(405, 'Método não permitido.');
  }
}

export function bodyOf(req) {
  if (req.bodyError) throw new AccessError(400, 'Os dados enviados não estão em um formato válido.');
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(typeof req.body === 'string' ? req.body : '{}');
  } catch {
    throw new AccessError(400, 'Os dados enviados não estão em um formato válido.');
  }
}

export function normalizeRegistration(value) {
  return String(value || '').trim().normalize('NFKC').toUpperCase();
}

export function validRegistration(value) {
  return value.length >= 2 && value.length <= 40 && /^[\p{L}\p{N}._/-]+$/u.test(value);
}

export function syntheticAuthEmail(registration) {
  const digest = createHash('sha256').update(normalizeRegistration(registration)).digest('hex');
  return `login-${digest}@auth.t-sim.invalid`;
}

export function hashKey(...parts) {
  return createHash('sha256').update(parts.join('\u001f')).digest('hex');
}

export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AccessError(503, 'O serviço de acesso ainda não está configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function getPublicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new AccessError(503, 'O serviço de acesso ainda não está configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function sessionKey() {
  const value = process.env.TSIM_SESSION_ENCRYPTION_KEY || '';
  if (!/^[\da-f]{64}$/i.test(value)) throw new AccessError(503, 'A chave segura de sessão ainda não está configurada.');
  return Buffer.from(value, 'hex');
}

function sealSession(session) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function openSession(value) {
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const clear = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
    const session = JSON.parse(clear);
    if (!session.accessToken || !session.refreshToken || Number(session.expiresAt) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((item) => {
    const separator = item.indexOf('=');
    return separator < 0 ? ['', ''] : [item.slice(0, separator).trim(), decodeURIComponent(item.slice(separator + 1).trim())];
  }).filter(([name]) => name));
}

function cookieValue(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function setSessionCookie(res, session) {
  const now = Date.now();
  const accessExpiresAt = now + (Number(session.expires_in) || 3600) * 1000;
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  const sealed = sealSession({ accessToken: session.access_token, refreshToken: session.refresh_token, accessExpiresAt, expiresAt });
  res.setHeader('Set-Cookie', cookieValue(sealed, SESSION_TTL_SECONDS));
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

async function loadSession(req, res) {
  const sealed = parseCookies(req)[COOKIE_NAME];
  const session = sealed && openSession(sealed);
  if (!session) return null;
  const publicClient = getPublicClient();
  let token = session.accessToken;
  let userResult = Number(session.accessExpiresAt) > Date.now()
    ? await publicClient.auth.getUser(token)
    : { error: new Error('Access token expired') };
  if (userResult.error) {
    const refreshed = await publicClient.auth.refreshSession({ refresh_token: session.refreshToken });
    if (refreshed.error || !refreshed.data.session) return null;
    setSessionCookie(res, refreshed.data.session);
    token = refreshed.data.session.access_token;
    userResult = await publicClient.auth.getUser(token);
  }
  if (userResult.error || !userResult.data.user) return null;
  const admin = getAdminClient();
  const { data: profile, error } = await admin.from('access_profiles').select('user_id,registration,full_name,email,company,job_title,access_status,is_admin').eq('user_id', userResult.data.user.id).maybeSingle();
  if (error) throw new AccessError(503, 'Não foi possível confirmar o status desta conta.');
  if (!profile || profile.access_status !== 'approved') return null;
  return { admin, profile };
}

export async function requireSession(req, res, adminRequired = false) {
  const current = await loadSession(req, res);
  if (!current) {
    clearSessionCookie(res);
    throw new AccessError(401, 'Sua sessão expirou. Entre novamente.');
  }
  if (adminRequired && !current.profile.is_admin) throw new AccessError(403, 'Esta ação exige uma conta administrativa.');
  return current;
}

export function publicAccount(profile) {
  return {
    registration: profile.registration,
    fullName: profile.full_name,
    role: profile.job_title,
    company: profile.company,
    isAdmin: profile.is_admin,
  };
}

export async function enforceRateLimit(admin, bucket, limit, windowSeconds) {
  const { data, error } = await admin.rpc('consume_access_rate_limit', {
    p_bucket_key: bucket,
    p_max_attempts: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new AccessError(503, 'Não foi possível validar o limite de tentativas.');
  if (data !== true) throw new AccessError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.');
}

export function requestIp(req) {
  const raw = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  return String(raw).split(',').at(-1).trim();
}

export function requireOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) throw new AccessError(403, 'Origem de solicitação inválida.');
  let originUrl;
  try { originUrl = new URL(origin); } catch { throw new AccessError(403, 'Origem de solicitação inválida.'); }
  const allowed = new Set();
  try { if (req.url) allowed.add(new URL(req.url).origin); } catch { /* Invalid request URLs are not trusted. */ }
  if (process.env.PUBLIC_APP_URL) {
    try { allowed.add(new URL(process.env.PUBLIC_APP_URL).origin); } catch { /* Invalid configuration is not trusted. */ }
  }
  if (req.headers.host) {
    const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    allowed.add(`${protocol}://${req.headers.host}`);
  }
  if (!allowed.has(originUrl.origin)) throw new AccessError(403, 'Origem de solicitação inválida.');
}

export function validateRequest(body) {
  const registration = normalizeRegistration(body.registration);
  const fullName = String(body.fullName || '').trim().replace(/\s+/g, ' ');
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const company = String(body.company || '').trim();
  const jobTitle = String(body.role || '').trim();
  const pin = String(body.pin || '');
  if (!validRegistration(registration)) throw new AccessError(400, 'Informe uma matrícula válida.');
  if (fullName.length < 3 || fullName.length > 120) throw new AccessError(400, 'Informe o nome completo.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError(400, 'Informe um e-mail válido.');
  if (phone.length < 8 || phone.length > 30) throw new AccessError(400, 'Informe um telefone válido.');
  if (company.length < 2 || company.length > 120) throw new AccessError(400, 'Informe a empresa.');
  if (jobTitle.length < 2 || jobTitle.length > 120) throw new AccessError(400, 'Informe o cargo ou função.');
  if (!/^\d{6}$/.test(pin)) throw new AccessError(400, 'A senha precisa ter exatamente seis números.');
  if (String(body.confirmPin || '') !== pin) throw new AccessError(400, 'As senhas não conferem.');
  return { registration, fullName, email, phone, company, jobTitle, pin };
}

function escapeEmailText(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').slice(0, 500);
}

export async function deliverEmail({ to, subject, text }) {
  const user = String(process.env.GMAIL_SMTP_USER || ADMIN_EMAIL).trim().toLowerCase();
  const appPassword = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!appPassword) return { sent: false, reason: 'O envio pelo Gmail ainda não está configurado.' };

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  try {
    await transporter.sendMail({
      from: { name: 'T-Sim', address: user },
      replyTo: ADMIN_EMAIL,
      to,
      subject: escapeEmailText(subject),
      text,
    });
    return { sent: true };
  } catch {
    return { sent: false, reason: 'O Gmail não aceitou o envio. Confira a senha de app e tente novamente.' };
  } finally {
    transporter.close();
  }
}

export function requestText(profile) {
  return [
    'Nova solicitação de acesso ao T-Sim',
    '',
    `Matrícula: ${escapeEmailText(profile.registration)}`,
    `Nome: ${escapeEmailText(profile.full_name)}`,
    `E-mail: ${escapeEmailText(profile.email)}`,
    `Telefone: ${escapeEmailText(profile.phone)}`,
    `Empresa: ${escapeEmailText(profile.company)}`,
    `Cargo / função: ${escapeEmailText(profile.job_title)}`,
    '',
    'A senha não foi incluída nesta mensagem. Revise a solicitação na área administrativa do T-Sim.',
    process.env.PUBLIC_APP_URL || 'https://t-sim.vercel.app',
  ].join('\n');
}

export function decisionText(profile, decision, reason = '') {
  if (decision === 'approved') {
    return `Olá, ${escapeEmailText(profile.full_name)}.\n\nSeu acesso ao T-Sim foi aprovado. Entre usando sua matrícula e a senha de seis dígitos cadastrada.\n\nAcesse: ${process.env.PUBLIC_APP_URL || 'https://t-sim.vercel.app'}\n\nApós entrar, você será direcionado à Configuração de Ambiente.\n\nEquipe T-Sim`;
  }
  return `Olá, ${escapeEmailText(profile.full_name)}.\n\nSua solicitação de acesso ao T-Sim não foi aprovada neste momento.\nMotivo informado: ${escapeEmailText(reason)}\n\nSe precisar de esclarecimentos, escreva para ${ADMIN_EMAIL}.\n\nEquipe T-Sim`;
}

export function handleError(res, error) {
  const status = Number(error?.status) || 500;
  sendJson(res, status, { message: status === 500 ? 'O serviço de acesso não conseguiu concluir a operação.' : error.message });
}
