import { _authToken, setAuthToken, setCurrentUser } from './api';

  const INACTIVITY_MS = 30 * 60 * 1000;
  let _inactivityTimer = null;

  export function resetInactivityTimer() {
    clearTimeout(_inactivityTimer);
    _inactivityTimer = setTimeout(() => {
      if (_authToken) {
        setAuthToken(null);
        setCurrentUser(null);
        sessionStorage.removeItem('_jwt');
        sessionStorage.removeItem('_user');
        alert('Sesión cerrada por inactividad (30 minutos sin actividad).');
        location.reload();
      }
    }, INACTIVITY_MS);
  }

  export function initInactivityListener() {
    ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(ev => {
      document.addEventListener(ev, resetInactivityTimer, { passive: true });
    });
    resetInactivityTimer();
  }

  export function logout() {
    try {
      import('./api').then(({ apiPost }) => apiPost('/logout', {}));
    } catch {}
    setAuthToken(null);
    setCurrentUser(null);
    sessionStorage.removeItem('_jwt');
    sessionStorage.removeItem('_user');
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('vie_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    location.reload();
  }