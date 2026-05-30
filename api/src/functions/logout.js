const { app } = require('@azure/functions');
const { requireAuth, revokeToken, getToken } = require('../auth');
const { CORS } = require('../helpers');

app.http('logout', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'logout',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return { status: 200, headers: CORS };
    try {
      await requireAuth(req);
      const token = getToken(req);
      console.log('[logout] token present:', !!token, 'length:', token?.length);
      if (token) await revokeToken(token);
      console.log('[logout] revokeToken completed');
      return { status: 200, headers: CORS, jsonBody: { ok: true } };
    } catch (e) {
      console.error('[logout] error:', e.message);
      return { status: e.status || 500, headers: CORS, jsonBody: { error: e.message } };
    }
  }
});
