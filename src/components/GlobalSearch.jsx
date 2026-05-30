import { useState, useEffect, useRef, useMemo } from 'react'
import { NAVY } from '../constants'

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const hit = (s, q) => norm(s).includes(norm(q))

const TAB_LABEL = { plazas: 'Plazas', proyectos: 'Proyectos', catalogos: 'Profesores', nombramientos: 'Nombramientos' }

export function GlobalSearch({ data, onJump, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    const t = q.trim()
    if (t.length < 2) return []
    const out = []

    ;(data.plazas || []).forEach(p => {
      if (hit(p.codigo, t) || hit(p.cf, t))
        out.push({ ic: '📋', label: p.codigo, sub: [p.cf, p.horasSemanales ? p.horasSemanales + 'h/sem' : ''].filter(Boolean).join(' · '), tab: 'plazas', q: p.codigo })
    })

    ;(data.proyectos || []).forEach(p => {
      if (hit(p.nombre, t) || hit(p.codigo, t))
        out.push({ ic: '📁', label: p.nombre, sub: p.codigo || '', tab: 'proyectos', q: p.nombre })
    })

    ;(data.profesores || []).forEach(p => {
      if (hit(p.nombre, t) || hit(p.cedula, t) || hit(p.email, t))
        out.push({ ic: '👨‍🏫', label: p.nombre, sub: [p.cedula, p.email].filter(Boolean).join(' · '), tab: 'catalogos', subCat: 'profesores', q: p.nombre })
    })

    const seenProfs = new Set()
    ;(data.nombramientos || []).forEach(n => {
      const prof = (data.profesores || []).find(p => p.id === n.profesorId)
      if (!prof || seenProfs.has(prof.id)) return
      if (hit(prof.nombre, t)) {
        seenProfs.add(prof.id)
        const activos = (data.nombramientos || []).filter(x => x.profesorId === prof.id && x.estado === 'Activo').length
        out.push({ ic: '📝', label: prof.nombre, sub: activos + ' nombramiento(s) activo(s)', tab: 'nombramientos', q: prof.nombre })
      }
    })

    return out.slice(0, 12)
  }, [q, data])

  useEffect(() => { setSel(0) }, [results])

  const pick = r => { onJump(r); onClose() }

  const onKey = e => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[sel]) pick(results[sel])
  }

  const isEmpty = q.trim().length < 2
  const noResults = !isEmpty && results.length === 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', zIndex: 9500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '11vh' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, margin: '0 16px', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ padding: '13px 16px', borderBottom: '1.5px solid #f0f0f8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#aaa', fontSize: 16, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar plaza, proyecto, profesor..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#222', background: 'transparent' }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
          )}
          <kbd style={{ background: '#f0f4f8', border: '1px solid #d1d5db', borderRadius: 5, padding: '2px 7px', fontSize: 11, color: '#777', flexShrink: 0 }}>Esc</kbd>
        </div>

        {/* States */}
        {isEmpty && (
          <div style={{ padding: '26px 16px', textAlign: 'center', color: '#bbb', fontSize: 13 }}>
            Escriba al menos 2 caracteres · Busca en plazas, proyectos, profesores y nombramientos
          </div>
        )}
        {noResults && (
          <div style={{ padding: '26px 16px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
            Sin resultados para <strong>"{q}"</strong>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div
                key={i}
                onClick={() => pick(r)}
                onMouseEnter={() => setSel(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                  cursor: 'pointer', borderLeft: '3px solid ' + (i === sel ? '#2563eb' : 'transparent'),
                  background: i === sel ? '#eff6ff' : 'transparent',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{r.ic}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                  {r.sub && <div style={{ fontSize: 11, color: '#888', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
                </div>
                <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {TAB_LABEL[r.tab] || r.tab}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '7px 16px', borderTop: '1px solid #f0f0f8', display: 'flex', gap: 14 }}>
          {['↑↓ navegar', '↵ abrir', 'Esc cerrar'].map(h => (
            <span key={h} style={{ fontSize: 10, color: '#bbb' }}>{h}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
