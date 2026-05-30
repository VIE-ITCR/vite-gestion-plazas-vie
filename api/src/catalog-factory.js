const { app } = require('@azure/functions');
const { getPool, sql } = require('./db');
const { requireAuth, requirePerm } = require('./auth');
const { CORS } = require('./helpers');

function makeCatalog(name, extraFields = [], sortBy = 'nombre', jsonFields = [], permKey = null) {
  app.http(name, {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: `${name}/{id?}`,
    handler: async (req) => {
      if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
      try {
        if (permKey) await requirePerm(req, permKey); else await requireAuth(req);
        const pool = await getPool();
        const id = req.params.id ? parseInt(req.params.id) : null;

        if (req.method === 'GET') {
          const r = await pool.request().query(`SELECT * FROM ${name} ORDER BY ${sortBy}`);
          const records = r.recordset.map(row => {
            const out = { ...row };
            jsonFields.forEach(f => { if (out[f]) try { out[f] = JSON.parse(out[f]); } catch { out[f] = []; } });
            return out;
          });
          return { status: 200, headers: CORS, jsonBody: records };
        }

        if (req.method === 'DELETE') {
          await pool.request().input('id', sql.Int, id).query(`DELETE FROM ${name} WHERE id=@id`);
          return { status: 200, headers: CORS, jsonBody: { ok: true } };
        }

        const body = await req.json();

        if (req.method === 'POST') {
          const insertFields = ['nombre', ...extraFields];
          const r = pool.request().input('nombre', sql.NVarChar, body.nombre || '');
          extraFields.forEach(f => r.input(f, sql.NVarChar, body[f] != null ? String(body[f]) : ''));
          const res = await r.query(`INSERT INTO ${name} (${insertFields.join(',')}) OUTPUT INSERTED.id VALUES (${insertFields.map(f => '@' + f).join(',')})`);
          return { status: 201, headers: CORS, jsonBody: { ...body, id: res.recordset[0].id } };
        }

        if (req.method === 'PUT') {
          const setFields = ['nombre', ...extraFields];
          const r = pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar, body.nombre || '');
          extraFields.forEach(f => r.input(f, sql.NVarChar, body[f] != null ? String(body[f]) : ''));
          const resU = await r.query(`UPDATE ${name} SET ${setFields.map(f => `${f}=@${f}`).join(',')} WHERE id=@id`);
          if (!resU.rowsAffected[0]) { const e = new Error('No se encontró el registro para actualizar.'); e.status = 404; throw e; }
          return { status: 200, headers: CORS, jsonBody: body };
        }

      } catch (e) {
        return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
      }
    }
  });
}

module.exports = { makeCatalog };
