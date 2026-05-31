const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS, intOrNull } = require('../helpers');

const bind = (r, b) => r
  .input('codigo', sql.NVarChar, b.codigo || '')
  .input('nombre', sql.NVarChar, b.nombre || '')
  .input('sedeId', sql.Int, intOrNull(b.sedeId))
  .input('unidadId', sql.Int, intOrNull(b.unidadId))
  .input('tipoId', sql.Int, intOrNull(b.tipoId))
  .input('subcategoria', sql.NVarChar, b.subcategoria || '')
  .input('inicio', sql.Date, b.inicio || null)
  .input('fin', sql.Date, b.fin || null)
  .input('estadoId', sql.Int, b.estadoId ? parseInt(b.estadoId) : null)
  .input('fuenteId', sql.Int, intOrNull(b.fuenteId))
  .input('gestorId', sql.Int, intOrNull(b.gestorId))
  .input('vinculacionId', sql.Int, intOrNull(b.vinculacionId))
  .input('coordinadorId', sql.Int, intOrNull(b.coordinadorId));

app.http('proyectos', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'proyectos/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'proyectos');
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
        if (q.get('tipoId')) {
          conditions.push('tipoId=@tipoId')
          dbReq.input('tipoId', sql.Int, parseInt(q.get('tipoId')))
        }
        if (q.get('unidadId')) {
          conditions.push('unidadId=@unidadId')
          dbReq.input('unidadId', sql.Int, parseInt(q.get('unidadId')))
        }
        if (q.get('subcategoria')) {
          conditions.push('subcategoria=@subcategoria')
          dbReq.input('subcategoria', sql.NVarChar, q.get('subcategoria'))
        }
        if (q.get('gestorId')) {
          conditions.push('gestorId=@gestorId')
          dbReq.input('gestorId', sql.Int, parseInt(q.get('gestorId')))
        }
        if (q.get('coordinadorId')) {
          conditions.push('coordinadorId=@coordinadorId')
          dbReq.input('coordinadorId', sql.Int, parseInt(q.get('coordinadorId')))
        }
        const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''
        const r = await dbReq.query('SELECT * FROM proyectos' + where + ' ORDER BY nombre')
        return { status: 200, headers: CORS, jsonBody: r.recordset }
      }

      if (req.method === 'DELETE') {
        await pool.request().input('id', sql.Int, id).query('DELETE FROM proyectos WHERE id=@id');
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }

      const body = await req.json();

      if (req.method === 'POST') {
        const res = await bind(pool.request(), body)
          .query('INSERT INTO proyectos (codigo,nombre,sedeId,unidadId,tipoId,subcategoria,inicio,fin,estadoId,fuenteId,gestorId,vinculacionId,coordinadorId) OUTPUT INSERTED.id VALUES (@codigo,@nombre,@sedeId,@unidadId,@tipoId,@subcategoria,@inicio,@fin,@estadoId,@fuenteId,@gestorId,@vinculacionId,@coordinadorId)');
        return { status: 201, headers: CORS, jsonBody: { ...body, id: res.recordset[0].id } };
      }

      if (req.method === 'PUT') {
        const resU = await bind(pool.request().input('id', sql.Int, id), body)
          .query('UPDATE proyectos SET codigo=@codigo,nombre=@nombre,sedeId=@sedeId,unidadId=@unidadId,tipoId=@tipoId,subcategoria=@subcategoria,inicio=@inicio,fin=@fin,estadoId=@estadoId,fuenteId=@fuenteId,gestorId=@gestorId,vinculacionId=@vinculacionId,coordinadorId=@coordinadorId WHERE id=@id');
        if (!resU.rowsAffected[0]) { const e = new Error('No se encontró el proyecto para actualizar.'); e.status = 404; throw e; }
        return { status: 200, headers: CORS, jsonBody: body };
      }
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

