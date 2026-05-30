const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS } = require('../helpers');

app.http('tiposActividad', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'tiposActividad/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'cat_tipos');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        const [tiposRes, subsRes] = await Promise.all([
          pool.request().query('SELECT * FROM tiposActividad ORDER BY nombre'),
          pool.request().query('SELECT tipoId, nombre FROM tiposActividad_subcategorias')
        ]);
        const map = {};
        subsRes.recordset.forEach(r => {
          if (!map[r.tipoId]) map[r.tipoId] = [];
          map[r.tipoId].push(r.nombre);
        });
        return {
          status: 200, headers: CORS,
          jsonBody: tiposRes.recordset.map(t => ({ ...t, subcategorias: map[t.id] || [] }))
        };
      }

      if (req.method === 'DELETE') {
        const t = new sql.Transaction(pool); await t.begin();
        try {
          await new sql.Request(t).input('id', sql.Int, id).query('DELETE FROM tiposActividad_subcategorias WHERE tipoId=@id');
          await new sql.Request(t).input('id', sql.Int, id).query('DELETE FROM tiposActividad WHERE id=@id');
          await t.commit();
        } catch (e) { await t.rollback(); throw e; }
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();
      const subcategorias = Array.isArray(body.subcategorias) ? body.subcategorias : [];

      const syncSubs = async (t, tipoId) => {
        await new sql.Request(t).input('id', sql.Int, tipoId)
          .query('DELETE FROM tiposActividad_subcategorias WHERE tipoId=@id');
        for (const nombre of subcategorias) {
          await new sql.Request(t)
            .input('tipoId', sql.Int, tipoId)
            .input('nombre', sql.NVarChar, nombre)
            .query('INSERT INTO tiposActividad_subcategorias (tipoId, nombre) VALUES (@tipoId, @nombre)');
        }
      };

      if (req.method === 'POST') {
        const t = new sql.Transaction(pool); await t.begin();
        try {
          const r = await new sql.Request(t)
            .input('nombre', sql.NVarChar, body.nombre || '')
            .query('INSERT INTO tiposActividad (nombre) OUTPUT INSERTED.id VALUES (@nombre)');
          const newId = r.recordset[0].id;
          await syncSubs(t, newId);
          await t.commit();
          return { status: 201, headers: CORS, jsonBody: { ...body, id: newId, subcategorias } };
        } catch (e) { await t.rollback(); throw e; }
      }

      if (req.method === 'PUT') {
        const t = new sql.Transaction(pool); await t.begin();
        try {
          await new sql.Request(t)
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar, body.nombre || '')
            .query('UPDATE tiposActividad SET nombre=@nombre WHERE id=@id');
          await syncSubs(t, id);
          await t.commit();
        } catch (e) { await t.rollback(); throw e; }
        return { status: 200, headers: CORS, jsonBody: { ...body, subcategorias } };
      }

    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

