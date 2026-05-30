import { useState, useRef, useEffect } from 'react'
import { NAVY } from '../constants'

  const inp = { width: "100%", padding: "8px 10px", border: "1.5px solid #e0e0e0", borderRadius: 7, fontSize: 14,
  outline: "none", boxSizing: "border-box", background: "#fafafa" };

  export function Btn({ children, onClick, color, sm, style: s }) {
    return (
      <button onClick={onClick} style={{ background: color || NAVY, color: "#fff", border: "none", borderRadius: sm ? 5
  : 7, padding: sm ? "4px 10px" : "8px 16px", cursor: "pointer", fontSize: sm ? 12 : 13, fontWeight: 600, ...s }}>
        {children}
      </button>
    );
  }

  export function Badge({ text }) {
    const m = { Activo: ["#dcfce7", "#166534"], Finalizado: ["#f3f4f6", "#374151"], "Por iniciar": ["#fef9c3",
  "#854d0e"] };
    const [bg, fg] = m[text] || ["#e5e7eb", "#374151"];
    return <span style={{ background: bg, color: fg, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700
   }}>{text}</span>;
  }

  export function Modal({ title, onClose, children }) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex",
  alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, minWidth: 400, maxWidth: 540, width: "90%",
  maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{title}</h3>
            <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer",
  color: "#888" }}>×</button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  export function Field({ label, children }) {
    return (
      <div style={{ marginBottom: 13 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4, textTransform:
  "uppercase", letterSpacing: .5 }}>{label}</label>
        {children}
      </div>
    );
  }

  export function SearchBar({ value, onChange, placeholder }) {
    return (
      <div style={{ position: "relative", flex: 2, minWidth: 220, maxWidth: 440 }}>
        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#aaa",
  fontSize: 13 }}>🔍</span>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Buscar..."} style={{
  ...inp, paddingLeft: 30, background: "#fff", border: "1.5px solid #e8e8f0" }} />
        {value && <button onClick={() => onChange("")} style={{ position: "absolute", right: 7, top: "50%", transform:
  "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 14 }}>×</button>}
      </div>
    );
  }

  export function FSel({ value, onChange, options, placeholder }) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, width: "auto", minWidth: 130,
  background: "#fff", border: "1.5px solid #e8e8f0" }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    );
  }

  export function FBar({ children, count, total }) {
    return (
      <div style={{ background: "#f0f4f8", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex",
  gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {children}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>{count === total ? total + " registros" :
  count + " de " + total}</span>
      </div>
    );
  }

  export function SectionTitle({ children }) {
    return <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: .6,
  marginBottom: 8, marginTop: 4 }}>{children}</div>;
  }

  export function Card({ title, subtitle, children, full }) {
    return (
      <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  gridColumn: full ? "1 / -1" : undefined, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  paddingBottom: 8, borderBottom: "2px solid #f0f4f8" }}>
          <h3 style={{ margin: 0, fontSize: 13, color: NAVY }}>{title}</h3>
          {subtitle && <span style={{ fontSize: 11, color: "#aaa" }}>{subtitle}</span>}
        </div>
        {children}
      </div>
    );
  }

export function SearchableSelect({ value, onChange, options, placeholder, style: extStyle }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const sel = options.find(o => String(o.v) === String(value))
  const filtered = options.filter(o => !q || o.l.toLowerCase().includes(q.toLowerCase()))
  return (
    <div ref={ref} style={{ position: 'relative', ...extStyle }}>
      <div style={{ position: 'relative' }}>
        <input value={open ? q : (sel?.l || '')} onChange={e => setQ(e.target.value)} onFocus={() => { setOpen(true); setQ('') }} placeholder={placeholder || '-- Seleccione --'} style={{ ...inp, paddingRight: sel ? 28 : 10, width: '100%', cursor: 'text' }} />
        {sel && !open && <button onClick={() => { onChange(''); setQ('') }} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 15, lineHeight: 1 }}>×</button>}
        {!sel && <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 11, pointerEvents: 'none' }}>▾</span>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.13)', zIndex: 200, maxHeight: 240, overflowY: 'auto' }}>
          {!filtered.length && <div style={{ padding: '10px 14px', color: '#aaa', fontSize: 12, fontStyle: 'italic' }}>Sin resultados</div>}
          {filtered.map(o => (
            <div key={o.v} onMouseDown={() => { onChange(String(o.v)); setOpen(false); setQ('') }}
              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', background: String(o.v) === String(value) ? '#eff6ff' : 'transparent', color: String(o.v) === String(value) ? NAVY : '#333', fontWeight: String(o.v) === String(value) ? 600 : 400 }}
              onMouseEnter={e => { if (String(o.v) !== String(value)) e.currentTarget.style.background = '#f0f4f8' }}
              onMouseLeave={e => { e.currentTarget.style.background = String(o.v) === String(value) ? '#eff6ff' : 'transparent' }}
            >{o.l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Skeleton({ w = '100%', h = 16, r = 6, mb = 0 }) {
  return <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb, background: '#e2e8f0', animation: 'vie-shimmer 1.4s ease-in-out infinite' }} />
}

export function EmptyState({ total, noun = 'registros' }) {
  const noData = total === 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', color: '#aaa', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{noData ? '📭' : '🔍'}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#888', marginBottom: 4 }}>
        {noData ? `No hay ${noun} todavía` : 'Sin resultados'}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        {noData ? 'Agrega el primer registro con el botón de arriba.' : 'Ningún resultado coincide con los filtros aplicados.'}
      </div>
    </div>
  )
}

export { inp }