const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS } = require('../helpers');

app.http('bitacora', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'bitacora',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'bitacora');
      const pool = await getPool();

      if (req.method === 'GET') {
        const r = await pool.request().query('SELECT * FROM bitacora ORDER BY fecha, hora');
        return { status: 200, headers: CORS, jsonBody: r.recordset };
      }

      if (req.method === 'POST') {
        const body = await req.json();
        await pool.request()
          .input('fecha', sql.Date, body.fecha || null)
          .input('hora', sql.NVarChar, body.hora || '')
          .input('usuario', sql.NVarChar, body.usuario || '')
          .input('accion', sql.NVarChar, body.accion || '')
          .input('detalle', sql.NVarChar, body.detalle || '')
          .input('entidad', sql.NVarChar, body.entidad || '')
          .input('entidadId', sql.NVarChar, body.entidadId != null ? String(body.entidadId) : '')
          .query('INSERT INTO bitacora (fecha,hora,usuario,accion,detalle,entidad,entidadId) VALUES (@fecha,@hora,@usuario,@accion,@detalle,@entidad,@entidadId)');
        return { status: 201, headers: CORS, jsonBody: { ok: true } };
      }
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

