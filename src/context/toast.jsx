import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastCtx = createContext(null)
const ConfirmCtx = createContext(null)

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
const COLORS = {
  success: { bg: '#f0fdf4', border: '#16a34a', text: '#15803d' },
  error:   { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c' },
  warning: { bg: '#fffbeb', border: '#d97706', text: '#b45309' },
  info:    { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8' },
}

function ToastItem({ t, onClose }) {
  const c = COLORS[t.type]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: c.bg, borderLeft: '4px solid ' + c.border,
      border: '1px solid ' + c.border + '55',
      borderRadius: 10, padding: '11px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      minWidth: 260, maxWidth: 400,
      animation: 'vie-slidein 0.2s ease',
    }}>
      <span style={{ color: c.border, fontWeight: 800, fontSize: 14, marginTop: 1, flexShrink: 0 }}>{ICONS[t.type]}</span>
      <span style={{ flex: 1, fontSize: 13, color: c.text, lineHeight: 1.45 }}>{t.msg}</span>
      <button onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 17, padding: '0 0 0 6px', lineHeight: 1, marginTop: -1 }}>
        ×
      </button>
    </div>
  )
}

function ConfirmDialog({ msg, opts, onResult }) {
  const isDanger = opts?.danger
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 28px 22px', minWidth: 320, maxWidth: 440, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        {opts?.title && <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#1e3a5f' }}>{opts.title}</h3>}
        <p style={{ margin: '0 0 22px', fontSize: 14, color: '#444', lineHeight: 1.5 }}>{msg}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => onResult(false)}
            style={{ background: '#f0f4f8', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#555' }}>
            {opts?.cancelText || 'Cancelar'}
          </button>
          <button onClick={() => onResult(true)}
            style={{ background: isDanger ? '#dc2626' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
            {opts?.okText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppProviders({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const resolveRef = useRef(null)

  const addToast = useCallback((type, msg) => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, type, msg }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])

  useEffect(() => {
    const h = e => addToast(e.detail.type, e.detail.msg)
    window.addEventListener('vie-toast', h)
    return () => window.removeEventListener('vie-toast', h)
  }, [addToast])

  const toast = {
    success: msg => addToast('success', msg),
    error:   msg => addToast('error', msg),
    info:    msg => addToast('info', msg),
    warning: msg => addToast('warning', msg),
  }

  const showConfirm = useCallback((msg, opts) => new Promise(resolve => {
    resolveRef.current = resolve
    setConfirmState({ msg, opts })
  }), [])

  const handleResult = ok => {
    resolveRef.current?.(ok)
    setConfirmState(null)
  }

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={showConfirm}>
        {children}
        <style>{`@keyframes vie-slidein{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes vie-shimmer{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem t={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
            </div>
          ))}
        </div>
        {confirmState && <ConfirmDialog msg={confirmState.msg} opts={confirmState.opts} onResult={handleResult} />}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
export const useConfirm = () => useContext(ConfirmCtx)
