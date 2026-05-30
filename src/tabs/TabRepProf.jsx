import { useState, useMemo } from 'react'
import { NAVY, BLUE, TEAL, GREEN, RED, AMBER } from '../constants'
import { nh, r2, fmtD, fmtDias } from '../utils'
import { Field } from '../components/ui'

function SearchableSelect({ value, onChange, options, placeholder }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => {
    const qn = q.toLowerCase()
    return options.filter(o => String(o.l).toLowerCase().includes(qn)).slice(0, 60)
  }, [options, q])
  const selected = options.find(o => String(o.v) === String(value))
  const inp = { padding: '7px 10px', borderRadius: 7, border: '1.5px solid #e0e0e0', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }
  return (
    <div style={{ position: 'relative' }}>
      <input style={{ ...inp, fontWeight: selected ? 700 : 400 }}
        value={selected ? selected.l : q}
        onChange={e => { setQ(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder || 'Buscar...'} />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.13)', zIndex: 999, maxHeight: 220, overflowY: 'auto' }}>
          {filtered.map(o => (
            <div key={o.v} onMouseDown={e => { e.preventDefault(); onChange(o.v); setQ(''); setOpen(false) }}
              style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: NAVY, borderBottom: '1px solid #f0f4ff', background: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >{o.l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TabRepProf({ data, gP, gPl, gPy, gTN, dU }) {
  const [profId, setProfId] = useState('')

  const prof = profId ? gP(Number(profId)) : null
  const noms = useMemo(() =>
    profId ? data.nombramientos.filter(n => n.profesorId === Number(profId)) : []
  , [profId, data.nombramientos])
  const horasAct = r2(noms.filter(n => n.estado === 'Activo').reduce((s, n) => s + nh(n.horas), 0))

  const totalDias = useMemo(() => {
    if (!noms.length) return 0
    const hoyMs = Date.now()
    const ivs = noms.filter(n => n.inicio && n.fin).map(n => {
      const ini = new Date(n.inicio).getTime()
      const fin = Math.min(new Date(n.fin).getTime() + 86400000, hoyMs)
      return fin > ini ? [ini, fin] : null
    }).filter(Boolean).sort((a, b) => a[0] - b[0])
    if (!ivs.length) return 0
    let m = [[...ivs[0]]]
    for (let i = 1; i < ivs.length; i++) {
      const l = m[m.length - 1]
      if (ivs[i][0] <= l[1]) l[1] = Math.max(l[1], ivs[i][1])
      else m.push([...ivs[i]])
    }
    return m.reduce((s, [a, b]) => s + Math.round((b - a) / 86400000), 0)
  }, [noms])

  const tiempoInt = useMemo(() => {
    if (!noms.length) return null
    const hoyMs = Date.now()
    const ivA = noms.filter(n => n.fin && (new Date(n.fin).getTime() + 86400000) >= hoyMs && n.inicio)
      .map(n => [new Date(n.inicio).getTime(), Math.min(new Date(n.fin).getTime() + 86400000, hoyMs)])
      .sort((a, b) => a[0] - b[0])
    if (!ivA.length) return null
    let c = [ivA[ivA.length - 1]]
    for (let i = ivA.length - 2; i >= 0; i--) {
      if (c[0][0] - ivA[i][1] <= 86400000 * 2) c.unshift(ivA[i])
      else break
    }
    return Math.round((hoyMs - c[0][0]) / 86400000)
  }, [noms])

  return (
    <div>
      <h2 style={{ margin: '0 0 14px', color: NAVY }}>Reporte por Profesor</h2>
      <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <Field label="Seleccionar Profesor">
          <SearchableSelect value={profId} onChange={setProfId} placeholder="-- Buscar profesor --"
            options={[...data.profesores].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => ({ v: p.id, l: p.nombre }))} />
        </Field>
      </div>
      {!prof && <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#aaa' }}>Seleccione un profesor.</div>}
      {prof && (
        <div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: NAVY }}>
              {prof.nombre.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{prof.nombre}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {(prof.unidades || []).map(u => data.unidades.find(x => x.id === u)?.nombre).filter(Boolean).join(' / ') || 'Sin unidad'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { l: 'Nombramientos', v: noms.length, c: NAVY },
              { l: 'Horas activas/sem', v: horasAct + 'h', c: BLUE },
              { l: 'Proyectos', v: new Set(noms.map(n => n.proyectoId)).size, c: TEAL },
              { l: 'Plazas', v: new Set(noms.map(n => n.plazaId)).size, c: GREEN }
            ].map(k => (
              <div key={k.l} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: '4px solid ' + k.c, flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.c }}>{k.v}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{k.l}</div>
              </div>
            ))}
          </div>
          {noms.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: '4px solid ' + AMBER, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Tiempo total acumulado</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: AMBER }}>{fmtDias(totalDias)}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: '4px solid ' + (tiempoInt ? TEAL : '#94a3b8'), flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Cadena ininterrumpida</div>
                {tiempoInt
                  ? <div style={{ fontSize: 18, fontWeight: 700, color: TEAL }}>{fmtDias(tiempoInt)}</div>
                  : <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Sin cadena activa</div>}
              </div>
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, color: NAVY, borderBottom: '2px solid #f0f4f8', paddingBottom: 8 }}>Detalle ({noms.length})</h3>
            {!noms.length
              ? <p style={{ color: '#aaa', textAlign: 'center', padding: 20, margin: 0 }}>Sin nombramientos.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8f9ff' }}>
                        {['#', 'Plaza', 'CF', 'Proyecto', 'Tipo', 'Horas', 'Inicio', 'Fin', 'Estado'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '7px 9px', color: '#666', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {noms.map((n, i) => {
                        const pl = gPl(n.plazaId), py = gPy(n.proyectoId), tn = gTN(n.tipoNombramientoId)
                        const [bgE, fgE] = n.estado === 'Activo' ? ['#dcfce7', '#166534'] : n.estado === 'Por iniciar' ? ['#fef9c3', '#854d0e'] : ['#f3f4f6', '#374151']
                        return (
                          <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                            <td style={{ padding: '7px 9px', color: '#aaa' }}>{i + 1}</td>
                            <td style={{ padding: '7px 9px', fontWeight: 700, color: NAVY }}>{pl?.codigo || '-'}</td>
                            <td style={{ padding: '7px 9px', color: '#666' }}>{pl?.cf || '-'}</td>
                            <td style={{ padding: '7px 9px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{py?.nombre || '-'}</td>
                            <td style={{ padding: '7px 9px' }}>
                              {tn ? <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 6px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{tn.nombre}</span>
                                : <span style={{ color: '#aaa', fontSize: 11 }}>-</span>}
                            </td>
                            <td style={{ padding: '7px 9px', fontWeight: 700, color: BLUE }}>{n.horas}h</td>
                            <td style={{ padding: '7px 9px', color: '#666' }}>{fmtD(n.inicio)}</td>
                            <td style={{ padding: '7px 9px', color: n.fin && dU(n.fin) <= 30 && n.estado === 'Activo' ? RED : '#666' }}>{fmtD(n.fin)}</td>
                            <td style={{ padding: '7px 9px' }}>
                              <span style={{ background: bgE, color: fgE, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{n.estado}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
