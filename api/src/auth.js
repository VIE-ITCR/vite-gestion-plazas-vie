const jwt = require('jsonwebtoken');
const { getPool, sql } = require('./db');

function getToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

async function requireAuth(request) {
  const token = getToken(request);
  if (!token) {
    const e = new Error('No autorizado'); e.status = 401; throw e;
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const e = new Error('Token inválido o expirado'); e.status = 401; throw e;
  }
  const pool = await getPool();
  const r = await pool.request()
    .input('token', sql.NVarChar(1000), token)
    .query('SELECT 1 FROM token_blacklist WHERE token=@token AND expiraEn>GETDATE()');
  if (r.recordset.length > 0) {
    const e = new Error('Token revocado'); e.status = 401; throw e;
  }
  let rows = [];
  try {
    const rp = await pool.request()
      .input('uid', sql.NVarChar(100), payload.uid)
      .query('SELECT r.permisos, r.sistema FROM usuarioRoles ur JOIN roles r ON r.id=ur.rolId WHERE ur.usuarioId=@uid');
    rows = rp.recordset;
  } catch {}
  if (payload.rolId) {
    try {
      const rp2 = await pool.request()
        .input('rolId', sql.Int, parseInt(payload.rolId))
        .query('SELECT permisos, sistema FROM roles WHERE id=@rolId');
      rows = [...rows, ...rp2.recordset];
    } catch {}
  }
  const ORDER = { write: 2, read: 1, none: 0 };
  const permisos = {};
  let isSistema = false;
  for (const row of rows) {
    if (row.sistema) isSistema = true;
    let p = {};
    if (row.permisos) { try { p = JSON.parse(row.permisos); } catch {} }
    for (const [k, v] of Object.entries(p)) {
      if ((ORDER[v] || 0) > (ORDER[permisos[k]] || 0)) permisos[k] = v;
    }
  }
  return { ...payload, permisos, sistema: isSistema };
}

async function requirePerm(request, key) {
  const payload = await requireAuth(request);
  if (payload.sistema) return payload;
  const need = request.method === 'GET' ? 'read' : 'write';
  const val = payload.permisos[key] || 'none';
  const ok = need === 'write' ? val === 'write' : (val === 'write' || val === 'read');
  if (!ok) {
    const e = new Error('Sin permisos suficientes'); e.status = 403; throw e;
  }
  return payload;
}

async function revokeToken(token) {
  try {
    const payload = jwt.decode(token);
    if (!payload || !payload.exp) return;
    const expiraEn = new Date(payload.exp * 1000);
    const pool = await getPool();
    await pool.request()
      .input('token', sql.NVarChar(1000), token)
      .input('expiraEn', sql.DateTime, expiraEn)
      .query('INSERT INTO token_blacklist (token, expiraEn) VALUES (@token, @expiraEn)');
    await pool.request().query('DELETE FROM token_blacklist WHERE expiraEn<=GETDATE()');
  } catch (err) { console.error('[revokeToken]', err.message); }
}

module.exports = { signToken, requireAuth, requirePerm, revokeToken, getToken };
