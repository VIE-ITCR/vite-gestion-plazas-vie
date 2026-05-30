const { app } = require('@azure/functions');
const { getPool, sql } = require('../db');
const { requireAuth } = require('../auth');
const { CORS } = require('../helpers');

app.http('misNombramientos', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'mis-nombramientos',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      const claims = await requireAuth(req);
      const pool   = await getPool();

      const [nomRes, pyRes] = await Promise.all([
        pool.request().input('email', sql.NVarChar, claims.email).query(`
          SELECT
            n.id, n.horas, n.inicio, n.fin, n.estado, n.observaciones, n.acuerdo,
            py.nombre           AS proyecto,
            py.codigo           AS proyectoCodigo,
            py.subcategoria     AS proyectoSubcategoria,
            py.inicio           AS proyectoInicio,
            py.fin              AS proyectoFin,
            py.estado           AS proyectoEstado,
            se.nombre           AS proyectoSede,
            ta.nombre           AS proyectoTipo,
            pu.nombre           AS proyectoUnidad,
            u.nombre            AS unidad,
            u.codigo            AS unidadCodigo,
            tn.nombre           AS tipoNombramiento
          FROM nombramientos n
          JOIN  profesores p         ON p.id  = n.profesorId
          LEFT JOIN proyectos py     ON py.id = n.proyectoId
          LEFT JOIN sedes se         ON se.id = py.sedeId
          LEFT JOIN tiposActividad ta ON ta.id = py.tipoId
          LEFT JOIN unidades pu      ON pu.id = py.unidadId
          LEFT JOIN unidades u       ON u.id  = n.unidadId
          LEFT JOIN tiposNombramiento tn ON tn.id = n.tipoNombramientoId
          WHERE p.email = @email
          ORDER BY
            CASE n.estado WHEN 'Activo' THEN 1 WHEN 'Por iniciar' THEN 2 ELSE 3 END,
            n.inicio DESC
        `),
        pool.request().input('email', sql.NVarChar, claims.email).query(`
          SELECT
            py.id, py.codigo, py.nombre, py.subcategoria,
            py.inicio, py.fin, py.estado,
            se.nombre  AS sede,
            pu.nombre  AS unidad,
            pu.codigo  AS unidadCodigo,
            ta.nombre  AS tipo
          FROM proyectos py
          JOIN  profesores p         ON p.id  = py.coordinadorId
          LEFT JOIN sedes se         ON se.id = py.sedeId
          LEFT JOIN unidades pu      ON pu.id = py.unidadId
          LEFT JOIN tiposActividad ta ON ta.id = py.tipoId
          WHERE p.email = @email
          ORDER BY py.inicio DESC
        `)
      ]);

      return {
        status: 200, headers: CORS,
        jsonBody: { nombramientos: nomRes.recordset, proyectos: pyRes.recordset }
      };
    } catch (e) {
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});
