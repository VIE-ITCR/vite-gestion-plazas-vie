const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS, intOrNull } = require('../helpers');

app.http('unidades', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'unidades/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'cat_unidades');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        const r = await pool.request().query('SELECT * FROM unidades ORDER BY nombre');
        return { status: 200, headers: CORS, jsonBody: r.recordset };
      }

      if (req.method === 'DELETE') {
        await pool.request().input('id', sql.Int, id).query('DELETE FROM unidades WHERE id=@id');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();

      if (req.method === 'POST') {
        const res = await pool.request()
          .input('codigo', sql.NVarChar, body.codigo || '')
          .input('nombre', sql.NVarChar, body.nombre || '')
          .input('sedeId', sql.Int, intOrNull(body.sedeId))
          .query('INSERT INTO unidades (codigo,nombre,sedeId) OUTPUT INSERTED.id VALUES (@codigo,@nombre,@sedeId)');
        return { status: 201, headers: CORS, jsonBody: { ...body, id: res.recordset[0].id } };
      }

      if (req.method === 'PUT') {
        await pool.request()
          .input('id', sql.Int, id)
          .input('codigo', sql.NVarChar, body.codigo || '')
          .input('nombre', sql.NVarChar, body.nombre || '')
          .input('sedeId', sql.Int, intOrNull(body.sedeId))
          .query('UPDATE unidades SET codigo=@codigo,nombre=@nombre,sedeId=@sedeId WHERE id=@id');
        return { status: 200, headers: CORS, jsonBody: body };
      }

    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

