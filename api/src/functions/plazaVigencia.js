const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS } = require('../helpers');

app.http('plaza_vigencia', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'plaza_vigencia/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'cat_vigencia');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        const r = await pool.request().query('SELECT vigenciaid, vigencia FROM plaza_vigencia ORDER BY vigencia');
        return { status: 200, headers: CORS, jsonBody: r.recordset };
      }

      if (req.method === 'DELETE') {
        await pool.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM plaza_vigencia WHERE vigenciaid=@id');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();

      if (req.method === 'POST') {
        const r = await pool.request()
          .input('vigencia', sql.NVarChar(100), body.vigencia || '')
          .query('INSERT INTO plaza_vigencia (vigencia) OUTPUT INSERTED.* VALUES (@vigencia)');
        return { status: 201, headers: CORS, jsonBody: r.recordset[0] };
      }

      if (req.method === 'PUT') {
        await pool.request()
          .input('id', sql.Int, id)
          .input('vigencia', sql.NVarChar(100), body.vigencia || '')
          .query('UPDATE plaza_vigencia SET vigencia=@vigencia WHERE vigenciaid=@id');
        return { status: 200, headers: CORS, jsonBody: { vigenciaid: id, vigencia: body.vigencia } };
      }

    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

