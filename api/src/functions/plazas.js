const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS, floatOrZero } = require('../helpers');

app.http('plazas', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'plazas/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'plazas');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        const r = await pool.request().query('SELECT * FROM plazas ORDER BY codigo');
        return { status: 200, headers: CORS, jsonBody: r.recordset };
      }

      if (req.method === 'DELETE') {
        await pool.request().input('id', sql.Int, id).query('DELETE FROM plazas WHERE id=@id');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();
      const bind = r => r
        .input('codigo', sql.NVarChar, body.codigo || '')
        .input('cf', sql.NVarChar, body.cf || '')
        .input('horasSemanales', sql.Decimal(5, 2), floatOrZero(body.horasSemanales))
        .input('vigenciaId', sql.Int, body.vigenciaId || null)
        .input('actividad', sql.NVarChar, body.actividad || '')
        .input('interno', sql.Bit, body.interno ? 1 : 0);

      if (req.method === 'POST') {
        const res = await bind(pool.request())
          .query('INSERT INTO plazas (codigo,cf,horasSemanales,vigenciaId,actividad,interno) OUTPUT INSERTED.id VALUES (@codigo,@cf,@horasSemanales,@vigenciaId,@actividad,@interno)');
        return { status: 201, headers: CORS, jsonBody: { ...body, id: res.recordset[0].id } };
      }

      if (req.method === 'PUT') {
        const resU = await bind(pool.request().input('id', sql.Int, id))
          .query('UPDATE plazas SET codigo=@codigo,cf=@cf,horasSemanales=@horasSemanales,vigenciaId=@vigenciaId,actividad=@actividad,interno=@interno WHERE id=@id');
        if (!resU.rowsAffected[0]) { const e = new Error('No se encontró la plaza para actualizar.'); e.status = 404; throw e; }
        return { status: 200, headers: CORS, jsonBody: body };
      }
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

