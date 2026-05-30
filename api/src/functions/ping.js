const { app } = require('@azure/functions');
const { CORS } = require('../helpers');

app.http('ping', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'ping',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    return { status: 200, headers: CORS, jsonBody: { ok: true } };
  }
});
