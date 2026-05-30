import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import Chart from 'chart.js/auto'
import * as XLSX from 'xlsx'
import { NAVY, BLUE, TEAL, GREEN, AMBER, RED, CATS, CAT_COLORS, TIPO_COLORS, CHART_COLORS, ESTADO_COLORS } from '../constants'
import { nh, r2, fmtD, fmtMoney, getAnios, profActivosEnAnio } from '../utils'
import { inp, SectionTitle } from '../components/ui'

function Card({ title, subtitle, children, full }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', gridColumn: full ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #f0f4f8' }}>
        <h3 style={{ margin: 0, fontSize: 13, color: NAVY }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 11, color: '#aaa' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function BarChart({ data: rows, height, showValues }) {
  const h = height || 120, sv = showValues !== false
  const max = Math.max(...rows.map(r => r.value), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: h + 30, paddingTop: 8, minWidth: rows.length * 52 }}>
        {rows.map((r, i) => {
          const pct = Math.round((r.value / max) * 100)
          return (
            <div key={i} style={{ flex: 1, minWidth: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {sv && <span style={{ fontSize: 10, fontWeight: 700, color: r.color || NAVY }}>{r.value}</span>}
              <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '4px 4px 0 0', height: h, display: 'flex', alignItems: 'flex-end' }}>
                <div title={r.label + ': ' + r.value} style={{ width: '100%', height: pct + '%', background: r.color || BLUE, borderRadius: '4px 4px 0 0', minHeight: r.value > 0 ? 4 : 0 }} />
              </div>
              <span style={{ fontSize: 9, color: '#888', textAlign: 'center', lineHeight: 1.2, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DonutChart({ segments, size }) {
  const sz = size || 110, total = segments.reduce((s, r) => s + r.value, 0) || 1
  let angle = -90
  const cx = sz / 2, cy = sz / 2, r = sz * 0.38, ri = sz * 0.22
  const toRad = deg => deg * Math.PI / 180
  const paths = segments.map(seg => {
    const sweep = (seg.value / total) * 360, a1 = angle, a2 = angle + sweep
    angle += sweep
    if (sweep >= 360) return <circle key={seg.label} cx={cx} cy={cy} r={r} fill={seg.color} />
    const x1 = cx + r * Math.cos(toRad(a1)), y1 = cy + r * Math.sin(toRad(a1))
    const x2 = cx + r * Math.cos(toRad(a2)), y2 = cy + r * Math.sin(toRad(a2))
    const xi1 = cx + ri * Math.cos(toRad(a1)), yi1 = cy + ri * Math.sin(toRad(a1))
    const xi2 = cx + ri * Math.cos(toRad(a2)), yi2 = cy + ri * Math.sin(toRad(a2))
    const large = sweep > 180 ? 1 : 0
    const d = `M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${ri},${ri} 0 ${large} 0 ${xi1},${yi1}Z`
    return <path key={seg.label} d={d} fill={seg.color} />
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width={sz} height={sz} style={{ flexShrink: 0 }}>{paths}</svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#555' }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: s.color, marginLeft: 'auto', paddingLeft: 6 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TablaColapsable({ children }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setShow(v => !v)} style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #dde3ee', background: show ? NAVY : '#f8fafc', color: show ? '#fff' : NAVY, marginBottom: show ? 10 : 0 }}>
        {show ? '▲ Ocultar tabla' : '▼ Ver tabla de datos'}
      </button>
      {show && children}
    </div>
  )
}

function ChartHorasTipoNom({ tiposNombramiento, nombramientos }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  useEffect(() => {
    const activos = nombramientos.filter(n => n.estado === 'Activo')
    const labels = tiposNombramiento.map(t => t.nombre)
    const vals = tiposNombramiento.map(t => activos.filter(n => n.tipoNombramientoId === t.id).reduce((s, n) => s + (Number(n.horas) || 0), 0))
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current) return
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Horas activas', data: vals, backgroundColor: '#2563eb', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [tiposNombramiento, nombramientos])
  return <div style={{ overflowX: 'auto' }}><div style={{ position: 'relative', minWidth: 280, height: 220 }}><canvas ref={canvasRef} /></div></div>
}

function ChartTiemposDocentes({ tiposActividad, proyectos, nombramientos, hxTD, tipoNomTD }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  useEffect(() => {
    const activosBase = nombramientos.filter(n => n.estado === 'Activo')
    const activos = tipoNomTD.length > 0 ? activosBase.filter(n => tipoNomTD.includes(String(n.tipoNombramientoId))) : activosBase
    const labels = tiposActividad.map(t => t.nombre)
    const horas = tiposActividad.map(t => { const ids = new Set(proyectos.filter(p => p.tipoId === t.id).map(p => p.id)); return r2(activos.filter(n => ids.has(n.proyectoId)).reduce((s, n) => s + nh(n.horas), 0)) })
    const vals = horas.map(h => r2(h / hxTD))
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current) return
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Tiempos docentes', data: vals, backgroundColor: TEAL, borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} TD (${horas[ctx.dataIndex]}h)` } } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [tiposActividad, proyectos, nombramientos, hxTD, tipoNomTD])
  return <div style={{ overflowX: 'auto' }}><div style={{ position: 'relative', minWidth: 280, height: 220 }}><canvas ref={canvasRef} /></div></div>
}

function ChartTiemposDocentesSede({ sedes, unidades, nombramientos, hxTD, tipoNomTD }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  useEffect(() => {
    const unidSede = new Map(unidades.map(u => [u.id, u.sedeId]))
    const activosBase = nombramientos.filter(n => n.estado === 'Activo')
    const activos = tipoNomTD.length > 0 ? activosBase.filter(n => tipoNomTD.includes(String(n.tipoNombramientoId))) : activosBase
    const labels = sedes.map(s => s.nombre)
    const horas = sedes.map(s => r2(activos.filter(n => unidSede.get(n.unidadId) === s.id).reduce((sum, n) => sum + nh(n.horas), 0)))
    const vals = horas.map(h => r2(h / hxTD))
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current) return
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Tiempos docentes', data: vals, backgroundColor: '#7c3aed', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} TD (${horas[ctx.dataIndex]}h)` } } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [sedes, unidades, nombramientos, hxTD, tipoNomTD])
  return <div style={{ overflowX: 'auto' }}><div style={{ position: 'relative', minWidth: 280, height: 220 }}><canvas ref={canvasRef} /></div></div>
}

function ChartTiemposDocentesUnidad({ unidades, nombramientos, hxTD, tipoNomTD }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  useEffect(() => {
    const activosBase = nombramientos.filter(n => n.estado === 'Activo')
    const activos = tipoNomTD.length > 0 ? activosBase.filter(n => tipoNomTD.includes(String(n.tipoNombramientoId))) : activosBase
    const labels = unidades.map(u => u.codigo || u.nombre)
    const horas = unidades.map(u => r2(activos.filter(n => n.unidadId === u.id).reduce((s, n) => s + nh(n.horas), 0)))
    const vals = horas.map(h => r2(h / hxTD))
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current) return
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Tiempos docentes', data: vals, backgroundColor: AMBER, borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} TD (${horas[ctx.dataIndex]}h)` } } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [unidades, nombramientos, hxTD, tipoNomTD])
  return <div style={{ overflowX: 'auto' }}><div style={{ position: 'relative', minWidth: 280, height: Math.max(180, unidades.length * 28) }}><canvas ref={canvasRef} /></div></div>
}

function ProfPorAnioCard({ noms, profesores }) {
  const años = [...new Set(noms.map(n => n.inicio ? Number(n.inicio.split('-')[0]) : null).filter(Boolean))].sort((a, b) => a - b)
  if (!años.length) return <Card title="👨‍🏫 Profesores Activos por Año" full><p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos.</p></Card>
  const datos = años.map(a => { const ids = profActivosEnAnio(noms, a); return { anio: a, count: ids.size, ids: [...ids] } })
  const maxVal = Math.max(...datos.map(x => x.count), 1)
  return (
    <Card title="👨‍🏫 Profesores con Nombramiento Activo por Año" full>
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, paddingTop: 8, minWidth: datos.length * 56 }}>
          {datos.map(({ anio, count }) => { const pct = Math.round((count / maxVal) * 100); return (
            <div key={anio} style={{ flex: '0 0 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{count}</span>
              <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: 130, display: 'flex', alignItems: 'flex-end' }}>
                <div title={anio + ': ' + count} style={{ width: '100%', height: pct + '%', background: BLUE, borderRadius: '6px 6px 0 0', minHeight: count > 0 ? 4 : 0 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{anio}</span>
            </div>
          )})}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr style={{ background: '#f8f9ff' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Año</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Profesores</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Detalle</th>
          </tr></thead>
          <tbody>{datos.map(({ anio, count, ids }, i) => (
            <tr key={anio} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
              <td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>{anio}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}><span style={{ background: '#dbeafe', color: BLUE, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{count}</span></td>
              <td style={{ padding: '6px 8px' }}><div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{ids.map(id => { const p = profesores.find(x => x.id === id); return <span key={id} style={{ background: '#f0f4f8', color: '#555', padding: '1px 6px', borderRadius: 20, fontSize: 10 }}>{p ? p.nombre.split(',')[0] : '-'}</span> })}</div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Card>
  )
}

function ProfPorUnidadAnioCard({ noms, unidades, profesores }) {
  const [filtAnios, setFiltAnios] = useState(null)
  const [filtUnids, setFiltUnids] = useState(null)
  const [drill, setDrill] = useState(null)
  const todosAnios = useMemo(() => [...new Set(noms.map(n => n.inicio ? Number(n.inicio.split('-')[0]) : null).filter(Boolean))].sort((a, b) => a - b), [noms])
  const todasUnids = useMemo(() => [...new Set(noms.map(n => n.unidadId).filter(Boolean))].map(id => unidades.find(u => u.id === id)).filter(Boolean).sort((a, b) => a.codigo.localeCompare(b.codigo)), [noms, unidades])
  if (!todosAnios.length || !todasUnids.length) return <Card title="🏛️ Profesores por Unidad y Año" full><p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p></Card>
  const años = filtAnios ? todosAnios.filter(a => filtAnios.has(a)) : todosAnios
  const unidsData = filtUnids ? todasUnids.filter(u => filtUnids.has(u.id)) : todasUnids
  const toggleAnio = a => { setFiltAnios(prev => { const s = new Set(prev || todosAnios); if (s.has(a)) { if (s.size > 1) s.delete(a) } else s.add(a); return s.size === todosAnios.length ? null : new Set(s) }); setDrill(null) }
  const toggleUnid = id => { setFiltUnids(prev => { const s = new Set(prev || todasUnids.map(u => u.id)); if (s.has(id)) s.delete(id); else s.add(id); return s.size === todasUnids.length ? null : new Set(s) }); setDrill(null) }
  const getProfIds = (unidadId, anio) => [...new Set(noms.filter(n => { if (n.unidadId !== unidadId || n.estado !== 'Activo') return false; const ini = Number(n.inicio?.split('-')[0]) || 0; const fin = Number(n.fin?.split('-')[0]) || 9999; return ini <= anio && fin >= anio }).map(n => n.profesorId))]
  const matriz = unidsData.map(u => ({ unidad: u, porAnio: años.map(a => { const ids = getProfIds(u.id, a); return { anio: a, count: ids.length, ids } }) }))
  const maxVal = Math.max(...matriz.flatMap(u => u.porAnio.map(x => x.count)), 1)
  const drillProfs = drill ? getProfIds(drill.uid, drill.anio).map(id => (profesores || []).find(p => p.id === id)).filter(Boolean) : []
  const drillUnidad = drill ? unidades.find(u => u.id === drill.uid) : null
  const clickCell = (uid, anio, count) => { if (!count) return; setDrill(d => d && d.uid === uid && d.anio === anio ? null : { uid, anio }) }
  return (
    <Card title="🏛️ Profesores por Unidad y Año" full>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#888', fontWeight: 700, marginRight: 2 }}>AÑO:</span>
        {todosAnios.map(a => { const on = !filtAnios || filtAnios.has(a); return <button key={a} onClick={() => toggleAnio(a)} style={{ padding: '2px 10px', borderRadius: 20, border: '1.5px solid ' + (on ? BLUE : '#ddd'), background: on ? BLUE : 'transparent', color: on ? '#fff' : '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{a}</button> })}
        {filtAnios && <button onClick={() => { setFiltAnios(null); setDrill(null) }} style={{ padding: '2px 8px', borderRadius: 20, border: '1px solid #ddd', background: 'transparent', color: '#aaa', fontSize: 10, cursor: 'pointer' }}>ver todos</button>}
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 8 }}>
        <div style={{ minWidth: Math.max(400, años.length * Math.max(60, unidsData.length * 20 + 20)) }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, paddingTop: 8 }}>
            {años.map(a => (
              <div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 130, width: '100%', justifyContent: 'center' }}>
                  {matriz.map((u, ui) => {
                    const { count } = u.porAnio.find(x => x.anio === a) || { count: 0 }
                    const pct = maxVal > 0 ? Math.round((count / maxVal) * 100) : 0
                    const col = CHART_COLORS[ui % CHART_COLORS.length]
                    const active = drill && drill.uid === u.unidad.id && drill.anio === a
                    return (
                      <div key={u.unidad.id} title={u.unidad.codigo + ' · ' + a + ': ' + count} onClick={() => clickCell(u.unidad.id, a, count)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 2, cursor: count > 0 ? 'pointer' : 'default' }}>
                        {count > 0 && <span style={{ fontSize: 8, color: active ? NAVY : col, fontWeight: 700 }}>{count}</span>}
                        <div style={{ width: '100%', height: pct + '%', background: active ? '#1e3a5f' : col, borderRadius: '3px 3px 0 0', minHeight: count > 0 ? 3 : 0 }} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginTop: 4 }}>{a}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#888', fontWeight: 700, marginRight: 2 }}>UNIDAD:</span>
            {todasUnids.map((u, ui) => {
              const on = !filtUnids || filtUnids.has(u.id)
              const col = CHART_COLORS[ui % CHART_COLORS.length]
              return <div key={u.id} onClick={() => toggleUnid(u.id)} title={u.nombre || u.codigo} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer', opacity: on ? 1 : 0.35, padding: '2px 7px', borderRadius: 4, border: '1px solid ' + (on ? '#e0e8f0' : 'transparent'), background: on ? '#f8f9ff' : 'transparent', userSelect: 'none' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: col, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#555', fontWeight: 600 }}>{u.codigo}</span>
              </div>
            })}
            {filtUnids && filtUnids.size === 0
              ? <button onClick={() => { setFiltUnids(null); setDrill(null) }} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid ' + BLUE, background: BLUE, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>ver todas</button>
              : <button onClick={() => { setFiltUnids(new Set()); setDrill(null) }} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd', background: 'transparent', color: '#aaa', cursor: 'pointer' }}>quitar todas</button>}
          </div>
        </div>
      </div>
      {drill && (
        <div style={{ background: '#eff6ff', border: '1.5px solid ' + BLUE, borderRadius: 10, padding: '12px 16px', marginBottom: 14, position: 'relative' }}>
          <button onClick={() => setDrill(null)} style={{ position: 'absolute', top: 6, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', lineHeight: 1 }}>×</button>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{drillUnidad?.codigo || drill.uid} &nbsp;·&nbsp; {drill.anio} &nbsp;—&nbsp; {drillProfs.length} profesor{drillProfs.length !== 1 ? 'es' : ''}</div>
          {drillProfs.length === 0 ? <span style={{ fontSize: 12, color: '#aaa' }}>Sin datos.</span>
            : <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{drillProfs.map(p => <span key={p.id} style={{ background: '#dbeafe', color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.nombre}</span>)}</div>}
        </div>
      )}
      <TablaColapsable>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 360 }}>
            <thead><tr style={{ background: '#f8f9ff' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Unidad</th>
              {años.map(a => <th key={a} style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{a}</th>)}
              <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th>
            </tr></thead>
            <tbody>{matriz.map((u, ui) => {
              const col = CHART_COLORS[ui % CHART_COLORS.length]
              const totP = new Set(u.porAnio.flatMap(x => x.ids)).size
              return (
                <tr key={u.unidad.id} style={{ borderBottom: '1px solid #f0f0f8', background: ui % 2 === 0 ? '#fff' : '#fafbff' }}>
                  <td style={{ padding: '6px 8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: col, display: 'inline-block' }} /><span style={{ fontWeight: 700, color: col }}>{u.unidad.codigo}</span></div></td>
                  {u.porAnio.map(({ anio, count }) => {
                    const active = drill && drill.uid === u.unidad.id && drill.anio === anio
                    return <td key={anio} onClick={() => clickCell(u.unidad.id, anio, count)} style={{ textAlign: 'right', padding: '6px 8px', color: count > 0 ? '#333' : '#ccc', fontWeight: count > 0 ? 700 : 400, cursor: count > 0 ? 'pointer' : 'default', background: active ? '#dbeafe' : 'transparent' }}>{count > 0 ? count : '—'}</td>
                  })}
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: col }}>{totP > 0 ? totP : '—'}</td>
                </tr>
              )
            })}</tbody>
            <tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}>
              <td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY, fontSize: 11 }}>Total</td>
              {años.map(a => { const tot = new Set(matriz.flatMap(u => (u.porAnio.find(x => x.anio === a) || { ids: [] }).ids)).size; return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: GREEN }}>{tot > 0 ? tot : '—'}</td> })}
              <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: GREEN }}>{new Set(matriz.flatMap(u => u.porAnio.flatMap(x => x.ids))).size}</td>
            </tr></tfoot>
          </table>
        </div>
      </TablaColapsable>
    </Card>
  )
}

function ProfPorTipoProyectoAnioCard({ noms, unidades, tiposActividad, proyectos, profesores }) {
  const [filtAnios, setFiltAnios] = useState(null)
  const [filtUnids, setFiltUnids] = useState(null)
  const [drill, setDrill] = useState(null)
  const proyTipoMap = useMemo(() => { const m = {}; proyectos.forEach(p => { m[p.id] = p.tipoId }); return m }, [proyectos])
  const todosAnios = useMemo(() => [...new Set(noms.map(n => n.inicio ? Number(n.inicio.split('-')[0]) : null).filter(Boolean))].sort((a, b) => a - b), [noms])
  const todasUnids = useMemo(() => [...new Set(noms.map(n => n.unidadId).filter(Boolean))].map(id => unidades.find(u => u.id === id)).filter(Boolean).sort((a, b) => a.codigo.localeCompare(b.codigo)), [noms, unidades])
  const tiposConDatos = useMemo(() => tiposActividad.filter(t => noms.some(n => proyTipoMap[n.proyectoId] === t.id)), [tiposActividad, noms, proyTipoMap])
  if (!todosAnios.length || !tiposConDatos.length) return <Card title="📁 Profesores por Tipo de Proyecto" full><p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p></Card>
  const años = filtAnios ? todosAnios.filter(a => filtAnios.has(a)) : todosAnios
  const unidsVis = filtUnids ? (filtUnids.size === 0 ? [] : todasUnids.filter(u => filtUnids.has(u.id))) : todasUnids
  const nomsFilt = noms.filter(n => {
    if (n.estado !== 'Activo') return false
    if (filtUnids && filtUnids.size > 0 && !filtUnids.has(n.unidadId)) return false
    if (filtUnids && filtUnids.size === 0) return false
    const ini = Number(n.inicio?.split('-')[0]) || 0
    const fin = Number(n.fin?.split('-')[0]) || 9999
    return años.some(a => ini <= a && fin >= a)
  })
  const profsPorTipo = tiposConDatos.map(t => { const ids = [...new Set(nomsFilt.filter(n => proyTipoMap[n.proyectoId] === t.id).map(n => n.profesorId))]; return { tipo: t, count: ids.length, ids } })
  const maxVal = Math.max(...profsPorTipo.map(x => x.count), 1)
  const profsPorUnidTipo = (uid, tipoId) => [...new Set(nomsFilt.filter(n => n.unidadId === uid && proyTipoMap[n.proyectoId] === tipoId).map(n => n.profesorId))]
  const toggleAnio = a => { setFiltAnios(prev => { const s = new Set(prev || todosAnios); if (s.has(a)) { if (s.size > 1) s.delete(a) } else s.add(a); return s.size === todosAnios.length ? null : new Set(s) }); setDrill(null) }
  const toggleUnid = id => { setFiltUnids(prev => { const s = new Set(prev || todasUnids.map(u => u.id)); if (s.has(id)) s.delete(id); else s.add(id); return s.size === todasUnids.length ? null : new Set(s) }); setDrill(null) }
  const clickCell = (uid, tipoId, count) => { if (!count) return; setDrill(d => d && d.uid === uid && d.tipoId === tipoId ? null : { uid, tipoId }) }
  const drillIds = drill ? profsPorUnidTipo(drill.uid, drill.tipoId) : []
  const drillProfs = drillIds.map(id => (profesores || []).find(p => p.id === id)).filter(Boolean)
  const drillUnidad = drill ? unidades.find(u => u.id === drill.uid) : null
  const drillTipo = drill ? tiposActividad.find(t => t.id === drill.tipoId) : null
  const btnReset = { padding: '2px 8px', borderRadius: 20, border: '1px solid #ddd', background: 'transparent', color: '#aaa', fontSize: 10, cursor: 'pointer' }
  return (
    <Card title="📁 Profesores por Tipo de Proyecto" full>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#888', fontWeight: 700, marginRight: 2 }}>AÑO:</span>
        {todosAnios.map(a => { const on = !filtAnios || filtAnios.has(a); return <button key={a} onClick={() => toggleAnio(a)} style={{ padding: '2px 10px', borderRadius: 20, border: '1.5px solid ' + (on ? BLUE : '#ddd'), background: on ? BLUE : 'transparent', color: on ? '#fff' : '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{a}</button> })}
        {filtAnios && <button onClick={() => { setFiltAnios(null); setDrill(null) }} style={btnReset}>ver todos</button>}
      </div>
      {todasUnids.length > 0 && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#888', fontWeight: 700, marginRight: 2 }}>UNIDAD:</span>
        {todasUnids.map((u, ui) => { const on = !filtUnids || filtUnids.has(u.id); const col = CHART_COLORS[ui % CHART_COLORS.length]; return <div key={u.id} onClick={() => toggleUnid(u.id)} title={u.nombre || u.codigo} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer', opacity: on ? 1 : 0.35, padding: '2px 7px', borderRadius: 4, border: '1px solid ' + (on ? '#e0e8f0' : 'transparent'), background: on ? '#f8f9ff' : 'transparent', userSelect: 'none' }}><span style={{ width: 9, height: 9, borderRadius: 2, background: col, display: 'inline-block', flexShrink: 0 }} /><span style={{ color: '#555', fontWeight: 600 }}>{u.codigo}</span></div> })}
        {filtUnids && filtUnids.size === 0 ? <button onClick={() => { setFiltUnids(null); setDrill(null) }} style={{ ...btnReset, border: '1px solid ' + BLUE, background: BLUE, color: '#fff', fontWeight: 700 }}>ver todas</button> : <button onClick={() => { setFiltUnids(new Set()); setDrill(null) }} style={btnReset}>quitar todas</button>}
      </div>}
      <div style={{ marginBottom: 16 }}>
        {profsPorTipo.map((x, ti) => { const col = TIPO_COLORS[ti % TIPO_COLORS.length]; const pct = maxVal > 0 ? Math.round((x.count / maxVal) * 100) : 0; return (
          <div key={x.tipo.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <div style={{ minWidth: 130, fontSize: 11, fontWeight: 700, color: col, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.tipo.nombre}>{x.tipo.nombre}</div>
            <div style={{ flex: 1, background: '#f0f4f8', borderRadius: 20, height: 14, overflow: 'hidden' }}><div style={{ width: pct + '%', background: col, height: '100%', borderRadius: 20 }} /></div>
            <div style={{ minWidth: 28, textAlign: 'right', fontSize: 13, fontWeight: 700, color: col }}>{x.count}</div>
          </div>
        )})}
      </div>
      {drill && (
        <div style={{ background: '#eff6ff', border: '1.5px solid ' + BLUE, borderRadius: 10, padding: '12px 16px', marginBottom: 14, position: 'relative' }}>
          <button onClick={() => setDrill(null)} style={{ position: 'absolute', top: 6, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', lineHeight: 1 }}>×</button>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{drillUnidad?.codigo}&nbsp;·&nbsp;{drillTipo?.nombre}&nbsp;—&nbsp;{drillProfs.length} profesor{drillProfs.length !== 1 ? 'es' : ''}</div>
          {drillProfs.length === 0 ? <span style={{ fontSize: 12, color: '#aaa' }}>Sin datos.</span> : <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{drillProfs.map(p => <span key={p.id} style={{ background: '#dbeafe', color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.nombre}</span>)}</div>}
        </div>
      )}
      <TablaColapsable>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 360 }}>
            <thead><tr style={{ background: '#f8f9ff' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Unidad</th>
              {tiposConDatos.map((t, ti) => <th key={t.id} style={{ textAlign: 'right', padding: '6px 8px', color: TIPO_COLORS[ti % TIPO_COLORS.length], fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0', maxWidth: 90, wordBreak: 'break-word' }}>{t.nombre}</th>)}
              <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th>
            </tr></thead>
            <tbody>{unidsVis.map((u, ui) => {
              const col = CHART_COLORS[ui % CHART_COLORS.length]
              const celdas = tiposConDatos.map(t => profsPorUnidTipo(u.id, t.id))
              const totP = new Set(celdas.flat()).size
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f8', background: ui % 2 === 0 ? '#fff' : '#fafbff' }}>
                  <td style={{ padding: '6px 8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: col, display: 'inline-block' }} /><span style={{ fontWeight: 700, color: col }}>{u.codigo}</span></div></td>
                  {celdas.map((ids, ti) => { const count = ids.length; const active = drill && drill.uid === u.id && drill.tipoId === tiposConDatos[ti].id; return <td key={tiposConDatos[ti].id} onClick={() => clickCell(u.id, tiposConDatos[ti].id, count)} style={{ textAlign: 'right', padding: '6px 8px', color: count > 0 ? '#333' : '#ccc', fontWeight: count > 0 ? 700 : 400, cursor: count > 0 ? 'pointer' : 'default', background: active ? '#dbeafe' : 'transparent' }}>{count > 0 ? count : '—'}</td> })}
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: col }}>{totP > 0 ? totP : '—'}</td>
                </tr>
              )
            })}</tbody>
            <tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}>
              <td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY, fontSize: 11 }}>Total</td>
              {tiposConDatos.map((t, ti) => { const tot = new Set(nomsFilt.filter(n => proyTipoMap[n.proyectoId] === t.id).map(n => n.profesorId)).size; return <td key={t.id} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: TIPO_COLORS[ti % TIPO_COLORS.length] }}>{tot > 0 ? tot : '—'}</td> })}
              <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: GREEN }}>{new Set(nomsFilt.map(n => n.profesorId)).size}</td>
            </tr></tfoot>
          </table>
        </div>
      </TablaColapsable>
    </Card>
  )
}

function ProyActivosPorSubAnioCard({ data }) {
  const allAnios = useMemo(() => [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b), [])
  const allSubs = useMemo(() => [...new Set(data.proyectos.map(p => p.subcategoria || 'Sin subcategoría'))].sort(), [])
  const subColors = useMemo(() => allSubs.reduce((m, s, i) => { m[s] = CHART_COLORS[i % CHART_COLORS.length]; return m }, {}), [allSubs])
  const [selAnios, setSelAnios] = useState(() => new Set(allAnios))
  const [selSubs, setSelSubs] = useState(() => new Set(allSubs))
  const toggleA = a => setSelAnios(prev => { const s = new Set(prev); s.has(a) ? s.delete(a) : s.add(a); return s })
  const toggleS = s => setSelSubs(prev => { const nx = new Set(prev); nx.has(s) ? nx.delete(s) : nx.add(s); return nx })
  const allA = selAnios.size === allAnios.length, allS = selSubs.size === allSubs.length
  const anios = allAnios.filter(a => selAnios.has(a))
  const subs = allSubs.filter(s => selSubs.has(s))
  const porAnio = anios.map(a => { const cols = subs.map(s => ({ s, v: data.proyectos.filter(p => (p.subcategoria || 'Sin subcategoría') === s && getAnios(p).includes(a)).length, color: subColors[s] })); return { a, cols, tot: cols.reduce((acc, c) => acc + c.v, 0) } })
  const mx = Math.max(...porAnio.map(x => x.tot), 1)
  const BAR_H = 130
  const chip = (active, label, onClick, tt) => <span key={label} onClick={onClick} title={tt} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? NAVY : '#e0e0e0'), background: active ? NAVY : '#f8fafc', color: active ? '#fff' : '#555', userSelect: 'none' }}>{label}</span>
  return (
    <Card title="🗂️ Proyectos activos por Subcategoría por Año" full>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Años</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chip(allA, 'Todos', () => setSelAnios(allA ? new Set() : new Set(allAnios)))}
          {allAnios.map(a => chip(selAnios.has(a), a, () => toggleA(a)))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Subcategorías</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chip(allS, 'Todas', () => setSelSubs(allS ? new Set() : new Set(allSubs)))}
          {allSubs.map(s => chip(selSubs.has(s), s, () => toggleS(s), s))}
        </div>
      </div>
      {porAnio.length === 0 || subs.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos para los filtros seleccionados.</p> : (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_H + 30, paddingTop: 8, marginBottom: 8 }}>
            {porAnio.map(({ a, cols, tot }) => { const usedH = Math.round((tot / mx) * BAR_H); return (
              <div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot}</span>
                <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  {[...cols].reverse().map(c => <div key={c.s} title={c.s + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />)}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span>
              </div>
            )})}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>{subs.map(s => <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: subColors[s], display: 'inline-block' }} /><span style={{ color: '#555' }}>{s}</span></div>)}</div>
          <TablaColapsable>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Subcategoría</th>
                {anios.map(a => <th key={a} style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{a}</th>)}
                <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th>
              </tr></thead>
              <tbody>{subs.map((s, si) => { const rowTot = anios.reduce((sum, a) => sum + (porAnio.find(x => x.a === a)?.cols.find(c => c.s === s)?.v || 0), 0); return (
                <tr key={s} style={{ borderBottom: '1px solid #f0f0f8', background: si % 2 === 0 ? '#fff' : '#fafbff' }}>
                  <td style={{ padding: '6px 8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: subColors[s], display: 'inline-block', flexShrink: 0 }} /><span style={{ fontWeight: 600, color: '#333' }}>{s}</span></div></td>
                  {anios.map(a => { const v = porAnio.find(x => x.a === a)?.cols.find(c => c.s === s)?.v || 0; return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', color: v > 0 ? '#333' : '#ddd', fontWeight: v > 0 ? 600 : 400 }}>{v > 0 ? v : '—'}</td> })}
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: subColors[s] }}>{rowTot || '—'}</td>
                </tr>
              )})}
              </tbody>
              <tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>Total</td>
                {anios.map(a => { const v = porAnio.find(x => x.a === a)?.tot || 0; return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{v > 0 ? v : '—'}</td> })}
                <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{anios.reduce((s, a) => s + (porAnio.find(x => x.a === a)?.tot || 0), 0)}</td>
              </tr></tfoot>
            </table></div>
          </TablaColapsable>
        </div>
      )}
    </Card>
  )
}

function ProyActivosPorUnidadTipoCard({ data }) {
  const activos = data.proyectos.filter(p => p.estado === 'Activo')
  const tipos = data.tiposActividad.map((t, i) => ({ ...t, color: TIPO_COLORS[i % TIPO_COLORS.length] }))
  const allUnids = useMemo(() => data.unidades.filter(u => activos.some(p => p.unidadId === u.id)).sort((a, b) => a.nombre.localeCompare(b.nombre)), [])
  const allAnios = useMemo(() => [...new Set(activos.flatMap(p => getAnios(p)))].sort((a, b) => a - b), [])
  const [selUnids, setSelUnids] = useState(() => new Set(allUnids.map(u => u.id)))
  const [selAnios, setSelAnios] = useState(() => new Set(allAnios))
  if (!activos.length) return <Card title="🏛️ Proyectos activos por unidad por tipo" full><p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin proyectos activos.</p></Card>
  const toggleU = id => setSelUnids(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleA = a => setSelAnios(prev => { const s = new Set(prev); s.has(a) ? s.delete(a) : s.add(a); return s })
  const allU = selUnids.size === allUnids.length, allA = selAnios.size === allAnios.length
  const filtActivos = selAnios.size === 0 ? [] : allA ? activos : activos.filter(p => getAnios(p).some(a => selAnios.has(a)))
  const unids = allUnids.filter(u => selUnids.has(u.id))
  const porUnidad = unids.map(u => { const cols = tipos.map(t => ({ ...t, v: filtActivos.filter(p => p.unidadId === u.id && p.tipoId === t.id).length })); return { u, cols, tot: cols.reduce((s, c) => s + c.v, 0) } })
  const mx = Math.max(...porUnidad.map(x => x.tot), 1)
  const BAR_H = 130
  const chip = (active, label, onClick, tt) => <span key={label} onClick={onClick} title={tt} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? NAVY : '#e0e0e0'), background: active ? NAVY : '#f8fafc', color: active ? '#fff' : '#555', userSelect: 'none' }}>{label}</span>
  return (
    <Card title="🏛️ Proyectos activos por unidad por tipo de proyecto" full>
      {allAnios.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Años</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allA, 'Todos', () => setSelAnios(allA ? new Set() : new Set(allAnios)))}{allAnios.map(a => chip(selAnios.has(a), a, () => toggleA(a)))}</div></div>}
      <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Unidades</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allU, 'Todas', () => setSelUnids(allU ? new Set() : new Set(allUnids.map(u => u.id))))}{allUnids.map(u => chip(selUnids.has(u.id), u.codigo || u.nombre, () => toggleU(u.id), u.nombre))}</div></div>
      {porUnidad.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos para los filtros seleccionados.</p> : (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_H + 30, paddingTop: 8, minWidth: porUnidad.length * 60 }}>
            {porUnidad.map(({ u, cols, tot }) => { const usedH = Math.round((tot / mx) * BAR_H); return (
              <div key={u.id} style={{ flex: '0 0 52px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot || ''}</span>
                <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  {[...cols].reverse().map(c => <div key={c.id} title={c.nombre + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />)}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#555', textAlign: 'center', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.nombre}>{u.codigo || u.nombre}</span>
              </div>
            )})}
          </div></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{tipos.map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: 'inline-block' }} /><span style={{ color: '#555' }}>{t.nombre}</span></div>)}</div>
        </div>
      )}
    </Card>
  )
}

function ProyActivosPorUnidadSubCard({ data }) {
  const activos = data.proyectos.filter(p => p.estado === 'Activo')
  const allUnids = useMemo(() => data.unidades.filter(u => activos.some(p => p.unidadId === u.id)).sort((a, b) => a.nombre.localeCompare(b.nombre)), [])
  const allAnios = useMemo(() => [...new Set(activos.flatMap(p => getAnios(p)))].sort((a, b) => a - b), [])
  const [selUnids, setSelUnids] = useState(() => new Set(allUnids.map(u => u.id)))
  const [selAnios, setSelAnios] = useState(() => new Set(allAnios))
  if (!activos.length) return <Card title="🏛️ Proyectos activos por unidad por Subcategoría" full><p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin proyectos activos.</p></Card>
  const toggleU = id => setSelUnids(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleA = a => setSelAnios(prev => { const s = new Set(prev); s.has(a) ? s.delete(a) : s.add(a); return s })
  const allU = selUnids.size === allUnids.length, allA = selAnios.size === allAnios.length
  const filtActivos = selAnios.size === 0 ? [] : allA ? activos : activos.filter(p => getAnios(p).some(a => selAnios.has(a)))
  const subs = [...new Set(filtActivos.map(p => p.subcategoria || 'Sin subcategoría'))].sort()
  const subColors = subs.reduce((m, s, i) => { m[s] = CHART_COLORS[i % CHART_COLORS.length]; return m }, {})
  const unids = allUnids.filter(u => selUnids.has(u.id))
  const porUnidad = unids.map(u => { const cols = subs.map(s => ({ s, color: subColors[s], v: filtActivos.filter(p => p.unidadId === u.id && (p.subcategoria || 'Sin subcategoría') === s).length })); return { u, cols, tot: cols.reduce((acc, c) => acc + c.v, 0) } })
  const mx = Math.max(...porUnidad.map(x => x.tot), 1)
  const BAR_H = 130
  const chip = (active, label, onClick, tt) => <span key={label} onClick={onClick} title={tt} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? NAVY : '#e0e0e0'), background: active ? NAVY : '#f8fafc', color: active ? '#fff' : '#555', userSelect: 'none' }}>{label}</span>
  return (
    <Card title="🏛️ Proyectos activos por unidad por Subcategoría" full>
      {allAnios.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Años</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allA, 'Todos', () => setSelAnios(allA ? new Set() : new Set(allAnios)))}{allAnios.map(a => chip(selAnios.has(a), a, () => toggleA(a)))}</div></div>}
      <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Unidades</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allU, 'Todas', () => setSelUnids(allU ? new Set() : new Set(allUnids.map(u => u.id))))}{allUnids.map(u => chip(selUnids.has(u.id), u.codigo || u.nombre, () => toggleU(u.id), u.nombre))}</div></div>
      {porUnidad.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p> : (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_H + 30, paddingTop: 8, minWidth: porUnidad.length * 60 }}>
            {porUnidad.map(({ u, cols, tot }) => { const usedH = Math.round((tot / mx) * BAR_H); return (
              <div key={u.id} style={{ flex: '0 0 52px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot || ''}</span>
                <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  {[...cols].reverse().map(c => <div key={c.s} title={c.s + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />)}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#555', textAlign: 'center', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.nombre}>{u.codigo || u.nombre}</span>
              </div>
            )})}
          </div></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>{subs.map(s => <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: subColors[s], display: 'inline-block' }} /><span style={{ color: '#555' }}>{s}</span></div>)}</div>
          <TablaColapsable><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr style={{ background: '#f8f9ff' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Unidad</th>
              {subs.map(s => <th key={s} style={{ textAlign: 'right', padding: '6px 8px', color: subColors[s], fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{s}</th>)}
              <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th>
            </tr></thead>
            <tbody>{porUnidad.map(({ u, cols, tot }, ui) => <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f8', background: ui % 2 === 0 ? '#fff' : '#fafbff' }}>
              <td style={{ padding: '6px 8px', fontWeight: 600, color: NAVY }}>{u.nombre}</td>
              {cols.map(c => <td key={c.s} style={{ textAlign: 'right', padding: '6px 8px', color: c.v > 0 ? '#333' : '#ddd', fontWeight: c.v > 0 ? 600 : 400 }}>{c.v > 0 ? c.v : '—'}</td>)}
              <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{tot || '—'}</td>
            </tr>)}</tbody>
            <tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}>
              <td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>Total</td>
              {subs.map(s => { const v = filtActivos.filter(p => (p.subcategoria || 'Sin subcategoría') === s).length; return <td key={s} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: subColors[s] }}>{v || '—'}</td> })}
              <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{filtActivos.length}</td>
            </tr></tfoot>
          </table></div></TablaColapsable>
        </div>
      )}
    </Card>
  )
}

function ProyInicioUnidadTipoCard({ data }) {
  const allAnios = useMemo(() => [...new Set(data.proyectos.map(p => p.inicio ? Number(p.inicio.split('-')[0]) : null).filter(y => y && y >= 1900 && y <= 2100))].sort((a, b) => a - b), [])
  const allUnids = useMemo(() => data.unidades.filter(u => data.proyectos.some(p => p.unidadId === u.id && p.inicio)).sort((a, b) => a.nombre.localeCompare(b.nombre)), [])
  const tipos = useMemo(() => data.tiposActividad.map((t, i) => ({ ...t, color: TIPO_COLORS[i % TIPO_COLORS.length] })), [])
  const [selAnios, setSelAnios] = useState(() => new Set(allAnios))
  const [selUnids, setSelUnids] = useState(() => new Set(allUnids.map(u => u.id)))
  const [modo, setModo] = useState('tipo')
  const toggleA = a => setSelAnios(prev => { const s = new Set(prev); s.has(a) ? s.delete(a) : s.add(a); return s })
  const toggleU = id => setSelUnids(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const allA = selAnios.size === allAnios.length, allU = selUnids.size === allUnids.length
  const filtProys = data.proyectos.filter(p => { if (!p.inicio) return false; const y = Number(p.inicio.split('-')[0]); return selAnios.has(y) && selUnids.has(p.unidadId) })
  const anios = allAnios.filter(a => selAnios.has(a))
  const unidsFilt = allUnids.filter(u => selUnids.has(u.id))
  const porAnioTipo = anios.map(a => { const py = filtProys.filter(p => Number(p.inicio.split('-')[0]) === a); const cols = tipos.map(t => ({ ...t, v: py.filter(p => p.tipoId === t.id).length })); return { a, cols, tot: py.length } })
  const mxTipo = Math.max(...porAnioTipo.map(x => x.tot), 1)
  const porAnioUnid = anios.map(a => { const py = filtProys.filter(p => Number(p.inicio.split('-')[0]) === a); return { a, unids: unidsFilt.map(u => { const cols = tipos.map(t => ({ ...t, v: py.filter(p => p.unidadId === u.id && p.tipoId === t.id).length })); const tot = cols.reduce((s, c) => s + c.v, 0); return { u, cols, tot } }) } })
  const mxUnid = Math.max(...porAnioUnid.flatMap(x => x.unids.map(u => u.tot)), 1)
  const BAR_H = 130
  const chip = (active, label, onClick, tt) => <span key={label} onClick={onClick} title={tt} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? NAVY : '#e0e0e0'), background: active ? NAVY : '#f8fafc', color: active ? '#fff' : '#555', userSelect: 'none' }}>{label}</span>
  const tBtn = (m, label) => <button key={m} onClick={() => setModo(m)} style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid ' + (modo === m ? NAVY : '#e0e0e0'), background: modo === m ? NAVY : '#f8fafc', color: modo === m ? '#fff' : '#555' }}>{label}</button>
  return (
    <Card title="🏛️ Proyectos por año de inicio por unidad por Tipo" full>
      {allAnios.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Años de inicio</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allA, 'Todos', () => setSelAnios(allA ? new Set() : new Set(allAnios)))}{allAnios.map(a => chip(selAnios.has(a), a, () => toggleA(a)))}</div></div>}
      <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Unidades</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allU, 'Todas', () => setSelUnids(allU ? new Set() : new Set(allUnids.map(u => u.id))))}{allUnids.map(u => chip(selUnids.has(u.id), u.codigo || u.nombre, () => toggleU(u.id), u.nombre))}</div></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>{tBtn('tipo', 'Por tipo')}{tBtn('unidad', 'Por unidad')}</div>
      {anios.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p> : modo === 'tipo' ? (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_H + 30, paddingTop: 8, minWidth: anios.length * 60 }}>
            {porAnioTipo.map(({ a, cols, tot }) => { const usedH = Math.round((tot / mxTipo) * BAR_H); return (
              <div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot || ''}</span>
                <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  {[...cols].reverse().map(c => <div key={c.id} title={c.nombre + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />)}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span>
              </div>
            )})}
          </div></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{tipos.map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: 'inline-block' }} /><span style={{ color: '#555' }}>{t.nombre}</span></div>)}</div>
        </div>
      ) : (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: BAR_H + 50, paddingTop: 8, minWidth: anios.length * (unidsFilt.length * 22 + 24) }}>
            {porAnioUnid.map(({ a, unids }) => (
              <div key={a} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: BAR_H + 20 }}>
                  {unids.map(({ u, cols, tot }) => { const usedH = Math.round((tot / mxUnid) * BAR_H); return (
                    <div key={u.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 20 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{tot || ''}</span>
                      <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '3px 3px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                        {[...cols].reverse().map(c => <div key={c.id} title={u.nombre + ' · ' + c.nombre + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 1 : 0 }} />)}
                      </div>
                      <span style={{ fontSize: 7, fontWeight: 700, color: '#666', textAlign: 'center', width: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.nombre}>{u.codigo || u.nombre}</span>
                    </div>
                  )})}
                </div>
                <div style={{ borderTop: '2px solid #e2e8f0', width: '100%', textAlign: 'center', paddingTop: 4, fontSize: 11, fontWeight: 700, color: '#555' }}>{a}</div>
              </div>
            ))}
          </div></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{tipos.map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: 'inline-block' }} /><span style={{ color: '#555' }}>{t.nombre}</span></div>)}</div>
        </div>
      )}
    </Card>
  )
}

