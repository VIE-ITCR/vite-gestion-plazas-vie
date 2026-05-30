const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS } = require('../helpers');

app.http('roles', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'roles/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'usuarios');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        let r;
        try {
          r = await pool.request().query('SELECT id,nombre,permisos,sistema,soloRegistrosPropios FROM roles ORDER BY nombre');
        } catch {
          r = await pool.request().query('SELECT id,nombre,permisos,sistema FROM roles ORDER BY nombre');
        }
        return {
          status: 200, headers: CORS,
          jsonBody: r.recordset.map(row => ({ ...row, permisos: row.permisos ? JSON.parse(row.permisos) : {}, soloRegistrosPropios: !!row.soloRegistrosPropios }))
        };
      }

      if (req.method === 'DELETE') {
        await pool.request().input('id', sql.Int, id).query('DELETE FROM roles WHERE id=@id');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();
      const permisos = JSON.stringify(body.permisos || {});

      if (req.method === 'POST') {
        const res = await pool.request()
          .input('nombre', sql.NVarChar, body.nombre || '')
          .input('permisos', sql.NVarChar, permisos)
          .input('sistema', sql.Bit, body.sistema ? 1 : 0)
          .input('solo', sql.Bit, body.soloRegistrosPropios ? 1 : 0)
          .query('INSERT INTO roles (nombre,permisos,sistema,soloRegistrosPropios) OUTPUT INSERTED.id VALUES (@nombre,@permisos,@sistema,@solo)');
        return { status: 201, headers: CORS, jsonBody: { ...body, id: res.recordset[0].id, soloRegistrosPropios: !!body.soloRegistrosPropios } };
      }

      if (req.method === 'PUT') {
        const resU = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar, body.nombre || '')
            .input('permisos', sql.NVarChar, permisos)
            .input('sistema', sql.Bit, body.sistema ? 1 : 0)
            .input('solo', sql.Bit, body.soloRegistrosPropios ? 1 : 0)
            .query('UPDATE roles SET nombre=@nombre,permisos=@permisos,sistema=@sistema,soloRegistrosPropios=@solo WHERE id=@id');
        if (!resU.rowsAffected[0]) { const e = new Error('No se encontró el rol para actualizar.'); e.status = 404; throw e; }
        return { status: 200, headers: CORS, jsonBody: { ...body, soloRegistrosPropios: !!body.soloRegistrosPropios } };
      }

    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

