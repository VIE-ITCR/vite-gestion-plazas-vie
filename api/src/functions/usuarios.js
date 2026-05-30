const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS, validatePassword } = require('../helpers');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

app.http('usuarios', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'usuarios/{uid?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'usuarios');
      const pool = await getPool();
      const uid = req.params.uid || null;

      if (req.method === 'GET') {
        const usersR = await pool.request().query('SELECT uid,nombre,email,rolId,activo,createdAt FROM usuarios ORDER BY nombre');
        let urR = { recordset: [] }, uuR = { recordset: [] };
        try { urR = await pool.request().query('SELECT usuarioId,rolId FROM usuarioRoles'); } catch {}
        try { uuR = await pool.request().query('SELECT usuarioId,rolId,todasUnidades,unidadId FROM usuarioUnidades'); } catch {}
        // build roles map: usuarioId -> [{rolId, todasUnidades, unidades:[]}]
        const rolesMap = {};
        urR.recordset.forEach(r => {
          if (!rolesMap[r.usuarioId]) rolesMap[r.usuarioId] = {};
          if (!rolesMap[r.usuarioId][r.rolId]) rolesMap[r.usuarioId][r.rolId] = { rolId: r.rolId, todasUnidades: false, unidades: [] };
        });
        uuR.recordset.forEach(r => {
          if (!rolesMap[r.usuarioId]) rolesMap[r.usuarioId] = {};
          if (!rolesMap[r.usuarioId][r.rolId]) rolesMap[r.usuarioId][r.rolId] = { rolId: r.rolId, todasUnidades: false, unidades: [] };
          if (r.todasUnidades) {
            rolesMap[r.usuarioId][r.rolId].todasUnidades = true;
          } else if (r.unidadId != null) {
            rolesMap[r.usuarioId][r.rolId].unidades.push(r.unidadId);
          }
        });
        return {
          status: 200, headers: CORS,
          jsonBody: usersR.recordset.map(u => {
            const roles = rolesMap[u.uid] ? Object.values(rolesMap[u.uid]) : [];
            const primaryRolId = roles[0]?.rolId || u.rolId;
            return { ...u, rolId: primaryRolId, roles };
          })
        };
      }

      if (req.method === 'DELETE') {
        await pool.request().input('uid', sql.NVarChar, uid).query('DELETE FROM usuarioUnidades WHERE usuarioId=@uid');
        await pool.request().input('uid', sql.NVarChar, uid).query('DELETE FROM usuarioRoles WHERE usuarioId=@uid');
        await pool.request().input('uid', sql.NVarChar, uid).query('DELETE FROM usuarios WHERE uid=@uid');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();

      if (req.method === 'POST') {
        if (!body.email || !body.password)
          return { status: 400, headers: CORS, jsonBody: { error: 'Email y contraseña requeridos.' } };
        const pwdErr = validatePassword(body.password);
        if (pwdErr) return { status: 400, headers: CORS, jsonBody: { error: pwdErr } };
        const hash = await bcrypt.hash(body.password, 10);
        const newUid = randomUUID();
        const primaryRolId = (body.roles || [])[0]?.rolId || body.rolId || 'viewer';
        await pool.request()
          .input('uid', sql.NVarChar, newUid)
          .input('nombre', sql.NVarChar, body.nombre || '')
          .input('email', sql.NVarChar, body.email)
          .input('hash', sql.NVarChar, hash)
          .input('rolId', sql.NVarChar, primaryRolId)
          .query('INSERT INTO usuarios (uid,nombre,email,password_hash,rolId,activo) VALUES (@uid,@nombre,@email,@hash,@rolId,1)');
        await saveRolesYUnidades(pool, newUid, body.roles || []);
        return { status: 201, headers: CORS, jsonBody: { uid: newUid, nombre: body.nombre, email: body.email, rolId: primaryRolId, activo: true, roles: body.roles || [] } };
      }

      if (req.method === 'PUT') {
        const r = pool.request()
          .input('uid', sql.NVarChar, uid)
          .input('nombre', sql.NVarChar, body.nombre || '')
          .input('activo', sql.Bit, body.activo ? 1 : 0);
        const primaryRolId = (body.roles || [])[0]?.rolId || body.rolId;
        if (primaryRolId) r.input('rolId', sql.NVarChar, primaryRolId);
        if (body.password) {
          const pwdErr = validatePassword(body.password);
          if (pwdErr) return { status: 400, headers: CORS, jsonBody: { error: pwdErr } };
          r.input('hash', sql.NVarChar, await bcrypt.hash(body.password, 10));
          const resU = await r.query(primaryRolId
            ? 'UPDATE usuarios SET nombre=@nombre,rolId=@rolId,activo=@activo,password_hash=@hash WHERE uid=@uid'
            : 'UPDATE usuarios SET nombre=@nombre,activo=@activo,password_hash=@hash WHERE uid=@uid');
          if (!resU.rowsAffected[0]) { const e = new Error('No se encontró el usuario para actualizar.'); e.status = 404; throw e; }
        } else {
          const resU = await r.query(primaryRolId
            ? 'UPDATE usuarios SET nombre=@nombre,rolId=@rolId,activo=@activo WHERE uid=@uid'
            : 'UPDATE usuarios SET nombre=@nombre,activo=@activo WHERE uid=@uid');
          if (!resU.rowsAffected[0]) { const e = new Error('No se encontró el usuario para actualizar.'); e.status = 404; throw e; }
        }
        if (body.roles !== undefined) {
          await saveRolesYUnidades(pool, uid, body.roles);
        }
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

async function saveRolesYUnidades(pool, usuarioId, roles) {
  await pool.request().input('uid', sql.NVarChar, usuarioId).query('DELETE FROM usuarioUnidades WHERE usuarioId=@uid');
  await pool.request().input('uid', sql.NVarChar, usuarioId).query('DELETE FROM usuarioRoles WHERE usuarioId=@uid');
  for (const r of roles) {
    const resRol = await pool.request()
      .input('id', sql.NVarChar, randomUUID())
      .input('uid', sql.NVarChar, usuarioId)
      .input('rolId', sql.Int, parseInt(r.rolId))
      .query('INSERT INTO usuarioRoles (id,usuarioId,rolId) VALUES (@id,@uid,@rolId)');
    if (!resRol.rowsAffected[0]) {
      const e = new Error('No se pudo guardar el rol ' + r.rolId + ' en la base de datos.'); e.status = 500; throw e;
    }
    if (r.todasUnidades) {
      const resUni = await pool.request()
        .input('id', sql.NVarChar, randomUUID())
        .input('uid', sql.NVarChar, usuarioId)
        .input('rolId', sql.Int, parseInt(r.rolId))
        .query('INSERT INTO usuarioUnidades (id,usuarioId,rolId,todasUnidades,unidadId) VALUES (@id,@uid,@rolId,1,NULL)');
      if (!resUni.rowsAffected[0]) {
        const e = new Error('No se pudo guardar la unidad del rol ' + r.rolId + '.'); e.status = 500; throw e;
      }
    } else {
      for (const uniId of (r.unidades || [])) {
        const resUni = await pool.request()
          .input('id', sql.NVarChar, randomUUID())
          .input('uid', sql.NVarChar, usuarioId)
          .input('rolId', sql.Int, parseInt(r.rolId))
          .input('uniId', sql.Int, Number(uniId))
          .query('INSERT INTO usuarioUnidades (id,usuarioId,rolId,todasUnidades,unidadId) VALUES (@id,@uid,@rolId,0,@uniId)');
        if (!resUni.rowsAffected[0]) {
          const e = new Error('No se pudo guardar la unidad ' + uniId + ' del rol ' + r.rolId + '.'); e.status = 500; throw e;
        }
      }
    }
  }
}
