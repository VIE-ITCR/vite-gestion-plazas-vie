const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requireAuth } = require('../auth');
const { CORS, validatePassword } = require('../helpers');
const bcrypt = require('bcryptjs');

app.http('cambiarPassword', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'cambiarPassword',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      const claims = await requireAuth(req);
      const { passwordActual, passwordNuevo } = await req.json();

      if (!passwordActual || !passwordNuevo)
        return { status: 400, headers: CORS, jsonBody: { error: 'Contraseña actual y nueva son requeridas.' } };

      const pwdErr = validatePassword(passwordNuevo);
      if (pwdErr) return { status: 400, headers: CORS, jsonBody: { error: pwdErr } };

      const pool = await getPool();
      const result = await pool.request()
        .input('uid', sql.NVarChar, claims.uid)
        .query('SELECT password_hash FROM usuarios WHERE uid=@uid AND activo=1');

      const user = result.recordset[0];
      if (!user) return { status: 404, headers: CORS, jsonBody: { error: 'Usuario no encontrado.' } };

      if (!(await bcrypt.compare(passwordActual, user.password_hash)))
        return { status: 401, headers: CORS, jsonBody: { error: 'La contraseña actual es incorrecta.' } };

      const newHash = await bcrypt.hash(passwordNuevo, 10);
      await pool.request()
        .input('uid', sql.NVarChar, claims.uid)
        .input('hash', sql.NVarChar, newHash)
        .query('UPDATE usuarios SET password_hash=@hash WHERE uid=@uid');

      return { status: 200, headers: CORS, jsonBody: { ok: true } };
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});
