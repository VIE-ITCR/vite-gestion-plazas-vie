const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { signToken } = require('../auth');
const { CORS, sanitize } = require('../helpers');
const { checkRateLimit, getClientIp } = require('../rate-limiter');
const bcrypt = require('bcryptjs');

app.http('login', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'login',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      const body = await req.json();
      const email = sanitize(body.email, 200).toLowerCase();
      const password = body.password ? String(body.password).slice(0, 200) : '';
      if (!email || !password)
        return { status: 400, headers: CORS, jsonBody: { error: 'Correo y contraseña requeridos.' } };
      checkRateLimit(getClientIp(req), email);

      const pool = await getPool();
      const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`SELECT u.uid, u.nombre, u.email, u.password_hash, u.activo,
          ISNULL((SELECT TOP 1 rolId FROM usuarioRoles WHERE usuarioId=u.uid), u.rolId) AS rolId
          FROM usuarios u WHERE u.email=@email AND u.activo=1`);

      const user = result.recordset[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash)))
        return { status: 401, headers: CORS, jsonBody: { error: 'Credenciales inválidas.' } };

      const token = signToken({ uid: user.uid, email: user.email, rolId: user.rolId, nombre: user.nombre });
      return {
        status: 200, headers: CORS,
        jsonBody: { token, user: { uid: user.uid, nombre: user.nombre, email: user.email, rolId: user.rolId } }
      };
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});
