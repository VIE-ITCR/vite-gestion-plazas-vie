const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS, intOrNull, floatOrZero } = require('../helpers');

const bind = (r, b) => r
  .input('plazaId', sql.Int, intOrNull(b.plazaId))
  .input('profesorId', sql.Int, intOrNull(b.profesorId))
  .input('proyectoId', sql.Int, intOrNull(b.proyectoId))
  .input('tipoNombramientoId', sql.Int, intOrNull(b.tipoNombramientoId))
  .input('unidadId', sql.Int, intOrNull(b.unidadId))
  .input('verificacionId', sql.Int, intOrNull(b.verificacionId))
  .input('horas', sql.Decimal(5, 2), floatOrZero(b.horas))
  .input('inicio', sql.Date, b.inicio || null)
  .input('fin', sql.Date, b.fin || null)
  .input('estadoId', sql.Int, b.estadoId ? parseInt(b.estadoId) : null)
  .input('observaciones', sql.NVarChar, b.observaciones || '')
  .input('acuerdo', sql.NVarChar, b.acuerdo || '');

app.http('nombramientos', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'nombramientos/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'nombramientos');
      const pool = await getPool();
      const id = req.params.id ? parseInt(req.params.id) : null;

      if (req.method === 'GET') {
        const q = req.query
        const conditions = []
        const dbReq = pool.request()
        if (q.get('estado')) {
          conditions.push('estado=@estado')
          dbReq.input('estado', sql.NVarChar, q.get('estado'))
        }
        if (q.get('verificacionId')) {
          conditions.push('verificacionId=@verificacionId')
          dbReq.input('verificacionId', sql.Int, parseInt(q.get('verificacionId')))
        }
        if (q.get('sedeId')) {
          conditions.push('unidadId IN (SELECT id FROM unidades WHERE sedeId=@sedeId)')
          dbReq.input('sedeId', sql.Int, parseInt(q.get('sedeId')))
        }
        const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''
        const r = await dbReq.query('SELECT * FROM nombramientos' + where + ' ORDER BY inicio')
        return { status: 200, headers: CORS, jsonBody: r.recordset }
      }

      if (req.method === 'DELETE') {
        await pool.request().input('id', sql.Int, id).query('DELETE FROM nombramientos WHERE id=@id');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();

      if (req.method === 'POST') {
        const res = await bind(pool.request(), body)
          .query('INSERT INTO nombramientos (plazaId,profesorId,proyectoId,tipoNombramientoId,unidadId,verificacionId,horas,inicio,fin,estadoId,observaciones,acuerdo) OUTPUT INSERTED.id VALUES (@plazaId,@profesorId,@proyectoId,@tipoNombramientoId,@unidadId,@verificacionId,@horas,@inicio,@fin,@estadoId,@observaciones,@acuerdo)');
        return { status: 201, headers: CORS, jsonBody: { ...body, id: res.recordset[0].id } };
      }

      if (req.method === 'PUT') {
        const resU = await bind(pool.request().input('id', sql.Int, id), body)
          .query('UPDATE nombramientos SET plazaId=@plazaId,profesorId=@profesorId,proyectoId=@proyectoId,tipoNombramientoId=@tipoNombramientoId,unidadId=@unidadId,verificacionId=@verificacionId,horas=@horas,inicio=@inicio,fin=@fin,estadoId=@estadoId,observaciones=@observaciones,acuerdo=@acuerdo WHERE id=@id');
        if (!resU.rowsAffected[0]) { const e = new Error('No se encontró el nombramiento para actualizar.'); e.status = 404; throw e; }
        return { status: 200, headers: CORS, jsonBody: body };
      }
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

