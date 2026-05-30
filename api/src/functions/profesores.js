const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS } = require('../helpers');

app.http('profesores', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'profesores/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'cat_profesores');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        const [profRes, unidRes] = await Promise.all([
          pool.request().query('SELECT * FROM profesores ORDER BY nombre'),
          pool.request().query('SELECT profesorId, unidadId FROM profesor_unidades')
        ]);
        const map = {};
        unidRes.recordset.forEach(r => {
          if (!map[r.profesorId]) map[r.profesorId] = [];
          map[r.profesorId].push(r.unidadId);
        });
        return { status: 200, headers: CORS, jsonBody: profRes.recordset.map(p => ({ ...p, unidades: map[p.id] || [] })) };
      }

      if (req.method === 'DELETE') {
        const t = new sql.Transaction(pool); await t.begin();
        try {
          await new sql.Request(t).input('id', sql.Int, id).query('DELETE FROM profesor_unidades WHERE profesorId=@id');
          await new sql.Request(t).input('id', sql.Int, id).query('DELETE FROM profesores WHERE id=@id');
          await t.commit();
        } catch (e) { await t.rollback(); throw e; }
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();
      const unidades = Array.isArray(body.unidades) ? body.unidades.map(Number) : [];

      const syncUnidades = async (t, profId) => {
        await new sql.Request(t).input('pid', sql.Int, profId)
          .query('DELETE FROM profesor_unidades WHERE profesorId=@pid');
        for (const uid of unidades) {
          await new sql.Request(t)
            .input('pid', sql.Int, profId).input('uid', sql.Int, uid)
            .query('INSERT INTO profesor_unidades (profesorId,unidadId) VALUES (@pid,@uid)');
        }
      };

      if (req.method === 'POST') {
        const t = new sql.Transaction(pool); await t.begin();
        try {
          const r = await new sql.Request(t)
            .input('nombre', sql.NVarChar, body.nombre || '')
            .input('cedula', sql.NVarChar, body.cedula || '')
            .input('email', sql.NVarChar, body.email || '')
            .query('INSERT INTO profesores (nombre,cedula,email) OUTPUT INSERTED.id VALUES (@nombre,@cedula,@email)');
          const newId = r.recordset[0].id;
          await syncUnidades(t, newId);
          await t.commit();
          return { status: 201, headers: CORS, jsonBody: { ...body, id: newId, unidades } };
        } catch (e) { await t.rollback(); throw e; }
      }

      if (req.method === 'PUT') {
        const t = new sql.Transaction(pool); await t.begin();
        try {
          await new sql.Request(t)
            .input('id', sql.Int, id).input('nombre', sql.NVarChar, body.nombre || '')
            .input('cedula', sql.NVarChar, body.cedula || '').input('email', sql.NVarChar, body.email || '')
            .query('UPDATE profesores SET nombre=@nombre,cedula=@cedula,email=@email WHERE id=@id');
          await syncUnidades(t, id);
          await t.commit();
        } catch (e) { await t.rollback(); throw e; }
        return { status: 200, headers: CORS, jsonBody: { ...body, unidades } };
      }

    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

