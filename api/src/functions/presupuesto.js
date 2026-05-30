const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requirePerm } = require('../auth');
const { CORS, floatOrZero } = require('../helpers');

app.http('presupuesto', {
  methods: ['GET', 'PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'presupuesto/{id?}',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requirePerm(req, 'presupuesto');
      const pool = await getPool();

      if (req.method === 'GET') {
        const r = await pool.request().query('SELECT * FROM presupuesto');
        const result = {};
        r.recordset.forEach(row => {
          result[row.proyectoId + '_' + row.anio] = { equipo: row.equipo, operativo: row.operativo, estudiantes: row.estudiantes };
        });
        return { status: 200, headers: CORS, jsonBody: result };
      }

      if (req.method === 'PUT') {
        const key = req.params.id;
        const body = await req.json();
        const parts = key.split('_');
        const proyectoId = parseInt(parts[0]);
        const anio = parseInt(parts[1]);
        const resU = await pool.request()
          .input('proyectoId', sql.Int, proyectoId)
          .input('anio', sql.Int, anio)
          .input('equipo', sql.Decimal(18, 2), floatOrZero(body.equipo))
          .input('operativo', sql.Decimal(18, 2), floatOrZero(body.operativo))
          .input('estudiantes', sql.Decimal(18, 2), floatOrZero(body.estudiantes))
          .query(`
            IF EXISTS (SELECT 1 FROM presupuesto WHERE proyectoId=@proyectoId AND anio=@anio)
              UPDATE presupuesto SET equipo=@equipo,operativo=@operativo,estudiantes=@estudiantes WHERE proyectoId=@proyectoId AND anio=@anio
            ELSE
              INSERT INTO presupuesto (proyectoId,anio,equipo,operativo,estudiantes) VALUES (@proyectoId,@anio,@equipo,@operativo,@estudiantes)
          `);
        if (!resU.rowsAffected[0]) { const e = new Error('No se pudo guardar el presupuesto en la base de datos.'); e.status = 500; throw e; }
        return { status: 200, headers: CORS, jsonBody: { ok: true } };
      }
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});