function ProyInicioUnidadSubCard({ data }) {
  const allAnios = useMemo(() => [...new Set(data.proyectos.map(p => p.inicio ? Number(p.inicio.split('-')[0]) : null).filter(y => y && y >= 1900 && y <= 2100))].sort((a, b) => a - b), [])
  const allUnids = useMemo(() => data.unidades.filter(u => data.proyectos.some(p => p.unidadId === u.id && p.inicio)).sort((a, b) => a.nombre.localeCompare(b.nombre)), [])
  const allSubs = useMemo(() => [...new Set(data.proyectos.map(p => p.subcategoria || 'Sin subcategoría'))].sort(), [])
  const subColors = useMemo(() => allSubs.reduce((m, s, i) => { m[s] = CHART_COLORS[i % CHART_COLORS.length]; return m }, {}), [allSubs])
  const [selAnios, setSelAnios] = useState(() => new Set(allAnios))
  const [selUnids, setSelUnids] = useState(() => new Set(allUnids.map(u => u.id)))
  const [modo, setModo] = useState('sub')
  const toggleA = a => setSelAnios(prev => { const s = new Set(prev); s.has(a) ? s.delete(a) : s.add(a); return s })
  const toggleU = id => setSelUnids(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const allA = selAnios.size === allAnios.length, allU = selUnids.size === allUnids.length
  const filtProys = data.proyectos.filter(p => { if (!p.inicio) return false; const y = Number(p.inicio.split('-')[0]); return selAnios.has(y) && selUnids.has(p.unidadId) })
  const anios = allAnios.filter(a => selAnios.has(a))
  const unidsFilt = allUnids.filter(u => selUnids.has(u.id))
  const porAnioSub = anios.map(a => { const py = filtProys.filter(p => Number(p.inicio.split('-')[0]) === a); const cols = allSubs.map(s => ({ s, color: subColors[s], v: py.filter(p => (p.subcategoria || 'Sin subcategoría') === s).length })); return { a, cols, tot: py.length } })
  const mxSub = Math.max(...porAnioSub.map(x => x.tot), 1)
  const porAnioUnid = anios.map(a => { const py = filtProys.filter(p => Number(p.inicio.split('-')[0]) === a); return { a, unids: unidsFilt.map(u => { const cols = allSubs.map(s => ({ s, color: subColors[s], v: py.filter(p => p.unidadId === u.id && (p.subcategoria || 'Sin subcategoría') === s).length })); const tot = cols.reduce((acc, c) => acc + c.v, 0); return { u, cols, tot } }) } })
  const mxUnid = Math.max(...porAnioUnid.flatMap(x => x.unids.map(u => u.tot)), 1)
  const porUnidTabla = unidsFilt.map(u => { const cols = allSubs.map(s => ({ s, color: subColors[s], v: filtProys.filter(p => p.unidadId === u.id && (p.subcategoria || 'Sin subcategoría') === s).length })); return { u, cols, tot: cols.reduce((acc, c) => acc + c.v, 0) } })
  const BAR_H = 130
  const chip = (active, label, onClick, tt) => <span key={label} onClick={onClick} title={tt} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? NAVY : '#e0e0e0'), background: active ? NAVY : '#f8fafc', color: active ? '#fff' : '#555', userSelect: 'none' }}>{label}</span>
  const tBtn = (m, label) => <button key={m} onClick={() => setModo(m)} style={{ padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid ' + (modo === m ? NAVY : '#e0e0e0'), background: modo === m ? NAVY : '#f8fafc', color: modo === m ? '#fff' : '#555' }}>{label}</button>
  const legend = <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>{allSubs.map(s => <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: subColors[s], display: 'inline-block' }} /><span style={{ color: '#555' }}>{s}</span></div>)}</div>
  const tabla = (
    <TablaColapsable><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead><tr style={{ background: '#f8f9ff' }}>
        <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Unidad</th>
        {allSubs.map(s => <th key={s} style={{ textAlign: 'right', padding: '6px 8px', color: subColors[s], fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{s}</th>)}
        <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th>
      </tr></thead>
      <tbody>{porUnidTabla.map(({ u, cols, tot }, ui) => <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f8', background: ui % 2 === 0 ? '#fff' : '#fafbff' }}>
        <td style={{ padding: '6px 8px', fontWeight: 600, color: NAVY }}>{u.nombre}</td>
        {cols.map(c => <td key={c.s} style={{ textAlign: 'right', padding: '6px 8px', color: c.v > 0 ? '#333' : '#ddd', fontWeight: c.v > 0 ? 600 : 400 }}>{c.v > 0 ? c.v : '—'}</td>)}
        <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{tot || '—'}</td>
      </tr>)}</tbody>
      <tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}>
        <td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>Total</td>
        {allSubs.map(s => { const v = filtProys.filter(p => (p.subcategoria || 'Sin subcategoría') === s).length; return <td key={s} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: subColors[s] }}>{v || '—'}</td> })}
        <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{porUnidTabla.reduce((s, x) => s + x.tot, 0) || '—'}</td>
      </tr></tfoot>
    </table></div></TablaColapsable>
  )
  return (
    <Card title="🏛️ Proyectos por año de inicio por unidad por Subcategoría" full>
      {allAnios.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Años de inicio</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allA, 'Todos', () => setSelAnios(allA ? new Set() : new Set(allAnios)))}{allAnios.map(a => chip(selAnios.has(a), a, () => toggleA(a)))}</div></div>}
      <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Unidades</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(allU, 'Todas', () => setSelUnids(allU ? new Set() : new Set(allUnids.map(u => u.id))))}{allUnids.map(u => chip(selUnids.has(u.id), u.codigo || u.nombre, () => toggleU(u.id), u.nombre))}</div></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>{tBtn('sub', 'Por subcategoría')}{tBtn('unidad', 'Por unidad')}</div>
      {anios.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p> : modo === 'sub' ? (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_H + 30, paddingTop: 8, minWidth: anios.length * 60 }}>
            {porAnioSub.map(({ a, cols, tot }) => { const usedH = Math.round((tot / mxSub) * BAR_H); return (
              <div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot || ''}</span>
                <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  {[...cols].reverse().map(c => <div key={c.s} title={c.s + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />)}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span>
              </div>
            )})}
          </div></div>
          {legend}{tabla}
        </div>
      ) : (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: BAR_H + 50, paddingTop: 8, minWidth: anios.length * (unidsFilt.length * 22 + 24) }}>
            {porAnioUnid.map(({ a, unids }) => (
              <div key={a} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: BAR_H + 20 }}>
                  {unids.map(({ u, cols, tot }) => { const usedH = Math.round((tot / mxUnid) * BAR_H); return (
                    <div key={u.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 20 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{tot || ''}</span>
                      <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '3px 3px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                        {[...cols].reverse().map(c => <div key={c.s} title={u.nombre + ' · ' + c.s + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 1 : 0 }} />)}
                      </div>
                      <span style={{ fontSize: 7, fontWeight: 700, color: '#666', textAlign: 'center', width: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.nombre}>{u.codigo || u.nombre}</span>
                    </div>
                  )})}
                </div>
                <div style={{ borderTop: '2px solid #e2e8f0', width: '100%', textAlign: 'center', paddingTop: 4, fontSize: 11, fontWeight: 700, color: '#555' }}>{a}</div>
              </div>
            ))}
          </div></div>
          {legend}{tabla}
        </div>
      )}
    </Card>
  )
}

