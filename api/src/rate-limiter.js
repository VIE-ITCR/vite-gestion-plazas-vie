// In-memory rate limiter — resets on cold start, sufficient for login brute-force protection
const _attempts = new Map(); // "ip:email" -> { count, resetAt }

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip, email) {
  const key = `${ip}:${(email || '').toLowerCase()}`;
  const now = Date.now();
  const entry = _attempts.get(key);

  if (!entry || now > entry.resetAt) {
    _attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    const wait = Math.ceil((entry.resetAt - now) / 60000);
    const e = new Error(`Demasiados intentos para esta cuenta. Espere ${wait} minutos.`);
    e.status = 429;
    throw e;
  }
}

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  ).split(',')[0].trim();
}

module.exports = { checkRateLimit, getClientIp };
