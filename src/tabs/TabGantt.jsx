import { useState, useMemo } from 'react'
import { NAVY } from '../constants'

const GANTT_COLORS = ['#2563eb', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#65a30d', '#ea580c', '#db2777', '#0d9488', '#92400e']

export function TabGantt({ data, gP, gPl, gPy }) {
  const [profId, setProfId] = useState('')
  const [profQuery, setProfQuery] = useState('')
  const [showSugg, setShowSugg] = useState(false)

  const INPS = { padding: '5px 10px', borderRadius: 7, border: '1.5px solid #e0e0e0', fontSize: 12 }

  const profesores = useMemo(() => [...data.profesores].sort((a, b) => a.nombre.localeCompare(b.nombre)), [data.profesores])
  const tipoMap = useMemo(() => Object.fromEntries((data.tiposNombramiento || []).map(t => [t.id, t.nombre])), [data.tiposNombramiento])

  const filteredProfs = useMemo(() => {
    if (!profQuery) return profesores
    const q = profQuery.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return profesores.filter(p => p.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
  }, [profesores, profQuery])

  const hoy = new Date()
  const parseF = d => { if (!d) return null; const dt = new Date(String(d).slice(0, 10)); return isNaN(dt.getTime()) ? null : dt }
  const iso = d => d.toISOString().slice(0, 10).split('-').reverse().join('/')
  const getIni = n => parseF(n.inicio)
  const getFin = n => parseF(n.fin) || hoy

  const merge = items => {
    if (!items.length) return []
    const sorted = [...items].sort((a, b) => getIni(a) - getIni(b))
    const out = []; let cur = { ini: getIni(sorted[0]), fin: getFin(sorted[0]) }
    for (let i = 1; i < sorted.length; i++) {
      const ini = getIni(sorted[i]), fin = getFin(sorted[i])
      if (ini <= cur.fin) { if (fin > cur.fin) cur.fin = fin }
      else { out.push({ ...cur }); cur = { ini, fin } }
    }
    out.push(cur); return out
  }

  const valid = useMemo(() =>
    (!profId ? [] : data.nombramientos.filter(n => n.profesorId === parseInt(profId) && parseF(n.inicio)))
      .map(n => ({ ...n, tipoNombramiento: tipoMap[n.tipoNombramientoId] || 'Sin tipo' }))
  , [profId, data.nombramientos, tipoMap])

  const renderGantt = () => {
    if (!valid.length) return <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Sin nombramientos con fechas para mostrar.</div>

    const allDates = valid.flatMap(n => [getIni(n), getFin(n)])
    const minF = new Date(Math.min(...allDates)), maxF = new Date(Math.max(...allDates))
    const totalMs = Math.max(1, maxF - minF)
    const pct = d => Math.max(0, Math.min(100, (d - minF) / totalMs * 100))

    const años = []
    for (let y = minF.getFullYear(); y <= maxF.getFullYear(); y++) años.push({ year: y, p: pct(new Date(y, 0, 1)) })
    const hoyPct = pct(hoy)

    const coverage = merge(valid)
    const tipos = [...new Set(valid.map(n => n.tipoNombramiento))].sort()
    const filas = tipos.map((tipo, i) => ({ tipo, color: GANTT_COLORS[i % GANTT_COLORS.length], blocks: merge(valid.filter(n => n.tipoNombramiento === tipo)) }))

    const ROW_H = 36, LBL_W = 200

    const GridLines = () => (
      <>
        {años.map(({ year, p }) => <div key={year} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: '#e2e8f0' }} />)}
        {hoyPct > 0 && hoyPct < 100 && <div style={{ position: 'absolute', left: `${hoyPct}%`, top: 0, bottom: 0, width: 2, background: 'rgba(220,38,38,.2)' }} />}
      </>
    )

    const Bars = ({ blocks, color, rh }) => blocks.map((b, bi) => {
      const lft = pct(b.ini), wid = Math.max(0.4, pct(b.fin) - lft)
      return <div key={bi} title={`${iso(b.ini)} → ${iso(b.fin)}`}
        style={{ position: 'absolute', left: `${lft}%`, width: `${wid}%`, top: 5, height: (rh || ROW_H) - 10, borderRadius: 5, background: color, boxSizing: 'border-box' }} />
    })

    const gaps = []
    for (let i = 0; i < coverage.length - 1; i++) {
      const dias = Math.round((coverage[i + 1].ini - coverage[i].fin) / 86400000)
      if (dias > 0) gaps.push({ desde: coverage[i].fin, hasta: coverage[i + 1].ini, dias })
    }

    return (
      <div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: LBL_W + 420, userSelect: 'none' }}>
            <div style={{ display: 'flex', marginBottom: 4 }}>
              <div style={{ width: LBL_W, flexShrink: 0 }} />
              <div style={{ flex: 1, height: 24, position: 'relative', borderBottom: '2px solid #e2e8f0' }}>
                {años.map(({ year, p }) => (
                  <span key={year} style={{ position: 'absolute', left: `${p}%`, fontSize: 11, color: '#94a3b8', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{year}</span>
                ))}
                {hoyPct > 0 && hoyPct < 100 && (
                  <span style={{ position: 'absolute', left: `${hoyPct}%`, fontSize: 11, fontWeight: 700, color: '#dc2626', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>hoy</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', height: ROW_H + 4, background: '#f0fdf4', borderBottom: '2px solid #86efac', marginBottom: 6 }}>
              <div style={{ width: LBL_W, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#166534' }}>Cobertura total</div>
              <div style={{ flex: 1, position: 'relative' }}><GridLines /><Bars blocks={coverage} color="#059669" rh={ROW_H + 4} /></div>
            </div>
            {filas.map(({ tipo, color, blocks }, fi) => (
              <div key={tipo} style={{ display: 'flex', height: ROW_H, background: fi % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: LBL_W, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 600, color: NAVY, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={tipo}>{tipo}</div>
                <div style={{ flex: 1, position: 'relative' }}><GridLines /><Bars blocks={blocks} color={color} /></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}><div style={{ width: 14, height: 10, borderRadius: 3, background: '#059669' }} />Cobertura total</div>
          {filas.map(({ tipo, color }) => <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}><div style={{ width: 14, height: 10, borderRadius: 3, background: color }} />{tipo}</div>)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}><div style={{ width: 2, height: 14, background: '#dc2626' }} />Hoy</div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 10 }}>Períodos sin nombramiento</div>
          {gaps.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', fontSize: 13, color: '#166534', fontWeight: 600 }}>✓ Sin períodos sin nombramiento registrados</div>
            : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#fee2e2' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#991b1b' }}>Desde</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#991b1b' }}>Hasta</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#991b1b' }}>Duración</th>
              </tr></thead>
              <tbody>{gaps.map((g, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff9f9' : '#fff', borderBottom: '1px solid #fee2e2' }}>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>{iso(g.desde)}</td>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>{iso(g.hasta)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: g.dias >= 30 ? '#dc2626' : g.dias >= 7 ? '#d97706' : '#64748b' }}>{g.dias} {g.dias === 1 ? 'día' : 'días'}</td>
                </tr>
              ))}</tbody>
            </table>
          }
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Gantt de Nombramientos</h2>
        <div style={{ position: 'relative', minWidth: 280 }}>
          <input value={profQuery} onChange={e => { setProfQuery(e.target.value); setProfId(''); setShowSugg(true) }}
            onFocus={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 160)}
            placeholder="Buscar profesor..."
            style={{ ...INPS, width: '100%', boxSizing: 'border-box', fontWeight: profId ? 700 : 400, paddingRight: profQuery ? 26 : 10, outline: 'none' }} />
          {profQuery && (
            <span onMouseDown={e => { e.preventDefault(); setProfQuery(''); setProfId(''); setShowSugg(false) }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8', fontSize: 14, userSelect: 'none' }}>✕</span>
          )}
          {showSugg && filteredProfs.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.13)', zIndex: 999, maxHeight: 220, overflowY: 'auto' }}>
              {filteredProfs.slice(0, 50).map(p => (
                <div key={p.id} onMouseDown={e => { e.preventDefault(); setProfId(String(p.id)); setProfQuery(p.nombre); setShowSugg(false) }}
                  style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: NAVY, borderBottom: '1px solid #f0f4ff', background: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >{p.nombre}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {!profId
          ? <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Seleccione un profesor para ver su Gantt de nombramientos.</div>
          : renderGantt()
        }
      </div>
    </div>
  )
}