function ComparativaSemestres({ nombramientos, today }) {
  const sems = useMemo(() => {
    const year = today.getFullYear()
    const all = []
    for (let y = year - 1; y <= year; y++) {
      all.push({ label: `S1 ${y}`, ini: new Date(`${y}-01-01`), fin: new Date(`${y}-06-30`) })
      all.push({ label: `S2 ${y}`, ini: new Date(`${y}-07-01`), fin: new Date(`${y}-12-31`) })
    }
    return all.filter(s => s.ini <= today).slice(-4)
  }, [today])

  const metrics = useMemo(() => sems.map(sem => {
    const ns = nombramientos.filter(n => {
      if (!n.inicio) return false
      const ini = new Date(n.inicio)
      const fin = n.fin ? new Date(n.fin) : today
      return ini <= sem.fin && fin >= sem.ini
    })
    return {
      label: sem.label,
      horas: r2(ns.reduce((s, n) => s + nh(n.horas), 0)),
      noms: ns.length,
      profesores: new Set(ns.map(n => n.profesorId)).size,
      proyectos: new Set(ns.map(n => n.proyectoId)).size,
    }
  }), [sems, nombramientos])

  const METRICAS = [
    { k: 'horas', l: 'Horas asignadas', fmt: v => v + 'h', c: BLUE },
    { k: 'noms', l: 'Nombramientos', fmt: v => v, c: TEAL },
    { k: 'profesores', l: 'Profesores', fmt: v => v, c: '#7c3aed' },
    { k: 'proyectos', l: 'Proyectos', fmt: v => v, c: AMBER },
  ]

  const varPct = (curr, prev) => {
    if (prev == null || prev === 0) return null
    return Math.round(((curr - prev) / prev) * 100)
  }

  const maxH = Math.max(...metrics.map(m => m.horas), 1)

  return (
    <Card title="Comparativa por Semestre" full>
      {metrics.length < 2
        ? <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>Se necesitan al menos 2 semestres con datos.</p>
        : (
          <div>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8f9ff' }}>
                    <th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Métrica</th>
                    {metrics.map((m, i) => (
                      <Fragment key={m.label}>
                        <th style={{ textAlign: 'right', padding: '7px 14px', color: NAVY, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>{m.label}</th>
                        {i > 0 && <th style={{ textAlign: 'right', padding: '7px 6px', color: '#aaa', fontWeight: 600, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Δ</th>}
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICAS.map((met, mi) => (
                    <tr key={met.k} style={{ borderBottom: '1px solid #f0f0f8', background: mi % 2 === 0 ? '#fff' : '#fafbff' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: met.c }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: met.c, display: 'inline-block', flexShrink: 0 }} />
                          {met.l}
                        </span>
                      </td>
                      {metrics.map((m, i) => {
                        const val = m[met.k]
                        const pct = i > 0 ? varPct(val, metrics[i - 1][met.k]) : null
                        return (
                          <Fragment key={m.label}>
                            <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 700, color: '#333' }}>{met.fmt(val)}</td>
                            {i > 0 && (
                              <td style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, fontWeight: 700, color: pct === null ? '#aaa' : pct > 0 ? GREEN : pct < 0 ? RED : '#aaa' }}>
                                {pct === null ? '—' : (pct >= 0 ? '+' : '') + pct + '%'}
                              </td>
                            )}
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Horas asignadas</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 100 }}>
              {metrics.map(m => {
                const pct = Math.round((m.horas / maxH) * 100)
                return (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: BLUE }}>{m.horas}h</span>
                    <div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: 80, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: pct + '%', background: BLUE, borderRadius: '6px 6px 0 0', minHeight: m.horas > 0 ? 4 : 0 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>{m.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
    </Card>
  )
}

export function TabResumen({ data, today, totalH, asigH, a30, hUsadas, presupuestos }) {
  const getP = (proyId, anio) => presupuestos[proyId + '_' + anio] || { equipo: '', operativo: '', estudiantes: '' }
  const totalCat = (proyId, anio, cat) => nh(getP(proyId, anio)[cat])
  const totalAnio = (proyId, anio) => r2(CATS.reduce((s, c) => s + totalCat(proyId, anio, c.toLowerCase()), 0))
  const totalProyecto = (proyId, anios) => r2(anios.reduce((s, a) => s + totalAnio(proyId, a), 0))
  const [resumenSec, setResumenSec] = useState('all')
  const libreH = r2(totalH - asigH)
  const activosProyecto = data.proyectos.filter(p => p.estado === 'Activo')
  const pyPorTipo = data.tiposActividad.map((t, i) => ({ label: t.nombre, value: activosProyecto.filter(p => p.tipoId === t.id).length, color: TIPO_COLORS[i % TIPO_COLORS.length] })).filter(x => x.value > 0)
  const subtiposMap = {}; activosProyecto.forEach(p => { const k = p.subcategoria || 'Sin subcategoría'; subtiposMap[k] = (subtiposMap[k] || 0) + 1 })
  const pyPorSub = Object.entries(subtiposMap).map(([k, v], i) => ({ label: k, value: v, color: CHART_COLORS[i % CHART_COLORS.length] }))
  const allAnios = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)
  const totalPresup = r2(data.proyectos.reduce((s, p) => s + totalProyecto(p.id, getAnios(p)), 0))
  const porCuenta = CATS.map(cat => { const ck = cat.toLowerCase(); return { cat, ck, color: CAT_COLORS[cat], porAnio: allAnios.map(a => ({ anio: a, val: r2(data.proyectos.reduce((s, p) => s + totalCat(p.id, a, ck), 0)) })), tot: r2(data.proyectos.reduce((s, p) => s + r2(getAnios(p).reduce((ss, a) => ss + totalCat(p.id, a, ck), 0)), 0)) } })
  const maxBarVal = Math.max(...allAnios.map(a => porCuenta.reduce((s, c) => s + (c.porAnio.find(x => x.anio === a)?.val || 0), 0)), 1)
  const ocupPlazas = data.plazas.map(p => { const usado = hUsadas(p.id); return { ...p, usado, libre: r2(p.horasSemanales - usado), pct: p.horasSemanales > 0 ? Math.round((usado / p.horasSemanales) * 100) : 0 } })
  const fh = v => +parseFloat(v || 0).toFixed(2)
  const [showAllOcup, setShowAllOcup] = useState(false)
  const OCUP_PREVIEW = 5
  const [hxTD, setHxTD] = useState(() => { const v = parseInt(localStorage.getItem('vie_hxtd') || '40'); return v > 1 ? v : 40 })
  const saveHxTD = v => { const n = parseInt(v); if (n > 1) { setHxTD(n); localStorage.setItem('vie_hxtd', String(n)) } }
  const [tipoNomTD, setTipoNomTD] = useState([])
  const toggleTipoNomTD = k => setTipoNomTD(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])
  const fuentesList = data.fuentes || []
  const gFuenteR = id => fuentesList.find(f => f.id === Number(id))
  const pyPorFuente = (() => { const arr = fuentesList.map((f, i) => ({ label: f.nombre, value: activosProyecto.filter(p => Number(p.fuenteId) === f.id).length, color: CHART_COLORS[i % CHART_COLORS.length] })).filter(x => x.value > 0); const sf = activosProyecto.filter(p => !gFuenteR(p.fuenteId)).length; if (sf > 0) arr.push({ label: 'Sin fuente', value: sf, color: '#cbd5e1' }); return arr })()
  const horasPorFuente = fuentesList.map((f, i) => { const ids = new Set(data.proyectos.filter(p => Number(p.fuenteId) === f.id).map(p => p.id)); const h = r2(data.nombramientos.filter(n => n.estado === 'Activo' && ids.has(n.proyectoId)).reduce((s, n) => s + nh(n.horas), 0)); return { label: f.nombre, value: h, color: CHART_COLORS[i % CHART_COLORS.length] } }).filter(x => x.value > 0)
  const vincList = data.vinculaciones || []
  const gVincR = id => vincList.find(v => v.id === Number(id))
  const pyPorVinc = (() => { const arr = vincList.map((v, i) => ({ label: v.nombre, value: activosProyecto.filter(p => Number(p.vinculacionId) === v.id).length, color: CHART_COLORS[(i + 5) % CHART_COLORS.length] })).filter(x => x.value > 0); const sv = activosProyecto.filter(p => !gVincR(p.vinculacionId)).length; if (sv > 0) arr.push({ label: 'Sin vinculación', value: sv, color: '#cbd5e1' }); return arr })()
  const horasPorVinc = vincList.map((v, i) => { const ids = new Set(data.proyectos.filter(p => Number(p.vinculacionId) === v.id).map(p => p.id)); const h = r2(data.nombramientos.filter(n => n.estado === 'Activo' && ids.has(n.proyectoId)).reduce((s, n) => s + nh(n.horas), 0)); return { label: v.nombre, value: h, color: CHART_COLORS[(i + 5) % CHART_COLORS.length] } }).filter(x => x.value > 0)

  const exportResumen = () => {
    const wb = XLSX.utils.book_new()
    const fecha = new Date().toISOString().slice(0, 10)
    const libreHExp = r2(totalH - asigH)
    const nomsActivos = data.nombramientos.filter(n => n.estado === 'Activo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Indicador', 'Valor'], ['Plazas', data.plazas.length], ['Horas totales', totalH], ['Horas asignadas', asigH], ['Horas libres', libreHExp], ['% Ocupación', totalH > 0 ? Math.round((asigH / totalH) * 100) + '%' : '0%'], ['Profesores', data.profesores.length], ['Proyectos activos', activosProyecto.length], ['Nombramientos activos', nomsActivos.length], ['Alertas 30 días', a30.length]]), 'Indicadores')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tipo', 'Cantidad'], ...pyPorTipo.map(t => [t.label, t.value])]), 'Proy por Tipo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Subcategoría', 'Cantidad'], ...pyPorSub.map(s => [s.label, s.value])]), 'Proy por Subcategoria')
    const estadosMap = {}; data.proyectos.forEach(p => { estadosMap[p.estado] = (estadosMap[p.estado] || 0) + 1 })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Estado', 'Cantidad'], ...Object.entries(estadosMap).map(([k, v]) => [k, v])]), 'Proy por Estado')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Plaza', 'Estado', 'CF', 'Total h', 'En uso', 'Libres', '% Ocupación'], ...ocupPlazas.map(p => [p.codigo, p.estado, p.cf, p.horasSemanales, p.usado, p.libre, p.pct + '%'])]), 'Ocupacion Plazas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Año', 'Proyectos'], ...allAnios.map(a => [a, data.proyectos.filter(p => getAnios(p).includes(a)).length])]), 'Proy por Año')
    const tiposPorAnioHeaders = ['Año', ...data.tiposActividad.map(t => t.nombre), 'Total']
    const tiposPorAnioRows = allAnios.map(a => { const cols = data.tiposActividad.map(t => data.proyectos.filter(p => p.tipoId === t.id && getAnios(p).includes(a)).length); return [a, ...cols, cols.reduce((s, v) => s + v, 0)] })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([tiposPorAnioHeaders, ...tiposPorAnioRows]), 'Proy Tipo por Año')
    const subcatMap = {}; activosProyecto.forEach(p => { const t = data.tiposActividad.find(x => x.id === p.tipoId)?.nombre || '-'; const k = t + '|' + (p.subcategoria || 'Sin subcat'); subcatMap[k] = (subcatMap[k] || 0) + 1 })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tipo', 'Subcategoría', 'Cantidad'], ...Object.entries(subcatMap).map(([k, v]) => [k.split('|')[0], k.split('|')[1], v])]), 'Proy por Subcat Año')
    const topUnidades = [...new Set(nomsActivos.map(n => n.unidadId))].map(uid => { const u = data.unidades.find(x => x.id === uid); return { nombre: u?.nombre || '-', codigo: u?.codigo || '-', count: nomsActivos.filter(n => n.unidadId === uid).length } }).sort((a, b) => b.count - a.count)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Unidad', 'Código', 'Nombramientos'], ...topUnidades.map(u => [u.nombre, u.codigo, u.count])]), 'Top Unidades')
    const dUExp = d => Math.ceil((new Date(d) - today) / 86400000)
    const nomsConFin = data.nombramientos.filter(n => n.estado === 'Activo' && n.fin)
    const sem30 = nomsConFin.filter(n => dUExp(n.fin) >= 0 && dUExp(n.fin) <= 30)
    const sem60 = nomsConFin.filter(n => dUExp(n.fin) > 30 && dUExp(n.fin) <= 60)
    const sem90 = nomsConFin.filter(n => dUExp(n.fin) > 60 && dUExp(n.fin) <= 90)
    const semOk = nomsConFin.filter(n => dUExp(n.fin) > 90)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Rango', 'Cantidad'], ['Crítico (≤30d)', sem30.length], ['Alerta (31-60d)', sem60.length], ['Atención (61-90d)', sem90.length], ['Normal (>90d)', semOk.length], ['Sin fecha de fin', data.nombramientos.filter(n => n.estado === 'Activo' && !n.fin).length]]), 'Semafo Vencimientos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tipo', 'Activos', 'Total'], ...data.tiposNombramiento.map(t => [t.nombre, data.nombramientos.filter(n => n.estado === 'Activo' && n.tipoNombramientoId === t.id).length, data.nombramientos.filter(n => n.tipoNombramientoId === t.id).length])]), 'Noms por Tipo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tipo', 'Horas activas'], ...data.tiposNombramiento.map(t => [t.nombre, r2(data.nombramientos.filter(n => n.estado === 'Activo' && n.tipoNombramientoId === t.id).reduce((s, n) => s + (Number(n.horas) || 0), 0))])]), 'Horas por Tipo Nom')
    const aniosNoms = [...new Set(data.nombramientos.map(n => n.inicio ? n.inicio.slice(0, 4) : null).filter(Boolean))].sort()
    const mExp = {}; data.nombramientos.forEach(n => { const an = n.inicio ? n.inicio.slice(0, 4) : null; if (!an) return; const uni = data.unidades.find(u => u.id === n.unidadId); const sid = uni?.sedeId || 0; const tid = n.tipoNombramientoId || 0; if (!mExp[sid]) mExp[sid] = {}; if (!mExp[sid][an]) mExp[sid][an] = {}; mExp[sid][an][tid] = (mExp[sid][an][tid] || 0) + parseFloat(n.horas || 0) })
    const sedeListExp = [...new Set(Object.keys(mExp).map(Number))].map(sid => { const s = data.sedes.find(x => x.id === sid); return { id: sid, nombre: s?.nombre || 'Sin sede' } }).sort((a, b) => a.nombre.localeCompare(b.nombre))
    const hSedeRows = []; sedeListExp.forEach(sed => { const tids = [...new Set(Object.values(mExp[sed.id] || {}).flatMap(x => Object.keys(x).map(Number)))]; tids.forEach(tid => { const tipo = data.tiposNombramiento.find(t => t.id === tid); hSedeRows.push([sed.nombre, tipo?.nombre || 'Sin tipo', ...aniosNoms.map(a => r2(mExp[sed.id]?.[a]?.[tid] || 0)), r2(aniosNoms.reduce((s, a) => s + (mExp[sed.id]?.[a]?.[tid] || 0), 0))]) }); hSedeRows.push(['Subtotal ' + sed.nombre, '', ...aniosNoms.map(a => r2(Object.values(mExp[sed.id]?.[a] || {}).reduce((s, v) => s + v, 0))), r2(aniosNoms.reduce((s, a) => s + Object.values(mExp[sed.id]?.[a] || {}).reduce((ss, v) => ss + v, 0), 0))]) })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sede', 'Tipo Nombramiento', ...aniosNoms, 'Total'], ...hSedeRows]), 'Horas Sede Tipo Año')
    const cnProfExp = new Set(data.nombramientos.filter(n => n.estado === 'Activo').map(n => n.profesorId))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Estado', 'Cantidad'], ['Con nombramiento activo', data.profesores.filter(p => cnProfExp.has(p.id)).length], ['Sin nombramiento activo', data.profesores.filter(p => !cnProfExp.has(p.id)).length], ['Total', data.profesores.length], [], ['Nombre', 'Con Nombramiento Activo'], ...data.profesores.map(p => [p.nombre, cnProfExp.has(p.id) ? 'Sí' : 'No'])]), 'Cobertura Profesores')
    const añosProfExp = [...new Set(data.nombramientos.map(n => n.inicio ? Number(n.inicio.split('-')[0]) : null).filter(Boolean))].sort((a, b) => a - b)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Año', 'Profesores activos'], ...añosProfExp.map(a => { const ids = profActivosEnAnio(data.nombramientos, a); return [a, ids.size] })]), 'Profesores por Año')
    const cnPlazasExp = new Set(data.nombramientos.filter(n => n.estado === 'Activo').map(n => n.plazaId))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Plaza', 'CF', 'Estado', 'Actividad'], ...data.plazas.filter(p => !cnPlazasExp.has(p.id)).map(p => [p.codigo, p.cf, p.estado, p.actividad])]), 'Plazas sin Nombramiento')
    if (totalPresup > 0) { const pHeaders = ['Cuenta', ...allAnios, 'Total', '%']; const pRows = porCuenta.map(c => [c.cat, ...allAnios.map(a => c.porAnio.find(x => x.anio === a)?.val || 0), c.tot, totalPresup > 0 ? Math.round((c.tot / totalPresup) * 100) + '%' : '0%']); const pTot = ['Total', ...allAnios.map(a => r2(porCuenta.reduce((s, c) => s + (c.porAnio.find(x => x.anio === a)?.val || 0), 0))), totalPresup, '100%']; XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([pHeaders, ...pRows, pTot]), 'Presupuesto Resumen') }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Fuente', 'Proyectos activos'], ...pyPorFuente.map(f => [f.label, f.value])]), 'Proy por Fuente')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Fuente', 'Horas activas'], ...horasPorFuente.map(f => [f.label, f.value])]), 'Horas por Fuente')
    const estPorFuente = fuentesList.map(f => { const py = data.proyectos.filter(p => Number(p.fuenteId) === f.id); return [f.nombre, py.filter(p => p.estado === 'Activo').length, py.filter(p => p.estado === 'Por iniciar').length, py.filter(p => p.estado === 'Finalizado').length, py.length] }).filter(r => r[4] > 0)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Fuente', 'Activos', 'Por iniciar', 'Finalizados', 'Total'], ...estPorFuente]), 'Estado por Fuente')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Vinculación', 'Proyectos activos'], ...pyPorVinc.map(v => [v.label, v.value])]), 'Proy por Vinculación')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Vinculación', 'Horas activas'], ...horasPorVinc.map(v => [v.label, v.value])]), 'Horas por Vinculación')
    const estPorVinc = vincList.map(v => { const py = data.proyectos.filter(p => Number(p.vinculacionId) === v.id); return [v.nombre, py.filter(p => p.estado === 'Activo').length, py.filter(p => p.estado === 'Por iniciar').length, py.filter(p => p.estado === 'Finalizado').length, py.length] }).filter(r => r[4] > 0)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Vinculación', 'Activos', 'Por iniciar', 'Finalizados', 'Total'], ...estPorVinc]), 'Estado por Vinculación')
    const sedesActF = data.sedes.filter(s => activosProyecto.some(p => Number(p.sedeId) === s.id))
    const fuenteSedeRows = sedesActF.map(s => { const pyS = activosProyecto.filter(p => Number(p.sedeId) === s.id); const counts = fuentesList.map(f => pyS.filter(p => Number(p.fuenteId) === f.id).length); const sf = pyS.filter(p => !gFuenteR(p.fuenteId)).length; return [s.nombre, ...counts, sf, pyS.length] })
    if (fuenteSedeRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sede', ...fuentesList.map(f => f.nombre), 'Sin fuente', 'Total'], ...fuenteSedeRows]), 'Fuente por Sede')
    const tiposActF = data.tiposActividad.filter(t => activosProyecto.some(p => Number(p.tipoId) === t.id))
    const fuenteTipoRows = tiposActF.map(t => { const pyT = activosProyecto.filter(p => Number(p.tipoId) === t.id); const counts = fuentesList.map(f => pyT.filter(p => Number(p.fuenteId) === f.id).length); const sf = pyT.filter(p => !gFuenteR(p.fuenteId)).length; return [t.nombre, ...counts, sf, pyT.length] })
    if (fuenteTipoRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tipo', ...fuentesList.map(f => f.nombre), 'Sin fuente', 'Total'], ...fuenteTipoRows]), 'Fuente por Tipo')
    const aniosFuente = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)
    const fuenteAnioRows = fuentesList.map(f => { const counts = aniosFuente.map(a => data.proyectos.filter(p => Number(p.fuenteId) === f.id && getAnios(p).includes(a)).length); const tot = counts.reduce((s, v) => s + v, 0); return [f.nombre, ...counts, tot] }).filter(r => r[r.length - 1] > 0)
    if (fuenteAnioRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Fuente', ...aniosFuente, 'Total'], ...fuenteAnioRows]), 'Fuente por Año')
    const sedesActV = data.sedes.filter(s => activosProyecto.some(p => Number(p.sedeId) === s.id))
    const vincSedeRows = sedesActV.map(s => { const pyS = activosProyecto.filter(p => Number(p.sedeId) === s.id); const counts = vincList.map(v => pyS.filter(p => Number(p.vinculacionId) === v.id).length); const sv = pyS.filter(p => !gVincR(p.vinculacionId)).length; return [s.nombre, ...counts, sv, pyS.length] })
    if (vincSedeRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sede', ...vincList.map(v => v.nombre), 'Sin vinculación', 'Total'], ...vincSedeRows]), 'Vinc por Sede')
    const tiposActV = data.tiposActividad.filter(t => activosProyecto.some(p => Number(p.tipoId) === t.id))
    const vincTipoRows = tiposActV.map(t => { const pyT = activosProyecto.filter(p => Number(p.tipoId) === t.id); const counts = vincList.map(v => pyT.filter(p => Number(p.vinculacionId) === v.id).length); const sv = pyT.filter(p => !gVincR(p.vinculacionId)).length; return [t.nombre, ...counts, sv, pyT.length] })
    if (vincTipoRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tipo', ...vincList.map(v => v.nombre), 'Sin vinculación', 'Total'], ...vincTipoRows]), 'Vinc por Tipo')
    const aniosVinc = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)
    const vincAnioRows = vincList.map(v => { const counts = aniosVinc.map(a => data.proyectos.filter(p => Number(p.vinculacionId) === v.id && getAnios(p).includes(a)).length); const tot = counts.reduce((s, v2) => s + v2, 0); return [v.nombre, ...counts, tot] }).filter(r => r[r.length - 1] > 0)
    if (vincAnioRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Vinculación', ...aniosVinc, 'Total'], ...vincAnioRows]), 'Vinc por Año')
    XLSX.writeFile(wb, 'Resumen_PlazasVIE_' + fecha + '.xlsx')
  }

  return (
    <div style={{ overflowX: 'clip' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: NAVY }}>Resumen General</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#888' }}>{today.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          <button onClick={exportResumen} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬇️ Exportar Excel</button>
          <button onClick={() => window.print()} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🖨️ Imprimir / PDF</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {[{ ic: '📋', l: 'Plazas', v: data.plazas.length, c: NAVY }, { ic: '⏱️', l: 'Horas totales', v: fh(totalH) + 'h', c: BLUE }, { ic: '✅', l: 'Asignadas', v: fh(asigH) + 'h', c: TEAL }, { ic: '🔓', l: 'Libres', v: fh(libreH) + 'h', c: GREEN }, { ic: '👨‍🏫', l: 'Profesores', v: data.profesores.length, c: '#7c3aed' }, { ic: '📁', l: 'Proy. activos', v: activosProyecto.length, c: TEAL }, { ic: '📝', l: 'Nombr. activos', v: data.nombramientos.filter(n => n.estado === 'Activo').length, c: NAVY }, { ic: '🔔', l: 'Alertas 30d', v: a30.length, c: a30.length > 0 ? RED : '#94a3b8' }].map(k => (
          <div key={k.l} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderLeft: '4px solid ' + k.c, flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{k.ic}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[{ k: 'all', l: '📊 Todo' }, { k: 'plazas', l: '📋 Plazas' }, { k: 'proyectos', l: '📁 Proyectos' }, { k: 'fuentes', l: '🔗 Fuentes' }, { k: 'vinculacion', l: '🔗 Vinculación' }, { k: 'nombramientos', l: '📝 Nombramientos' }, { k: 'tiempos', l: '⏱️ Tiempos docentes' }, { k: 'profesores', l: '👨‍🏫 Profesores' }, { k: 'presupuesto', l: '💰 Presupuesto' }, { k: 'semestres', l: '📅 Semestres' }].map(s => (
          <button key={s.k} onClick={() => setResumenSec(s.k)} style={{ background: resumenSec === s.k ? NAVY : '#f0f4f8', color: resumenSec === s.k ? '#fff' : NAVY, border: 'none', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{s.l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {(resumenSec === 'all' || resumenSec === 'plazas') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>📋 Plazas</span>
          </div>
          <Card title="📋 Ocupación de Plazas" full>
            <div style={{ marginBottom: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ fontWeight: 600, color: '#555' }}>Ocupación global</span><span style={{ fontWeight: 700, color: NAVY }}>{totalH > 0 ? Math.round((asigH / totalH) * 100) : 0}% · {fh(asigH)}h / {fh(totalH)}h</span></div><div style={{ background: '#e8e8f0', borderRadius: 20, height: 8 }}><div style={{ width: (totalH > 0 ? Math.min(100, Math.round((asigH / totalH) * 100)) : 0) + '%', background: BLUE, height: '100%', borderRadius: 20 }} /></div></div>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr style={{ background: '#f8f9ff' }}>{['Plaza', 'Estado', 'CF', 'Total h', 'En uso', 'Libres', 'Ocupación'].map(h => <th key={h} style={{ textAlign: 'left', padding: '5px 8px', color: '#888', fontWeight: 600, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{h}</th>)}</tr></thead><tbody>{(showAllOcup ? ocupPlazas : ocupPlazas.slice(0, OCUP_PREVIEW)).map((p, i) => { const [bg, fg] = ESTADO_COLORS[p.estado] || ['#f3f4f6', '#374151']; const barColor = p.pct >= 100 ? RED : p.pct > 70 ? AMBER : BLUE; return (<tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}><td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>{p.codigo}</td><td style={{ padding: '6px 8px' }}><span style={{ background: bg, color: fg, padding: '1px 6px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{p.estado}</span></td><td style={{ padding: '6px 8px', color: '#666' }}>{p.cf}</td><td style={{ padding: '6px 8px', fontWeight: 600 }}>{fh(p.horasSemanales)}h</td><td style={{ padding: '6px 8px', color: BLUE, fontWeight: 600 }}>{fh(p.usado)}h</td><td style={{ padding: '6px 8px', color: p.libre > 0 ? GREEN : RED, fontWeight: 600 }}>{fh(p.libre)}h</td><td style={{ padding: '6px 8px', minWidth: 120 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ flex: 1, background: '#e8e8f0', borderRadius: 20, height: 5 }}><div style={{ width: p.pct + '%', background: barColor, height: '100%', borderRadius: 20 }} /></div><span style={{ fontSize: 10, fontWeight: 700, color: barColor, minWidth: 28 }}>{p.pct}%</span></div></td></tr>) })}</tbody></table></div>
            {ocupPlazas.length > OCUP_PREVIEW && (<div style={{ textAlign: 'center', marginTop: 10 }}><button onClick={() => setShowAllOcup(v => !v)} style={{ background: 'none', border: '1.5px solid #dde3ee', borderRadius: 20, padding: '5px 18px', fontSize: 11, color: NAVY, fontWeight: 700, cursor: 'pointer' }}>{showAllOcup ? '▲ Mostrar menos' : '▼ Mostrar más (' + (ocupPlazas.length - OCUP_PREVIEW) + ' plazas más)'}</button></div>)}
          </Card>
          <Card title="🏢 Uso de Plazas por CF" full>
            {(() => {
              const cfs = [...new Set(ocupPlazas.map(p => p.cf || 'Sin CF'))].sort()
              const cfData = cfs.map((cf, i) => { const plazasCF = ocupPlazas.filter(p => (p.cf || 'Sin CF') === cf); const totalHCF = r2(plazasCF.reduce((s, p) => s + p.horasSemanales, 0)); const usadoHCF = r2(plazasCF.reduce((s, p) => s + p.usado, 0)); const libreHCF = r2(totalHCF - usadoHCF); const pctCF = totalHCF > 0 ? Math.round((usadoHCF / totalHCF) * 100) : 0; return { cf, plazas: plazasCF.length, totalH: totalHCF, usado: usadoHCF, libre: libreHCF, pct: pctCF, color: CHART_COLORS[i % CHART_COLORS.length] } })
              if (cfData.length === 0) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos de CF.</p>
              return (<div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {cfData.map(c => (<div key={c.cf} style={{ flex: 1, minWidth: 100, background: '#f8f9ff', borderRadius: 10, padding: '10px 14px', borderLeft: '4px solid ' + c.color }}><div style={{ fontSize: 11, fontWeight: 700, color: c.color, marginBottom: 4 }}>{c.cf}</div><div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{c.plazas} <span style={{ fontSize: 10, fontWeight: 400, color: '#888' }}>plazas</span></div><div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{fh(c.totalH)}h total</div><div style={{ background: '#e8e8f0', borderRadius: 20, height: 5, marginTop: 6 }}><div style={{ width: c.pct + '%', background: c.pct >= 90 ? RED : c.pct > 60 ? AMBER : c.color, height: '100%', borderRadius: 20 }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 3 }}><span style={{ color: c.color, fontWeight: 700 }}>{fh(c.usado)}h en uso</span><span style={{ color: GREEN, fontWeight: 700 }}>{fh(c.libre)}h libres</span></div></div>))}
                </div>
                <div style={{ overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                  {cfData.map(c => (<div key={c.cf} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>{c.pct}%</span><div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: 130, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><div style={{ width: '100%', height: (100 - c.pct) + '%', background: GREEN, opacity: 0.25 }} /><div style={{ width: '100%', height: c.pct + '%', background: c.pct >= 90 ? RED : c.pct > 60 ? AMBER : c.color, minHeight: c.pct > 0 ? 2 : 0 }} /></div><span style={{ fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'center' }}>{c.cf}</span></div>))}
                </div></div>
              </div>)
            })()}
          </Card>
          <Card title="📋 Plazas sin Nombramiento Activo">
            {(() => { const conNom = new Set(data.nombramientos.filter(n => n.estado === 'Activo').map(n => n.plazaId)); const sinNom = data.plazas.filter(p => !conNom.has(p.id)); const enUso = data.plazas.length - sinNom.length; return (<div><div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><div style={{ flex: 1, background: '#dcfce7', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: GREEN }}>{enUso}</div><div style={{ fontSize: 10, color: GREEN, fontWeight: 600, marginTop: 2 }}>En uso activo</div></div><div style={{ flex: 1, background: '#fee2e2', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: RED }}>{sinNom.length}</div><div style={{ fontSize: 10, color: RED, fontWeight: 600, marginTop: 2 }}>Sin uso activo</div></div></div>{sinNom.length > 0 && (<div style={{ maxHeight: 120, overflowY: 'auto' }}>{sinNom.slice(0, 8).map(p => (<div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f0f0f8', color: '#555' }}><span style={{ fontWeight: 700, color: NAVY }}>{p.codigo}</span><span style={{ color: '#aaa', fontSize: 10 }}>{p.estado}</span></div>))}{sinNom.length > 8 && <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>+{sinNom.length - 8} más...</div>}</div>)}</div>) })()}
          </Card>
        </>}
        {(resumenSec === 'all' || resumenSec === 'proyectos') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>📁 Proyectos</span>
          </div>
          <Card title="📁 Proyectos por Tipo" subtitle={activosProyecto.length + ' activos'}>
            {pyPorTipo.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin proyectos activos.</p> : <div><DonutChart segments={pyPorTipo} /><div style={{ marginTop: 14 }}><BarChart height={90} data={pyPorTipo} /></div></div>}
          </Card>
          <Card title="🗂️ Proyectos por Subtipo">
            {pyPorSub.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p> : <div><DonutChart segments={pyPorSub} /></div>}
          </Card>
          <Card title="📊 Proyectos por Estado">
            {(() => { const est = [{ l: 'Activo', c: GREEN, ic: '🟢' }, { l: 'Por iniciar', c: AMBER, ic: '🟡' }, { l: 'Finalizado', c: '#94a3b8', ic: '⚪' }]; return (<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{est.map(e => { const cnt = data.proyectos.filter(p => p.estado === e.l).length; return (<div key={e.l} style={{ flex: 1, minWidth: 80, background: '#f8f9ff', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + e.c, textAlign: 'center' }}><div style={{ fontSize: 18, marginBottom: 2 }}>{e.ic}</div><div style={{ fontSize: 22, fontWeight: 700, color: e.c }}>{cnt}</div><div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{e.l}</div></div>) })}</div>) })()}
          </Card>
          <Card title="⏰ Proyectos Próximos a Vencer">
            {(() => { const dU2 = d => Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000); const prox = data.proyectos.filter(p => p.estado === 'Activo' && p.fin && dU2(p.fin) >= 0).sort((a, b) => dU2(a.fin) - dU2(b.fin)).slice(0, 6); return prox.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin proyectos con fecha fin.</p> : (<div>{prox.map(p => { const dias = dU2(p.fin); const col = dias <= 30 ? RED : dias <= 90 ? AMBER : GREEN; const bg = dias <= 30 ? '#fee2e2' : dias <= 90 ? '#fef3c7' : '#dcfce7'; return (<div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, background: '#fafbff', borderRadius: 8, padding: '5px 8px' }}><span style={{ background: bg, color: col, fontWeight: 700, fontSize: 10, padding: '2px 7px', borderRadius: 20, minWidth: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{dias}d</span><span style={{ flex: 1, fontSize: 11, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span><span style={{ fontSize: 10, color: '#aaa', whiteSpace: 'nowrap', marginLeft: 4 }}>{fmtD(p.fin)}</span></div>) })}</div>) })()}
          </Card>
          <Card title="📅 Proyectos por año de inicio" full>
            {(() => {
              const countByYear = {}; data.proyectos.forEach(p => { if (p.inicio) { const y = Number(p.inicio.split('-')[0]); if (y >= 1900 && y <= 2100) countByYear[y] = (countByYear[y] || 0) + 1 } })
              const anos = Object.keys(countByYear).map(Number).sort((a, b) => a - b)
              if (!anos.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin proyectos.</p>
              const mx = Math.max(...anos.map(a => countByYear[a]), 1)
              return (<div style={{ overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 8, marginBottom: 8 }}>
                {anos.map(a => { const v = countByYear[a]; const pct = Math.round((v / mx) * 100); return (<div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{v}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: 130, display: 'flex', alignItems: 'flex-end' }}><div title={a + ': ' + v} style={{ width: '100%', height: pct + '%', background: '#7c3aed', borderRadius: '6px 6px 0 0', minHeight: v > 0 ? 4 : 0 }} /></div><span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span></div>) })}
              </div></div>)
            })()}
          </Card>
          <Card title="📁 Proyectos por año de inicio por tipo" full>
            {(() => {
              const getIniY = p => p.inicio ? Number(p.inicio.split('-')[0]) : null
              const anos = [...new Set(data.proyectos.map(getIniY).filter(y => y && y >= 1900 && y <= 2100))].sort((a, b) => a - b)
              if (!anos.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin proyectos.</p>
              const tipos = data.tiposActividad.map((t, i) => ({ ...t, color: TIPO_COLORS[i % TIPO_COLORS.length] }))
              const porAnio = anos.map(a => { const cols = tipos.map(t => ({ ...t, v: data.proyectos.filter(p => getIniY(p) === a && p.tipoId === t.id).length })); return { a, cols, tot: cols.reduce((s, c) => s + c.v, 0) } })
              const mx = Math.max(...porAnio.map(x => x.tot), 1)
              return (<div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 8, marginBottom: 8 }}>
                  {porAnio.map(({ a, cols, tot }) => { const barH = 130; const usedH = Math.round((tot / mx) * barH); return (<div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: barH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>{[...cols].reverse().map(c => (<div key={c.id} title={c.nombre + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />))}</div><span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span></div>) })}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{tipos.map(t => (<div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: 'inline-block' }} /><span style={{ color: '#555' }}>{t.nombre}</span></div>))}</div>
              </div>)
            })()}
          </Card>
          <Card title="🗂️ Proyectos por año de inicio por subcategoría" full>
            {(() => {
              const getIniY = p => p.inicio ? Number(p.inicio.split('-')[0]) : null
              const anos = [...new Set(data.proyectos.map(getIniY).filter(y => y && y >= 1900 && y <= 2100))].sort((a, b) => a - b)
              if (!anos.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin proyectos.</p>
              const subs = [...new Set(data.proyectos.map(p => p.subcategoria || 'Sin subcategoría'))].sort()
              const subColors = subs.reduce((m, s, i) => { m[s] = CHART_COLORS[i % CHART_COLORS.length]; return m }, {})
              const porAnio = anos.map(a => { const cols = subs.map(s => ({ s, v: data.proyectos.filter(p => getIniY(p) === a && (p.subcategoria || 'Sin subcategoría') === s).length, color: subColors[s] })); return { a, cols, tot: cols.reduce((acc, c) => acc + c.v, 0) } })
              const mx = Math.max(...porAnio.map(x => x.tot), 1)
              return (<div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 8, marginBottom: 8 }}>
                  {porAnio.map(({ a, cols, tot }) => { const barH = 130; const usedH = Math.round((tot / mx) * barH); return (<div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: barH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>{[...cols].reverse().map(c => (<div key={c.s} title={c.s + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />))}</div><span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span></div>) })}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>{subs.map(s => (<div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: subColors[s], display: 'inline-block' }} /><span style={{ color: '#555' }}>{s}</span></div>))}</div>
                <TablaColapsable><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Subcategoría</th>{anos.map(a => <th key={a} style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{a}</th>)}<th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th></tr></thead>
                  <tbody>{subs.map((s, si) => { const rowTot = anos.reduce((sum, a) => sum + (porAnio.find(x => x.a === a)?.cols.find(c => c.s === s)?.v || 0), 0); return (<tr key={s} style={{ borderBottom: '1px solid #f0f0f8', background: si % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '6px 8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: subColors[s], display: 'inline-block', flexShrink: 0 }} /><span style={{ fontWeight: 600, color: '#333' }}>{s}</span></div></td>{anos.map(a => { const v = porAnio.find(x => x.a === a)?.cols.find(c => c.s === s)?.v || 0; return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', color: v > 0 ? '#333' : '#ddd', fontWeight: v > 0 ? 600 : 400 }}>{v > 0 ? v : '—'}</td> })}<td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: subColors[s] }}>{rowTot || '—'}</td></tr>) })}</tbody>
                  <tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>Total</td>{anos.map(a => { const v = porAnio.find(x => x.a === a)?.tot || 0; return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{v > 0 ? v : '—'}</td> })}<td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{anos.reduce((s, a) => s + (porAnio.find(x => x.a === a)?.tot || 0), 0)}</td></tr></tfoot>
                </table></div></TablaColapsable>
              </div>)
            })()}
          </Card>
          <Card title="📅 Total de Proyectos activos por Año" full>
            {(() => {
              const anos = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)
              const tots = anos.map(a => ({ a, v: data.proyectos.filter(p => getAnios(p).includes(a)).length }))
              const mx = Math.max(...tots.map(x => x.v), 1)
              return (<div style={{ overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 8, marginBottom: 8 }}>{tots.map(({ a, v }) => { const pct = Math.round((v / mx) * 100); return (<div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{v}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: 130, display: 'flex', alignItems: 'flex-end' }}><div title={a + ': ' + v} style={{ width: '100%', height: pct + '%', background: BLUE, borderRadius: '6px 6px 0 0', minHeight: v > 0 ? 4 : 0 }} /></div><span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span></div>) })}
              </div></div>)
            })()}
          </Card>
          <Card title="📁 Proyectos activos por Tipo por Año" full>
            {(() => {
              const anos = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)
              const tipos = data.tiposActividad.map((t, i) => ({ ...t, color: TIPO_COLORS[i % TIPO_COLORS.length] }))
              const porAnio = anos.map(a => { const cols = tipos.map(t => ({ ...t, v: data.proyectos.filter(p => p.tipoId === t.id && getAnios(p).includes(a)).length })); return { a, cols, tot: cols.reduce((s, c) => s + c.v, 0) } })
              const mx = Math.max(...porAnio.map(x => x.tot), 1)
              return (<div style={{ overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 8, marginBottom: 8 }}>{porAnio.map(({ a, cols, tot }) => { const barH = 130; const usedH = Math.round((tot / mx) * barH); return (<div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{tot}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: barH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>{[...cols].reverse().map(c => (<div key={c.id} title={c.nombre + ': ' + c.v} style={{ width: '100%', height: tot > 0 ? Math.round((c.v / tot) * usedH) : 0, background: c.color, minHeight: c.v > 0 ? 2 : 0 }} />))}</div><span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span></div>) })}
              </div><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{tipos.map(t => (<div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: 'inline-block' }} /><span style={{ color: '#555' }}>{t.nombre}</span></div>))}</div></div>)
            })()}
          </Card>
          <ProyActivosPorSubAnioCard data={data} />
          <ProyActivosPorUnidadTipoCard data={data} />
          <ProyActivosPorUnidadSubCard data={data} />
          <ProyInicioUnidadTipoCard data={data} />
          <ProyInicioUnidadSubCard data={data} />
        </>}
        {(resumenSec === 'all' || resumenSec === 'fuentes') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>🔗 Fuentes de financiamiento</span>
          </div>
          <Card title="🔗 Proyectos por Fuente" subtitle={activosProyecto.length + ' activos'}>
            {pyPorFuente.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin fuentes asignadas.</p> : <div><DonutChart segments={pyPorFuente} /><div style={{ marginTop: 14 }}><BarChart height={90} data={pyPorFuente} /></div></div>}
          </Card>
          <Card title="⏱️ Horas Activas por Fuente">
            {horasPorFuente.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con fuente asignada.</p> : <div><BarChart height={110} data={horasPorFuente} /><div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{horasPorFuente.map(f => <span key={f.label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f0f4f8', color: NAVY, fontWeight: 600 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: f.color, marginRight: 4, verticalAlign: 'middle' }} />{f.label}: {f.value}h</span>)}</div></div>}
          </Card>
          <Card title="📊 Estado de Proyectos por Fuente" full>
            {(() => {
              if (!fuentesList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin fuentes registradas.</p>
              const estados = ['Activo', 'Por iniciar', 'Finalizado']; const colEst = { 'Activo': GREEN, 'Por iniciar': AMBER, 'Finalizado': '#94a3b8' }
              const rows = fuentesList.map(f => { const pyF = data.proyectos.filter(p => Number(p.fuenteId) === f.id); if (!pyF.length) return null; const cts = Object.fromEntries(estados.map(e => [e, pyF.filter(p => p.estado === e).length])); return { nombre: f.nombre, cts, tot: pyF.length } }).filter(Boolean)
              if (!rows.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p>
              const maxTot = Math.max(...rows.map(r => r.tot), 1)
              return <div>{rows.map(r => (<div key={r.nombre} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ fontWeight: 600, color: NAVY }}>{r.nombre}</span><span style={{ color: '#aaa' }}>{r.tot} proyectos</span></div><div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', background: '#f0f4f8' }}>{estados.map(e => r.cts[e] > 0 && (<div key={e} title={e + ': ' + r.cts[e]} style={{ width: (r.cts[e] / maxTot * 100) + '%', background: colEst[e], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{r.cts[e]}</span></div>))}</div></div>))}<div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10 }}>{estados.map(e => (<span key={e} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: colEst[e], display: 'inline-block' }} />{e}</span>))}</div></div>
            })()}
          </Card>
          <Card title="📍 Distribución de Fuentes por Sede" full>
            {(() => {
              const sedes = data.sedes.filter(s => activosProyecto.some(p => Number(p.sedeId) === s.id))
              if (!sedes.length || !fuentesList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p>
              const maxSede = Math.max(...sedes.map(s => activosProyecto.filter(p => Number(p.sedeId) === s.id).length), 1)
              return <div>{sedes.map(s => { const pyS = activosProyecto.filter(p => Number(p.sedeId) === s.id); return <div key={s.id} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ fontWeight: 600, color: NAVY }}>{s.nombre}</span><span style={{ color: '#aaa' }}>{pyS.length} proyectos</span></div><div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', background: '#f0f4f8' }}>{fuentesList.map((f, i) => { const cnt = pyS.filter(p => Number(p.fuenteId) === f.id).length; return cnt > 0 && (<div key={f.id} title={f.nombre + ': ' + cnt} style={{ width: (cnt / maxSede * 100) + '%', background: CHART_COLORS[i % CHART_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{cnt}</span></div>) })}{(() => { const sf = pyS.filter(p => !gFuenteR(p.fuenteId)).length; return sf > 0 && <div title={'Sin fuente: ' + sf} style={{ width: (sf / maxSede * 100) + '%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{sf}</span></div> })()}</div></div> })}<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 10 }}>{fuentesList.map((f, i) => <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />{f.nombre}</span>)}<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#cbd5e1', display: 'inline-block' }} />Sin fuente</span></div></div>
            })()}
          </Card>
          <Card title="🎯 Fuentes por Tipo de Proyecto" full>
            {(() => {
              const tipos = data.tiposActividad.filter(t => activosProyecto.some(p => Number(p.tipoId) === t.id))
              if (!tipos.length || !fuentesList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p>
              const maxTipo = Math.max(...tipos.map(t => activosProyecto.filter(p => Number(p.tipoId) === t.id).length), 1)
              return <div>{tipos.map(t => { const pyT = activosProyecto.filter(p => Number(p.tipoId) === t.id); return <div key={t.id} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ fontWeight: 600, color: NAVY }}>{t.nombre}</span><span style={{ color: '#aaa' }}>{pyT.length} proyectos</span></div><div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', background: '#f0f4f8' }}>{fuentesList.map((f, i) => { const cnt = pyT.filter(p => Number(p.fuenteId) === f.id).length; return cnt > 0 && (<div key={f.id} title={f.nombre + ': ' + cnt} style={{ width: (cnt / maxTipo * 100) + '%', background: CHART_COLORS[i % CHART_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{cnt}</span></div>) })}{(() => { const sf = pyT.filter(p => !gFuenteR(p.fuenteId)).length; return sf > 0 && <div title={'Sin fuente: ' + sf} style={{ width: (sf / maxTipo * 100) + '%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{sf}</span></div> })()}</div></div> })}<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 10 }}>{fuentesList.map((f, i) => <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />{f.nombre}</span>)}<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#cbd5e1', display: 'inline-block' }} />Sin fuente</span></div></div>
            })()}
          </Card>
          <Card title="📅 Proyectos por Fuente y Año" full>
            {(() => {
              if (!fuentesList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin fuentes registradas.</p>
              const anos = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)
              if (!anos.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin años registrados.</p>
              const fData = fuentesList.map((f, i) => ({ id: f.id, nombre: f.nombre, color: CHART_COLORS[i % CHART_COLORS.length], porAnio: anos.map(a => data.proyectos.filter(p => Number(p.fuenteId) === f.id && getAnios(p).includes(a)).length) }))
              const maxVal = Math.max(...anos.map((_, ai) => fData.reduce((s, f) => s + f.porAnio[ai], 0)), 1)
              const BAR_H = 110
              return <div>
                <div style={{ overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: BAR_H + 30, paddingTop: 8, minWidth: anos.length * 60 }}>
                  {anos.map((a, ai) => { const tot = fData.reduce((s, f) => s + f.porAnio[ai], 0); return <div key={a} style={{ flex: 1, minWidth: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>{tot || ''}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>{[...fData.filter(f => f.porAnio[ai] > 0)].reverse().map(f => { const px = Math.round((f.porAnio[ai] / maxVal) * BAR_H); return <div key={f.id} title={f.nombre + ': ' + f.porAnio[ai]} style={{ width: '100%', height: px, background: f.color, minHeight: f.porAnio[ai] > 0 ? 2 : 0 }} /> })}</div><span style={{ fontSize: 10, fontWeight: 600, color: '#555' }}>{a}</span></div> })}
                </div></div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 10 }}>{fData.map(f => <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: 'inline-block' }} />{f.nombre}</span>)}</div>
                <TablaColapsable><div style={{ overflowX: 'auto', marginTop: 16 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Fuente</th>{anos.map(a => <th key={a} style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{a}</th>)}<th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th></tr></thead><tbody>{fData.map((f, fi) => { const rowTotal = f.porAnio.reduce((s, v) => s + v, 0); if (!rowTotal) return null; return (<tr key={f.id} style={{ background: fi % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}><td style={{ padding: '5px 8px', borderLeft: '3px solid ' + f.color, whiteSpace: 'nowrap' }}>{f.nombre}</td>{f.porAnio.map((v, ai) => <td key={ai} style={{ padding: '5px 8px', textAlign: 'right', color: v > 0 ? NAVY : '#ccc', fontWeight: v > 0 ? 600 : 400 }}>{v || '—'}</td>)}<td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: NAVY }}>{rowTotal}</td></tr>) })}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '5px 8px', fontWeight: 700, color: NAVY, fontSize: 10 }}>Total</td>{anos.map((_, ai) => { const tot = fData.reduce((s, f) => s + f.porAnio[ai], 0); return <td key={ai} style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: NAVY }}>{tot || '—'}</td> })}<td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: NAVY }}>{fData.reduce((s, f) => s + f.porAnio.reduce((ss, v) => ss + v, 0), 0)}</td></tr></tfoot></table></div></TablaColapsable>
              </div>
            })()}
          </Card>
        </>}
        {(resumenSec === 'all' || resumenSec === 'vinculacion') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>🔗 Vinculación</span>
          </div>
          <Card title="🔗 Proyectos por Vinculación" subtitle={activosProyecto.length + ' activos'}>
            {pyPorVinc.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin vinculaciones asignadas.</p> : <div><DonutChart segments={pyPorVinc} /><div style={{ marginTop: 14 }}><BarChart height={90} data={pyPorVinc} /></div></div>}
          </Card>
          <Card title="⏱️ Horas Activas por Vinculación">
            {horasPorVinc.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con vinculación asignada.</p> : <div><BarChart height={110} data={horasPorVinc} /><div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{horasPorVinc.map(v => <span key={v.label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f0f4f8', color: NAVY, fontWeight: 600 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: v.color, marginRight: 4, verticalAlign: 'middle' }} />{v.label}: {v.value}h</span>)}</div></div>}
          </Card>
          <Card title="📊 Estado de Proyectos por Vinculación" full>
            {(() => {
              if (!vincList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin vinculaciones registradas.</p>
              const estados = ['Activo', 'Por iniciar', 'Finalizado']; const colEst = { 'Activo': GREEN, 'Por iniciar': AMBER, 'Finalizado': '#94a3b8' }
              const rows = vincList.map(v => { const pyV = data.proyectos.filter(p => Number(p.vinculacionId) === v.id); if (!pyV.length) return null; const cts = Object.fromEntries(estados.map(e => [e, pyV.filter(p => p.estado === e).length])); return { nombre: v.nombre, cts, tot: pyV.length } }).filter(Boolean)
              if (!rows.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p>
              const maxTot = Math.max(...rows.map(r => r.tot), 1)
              return (<div>{rows.map(r => (<div key={r.nombre} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ fontWeight: 600, color: NAVY }}>{r.nombre}</span><span style={{ color: '#aaa' }}>{r.tot} proyectos</span></div><div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', background: '#f0f4f8' }}>{estados.map(e => r.cts[e] > 0 && (<div key={e} title={e + ': ' + r.cts[e]} style={{ width: (r.cts[e] / maxTot * 100) + '%', background: colEst[e], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{r.cts[e]}</span></div>))}</div></div>))}<div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10 }}>{estados.map(e => (<span key={e} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: colEst[e], display: 'inline-block' }} />{e}</span>))}</div></div>)
            })()}
          </Card>
          <Card title="📍 Vinculación por Sede" full>
            {(() => {
              const sedes = data.sedes.filter(s => activosProyecto.some(p => Number(p.sedeId) === s.id))
              if (!sedes.length || !vincList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p>
              const maxSede = Math.max(...sedes.map(s => activosProyecto.filter(p => Number(p.sedeId) === s.id).length), 1)
              return (<div>{sedes.map(s => { const pyS = activosProyecto.filter(p => Number(p.sedeId) === s.id); return (<div key={s.id} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ fontWeight: 600, color: NAVY }}>{s.nombre}</span><span style={{ color: '#aaa' }}>{pyS.length} proyectos</span></div><div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', background: '#f0f4f8' }}>{vincList.map((v, i) => { const cnt = pyS.filter(p => Number(p.vinculacionId) === v.id).length; return cnt > 0 && (<div key={v.id} title={v.nombre + ': ' + cnt} style={{ width: (cnt / maxSede * 100) + '%', background: CHART_COLORS[(i + 5) % CHART_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{cnt}</span></div>) })}{(() => { const sf = pyS.filter(p => !gVincR(p.vinculacionId)).length; return sf > 0 && (<div title={'Sin vinculación: ' + sf} style={{ width: (sf / maxSede * 100) + '%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{sf}</span></div>) })()}</div></div>) })}<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 10 }}>{vincList.map((v, i) => <span key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[(i + 5) % CHART_COLORS.length], display: 'inline-block' }} />{v.nombre}</span>)}<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#cbd5e1', display: 'inline-block' }} />Sin vinculación</span></div></div>)
            })()}
          </Card>
          <Card title="🎯 Vinculación por Tipo de Proyecto" full>
            {(() => {
              const tipos = data.tiposActividad.filter(t => activosProyecto.some(p => Number(p.tipoId) === t.id))
              if (!tipos.length || !vincList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p>
              const maxTipo = Math.max(...tipos.map(t => activosProyecto.filter(p => Number(p.tipoId) === t.id).length), 1)
              return (<div>{tipos.map(t => { const pyT = activosProyecto.filter(p => Number(p.tipoId) === t.id); return (<div key={t.id} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ fontWeight: 600, color: NAVY }}>{t.nombre}</span><span style={{ color: '#aaa' }}>{pyT.length} proyectos</span></div><div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', background: '#f0f4f8' }}>{vincList.map((v, i) => { const cnt = pyT.filter(p => Number(p.vinculacionId) === v.id).length; return cnt > 0 && (<div key={v.id} title={v.nombre + ': ' + cnt} style={{ width: (cnt / maxTipo * 100) + '%', background: CHART_COLORS[(i + 5) % CHART_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{cnt}</span></div>) })}{(() => { const sf = pyT.filter(p => !gVincR(p.vinculacionId)).length; return sf > 0 && (<div title={'Sin vinculación: ' + sf} style={{ width: (sf / maxTipo * 100) + '%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{sf}</span></div>) })()}</div></div>) })}<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 10 }}>{vincList.map((v, i) => <span key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[(i + 5) % CHART_COLORS.length], display: 'inline-block' }} />{v.nombre}</span>)}<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#cbd5e1', display: 'inline-block' }} />Sin vinculación</span></div></div>)
            })()}
          </Card>
          <Card title="📅 Vinculación por Año" full>
            {(() => {
              if (!vincList.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin vinculaciones registradas.</p>
              const anos = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)
              if (!anos.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin años registrados.</p>
              const vData = vincList.map((v, i) => ({ id: v.id, nombre: v.nombre, color: CHART_COLORS[(i + 5) % CHART_COLORS.length], porAnio: anos.map(a => data.proyectos.filter(p => Number(p.vinculacionId) === v.id && getAnios(p).includes(a)).length) }))
              const maxVal = Math.max(...anos.map((_, ai) => vData.reduce((s, v) => s + v.porAnio[ai], 0)), 1)
              const BAR_H = 110
              return (<div><div style={{ overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: BAR_H + 30, paddingTop: 8, minWidth: anos.length * 60 }}>{anos.map((a, ai) => { const tot = vData.reduce((s, v) => s + v.porAnio[ai], 0); return (<div key={a} style={{ flex: 1, minWidth: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>{tot || ''}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: BAR_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>{[...vData.filter(v => v.porAnio[ai] > 0)].reverse().map(v => { const px = Math.round((v.porAnio[ai] / maxVal) * BAR_H); return (<div key={v.id} title={v.nombre + ': ' + v.porAnio[ai]} style={{ width: '100%', height: px, background: v.color, minHeight: v.porAnio[ai] > 0 ? 2 : 0 }} />) })}</div><span style={{ fontSize: 10, fontWeight: 600, color: '#555' }}>{a}</span></div>) })}</div></div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 10 }}>{vData.map(v => <span key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: v.color, display: 'inline-block' }} />{v.nombre}</span>)}</div></div>)
            })()}
          </Card>
        </>}
        {(resumenSec === 'all' || resumenSec === 'nombramientos') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>📝 Nombramientos</span>
          </div>
          <Card title="🚦 Semáforo de Vencimientos">
            {(() => { const dU2 = d => Math.ceil((new Date(d) - today) / 86400000); const activos = data.nombramientos.filter(n => n.estado === 'Activo' && n.fin); const v30 = activos.filter(n => dU2(n.fin) >= 0 && dU2(n.fin) <= 30); const v60 = activos.filter(n => dU2(n.fin) > 30 && dU2(n.fin) <= 60); const v90 = activos.filter(n => dU2(n.fin) > 60 && dU2(n.fin) <= 90); const ok = activos.filter(n => dU2(n.fin) > 90); return (<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{[{ label: 'Crítico ≤30d', noms: v30, bg: '#fee2e2', color: RED, ic: '🔴' }, { label: 'Alerta 31-60d', noms: v60, bg: '#fef3c7', color: AMBER, ic: '🟡' }, { label: 'Atención 61-90d', noms: v90, bg: '#fef9c3', color: '#ca8a04', ic: '🟠' }, { label: 'Normal >90d', noms: ok, bg: '#dcfce7', color: GREEN, ic: '🟢' }].map(n => (<div key={n.label} style={{ flex: 1, minWidth: 80, background: n.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}><div style={{ fontSize: 18, marginBottom: 2 }}>{n.ic}</div><div style={{ fontSize: 22, fontWeight: 700, color: n.color }}>{n.noms.length}</div><div style={{ fontSize: 9, color: n.color, fontWeight: 700, marginTop: 2 }}>{n.label}</div></div>))}</div>) })()}
          </Card>
          <Card title="📄 Nombramientos por Tipo">
            {(() => {
              const activos = data.nombramientos.filter(n => n.estado === 'Activo').length
              const totalNoms = data.nombramientos.length
              const rows = data.tiposNombramiento.map((t, i) => ({ ...t, cntActivo: data.nombramientos.filter(n => n.estado === 'Activo' && n.tipoNombramientoId === t.id).length, cntTotal: data.nombramientos.filter(n => n.tipoNombramientoId === t.id).length, color: CHART_COLORS[i % CHART_COLORS.length] })).sort((a, b) => b.cntTotal - a.cntTotal)
              return (<div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginBottom: 8 }}><span style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>ACTIVOS</span><span style={{ fontSize: 10, color: '#888', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>TOTAL</span></div>{rows.map(r => (<div key={r.id} style={{ marginBottom: 9 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}><div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: r.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</div><div style={{ minWidth: 28, textAlign: 'right', fontSize: 12, fontWeight: 700, color: TEAL }}>{r.cntActivo}</div><div style={{ minWidth: 36, textAlign: 'right', fontSize: 12, fontWeight: 700, color: NAVY }}>{r.cntTotal}</div></div><div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 20, overflow: 'hidden', background: '#f0f4f8' }}><div style={{ width: (totalNoms > 0 ? Math.round((r.cntActivo / totalNoms) * 100) : 0) + '%', background: r.color, borderRadius: 20 }} /><div style={{ width: (totalNoms > 0 ? Math.round(((r.cntTotal - r.cntActivo) / totalNoms) * 100) : 0) + '%', background: r.color, opacity: 0.3 }} /></div></div>))}<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginTop: 6, borderTop: '1px solid #f0f0f8', paddingTop: 6 }}><span>Total general</span><div style={{ display: 'flex', gap: 16 }}><span style={{ color: TEAL, fontWeight: 700 }}>{activos} activos</span><span style={{ color: NAVY, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{totalNoms}</span></div></div></div>)
            })()}
          </Card>
          <Card title="📊 Horas activas por Tipo de Nombramiento">
            <ChartHorasTipoNom tiposNombramiento={data.tiposNombramiento} nombramientos={data.nombramientos} />
          </Card>
          <Card title="🏛️ Horas de Nombramientos por Sede, Tipo y Año" full>
            {(() => {
              const anos = [...new Set(data.nombramientos.map(n => n.inicio ? n.inicio.slice(0, 4) : null).filter(Boolean))].sort()
              if (!anos.length) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos de nombramientos.</p>
              const matrix = {}
              data.nombramientos.forEach(n => { const anio = n.inicio ? n.inicio.slice(0, 4) : null; if (!anio) return; const uni = data.unidades.find(u => u.id === n.unidadId); const sedeId = uni?.sedeId || 0; const tipoId = n.tipoNombramientoId || 0; const h = parseFloat(n.horas || 0); if (!matrix[sedeId]) matrix[sedeId] = {}; if (!matrix[sedeId][anio]) matrix[sedeId][anio] = {}; matrix[sedeId][anio][tipoId] = (matrix[sedeId][anio][tipoId] || 0) + h })
              const sedeList = [...new Set(Object.keys(matrix).map(Number))].map((sid, i) => { const s = data.sedes.find(x => x.id === sid); return { id: sid, nombre: s?.nombre || 'Sin sede', color: CHART_COLORS[i % CHART_COLORS.length] } }).sort((a, b) => a.nombre.localeCompare(b.nombre))
              const totalPorAnio = anos.map(a => ({ a, tot: r2(sedeList.reduce((s, sed) => s + Object.values(matrix[sed.id]?.[a] || {}).reduce((ss, v) => ss + v, 0), 0)) }))
              const maxH = Math.max(...totalPorAnio.map(x => x.tot), 1)
              const totalGen = r2(totalPorAnio.reduce((s, x) => s + x.tot, 0))
              return (<div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, paddingTop: 8, marginBottom: 8 }}>{anos.map(a => { const tot = totalPorAnio.find(x => x.a === a)?.tot || 0; const barH = 140; const usedH = maxH > 0 ? Math.round((tot / maxH) * barH) : 0; return (<div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{Math.round(tot)}h</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '6px 6px 0 0', height: barH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>{[...sedeList].reverse().map(sed => { const sedTot = r2(Object.values(matrix[sed.id]?.[a] || {}).reduce((s, v) => s + v, 0)); const h = tot > 0 ? Math.round((sedTot / tot) * usedH) : 0; return <div key={sed.id} title={sed.nombre + ': ' + Math.round(sedTot) + 'h'} style={{ width: '100%', height: h, background: sed.color, minHeight: sedTot > 0 ? 2 : 0 }} /> })}</div><span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span></div>) })}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>{sedeList.map(s => (<div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} /><span style={{ color: '#555' }}>{s.nombre}</span></div>))}</div>
                <TablaColapsable><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Sede</th><th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Tipo de Nombramiento</th>{anos.map(a => <th key={a} style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{a}</th>)}<th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th></tr></thead><tbody>{sedeList.flatMap((sed, si) => { const tipoIds = [...new Set(Object.values(matrix[sed.id] || {}).flatMap(x => Object.keys(x).map(Number)))]; const tipoRows = tipoIds.map((tid, ti) => { const tipo = data.tiposNombramiento.find(t => t.id === tid); const totTipo = r2(anos.reduce((s, a) => s + (matrix[sed.id]?.[a]?.[tid] || 0), 0)); return (<tr key={sed.id + '-' + tid} style={{ borderBottom: '1px solid #f0f0f8', background: (si + ti) % 2 === 0 ? '#fff' : '#fafbff' }}>{ti === 0 && <td rowSpan={tipoIds.length} style={{ padding: '6px 8px', fontWeight: 700, color: sed.color, verticalAlign: 'middle', borderRight: '3px solid ' + sed.color + '55' }}>{sed.nombre}</td>}<td style={{ padding: '6px 8px', color: '#555' }}>{tipo?.nombre || 'Sin tipo'}</td>{anos.map(a => { const v = r2(matrix[sed.id]?.[a]?.[tid] || 0); return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', color: v > 0 ? '#333' : '#ddd', fontWeight: v > 0 ? 600 : 400 }}>{v > 0 ? v + 'h' : '—'}</td> })}<td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: sed.color }}>{totTipo}h</td></tr>) }); const sedTotRow = (<tr key={sed.id + '-tot'} style={{ background: sed.color + '18', borderTop: '2px solid ' + sed.color + '44' }}><td colSpan={2} style={{ padding: '5px 8px', fontWeight: 700, color: sed.color, fontSize: 11 }}>Subtotal {sed.nombre}</td>{anos.map(a => { const v = r2(Object.values(matrix[sed.id]?.[a] || {}).reduce((s, x) => s + x, 0)); return <td key={a} style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: sed.color }}>{v > 0 ? v + 'h' : '—'}</td> })}<td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: sed.color }}>{r2(anos.reduce((s, a) => s + Object.values(matrix[sed.id]?.[a] || {}).reduce((ss, x) => ss + x, 0), 0))}h</td></tr>); return [...tipoRows, sedTotRow] })}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td colSpan={2} style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>Total general</td>{anos.map(a => { const v = totalPorAnio.find(x => x.a === a)?.tot || 0; return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{v}h</td> })}<td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: NAVY }}>{totalGen}h</td></tr></tfoot></table></div></TablaColapsable>
              </div>)
            })()}
          </Card>
        </>}
        {(resumenSec === 'all' || resumenSec === 'tiempos') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>⏱️ Tiempos Docentes</span>
          </div>
          <Card title="⚙️ Horas por Tiempo Docente" full>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Horas por tiempo docente:</label>
              <input type="number" min="2" step="1" value={hxTD} onChange={e => saveHxTD(e.target.value)} style={{ ...inp, width: 90, textAlign: 'center', fontWeight: 700, fontSize: 15 }} />
              <span style={{ fontSize: 11, color: '#888' }}>Entero mayor a 1. Las horas activas por tipo de proyecto se dividen entre este valor para obtener los tiempos docentes.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>Filtrar por tipo de nombramiento:</span>
              <button onClick={() => setTipoNomTD([])} style={{ background: tipoNomTD.length === 0 ? TEAL : '#f0f4f8', color: tipoNomTD.length === 0 ? '#fff' : NAVY, border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Todos</button>
              {data.tiposNombramiento.map(t => { const k = String(t.id); const sel = tipoNomTD.includes(k); return (<button key={k} onClick={() => toggleTipoNomTD(k)} style={{ background: sel ? TEAL : '#f0f4f8', color: sel ? '#fff' : NAVY, border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>{t.nombre}</button>) })}
            </div>
          </Card>
          <Card title="📊 Tiempos Docentes por Tipo de Proyecto">
            <ChartTiemposDocentes tiposActividad={data.tiposActividad} proyectos={data.proyectos} nombramientos={data.nombramientos} hxTD={hxTD} tipoNomTD={tipoNomTD} />
          </Card>
          <Card title="📋 Tabla de Tiempos Docentes por Tipo de Proyecto" full>
            {(() => {
              const activosBase = data.nombramientos.filter(n => n.estado === 'Activo')
              const activos = tipoNomTD.length > 0 ? activosBase.filter(n => tipoNomTD.includes(String(n.tipoNombramientoId))) : activosBase
              const filas = data.tiposActividad.map((t, i) => { const ids = new Set(data.proyectos.filter(p => p.tipoId === t.id).map(p => p.id)); const h = r2(activos.filter(n => ids.has(n.proyectoId)).reduce((s, n) => s + nh(n.horas), 0)); return { ...t, horas: h, tiempos: r2(h / hxTD), color: CHART_COLORS[i % CHART_COLORS.length] } })
              const totH = r2(filas.reduce((s, f) => s + f.horas, 0)); const totTD = r2(filas.reduce((s, f) => s + f.tiempos, 0))
              if (!totH) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con proyecto asociado.</p>
              return (<TablaColapsable><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tipo de Proyecto</th><th style={{ textAlign: 'right', padding: '7px 10px', color: NAVY, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Horas activas</th><th style={{ textAlign: 'right', padding: '7px 10px', color: TEAL, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tiempos docentes (÷{hxTD}h)</th></tr></thead><tbody>{filas.map((f, i) => (<tr key={f.id} style={{ borderBottom: '1px solid #f0f0f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '7px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: 'inline-block' }} /><span style={{ fontWeight: 600, color: f.color }}>{f.nombre}</span></div></td><td style={{ textAlign: 'right', padding: '7px 10px', color: f.horas > 0 ? '#333' : '#ccc', fontWeight: f.horas > 0 ? 600 : 400 }}>{f.horas > 0 ? f.horas + 'h' : '—'}</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: f.tiempos > 0 ? TEAL : '#ccc' }}>{f.tiempos > 0 ? f.tiempos : '—'}</td></tr>))}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: NAVY }}>Total</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: NAVY }}>{totH}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: TEAL }}>{totTD}</td></tr></tfoot></table></TablaColapsable>)
            })()}
          </Card>
          <Card title="📊 Tiempos Docentes por Sede">
            <ChartTiemposDocentesSede sedes={data.sedes} unidades={data.unidades} nombramientos={data.nombramientos} hxTD={hxTD} tipoNomTD={tipoNomTD} />
          </Card>
          <Card title="📋 Tabla de Tiempos Docentes por Sede" full>
            {(() => {
              const unidSede = new Map(data.unidades.map(u => [u.id, u.sedeId]))
              const activosBase = data.nombramientos.filter(n => n.estado === 'Activo')
              const activos = tipoNomTD.length > 0 ? activosBase.filter(n => tipoNomTD.includes(String(n.tipoNombramientoId))) : activosBase
              const filas = data.sedes.map((s, i) => { const h = r2(activos.filter(n => unidSede.get(n.unidadId) === s.id).reduce((sum, n) => sum + nh(n.horas), 0)); return { ...s, horas: h, tiempos: r2(h / hxTD), color: CHART_COLORS[i % CHART_COLORS.length] } })
              const totH = r2(filas.reduce((s, f) => s + f.horas, 0)); const totTD = r2(filas.reduce((s, f) => s + f.tiempos, 0))
              if (!totH) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con sede asociada.</p>
              return (<TablaColapsable><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Sede</th><th style={{ textAlign: 'right', padding: '7px 10px', color: NAVY, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Horas activas</th><th style={{ textAlign: 'right', padding: '7px 10px', color: '#7c3aed', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tiempos docentes (÷{hxTD}h)</th></tr></thead><tbody>{filas.map((f, i) => (<tr key={f.id} style={{ borderBottom: '1px solid #f0f0f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '7px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: 'inline-block' }} /><span style={{ fontWeight: 600, color: f.color }}>{f.nombre}</span></div></td><td style={{ textAlign: 'right', padding: '7px 10px', color: f.horas > 0 ? '#333' : '#ccc', fontWeight: f.horas > 0 ? 600 : 400 }}>{f.horas > 0 ? f.horas + 'h' : '—'}</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: f.tiempos > 0 ? '#7c3aed' : '#ccc' }}>{f.tiempos > 0 ? f.tiempos : '—'}</td></tr>))}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: NAVY }}>Total</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: NAVY }}>{totH}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: '#7c3aed' }}>{totTD}</td></tr></tfoot></table></TablaColapsable>)
            })()}
          </Card>
          <Card title="📊 Tiempos Docentes por Unidad" full>
            <ChartTiemposDocentesUnidad unidades={data.unidades} nombramientos={data.nombramientos} hxTD={hxTD} tipoNomTD={tipoNomTD} />
          </Card>
          <Card title="📋 Tabla de Tiempos Docentes por Unidad" full>
            {(() => {
              const activosBase = data.nombramientos.filter(n => n.estado === 'Activo')
              const activos = tipoNomTD.length > 0 ? activosBase.filter(n => tipoNomTD.includes(String(n.tipoNombramientoId))) : activosBase
              const filas = data.unidades.map((u, i) => { const h = r2(activos.filter(n => n.unidadId === u.id).reduce((s, n) => s + nh(n.horas), 0)); return { ...u, horas: h, tiempos: r2(h / hxTD), color: CHART_COLORS[i % CHART_COLORS.length] } }).filter(f => f.horas > 0).sort((a, b) => b.horas - a.horas)
              const totH = r2(filas.reduce((s, f) => s + f.horas, 0)); const totTD = r2(filas.reduce((s, f) => s + f.tiempos, 0))
              if (!totH) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con unidad asociada.</p>
              return (<TablaColapsable><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Unidad</th><th style={{ textAlign: 'right', padding: '7px 10px', color: NAVY, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Horas activas</th><th style={{ textAlign: 'right', padding: '7px 10px', color: AMBER, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tiempos docentes (÷{hxTD}h)</th></tr></thead><tbody>{filas.map((f, i) => (<tr key={f.id} style={{ borderBottom: '1px solid #f0f0f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '7px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: 'inline-block' }} /><span style={{ fontWeight: 600, color: f.color }}>{f.nombre}</span>{f.codigo && <span style={{ fontSize: 10, color: '#aaa' }}>({f.codigo})</span>}</div></td><td style={{ textAlign: 'right', padding: '7px 10px', color: '#333', fontWeight: 600 }}>{f.horas}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: AMBER }}>{f.tiempos}</td></tr>))}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: NAVY }}>Total</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: NAVY }}>{totH}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: AMBER }}>{totTD}</td></tr></tfoot></table></TablaColapsable>)
            })()}
          </Card>
        </>}
        {(resumenSec === 'all' || resumenSec === 'profesores') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>👨‍🏫 Profesores</span>
          </div>
          <Card title="👨‍🏫 Cobertura de Profesores">
            {(() => { const conNom = new Set(data.nombramientos.filter(n => n.estado === 'Activo').map(n => n.profesorId)); const conAct = data.profesores.filter(p => conNom.has(p.id)).length; const sinAct = data.profesores.length - conAct; const pct = data.profesores.length > 0 ? Math.round((conAct / data.profesores.length) * 100) : 0; return (<div><div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><div style={{ flex: 1, background: '#dcfce7', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: GREEN }}>{conAct}</div><div style={{ fontSize: 10, color: GREEN, fontWeight: 600, marginTop: 2 }}>Con nombramiento activo</div></div><div style={{ flex: 1, background: '#f3f4f6', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: '#64748b' }}>{sinAct}</div><div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 2 }}>Sin nombramiento activo</div></div></div><div style={{ background: '#e8e8f0', borderRadius: 20, height: 8 }}><div style={{ width: pct + '%', background: GREEN, height: '100%', borderRadius: 20 }} /></div><div style={{ fontSize: 10, color: '#888', marginTop: 4, textAlign: 'right' }}>{pct}% con nombramiento activo</div></div>) })()}
          </Card>
          <Card title="🏛️ Top Unidades por Proyectos Activos">
            {(() => { const act = data.proyectos.filter(p => p.estado === 'Activo'); const pu = data.unidades.map(u => ({ ...u, cnt: act.filter(p => p.unidadId === u.id).length })).filter(u => u.cnt > 0).sort((a, b) => b.cnt - a.cnt).slice(0, 8); const mx = Math.max(...pu.map(u => u.cnt), 1); return pu.length === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin datos.</p> : (<div>{pu.map((u, i) => (<div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}><div style={{ minWidth: 56, fontSize: 10, fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.codigo}</div><div style={{ flex: 1, background: '#f0f4f8', borderRadius: 20, height: 9 }}><div style={{ width: Math.round((u.cnt / mx) * 100) + '%', background: CHART_COLORS[i % CHART_COLORS.length], height: '100%', borderRadius: 20 }} /></div><div style={{ minWidth: 20, textAlign: 'right', fontSize: 12, fontWeight: 700, color: NAVY }}>{u.cnt}</div></div>))}</div>) })()}
          </Card>
          <ProfPorAnioCard noms={data.nombramientos} profesores={data.profesores} />
          <ProfPorUnidadAnioCard noms={data.nombramientos} unidades={data.unidades} profesores={data.profesores} />
          <ProfPorTipoProyectoAnioCard noms={data.nombramientos} unidades={data.unidades} tiposActividad={data.tiposActividad} proyectos={data.proyectos} profesores={data.profesores} />
        </>}
        {(resumenSec === 'all' || resumenSec === 'presupuesto') && <>
          <div style={{ gridColumn: '1/-1', borderBottom: '2px solid #e0e8f0', paddingBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: .6 }}>💰 Presupuesto</span>
          </div>
          <Card title="💰 Presupuesto por Año y Cuenta" full>
            {totalPresup === 0 ? <p style={{ fontSize: 12, color: '#bbb', margin: 0, fontStyle: 'italic' }}>Sin presupuesto. Ingresá datos en la pestaña Presupuesto.</p> : (
              <div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  {porCuenta.map(c => (<div key={c.cat} style={{ flex: 1, minWidth: 120, background: '#f8f9ff', borderRadius: 10, padding: '10px 14px', borderLeft: '4px solid ' + c.color }}><div style={{ fontSize: 11, fontWeight: 700, color: c.color, marginBottom: 3 }}>{c.cat}</div><div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{fmtMoney(c.tot)}</div><div style={{ fontSize: 10, color: '#888' }}>{totalPresup > 0 ? Math.round((c.tot / totalPresup) * 100) : 0}%</div></div>))}
                  <div style={{ flex: 1, minWidth: 120, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', borderLeft: '4px solid ' + GREEN }}><div style={{ fontSize: 11, fontWeight: 700, color: GREEN, marginBottom: 3 }}>Total</div><div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{fmtMoney(totalPresup)}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 180 }}><SectionTitle>Por cuenta</SectionTitle><DonutChart segments={porCuenta.filter(c => c.tot > 0).map(c => ({ label: c.cat, value: c.tot, color: c.color }))} /></div>
                  <div style={{ flex: 2, minWidth: 0, overflowX: 'auto' }}><SectionTitle>Por año (apilado)</SectionTitle>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, paddingTop: 8 }}>
                      {allAnios.map(a => { const totA = r2(porCuenta.reduce((s, c) => s + (c.porAnio.find(x => x.anio === a)?.val || 0), 0)); const pH = maxBarVal > 0 ? Math.round((totA / maxBarVal) * 120) : 0; return (<div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 9, fontWeight: 700, color: NAVY }}>{fmtMoney(totA)}</span><div style={{ width: '100%', background: '#f0f4f8', borderRadius: '4px 4px 0 0', height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>{[...porCuenta].reverse().map(c => { const val = c.porAnio.find(x => x.anio === a)?.val || 0; const h = totA > 0 ? Math.round((val / totA) * pH) : 0; return <div key={c.cat} title={c.cat + ': ' + fmtMoney(val)} style={{ width: '100%', height: h, background: c.color, minHeight: val > 0 ? 2 : 0 }} /> })}</div><span style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{a}</span></div>) })}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>{porCuenta.map(c => (<div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: 'inline-block' }} /><span style={{ color: '#555' }}>{c.cat}</span></div>))}</div>
                  </div>
                </div>
                <SectionTitle>Tabla detalle</SectionTitle>
                <TablaColapsable><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Cuenta</th>{allAnios.map(a => <th key={a} style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>{a}</th>)}<th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Total</th><th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>%</th></tr></thead><tbody>{porCuenta.map((c, ci) => (<tr key={c.cat} style={{ borderBottom: '1px solid #f0f0f8', background: ci % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '6px 8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: 'inline-block' }} /><span style={{ fontWeight: 700, color: c.color }}>{c.cat}</span></div></td>{c.porAnio.map(({ anio, val }) => (<td key={anio} style={{ textAlign: 'right', padding: '6px 8px', color: val > 0 ? '#333' : '#ccc' }}>{val > 0 ? fmtMoney(val) : '—'}</td>))}<td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: c.color }}>{fmtMoney(c.tot)}</td><td style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, color: c.color, fontWeight: 700 }}>{totalPresup > 0 ? Math.round((c.tot / totalPresup) * 100) : 0}%</td></tr>))}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '6px 8px', fontWeight: 700, color: NAVY }}>Total</td>{allAnios.map(a => { const v = r2(porCuenta.reduce((s, c) => s + (c.porAnio.find(x => x.anio === a)?.val || 0), 0)); return <td key={a} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: GREEN }}>{fmtMoney(v)}</td> })}<td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: GREEN }}>{fmtMoney(totalPresup)}</td><td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: GREEN }}>100%</td></tr></tfoot></table></div></TablaColapsable>
              </div>
            )}
          </Card>
        </>}
        {(resumenSec === 'all' || resumenSec === 'semestres') && (
          <ComparativaSemestres nombramientos={data.nombramientos} today={today} />
        )}
      </div>
    </div>
  )
}
