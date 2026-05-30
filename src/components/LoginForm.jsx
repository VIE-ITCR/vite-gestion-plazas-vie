import { useState } from 'react';
  import { NAVY } from '../constants';
  import { apiPost, setAuthToken, setCurrentUser } from '../api';

  export function LoginForm() {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const login = async () => {
      if (!email || !pass) { setErr('Ingrese correo y contraseña.'); return; }
      setLoading(true); setErr('');
      try {
        const data = await apiPost('/login', { email, password: pass });
        setAuthToken(data.token);
        setCurrentUser(data.user);
        sessionStorage.setItem('_jwt', data.token);
        sessionStorage.setItem('_user', JSON.stringify(data.user));
        location.reload();
      } catch (e) {
        setErr(e.message);
        setLoading(false);
      }
    };

    const inputStyle = {
      width: '100%',
      padding: '9px 11px',
      border: '1.5px solid #e0e0e0',
      borderRadius: 7,
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box'
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background:
  'linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', minWidth: 360, maxWidth: 400, width:
  '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ color: '#1e3a5f', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
              Gestión de Plazas
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>
              VIE – Instituto Tecnológico de Costa Rica
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase',
  marginBottom: 4 }}>
              Correo electrónico
            </label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              autoFocus
              placeholder="usuario@itcr.ac.cr"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase',
  marginBottom: 4 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, padding: '9px 38px 9px 11px' }}
                type={showPwd ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none',
  border: 'none', cursor: 'pointer', color: '#888', fontSize: 16 }}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {err && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 7, padding: '8px 12px',
  fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
              {err}
            </div>
          )}

          <button
            onClick={login}
            disabled={loading}
            style={{ width: '100%', background: loading ? '#94a3b8' : NAVY, color: '#fff', border: 'none', borderRadius:
   8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>

        </div>
      </div>
    );
  }