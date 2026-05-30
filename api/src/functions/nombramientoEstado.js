const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS } = require('../helpers');

app.http('nombramiento_estado', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'nombramiento_estado/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'cat_nomEstado');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        const r = await pool.request().query('SELECT estadoid, estado FROM nombramiento_estado ORDER BY estado');
        return { status: 200, headers: CORS, jsonBody: r.recordset };
      }

      if (req.method === 'DELETE') {
        await pool.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM nombramiento_estado WHERE estadoid=@id');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();

      if (req.method === 'POST') {
        const r = await pool.request()
          .input('estado', sql.NVarChar(100), body.estado || '')
          .query('INSERT INTO nombramiento_estado (estado) OUTPUT INSERTED.* VALUES (@estado)');
        return { status: 201, headers: CORS, jsonBody: r.recordset[0] };
      }

      if (req.method === 'PUT') {
        await pool.request()
          .input('id', sql.Int, id)
          .input('estado', sql.NVarChar(100), body.estado || '')
          .query('UPDATE nombramiento_estado SET estado=@estado WHERE estadoid=@id');
        return { status: 200, headers: CORS, jsonBody: { estadoid: id, estado: body.estado } };
      }

    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

