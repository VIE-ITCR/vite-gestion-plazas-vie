const API = 'https://vitevie-erbmf0a8dgg4fhec.australiaeast-01.azurewebsites.net/api';

  export let _authToken = sessionStorage.getItem('_jwt') || null;
  export let _currentUser = JSON.parse(sessionStorage.getItem('_user') || 'null');

  export function setAuthToken(token) { _authToken = token; }
  export function setCurrentUser(user) { _currentUser = user; }

  export function apiHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (_authToken) h['Authorization'] = 'Bearer ' + _authToken;
    return h;
  }

  function _checkOk(r) {
    const ok = r.ok, status = r.status;
    return r.text()
      .catch(() => '')
      .then(text => {
        let d = {};
        try { if (text && text.trim()) d = JSON.parse(text); } catch (_) {}
        if (!ok) {
          const technical = d.error || d.message || 'Error HTTP ' + status;
          console.error('[API] ' + status + ':', technical);
          throw new Error(technical);
        }
        return d;
      });
  }

  export function apiGet(path) {
    return fetch(API + path, { headers: apiHeaders() }).then(_checkOk);
  }
  export function apiPost(path, body) {
    return fetch(API + path, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) }).then(_checkOk);
  }
  export function apiPut(path, body) {
    return fetch(API + path, { method: 'PUT', headers: apiHeaders(), body: JSON.stringify(body) }).then(_checkOk);
  }
  export function apiDelete(path) {
    return fetch(API + path, { method: 'DELETE', headers: apiHeaders() }).then(_checkOk);
  }