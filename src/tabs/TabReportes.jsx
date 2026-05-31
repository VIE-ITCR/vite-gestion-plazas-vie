import { useState, useEffect, useRef, useMemo } from 'react'
import Chart from 'chart.js/auto'
import * as XLSX from 'xlsx'
import { NAVY, BLUE, TEAL, GREEN, RED, AMBER, CHART_COLORS, CATS } from '../constants'
import { nh, r2, fmtD, fmtDias, getAnios, exportCSV, exportXLSX } from '../utils'

const REPORT_GRUPOS = [
  { label: 'Plazas y Horas', ids: ['plazas', 'plazas_sin_nom', 'horas_cf'] },
  { label: 'Profesores', ids: ['profesores', 'prof_unidad', 'prof_tiempo'] },
  { label: 'Proyectos', ids: ['proyectos', 'proy_vencer', 'proy_sin_nom', 'proy_sede_anio_tipo'] },
  { label: 'Nombramientos', ids: ['nombramientos', 'nom_estado', 'nom_tipo', 'nom_fecha', 'nom_vencer', 'nom_mes', 'nom_profesor'] },
  { label: 'Presupuesto', ids: ['presupuesto', 'presupuesto_anio', 'presupuesto_unidad'] },
  { label: 'Cruzados', ids: ['cruce_prof_proy', 'cruce_unidad', 'resumen_ejecutivo'] },
  { label: 'Fuentes', ids: ['nom_fuente', 'proy_fuente_anio', 'proy_fuente_anio_tipo'] },
  { label: 'Vinculación', ids: ['nom_vinc', 'proy_vinc_anio', 'proy_vinc_anio_tipo'] },
  { label: 'Tiempos Docentes', ids: ['tiempos_docentes'] },
]

const inp = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #e0e0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }

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
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw} TD (${horas[ctx.dataIndex]}h)` } } }, scales: { x: { beginAtZero: true } } }
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
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw} TD (${horas[ctx.dataIndex]}h)` } } }, scales: { x: { beginAtZero: true } } }
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
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw} TD (${horas[ctx.dataIndex]}h)` } } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [unidades, nombramientos, hxTD, tipoNomTD])
  return <div style={{ overflowX: 'auto' }}><div style={{ position: 'relative', minWidth: 280, height: 220 }}><canvas ref={canvasRef} /></div></div>
}

export function TabReportes({ data, presupuestos, gP, gPl, gPy, gT, gTN, gU, gSede, gVerif, gFuente, gVin, gGestor, gVig, hUsadas, totalH, asigH, a30, a60, a90, dU, totalCat, totalProyecto, today }) {
  const [activeRep, setActiveRep] = useState(() => { try { return localStorage.getItem('vie_activeRep') || 'plazas' } catch { return 'plazas' } })
  const [globalFiltros, setGlobalFiltros] = useState({})
  const [colFiltros, setColFiltros] = useState({})
  const [paramValues, setParamValues] = useState({})
  const [expandedGrupos, setExpandedGrupos] = useState(() => { const init = {}; REPORT_GRUPOS.forEach(g => { init[g.label] = g.ids.includes(activeRep) }); return init })
  const [hxTDRep, setHxTDRep] = useState(() => { const v = parseInt(localStorage.getItem('vie_hxtd') || '40'); return v > 1 ? v : 40 })
  const [tipoNomTDRep, setTipoNomTDRep] = useState([])
  const proyectosContab = data.proyectos.filter(p => new Set(data.tiposActividad.filter(t => (t.contabilizar || 'Sí') !== 'No').map(t => t.id)).has(p.tipoId))

  useEffect(() => { try { localStorage.setItem('vie_activeRep', activeRep) } catch {} }, [activeRep])

  const saveHxTDRep = v => { const n = parseInt(v); if (n > 1) { setHxTDRep(n); localStorage.setItem('vie_hxtd', String(n)) } }
  const toggleTipoNomTDRep = k => setTipoNomTDRep(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])

  const REPORTES_DEF = [
    { id: 'plazas', titulo: 'Plazas', icon: '📋', headers: ['Código', 'CF', 'Vigencia', 'Actividad', 'Total h', 'En uso', 'Libres', '% Ocupación'], getRows: () => data.plazas.map(p => { const u = hUsadas(p.id); const pct = p.horasSemanales > 0 ? Math.round((u / p.horasSemanales) * 100) : 0; return [p.codigo, p.cf, gVig(p.vigenciaId)?.vigencia || '-', p.actividad, p.horasSemanales, u, r2(p.horasSemanales - u), pct + '%'] }) },
    { id: 'plazas_sin_nom', titulo: 'Plazas sin Nombramiento Activo', icon: '📋', headers: ['Código', 'CF', 'Vigencia', 'Actividad', 'Total h'], getRows: () => data.plazas.filter(p => !data.nombramientos.some(n => n.plazaId === p.id && n.estado === 'Activo')).map(p => [p.codigo, p.cf, gVig(p.vigenciaId)?.vigencia || '-', p.actividad, p.horasSemanales]) },
    { id: 'horas_cf', titulo: 'Horas por CF y Actividad', icon: '⏱️', headers: ['CF', 'Actividad', 'Plazas', 'Total h', 'En uso', 'Libres', '% Ocupación'], getRows: () => { const cfs = [...new Set(data.plazas.map(p => p.cf))]; const acts = [...new Set(data.plazas.map(p => p.actividad))]; const rows = []; cfs.forEach(cf => acts.forEach(act => { const plzs = data.plazas.filter(p => p.cf === cf && p.actividad === act); if (!plzs.length) return; const tot = r2(plzs.reduce((s, p) => s + nh(p.horasSemanales), 0)); const uso = r2(plzs.reduce((s, p) => s + hUsadas(p.id), 0)); rows.push([cf, act, plzs.length, tot, uso, r2(tot - uso), tot > 0 ? Math.round((uso / tot) * 100) + '%' : '0%']) })); return rows } },
    { id: 'profesores', titulo: 'Profesores', icon: '👨‍🏫', headers: ['Nombre', 'Cédula', 'Email', 'Unidades', 'Horas activas', 'Nombramientos activos', 'Proyectos activos'], getRows: () => data.profesores.map(p => { const nA = data.nombramientos.filter(n => n.profesorId === p.id && n.estado === 'Activo'); return [p.nombre, p.cedula || '', p.email || '', (p.unidades || []).map(u => data.unidades.find(x => x.id === u)?.codigo || '').filter(Boolean).join(', '), r2(nA.reduce((s, n) => s + nh(n.horas), 0)), nA.length, new Set(nA.map(n => n.proyectoId)).size] }) },
    { id: 'prof_unidad', titulo: 'Profesores por Unidad', icon: '🏛️', headers: ['Unidad', 'Código', 'Profesores', 'Horas activas', 'Nombramientos activos'], getRows: () => data.unidades.map(u => { const profs = data.profesores.filter(p => (p.unidades || []).includes(u.id)); const noms2 = data.nombramientos.filter(n => profs.some(p => p.id === n.profesorId) && n.estado === 'Activo'); return [u.nombre, u.codigo, profs.length, r2(noms2.reduce((s, n) => s + nh(n.horas), 0)), noms2.length] }).filter(r => r[2] > 0) },
    { id: 'prof_tiempo', titulo: 'Tiempo Acumulado por Profesor', icon: '⏳', headers: ['Nombre', 'Unidades', 'Días totales', 'Tiempo total', 'Días cadena', 'Cadena activa', 'Horas activas'], getRows: () => { const hoyMs = today.getTime(); return data.profesores.map(p => { const noms2 = data.nombramientos.filter(n => n.profesorId === p.id && n.inicio && n.fin); const ivs = noms2.map(n => { const ini = new Date(n.inicio).getTime(), fin = Math.min(new Date(n.fin).getTime() + 86400000, hoyMs); return fin > ini ? [ini, fin] : null }).filter(Boolean).sort((a, b) => a[0] - b[0]); if (!ivs.length) return null; let m = [[...ivs[0]]]; for (let i = 1; i < ivs.length; i++) { const l = m[m.length - 1]; if (ivs[i][0] <= l[1]) l[1] = Math.max(l[1], ivs[i][1]); else m.push([...ivs[i]]) } const dias = m.reduce((s, [a, b]) => s + Math.round((b - a) / 86400000), 0); const ivA = noms2.filter(n => (new Date(n.fin).getTime() + 86400000) >= hoyMs).map(n => [new Date(n.inicio).getTime(), Math.min(new Date(n.fin).getTime() + 86400000, hoyMs)]).sort((a, b) => a[0] - b[0]); let cadena = null; if (ivA.length) { let c = [ivA[ivA.length - 1]]; for (let i = ivA.length - 2; i >= 0; i--) { if (c[0][0] - ivA[i][1] <= 86400000 * 2) c.unshift(ivA[i]); else break } cadena = Math.round((hoyMs - c[0][0]) / 86400000) } const hA = r2(data.nombramientos.filter(n => n.profesorId === p.id && n.estado === 'Activo').reduce((s, n) => s + nh(n.horas), 0)); const uCods = (p.unidades || []).map(uid2 => data.unidades.find(u => u.id === uid2)?.codigo).filter(Boolean).join(', '); return [p.nombre, uCods, dias, fmtDias(dias), cadena || 0, cadena ? fmtDias(cadena) : 'Sin cadena', hA] }).filter(Boolean).filter(r => r[2] > 0).sort((a, b) => b[2] - a[2]) } },
    { id: 'proyectos', titulo: 'Proyectos', icon: '📁', headers: ['Código', 'Nombre', 'Tipo', 'Subcategoría', 'Sede', 'Unidad', 'Inicio', 'Fin', 'Estado', 'Horas activas', 'Nombramientos activos'], getRows: () => data.proyectos.map(p => { const uni = gU(p.unidadId); const nA = data.nombramientos.filter(n => n.proyectoId === p.id && n.estado === 'Activo'); return [p.codigo || '-', p.nombre, gT(p.tipoId)?.nombre || '-', p.subcategoria || '-', gSede(p.sedeId)?.nombre || '-', uni ? uni.nombre || uni.codigo || '-' : '-', fmtD(p.inicio), fmtD(p.fin), p.estado, r2(nA.reduce((s, n) => s + nh(n.horas), 0)), nA.length] }) },
    { id: 'proy_vencer', titulo: 'Proyectos por Vencer (≤365d)', icon: '⚠️', headers: ['Nombre', 'Tipo', 'Estado', 'Fin', 'Días restantes', 'Horas activas', 'Nombramientos'], getRows: () => data.proyectos.filter(p => p.fin && dU(p.fin) >= 0 && dU(p.fin) <= 365).map(p => { const nA = data.nombramientos.filter(n => n.proyectoId === p.id && n.estado === 'Activo'); return [p.nombre, gT(p.tipoId)?.nombre || '-', p.estado, fmtD(p.fin), dU(p.fin), r2(nA.reduce((s, n) => s + nh(n.horas), 0)), nA.length] }).sort((a, b) => a[4] - b[4]) },
    { id: 'proy_sin_nom', titulo: 'Proyectos sin Nombramiento Activo', icon: '📁', headers: ['Nombre', 'Tipo', 'Estado', 'Inicio', 'Fin'], getRows: () => data.proyectos.filter(p => !data.nombramientos.some(n => n.proyectoId === p.id && n.estado === 'Activo')).map(p => [p.nombre, gT(p.tipoId)?.nombre || '-', p.estado, fmtD(p.inicio), fmtD(p.fin)]) },
    { id: 'proy_sede_anio_tipo', titulo: 'Proyectos por Sede, Año y Tipo', icon: '📍', headers: ['Sede', 'Año', 'Tipo', 'Proyectos', 'Activos', 'Finalizados', 'Por iniciar', 'Horas activas'], getRows: () => { const rows = []; const anios = [...new Set(data.proyectos.filter(p => p.inicio).map(p => p.inicio.split('-')[0]))].sort(); data.sedes.forEach(sede => { anios.forEach(anio => { data.tiposActividad.forEach(tipo => { const ps = data.proyectos.filter(p => p.sedeId === sede.id && p.inicio && p.inicio.split('-')[0] === anio && p.tipoId === tipo.id); if (!ps.length) return; const hA = r2(ps.reduce((s, p) => { const nA = data.nombramientos.filter(n => n.proyectoId === p.id && n.estado === 'Activo'); return r2(s + r2(nA.reduce((a, n) => a + nh(n.horas), 0))) }, 0)); rows.push([sede.nombre, anio, tipo.nombre, ps.length, ps.filter(p => p.estado === 'Activo').length, ps.filter(p => p.estado === 'Finalizado').length, ps.filter(p => p.estado === 'Por iniciar').length, hA]) }) }) }); return rows.length ? rows : [['Sin datos', '', '', '', '', '', '', '']] } },
    { id: 'nombramientos', titulo: 'Nombramientos', icon: '📝', headers: ['Plaza', 'CF', 'Profesor', 'Unidad', 'Proyecto', 'Tipo Nomb.', 'Horas', '%', 'Inicio', 'Fin', 'Días', 'Estado'], getRows: () => data.nombramientos.map(n => { const pl = gPl(n.plazaId), pr = gP(n.profesorId), py = gPy(n.proyectoId), tn = gTN(n.tipoNombramientoId), uni = gU(n.unidadId); const dias = n.inicio && n.fin ? Math.round((new Date(n.fin) - new Date(n.inicio)) / 86400000) + 1 : '-'; return [pl?.codigo || '-', pl?.cf || '-', pr?.nombre || '-', uni?.codigo || '-', py?.nombre || '-', tn?.nombre || '-', n.horas, Math.round(parseFloat(n.horas || 0) / 40 * 100), fmtD(n.inicio), fmtD(n.fin), dias, n.estado] }) },
    { id: 'nom_estado', titulo: 'Nombramientos por Estado', icon: '📊', headers: ['Estado', 'Cantidad', 'Horas totales', 'Profesores únicos', 'Proyectos únicos', 'Plazas únicas'], getRows: () => (data.nombramiento_estado || []).map(e => e.estado).map(est => { const noms2 = data.nombramientos.filter(n => n.estado === est); return [est, noms2.length, r2(noms2.reduce((s, n) => s + nh(n.horas), 0)), new Set(noms2.map(n => n.profesorId)).size, new Set(noms2.map(n => n.proyectoId)).size, new Set(noms2.map(n => n.plazaId)).size] }) },
    { id: 'nom_tipo', titulo: 'Nombramientos por Tipo', icon: '📄', headers: ['Tipo', 'Cantidad', 'Horas totales', 'Profesores únicos', '% del total'], getRows: () => { const total = data.nombramientos.filter(n => n.estado === 'Activo').length; return data.tiposNombramiento.map(t => { const noms2 = data.nombramientos.filter(n => n.tipoNombramientoId === t.id && n.estado === 'Activo'); return [t.nombre, noms2.length, r2(noms2.reduce((s, n) => s + nh(n.horas), 0)), new Set(noms2.map(n => n.profesorId)).size, total > 0 ? Math.round((noms2.length / total) * 100) + '%' : '0%'] }) } },
    {
      id: 'nom_fecha', titulo: 'Nombramientos Activos Vencidos a una Fecha', icon: '📅', params: [{ key: 'fecha', label: 'Vencidos al', type: 'date' }],
      headers: ['Profesor', 'Plaza', 'CF', 'Proyecto', 'Tipo Nombramiento', 'Verificación', 'Horas', '%', 'Fin', 'Días restantes', 'Estado'],
      getRows: (p = {}) => { const fecha = p.fecha || ''; if (!fecha) return []; return data.nombramientos.filter(n => n.estado === 'Activo' && n.fin && n.fin <= fecha).map(n => { const d = dU(n.fin); return [gP(n.profesorId)?.nombre || '-', gPl(n.plazaId)?.codigo || '-', gPl(n.plazaId)?.cf || '-', gPy(n.proyectoId)?.nombre || '-', gTN(n.tipoNombramientoId)?.nombre || '-', gVerif(n.verificacionId)?.nombre || '-', n.horas, Math.round(parseFloat(n.horas || 0) / 40 * 100), fmtD(n.fin), d >= 0 ? d + 'd' : 'Vencido', n.estado] }).sort((a, b) => a[9] - b[9]) },
      getResumen: (p = {}) => { const fecha = p.fecha || ''; if (!fecha) return []; const internasIds = new Set(data.plazas.filter(x => x.interno !== 'No').map(x => x.id)); const noms = data.nombramientos.filter(n => n.estado === 'Activo' && n.fin && n.fin <= fecha); const map = {}; noms.forEach(n => { if (!internasIds.has(n.plazaId)) return; const tipo = gTN(n.tipoNombramientoId)?.nombre || 'Sin tipo'; if (!map[tipo]) map[tipo] = { tipo, count: 0, horas: 0 }; map[tipo].count++; map[tipo].horas = r2(map[tipo].horas + nh(n.horas)) }); return Object.values(map).filter(r => r.horas > 0).sort((a, b) => b.horas - a.horas) },
      getVerifResumen: (p = {}) => { const fecha = p.fecha || ''; if (!fecha) return []; const noms = data.nombramientos.filter(n => n.estado === 'Activo' && n.fin && n.fin <= fecha); const map = {}; noms.forEach(n => { const v = gVerif(n.verificacionId); const key = v ? String(v.id) : '__sin__'; if (!map[key]) map[key] = { nombre: v?.nombre || 'Sin verificación', color: v?.color || '#cbd5e1', count: 0, horas: 0 }; map[key].count++; map[key].horas = r2(map[key].horas + nh(n.horas)) }); return Object.values(map).sort((a, b) => b.horas - a.horas) },
      getCfResumen: (p = {}) => { const fecha = p.fecha || ''; if (!fecha) return []; const internasIds = new Set(data.plazas.filter(x => x.interno !== 'No').map(x => x.id)); const noms = data.nombramientos.filter(n => n.estado === 'Activo' && n.fin && n.fin <= fecha); const map = {}; data.plazas.filter(x => x.interno !== 'No').forEach(pl => { const cf = pl.cf || 'Sin CF'; if (!map[cf]) map[cf] = { cf, count: 0, horas: 0 }; const libre = r2(nh(pl.horasSemanales) - nh(hUsadas(pl.id))); if (libre > 0) map[cf].horas = r2(map[cf].horas + libre) }); noms.forEach(n => { if (!internasIds.has(n.plazaId)) return; const cf = gPl(n.plazaId)?.cf || 'Sin CF'; if (!map[cf]) map[cf] = { cf, count: 0, horas: 0 }; map[cf].count++; map[cf].horas = r2(map[cf].horas + nh(n.horas)) }); return Object.values(map).filter(r => r.horas > 0).sort((a, b) => b.horas - a.horas) },
      getPorIniciarResumen: () => { const noms = data.nombramientos.filter(n => n.estado === 'Por iniciar'); return { count: noms.length, horas: r2(noms.reduce((s, n) => s + nh(n.horas), 0)) } }
    },
    { id: 'nom_vencer', titulo: 'Nombramientos que Vencen ≤90d', icon: '🔔', headers: ['Profesor', 'Plaza', 'CF', 'Proyecto', 'Horas', '%', 'Fin', 'Días restantes', 'Semáforo'], getRows: () => data.nombramientos.filter(n => n.estado === 'Activo' && n.fin && dU(n.fin) >= 0 && dU(n.fin) <= 90).map(n => { const d = dU(n.fin); return [gP(n.profesorId)?.nombre || '-', gPl(n.plazaId)?.codigo || '-', gPl(n.plazaId)?.cf || '-', gPy(n.proyectoId)?.nombre || '-', n.horas, Math.round(parseFloat(n.horas || 0) / 40 * 100), fmtD(n.fin), d, d <= 30 ? '🔴 Crítico' : d <= 60 ? '🟡 Alerta' : '🟠 Atención'] }).sort((a, b) => a[7] - b[7]) },
    { id: 'nom_mes', titulo: 'Vencimientos por Mes', icon: '📅', headers: ['Año', 'Mes', 'Cantidad', 'Horas totales', 'Profesores únicos'], getRows: () => { const map = {}; data.nombramientos.filter(n => n.estado === 'Activo' && n.fin).forEach(n => { const [y, m] = n.fin.split('-'); const k = y + '-' + m; if (!map[k]) map[k] = { y, m, count: 0, horas: 0, profs: new Set() }; map[k].count++; map[k].horas = r2(map[k].horas + nh(n.horas)); map[k].profs.add(n.profesorId) }); return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => [v.y, v.m, v.count, v.horas, v.profs.size]) } },
    {
      id: 'nom_profesor', titulo: 'Nombramientos por Profesor', icon: '👨‍🏫', params: [{ key: 'minHoras', label: 'Cantidad igual o mayor de horas asignadas', type: 'text', placeholder: '20' }],
      headers: ['Profesor', 'Cédula', 'Tipo Nombramiento', 'Noms. activos', 'Horas'],
      getRows: () => { const map = {}; data.nombramientos.filter(n => n.estado === 'Activo').forEach(n => { const prof = gP(n.profesorId); const pNom = prof?.nombre || 'Sin profesor'; const pCed = prof?.cedula || '-'; const tipo = gTN(n.tipoNombramientoId)?.nombre || 'Sin tipo'; if (!map[pNom]) map[pNom] = { nombre: pNom, cedula: pCed, tipos: {}, total: 0, count: 0 }; if (!map[pNom].tipos[tipo]) map[pNom].tipos[tipo] = { count: 0, horas: 0 }; map[pNom].tipos[tipo].count++; map[pNom].tipos[tipo].horas = r2(map[pNom].tipos[tipo].horas + nh(n.horas)); map[pNom].total = r2(map[pNom].total + nh(n.horas)); map[pNom].count++ }); const rows = []; Object.values(map).sort((a, b) => b.total - a.total).forEach(p => { Object.entries(p.tipos).sort((a, b) => b[1].horas - a[1].horas).forEach(([tipo, t]) => { rows.push([p.nombre, p.cedula, tipo, t.count, t.horas]) }); if (Object.keys(p.tipos).length > 1) rows.push(['→ Total ' + p.nombre, p.cedula, '(todos los tipos)', p.count, p.total]) }); return rows },
      getResumenFromRows: (rows, p = {}) => { const minH = parseFloat(p.minHoras) || 20; const map = {}; rows.filter(r => !String(r[0] || '').startsWith('→')).forEach(r => { const nombre = r[0]; if (!map[nombre]) map[nombre] = { tipo: nombre, count: 0, horas: 0 }; map[nombre].horas = r2(map[nombre].horas + (parseFloat(r[4]) || 0)); map[nombre].count += parseInt(r[3]) || 0 }); return Object.values(map).filter(r => r.horas >= minH).sort((a, b) => b.horas - a.horas) }
    },
    { id: 'presupuesto', titulo: 'Presupuesto por Proyecto', icon: '💰', headers: ['Proyecto', 'Tipo', 'Estado', 'Inicio', 'Fin', ...CATS, 'Total'], getRows: () => data.proyectos.map(p => { const anios = getAnios(p); const porCat = CATS.map(cat => r2(anios.reduce((s, a) => s + totalCat(p.id, a, cat.toLowerCase()), 0))); return [p.nombre, gT(p.tipoId)?.nombre || '-', p.estado, fmtD(p.inicio), fmtD(p.fin), ...porCat, r2(porCat.reduce((s, v) => s + v, 0))] }) },
    { id: 'presupuesto_anio', titulo: 'Presupuesto por Año y Cuenta', icon: '💰', headers: ['Año', ...CATS, 'Total'], getRows: () => { const allAnios = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b); return allAnios.map(a => { const porCat = CATS.map(cat => r2(data.proyectos.reduce((s, p) => s + totalCat(p.id, a, cat.toLowerCase()), 0))); return [a, ...porCat, r2(porCat.reduce((s, v) => s + v, 0))] }) } },
    { id: 'presupuesto_unidad', titulo: 'Presupuesto por Unidad', icon: '🏛️', headers: ['Unidad', 'Código', 'Proyectos', 'Presupuesto Total', '% del Total'], getRows: () => { const tot = data.proyectos.reduce((s, p) => s + totalProyecto(p.id, getAnios(p)), 0); return data.unidades.map(u => { const pyU = data.proyectos.filter(p => p.unidadId === u.id); const pT = pyU.reduce((s, p) => s + totalProyecto(p.id, getAnios(p)), 0); return [u.nombre, u.codigo, pyU.length, pT, tot > 0 ? Math.round((pT / tot) * 100) + '%' : '0%'] }).filter(r => r[3] > 0).sort((a, b) => b[3] - a[3]) } },
    { id: 'cruce_prof_proy', titulo: 'Profesor × Proyecto × Período', icon: '🔀', headers: ['Profesor', 'Unidad', 'Proyecto', 'Tipo Proyecto', 'Plaza', 'CF', 'Tipo Nomb.', 'Horas', '%', 'Inicio', 'Fin', 'Días', 'Estado'], getRows: () => data.nombramientos.map(n => { const pr = gP(n.profesorId), pl = gPl(n.plazaId), py = gPy(n.proyectoId), tn = gTN(n.tipoNombramientoId), uni = gU(n.unidadId); const dias = n.inicio && n.fin ? Math.round((new Date(n.fin) - new Date(n.inicio)) / 86400000) + 1 : '-'; return [pr?.nombre || '-', uni?.codigo || '-', py?.nombre || '-', gT(py?.tipoId)?.nombre || '-', pl?.codigo || '-', pl?.cf || '-', tn?.nombre || '-', n.horas, Math.round(parseFloat(n.horas || 0) / 40 * 100), fmtD(n.inicio), fmtD(n.fin), dias, n.estado] }) },
    { id: 'cruce_unidad', titulo: 'Unidad × Plazas × Nombramientos', icon: '🏛️', headers: ['Unidad', 'Código', 'Profesores', 'Plazas únicas', 'Horas activas', 'Nombr. activos', 'Nombr. totales', 'Proyectos activos'], getRows: () => data.unidades.map(u => { const profs = data.profesores.filter(p => (p.unidades || []).includes(u.id)); const nomsU = data.nombramientos.filter(n => n.unidadId === u.id); const nA = nomsU.filter(n => n.estado === 'Activo'); return [u.nombre, u.codigo, profs.length, new Set(nA.map(n => n.plazaId)).size, nA.reduce((s, n) => s + nh(n.horas), 0), nA.length, nomsU.length, new Set(nA.map(n => n.proyectoId)).size] }).filter(r => r[2] > 0 || r[5] > 0) },
    { id: 'resumen_ejecutivo', titulo: 'Resumen Ejecutivo', icon: '📊', headers: ['Indicador', 'Valor'], getRows: () => { const nA = data.nombramientos.filter(n => n.estado === 'Activo'); const totPres = data.proyectos.reduce((s, p) => s + totalProyecto(p.id, getAnios(p)), 0); return [['Total de plazas', data.plazas.length], ['Horas semanales totales', totalH], ['Horas asignadas', asigH], ['Horas libres', r2(totalH - asigH)], ['% Ocupación', totalH > 0 ? Math.round((asigH / totalH) * 100) + '%' : '0%'], ['Total profesores', data.profesores.length], ['Profesores con nombramiento activo', new Set(nA.map(n => n.profesorId)).size], ['Total proyectos', data.proyectos.length], ['Proyectos activos', data.proyectos.filter(p => p.estado === 'Activo').length], ['Proyectos que vencen este año', data.proyectos.filter(p => p.fin && Number(p.fin.split('-')[0]) === today.getFullYear()).length], ['Nombramientos activos', nA.length], ['Nombramientos por iniciar', data.nombramientos.filter(n => n.estado === 'Por iniciar').length], ['Nombramientos finalizados', data.nombramientos.filter(n => n.estado === 'Finalizado').length], ['Alertas críticas ≤30d', a30.length], ['Alertas 31-60d', a60.length], ['Alertas 61-90d', a90.length], ['Presupuesto total', totPres]] } },
    {
      id: 'nom_fuente', titulo: 'Nombramientos Activos por Fuente', icon: '🔗', headers: ['Fuente', 'Profesor', 'Plaza', 'CF', 'Proyecto', 'Tipo Nombramiento', 'Horas', 'Fin', 'Días restantes', 'Estado'],
      getRows: () => { const tcIds = new Set(data.tiposActividad.filter(t => (t.contabilizar || 'Sí') !== 'No').map(t => t.id)); const pyContabIds = new Set(data.proyectos.filter(p => tcIds.has(p.tipoId)).map(p => p.id)); return data.nombramientos.filter(n => n.estado === 'Activo' && pyContabIds.has(n.proyectoId)).map(n => { const py = gPy(n.proyectoId); const fuente = gFuente(py?.fuenteId)?.nombre || 'Sin fuente'; const d = n.fin ? dU(n.fin) : ''; return [fuente, gP(n.profesorId)?.nombre || '-', gPl(n.plazaId)?.codigo || '-', gPl(n.plazaId)?.cf || '-', py?.nombre || '-', gTN(n.tipoNombramientoId)?.nombre || '-', n.horas, n.fin ? fmtD(n.fin) : '-', typeof d === 'number' ? d + 'd' : '-', n.estado] }).sort((a, b) => a[0].localeCompare(b[0])) },
      getResumen: () => { const tcIds = new Set(data.tiposActividad.filter(t => (t.contabilizar || 'Sí') !== 'No').map(t => t.id)); const pyContabIds = new Set(data.proyectos.filter(p => tcIds.has(p.tipoId)).map(p => p.id)); const map = {}; data.nombramientos.filter(n => n.estado === 'Activo' && pyContabIds.has(n.proyectoId)).forEach(n => { const py = gPy(n.proyectoId); const fuente = gFuente(py?.fuenteId)?.nombre || 'Sin fuente'; if (!map[fuente]) map[fuente] = { tipo: fuente, count: 0, horas: 0 }; map[fuente].count++; map[fuente].horas = r2(map[fuente].horas + nh(n.horas)) }); return Object.values(map).sort((a, b) => b.horas - a.horas) }
    },
    {
      id: 'proy_fuente_anio', titulo: 'Proyectos por Fuente y Año', icon: '🔗', params: [{ key: 'anio', label: 'Año', type: 'text' }],
      headers: ['Fuente', 'Año', 'Código', 'Nombre', 'Estado', 'Gestor', 'Vinculación', 'Horas activas', 'Inicio', 'Fin'],
      getRows: (p = {}) => { const tcIds = new Set(data.tiposActividad.filter(t => (t.contabilizar || 'Sí') !== 'No').map(t => t.id)); const pyContab = data.proyectos.filter(py => tcIds.has(py.tipoId)); const filtAnio = (p.anio || '').trim(); return pyContab.filter(py => !filtAnio || (py.inicio && py.inicio.split('-')[0] === filtAnio)).map(py => { const fuente = gFuente(py.fuenteId)?.nombre || 'Sin fuente'; const anio = py.inicio ? py.inicio.split('-')[0] : '-'; const nA = data.nombramientos.filter(n => n.proyectoId === py.id && n.estado === 'Activo'); const hA = r2(nA.reduce((s, n) => s + nh(n.horas), 0)); return [fuente, anio, py.codigo || '-', py.nombre, py.estado, gGestor(py.gestorId)?.nombre || '-', gVin(py.vinculacionId)?.nombre || '-', hA, py.inicio ? fmtD(py.inicio) : '-', py.fin ? fmtD(py.fin) : '-'] }).sort((a, b) => a[0].localeCompare(b[0]) || b[1].localeCompare(a[1]) || a[3].localeCompare(b[3])) },
      getPyResumen: (p = {}) => { const tcIds = new Set(data.tiposActividad.filter(t => (t.contabilizar || 'Sí') !== 'No').map(t => t.id)); const pyContab = data.proyectos.filter(py => tcIds.has(py.tipoId)); const filtAnio = (p.anio || '').trim(); const pys = pyContab.filter(py => !filtAnio || (py.inicio && py.inicio.split('-')[0] === filtAnio)); const map = {}; pys.forEach(py => { const fuente = gFuente(py.fuenteId)?.nombre || 'Sin fuente'; if (!map[fuente]) map[fuente] = { label: fuente, activos: 0, total: 0 }; map[fuente].total++; if (py.estado === 'Activo') map[fuente].activos++ }); return Object.values(map).sort((a, b) => b.activos - a.activos) }
    },
    {
      id: 'proy_fuente_anio_tipo', titulo: 'Proyectos por Fuente, Año y Tipo', icon: '📊', headers: ['Fuente', 'Año', 'Tipo de Proyecto', 'Total', 'Activos', 'Por iniciar', 'Finalizados', 'Horas activas'],
      getRows: () => { const tcIds = new Set(data.tiposActividad.filter(t => (t.contabilizar || 'Sí') !== 'No').map(t => t.id)); const pyContab = data.proyectos.filter(p => tcIds.has(p.tipoId)); const rows = []; const anios = [...new Set(pyContab.filter(p => p.inicio).map(p => p.inicio.split('-')[0]))].sort(); const fuentes = [...data.fuentes].sort((a, b) => a.nombre.localeCompare(b.nombre)); const tipos = [...data.tiposActividad].sort((a, b) => a.nombre.localeCompare(b.nombre)); fuentes.forEach(f => { anios.forEach(anio => { const pyFA = pyContab.filter(p => Number(p.fuenteId) === f.id && p.inicio && p.inicio.split('-')[0] === anio); if (!pyFA.length) return; tipos.forEach(t => { const ps = pyFA.filter(p => p.tipoId === t.id); if (!ps.length) return; const hA = r2(ps.reduce((s, p) => { const nA = data.nombramientos.filter(n => n.proyectoId === p.id && n.estado === 'Activo'); return r2(s + nA.reduce((a, n) => a + nh(n.horas), 0)) }, 0)); rows.push([f.nombre, anio, t.nombre, ps.length, ps.filter(p => p.estado === 'Activo').length, ps.filter(p => p.estado === 'Por iniciar').length, ps.filter(p => p.estado === 'Finalizado').length, hA]) }); const hTot = r2(pyFA.reduce((s, p) => { const nA = data.nombramientos.filter(n => n.proyectoId === p.id && n.estado === 'Activo'); return r2(s + nA.reduce((a, n) => a + nh(n.horas), 0)) }, 0)); rows.push(['→ Subtotal ' + f.nombre, anio, '(todos los tipos)', pyFA.length, pyFA.filter(p => p.estado === 'Activo').length, pyFA.filter(p => p.estado === 'Por iniciar').length, pyFA.filter(p => p.estado === 'Finalizado').length, hTot]) }) }); return rows },
      getPyResumenGrupo: (p = {}) => { const tcIds = new Set(data.tiposActividad.filter(t => (t.contabilizar || 'Sí') !== 'No').map(t => t.id)); const pyContab = data.proyectos.filter(py => tcIds.has(py.tipoId)); const filtAnio = (p.anio || '').trim(); const pys = pyContab.filter(py => !filtAnio || (py.inicio && py.inicio.split('-')[0] === filtAnio)); const gmap = {}; pys.forEach(py => { const fuente = gFuente(py.fuenteId)?.nombre || 'Sin fuente'; const tipo = gT(py.tipoId)?.nombre || 'Sin tipo'; if (!gmap[fuente]) gmap[fuente] = {}; if (!gmap[fuente][tipo]) gmap[fuente][tipo] = { label: tipo, activos: 0, total: 0 }; gmap[fuente][tipo].total++; if (py.estado === 'Activo') gmap[fuente][tipo].activos++ }); return Object.keys(gmap).sort().map(f => ({ grupo: f, items: Object.values(gmap[f]).sort((a, b) => b.activos - a.activos) })) }
    },
    {
      id: 'nom_vinc', titulo: 'Nombramientos Activos por Vinculación', icon: '🔗', headers: ['Vinculación', 'Profesor', 'Plaza', 'CF', 'Proyecto', 'Tipo Nombramiento', 'Horas', 'Fin', 'Días restantes', 'Estado'],
      getRows: () => data.nombramientos.filter(n => n.estado === 'Activo').map(n => { const py = gPy(n.proyectoId); const vinc = gVin(py?.vinculacionId)?.nombre || 'Sin vinculación'; const d = n.fin ? dU(n.fin) : ''; return [vinc, gP(n.profesorId)?.nombre || '-', gPl(n.plazaId)?.codigo || '-', gPl(n.plazaId)?.cf || '-', py?.nombre || '-', gTN(n.tipoNombramientoId)?.nombre || '-', n.horas, n.fin ? fmtD(n.fin) : '-', typeof d === 'number' ? d + 'd' : '-', n.estado] }).sort((a, b) => a[0].localeCompare(b[0])),
      getResumen: () => { const map = {}; data.nombramientos.filter(n => n.estado === 'Activo').forEach(n => { const py = gPy(n.proyectoId); const vinc = gVin(py?.vinculacionId)?.nombre || 'Sin vinculación'; if (!map[vinc]) map[vinc] = { tipo: vinc, count: 0, horas: 0 }; map[vinc].count++; map[vinc].horas = r2(map[vinc].horas + nh(n.horas)) }); return Object.values(map).sort((a, b) => b.horas - a.horas) }
    },
    {
      id: 'proy_vinc_anio', titulo: 'Proyectos por Vinculación y Año', icon: '🔗', params: [{ key: 'anio', label: 'Año', type: 'text' }],
      headers: ['Vinculación', 'Año', 'Código', 'Nombre', 'Estado', 'Gestor', 'Fuente', 'Horas activas', 'Inicio', 'Fin'],
      getRows: (p = {}) => { const filtAnio = (p.anio || '').trim(); return data.proyectos.filter(py => !filtAnio || (py.inicio && py.inicio.split('-')[0] === filtAnio)).map(py => { const vinc = gVin(py.vinculacionId)?.nombre || 'Sin vinculación'; const anio = py.inicio ? py.inicio.split('-')[0] : '-'; const nA = data.nombramientos.filter(n => n.proyectoId === py.id && n.estado === 'Activo'); const hA = r2(nA.reduce((s, n) => s + nh(n.horas), 0)); return [vinc, anio, py.codigo || '-', py.nombre, py.estado, gGestor(py.gestorId)?.nombre || '-', gFuente(py.fuenteId)?.nombre || '-', hA, py.inicio ? fmtD(py.inicio) : '-', py.fin ? fmtD(py.fin) : '-'] }).sort((a, b) => a[0].localeCompare(b[0]) || b[1].localeCompare(a[1]) || a[3].localeCompare(b[3])) },
      getPyResumen: (p = {}) => { const filtAnio = (p.anio || '').trim(); const pys = data.proyectos.filter(py => !filtAnio || (py.inicio && py.inicio.split('-')[0] === filtAnio)); const map = {}; pys.forEach(py => { const vinc = gVin(py.vinculacionId)?.nombre || 'Sin vinculación'; if (!map[vinc]) map[vinc] = { label: vinc, activos: 0, total: 0 }; map[vinc].total++; if (py.estado === 'Activo') map[vinc].activos++ }); return Object.values(map).sort((a, b) => b.activos - a.activos) }
    },
    {
      id: 'proy_vinc_anio_tipo', titulo: 'Proyectos por Vinculación, Año y Tipo', icon: '📊', headers: ['Vinculación', 'Año', 'Tipo de Proyecto', 'Total', 'Activos', 'Por iniciar', 'Finalizados', 'Horas activas'],
      getRows: () => { const rows = []; const anios = [...new Set(data.proyectos.filter(p => p.inicio).map(p => p.inicio.split('-')[0]))].sort(); const vincs = [...data.vinculaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)); const tipos = [...data.tiposActividad].sort((a, b) => a.nombre.localeCompare(b.nombre)); vincs.forEach(v => { anios.forEach(anio => { const pyVA = data.proyectos.filter(p => Number(p.vinculacionId) === v.id && p.inicio && p.inicio.split('-')[0] === anio); if (!pyVA.length) return; tipos.forEach(t => { const ps = pyVA.filter(p => p.tipoId === t.id); if (!ps.length) return; const hA = r2(ps.reduce((s, p) => { const nA = data.nombramientos.filter(n => n.proyectoId === p.id && n.estado === 'Activo'); return r2(s + nA.reduce((a, n) => a + nh(n.horas), 0)) }, 0)); rows.push([v.nombre, anio, t.nombre, ps.length, ps.filter(p => p.estado === 'Activo').length, ps.filter(p => p.estado === 'Por iniciar').length, ps.filter(p => p.estado === 'Finalizado').length, hA]) }); const hTot = r2(pyVA.reduce((s, p) => { const nA = data.nombramientos.filter(n => n.proyectoId === p.id && n.estado === 'Activo'); return r2(s + nA.reduce((a, n) => a + nh(n.horas), 0)) }, 0)); rows.push(['→ Subtotal ' + v.nombre, anio, '(todos los tipos)', pyVA.length, pyVA.filter(p => p.estado === 'Activo').length, pyVA.filter(p => p.estado === 'Por iniciar').length, pyVA.filter(p => p.estado === 'Finalizado').length, hTot]) }) }); return rows },
      getPyResumenGrupo: (p = {}) => { const filtAnio = (p.anio || '').trim(); const pys = data.proyectos.filter(py => !filtAnio || (py.inicio && py.inicio.split('-')[0] === filtAnio)); const gmap = {}; pys.forEach(py => { const vinc = gVin(py.vinculacionId)?.nombre || 'Sin vinculación'; const tipo = gT(py.tipoId)?.nombre || 'Sin tipo'; if (!gmap[vinc]) gmap[vinc] = {}; if (!gmap[vinc][tipo]) gmap[vinc][tipo] = { label: tipo, activos: 0, total: 0 }; gmap[vinc][tipo].total++; if (py.estado === 'Activo') gmap[vinc][tipo].activos++ }); return Object.keys(gmap).sort().map(v => ({ grupo: v, items: Object.values(gmap[v]).sort((a, b) => b.activos - a.activos) })) }
    },
  ]

  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const rep = REPORTES_DEF.find(r => r.id === activeRep)
  const repParams = useMemo(() => paramValues[activeRep] || {}, [paramValues, activeRep])
  const allRows = useMemo(() => rep ? rep.getRows(repParams) : [], [activeRep, repParams, data, presupuestos])

  const globalQ = norm(globalFiltros[activeRep] || '')
  const colF = colFiltros[activeRep] || {}

  const filteredRows = useMemo(() => allRows.filter(row => {
    if (globalQ && !row.some(cell => norm(cell).includes(globalQ))) return false
    return Object.entries(colF).every(([ci, val]) => !val || norm(row[parseInt(ci)]).includes(norm(val)))
  }), [allRows, globalQ, colF])

  const setGlobal = v => setGlobalFiltros(p => ({ ...p, [activeRep]: v }))
  const setColF = (ci, v) => setColFiltros(p => ({ ...p, [activeRep]: { ...(p[activeRep] || {}), [String(ci)]: v } }))
  const clearAll = () => { setGlobalFiltros(p => ({ ...p, [activeRep]: '' })); setColFiltros(p => ({ ...p, [activeRep]: {} })) }
  const hasFilters = !!globalQ || Object.values(colF).some(v => !!v)
  const toggleGrupo = label => setExpandedGrupos(p => ({ ...p, [label]: !p[label] }))
  const setParam = (key, val) => setParamValues(p => ({ ...p, [activeRep]: { ...(p[activeRep] || {}), [key]: val } }))

  return (
    <div>
      <h2 style={{ margin: '0 0 14px', color: NAVY, fontSize: 17 }}>Reportes</h2>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 220, flexShrink: 0, background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {REPORT_GRUPOS.map(g => {
            const isOpen = !!expandedGrupos[g.label]
            return (
              <div key={g.label} style={{ marginBottom: 4 }}>
                <div onClick={() => toggleGrupo(g.label)} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 7, background: isOpen ? '#e8eef6' : 'transparent', color: isOpen ? '#334' : '#aaa', userSelect: 'none', marginBottom: isOpen ? 3 : 0 }}>
                  <span>{g.label}</span>
                  <span style={{ fontSize: 12, color: isOpen ? '#667' : '#ccc', display: 'inline-block', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s' }}>▾</span>
                </div>
                {isOpen && g.ids.map(id => {
                  if (id === 'tiempos_docentes') return (
                    <button key={id} onClick={() => setActiveRep(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: activeRep === id ? 700 : 400, background: activeRep === id ? '#dbeafe' : 'transparent', color: activeRep === id ? NAVY : '#555', textAlign: 'left', marginBottom: 2 }}>
                      <span>⏱️</span><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tiempos Docentes</span>
                    </button>
                  )
                  const r = REPORTES_DEF.find(x => x.id === id); if (!r) return null
                  const cnt = r.params ? '-' : r.getRows({}).length
                  return (
                    <button key={id} onClick={() => setActiveRep(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: activeRep === id ? 700 : 400, background: activeRep === id ? '#dbeafe' : 'transparent', color: activeRep === id ? NAVY : '#555', textAlign: 'left', marginBottom: 2 }}>
                      <span>{r.icon}</span><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titulo}</span>
                      <span style={{ background: activeRep === id ? '#bfdbfe' : '#f0f4f8', color: activeRep === id ? BLUE : '#888', borderRadius: 20, padding: '0 5px', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{cnt}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {activeRep === 'tiempos_docentes' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #f0f4f8', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>⏱️ Tiempos Docentes</h3>
                <button onClick={() => {
                  const wb = XLSX.utils.book_new()
                  const unidSede = new Map(data.unidades.map(u => [u.id, u.sedeId]))
                  const activosBase = data.nombramientos.filter(n => n.estado === 'Activo')
                  const activos = tipoNomTDRep.length > 0 ? activosBase.filter(n => tipoNomTDRep.includes(String(n.tipoNombramientoId))) : activosBase
                  const filasTipo = data.tiposActividad.map(t => { const ids = new Set(proyectosContab.filter(p => p.tipoId === t.id).map(p => p.id)); const h = r2(activos.filter(n => ids.has(n.proyectoId)).reduce((s, n) => s + nh(n.horas), 0)); return [t.nombre, h, r2(h / hxTDRep)] })
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tipo de Proyecto', 'Horas activas', 'Tiempos docentes (÷' + hxTDRep + 'h)'], ...filasTipo]), 'Por Tipo')
                  const filasSede = data.sedes.map(s => { const h = r2(activos.filter(n => unidSede.get(n.unidadId) === s.id).reduce((sum, n) => sum + nh(n.horas), 0)); return [s.nombre, h, r2(h / hxTDRep)] })
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sede', 'Horas activas', 'Tiempos docentes (÷' + hxTDRep + 'h)'], ...filasSede]), 'Por Sede')
                  const filasUnidad = data.unidades.map(u => { const h = r2(activos.filter(n => n.unidadId === u.id).reduce((s, n) => s + nh(n.horas), 0)); return [u.nombre, u.codigo || '', h, r2(h / hxTDRep)] }).filter(f => f[2] > 0).sort((a, b) => b[2] - a[2])
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Unidad', 'Código', 'Horas activas', 'Tiempos docentes (÷' + hxTDRep + 'h)'], ...filasUnidad]), 'Por Unidad')
                  XLSX.writeFile(wb, 'tiempos_docentes_' + new Date().toISOString().slice(0, 10) + '.xlsx')
                }} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬇ Excel</button>
              </div>
              <div style={{ background: '#f8f9ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Horas por tiempo docente:</span>
                  <input type="number" min="2" step="1" value={hxTDRep} onChange={e => saveHxTDRep(e.target.value)} style={{ ...inp, width: 90, textAlign: 'center', fontWeight: 700, fontSize: 15 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>Tipo de nombramiento:</span>
                  <button onClick={() => setTipoNomTDRep([])} style={{ background: tipoNomTDRep.length === 0 ? TEAL : '#f0f4f8', color: tipoNomTDRep.length === 0 ? '#fff' : NAVY, border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Todos</button>
                  {data.tiposNombramiento.map(t => { const k = String(t.id); const sel = tipoNomTDRep.includes(k); return <button key={k} onClick={() => toggleTipoNomTDRep(k)} style={{ background: sel ? TEAL : '#f0f4f8', color: sel ? '#fff' : NAVY, border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>{t.nombre}</button> })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card title="📊 Por Tipo de Proyecto">
                  <ChartTiemposDocentes tiposActividad={data.tiposActividad} proyectos={proyectosContab} nombramientos={data.nombramientos} hxTD={hxTDRep} tipoNomTD={tipoNomTDRep} />
                </Card>
                <Card title="📊 Por Sede">
                  <ChartTiemposDocentesSede sedes={data.sedes} unidades={data.unidades} nombramientos={data.nombramientos} hxTD={hxTDRep} tipoNomTD={tipoNomTDRep} />
                </Card>
                <Card title="📋 Tabla por Tipo de Proyecto" full>
                  {(() => {
                    const activosBase = data.nombramientos.filter(n => n.estado === 'Activo')
                    const activos = tipoNomTDRep.length > 0 ? activosBase.filter(n => tipoNomTDRep.includes(String(n.tipoNombramientoId))) : activosBase
                    const filas = data.tiposActividad.map((t, i) => { const ids = new Set(proyectosContab.filter(p => p.tipoId === t.id).map(p => p.id)); const h = r2(activos.filter(n => ids.has(n.proyectoId)).reduce((s, n) => s + nh(n.horas), 0)); return { ...t, horas: h, tiempos: r2(h / hxTDRep), color: CHART_COLORS[i % CHART_COLORS.length] } })
                    const totH = r2(filas.reduce((s, f) => s + f.horas, 0)); const totTD = r2(filas.reduce((s, f) => s + f.tiempos, 0))
                    if (!totH) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con proyecto asociado.</p>
                    return <TablaColapsable><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tipo de Proyecto</th><th style={{ textAlign: 'right', padding: '7px 10px', color: NAVY, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Horas activas</th><th style={{ textAlign: 'right', padding: '7px 10px', color: TEAL, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tiempos docentes (÷{hxTDRep}h)</th></tr></thead><tbody>{filas.map((f, i) => <tr key={f.id} style={{ borderBottom: '1px solid #f0f0f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '7px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: 'inline-block' }} /><span style={{ fontWeight: 600, color: f.color }}>{f.nombre}</span></div></td><td style={{ textAlign: 'right', padding: '7px 10px', color: f.horas > 0 ? '#333' : '#ccc', fontWeight: f.horas > 0 ? 600 : 400 }}>{f.horas > 0 ? f.horas + 'h' : '—'}</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: f.tiempos > 0 ? TEAL : '#ccc' }}>{f.tiempos > 0 ? f.tiempos : '—'}</td></tr>)}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: NAVY }}>Total</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: NAVY }}>{totH}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: TEAL }}>{totTD}</td></tr></tfoot></table></TablaColapsable>
                  })()}
                </Card>
                <Card title="📋 Tabla por Sede" full>
                  {(() => {
                    const unidSede = new Map(data.unidades.map(u => [u.id, u.sedeId]))
                    const activosBase = data.nombramientos.filter(n => n.estado === 'Activo')
                    const activos = tipoNomTDRep.length > 0 ? activosBase.filter(n => tipoNomTDRep.includes(String(n.tipoNombramientoId))) : activosBase
                    const filas = data.sedes.map((s, i) => { const h = r2(activos.filter(n => unidSede.get(n.unidadId) === s.id).reduce((sum, n) => sum + nh(n.horas), 0)); return { ...s, horas: h, tiempos: r2(h / hxTDRep), color: CHART_COLORS[i % CHART_COLORS.length] } })
                    const totH = r2(filas.reduce((s, f) => s + f.horas, 0)); const totTD = r2(filas.reduce((s, f) => s + f.tiempos, 0))
                    if (!totH) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con sede asociada.</p>
                    return <TablaColapsable><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Sede</th><th style={{ textAlign: 'right', padding: '7px 10px', color: NAVY, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Horas activas</th><th style={{ textAlign: 'right', padding: '7px 10px', color: '#7c3aed', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tiempos docentes (÷{hxTDRep}h)</th></tr></thead><tbody>{filas.map((f, i) => <tr key={f.id} style={{ borderBottom: '1px solid #f0f0f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '7px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: 'inline-block' }} /><span style={{ fontWeight: 600, color: f.color }}>{f.nombre}</span></div></td><td style={{ textAlign: 'right', padding: '7px 10px', color: f.horas > 0 ? '#333' : '#ccc', fontWeight: f.horas > 0 ? 600 : 400 }}>{f.horas > 0 ? f.horas + 'h' : '—'}</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: f.tiempos > 0 ? '#7c3aed' : '#ccc' }}>{f.tiempos > 0 ? f.tiempos : '—'}</td></tr>)}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: NAVY }}>Total</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: NAVY }}>{totH}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: '#7c3aed' }}>{totTD}</td></tr></tfoot></table></TablaColapsable>
                  })()}
                </Card>
                <Card title="📊 Por Unidad" full>
                  <ChartTiemposDocentesUnidad unidades={data.unidades} nombramientos={data.nombramientos} hxTD={hxTDRep} tipoNomTD={tipoNomTDRep} />
                </Card>
                <Card title="📋 Tabla por Unidad" full>
                  {(() => {
                    const activosBase = data.nombramientos.filter(n => n.estado === 'Activo')
                    const activos = tipoNomTDRep.length > 0 ? activosBase.filter(n => tipoNomTDRep.includes(String(n.tipoNombramientoId))) : activosBase
                    const filas = data.unidades.map((u, i) => { const h = r2(activos.filter(n => n.unidadId === u.id).reduce((s, n) => s + nh(n.horas), 0)); return { ...u, horas: h, tiempos: r2(h / hxTDRep), color: CHART_COLORS[i % CHART_COLORS.length] } }).filter(f => f.horas > 0).sort((a, b) => b.horas - a.horas)
                    const totH = r2(filas.reduce((s, f) => s + f.horas, 0)); const totTD = r2(filas.reduce((s, f) => s + f.tiempos, 0))
                    if (!totH) return <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>Sin nombramientos activos con unidad asociada.</p>
                    return <TablaColapsable><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8f9ff' }}><th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Unidad</th><th style={{ textAlign: 'right', padding: '7px 10px', color: NAVY, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Horas activas</th><th style={{ textAlign: 'right', padding: '7px 10px', color: AMBER, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e8e8f0' }}>Tiempos docentes (÷{hxTDRep}h)</th></tr></thead><tbody>{filas.map((f, i) => <tr key={f.id} style={{ borderBottom: '1px solid #f0f0f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}><td style={{ padding: '7px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, display: 'inline-block' }} /><span style={{ fontWeight: 600, color: f.color }}>{f.nombre}</span>{f.codigo && <span style={{ fontSize: 10, color: '#aaa', marginLeft: 2 }}>({f.codigo})</span>}</div></td><td style={{ textAlign: 'right', padding: '7px 10px', color: '#333', fontWeight: 600 }}>{f.horas}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: AMBER }}>{f.tiempos}</td></tr>)}</tbody><tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: NAVY }}>Total</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: NAVY }}>{totH}h</td><td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: AMBER }}>{totTD}</td></tr></tfoot></table></TablaColapsable>
                  })()}
                </Card>
              </div>
            </div>
          )}

          {rep && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #f0f4f8', flexWrap: 'wrap', gap: 8 }}>
                <div><h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>{rep.icon} {rep.titulo}</h3><span style={{ fontSize: 11, color: '#aaa' }}>{filteredRows.length} de {allRows.length} registros</span></div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {hasFilters && <button onClick={clearAll} style={{ background: '#94a3b8', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕ Limpiar</button>}
                  <button onClick={() => exportCSV(rep.titulo, rep.headers, filteredRows)} style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬇ CSV</button>
                  <button onClick={() => exportXLSX(rep.titulo, rep.headers, filteredRows)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬇ Excel</button>
                  <button onClick={() => { const style = document.createElement('style'); style.id = 'print-style'; style.textContent = '@media print{nav,button,.no-print{display:none!important;}body{font-size:11px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:4px 6px;font-size:10px;}th{background:#1e3a5f;color:#fff;}}'; document.head.appendChild(style); window.print(); setTimeout(() => { const s = document.getElementById('print-style'); if (s) s.remove() }, 1000) }} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🖨️ PDF</button>
                </div>
              </div>
              {rep.params && rep.params.length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, padding: '12px 14px', background: '#f8f9ff', borderRadius: 8, border: '1.5px solid #e8e8f0' }}>
                  {rep.params.map(param => (
                    <div key={param.key}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{param.label}</label>
                      <input type={param.type || 'text'} value={repParams[param.key] || ''} onChange={e => setParam(param.key, e.target.value)} style={{ ...inp, fontSize: 12, minWidth: 160 }} />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                  <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 12 }}>🔍</span>
                  <input value={globalFiltros[activeRep] || ''} onChange={e => setGlobal(e.target.value)} placeholder="Buscar en todos los campos..." style={{ ...inp, paddingLeft: 28, background: '#f8f9ff', border: '1.5px solid #e8e8f0' }} />
                  {globalQ && <button onClick={() => setGlobal('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 12 }}>×</button>}
                </div>
              </div>

              {rep.getVerifResumen && (() => { const vr = rep.getVerifResumen(repParams); if (!vr || !vr.length) return null; return (
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #f0f4f8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Por verificación</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {vr.map(r => <div key={r.nombre} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 16px', borderLeft: '4px solid ' + r.color, minWidth: 140 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: r.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.12)' }} /><span style={{ fontSize: 11, color: '#444', fontWeight: 600 }}>{r.nombre}</span></div><div style={{ fontSize: 18, fontWeight: 700, color: r.color }}>{r2(r.horas)}h</div><div style={{ fontSize: 10, color: '#aaa' }}>{r.count} nombramiento{r.count !== 1 ? 's' : ''}</div></div>)}
                  </div>
                </div>
              ) })()}

              {rep.getCfResumen && (() => { const cfr = rep.getCfResumen(repParams); if (!cfr || !cfr.length) return null; const totalHcf = r2(cfr.reduce((s, r) => s + r.horas, 0)); return (
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #f0f4f8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Por CF de plaza</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    {cfr.map(r => <div key={r.cf} style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 16px', borderLeft: '3px solid #0d9488', minWidth: 150 }}><div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{r.cf}</div><div style={{ fontSize: 18, fontWeight: 700, color: '#0d9488' }}>{r2(r.horas)}h</div><div style={{ fontSize: 10, color: '#aaa' }}>{r.count} nombramiento{r.count !== 1 ? 's' : ''}</div></div>)}
                    <div style={{ background: '#0d9488', borderRadius: 8, padding: '10px 16px', minWidth: 150 }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Total general</div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{totalHcf}h</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{cfr.reduce((s, r) => s + r.count, 0)} nombramientos</div></div>
                  </div>
                </div>
              ) })()}

              {rep.getPyResumen && (() => { const pyr = rep.getPyResumen(repParams); if (!pyr || !pyr.length) return null; return (
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #f0f4f8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Proyectos activos</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    {pyr.map(r => <div key={r.label} style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 16px', borderLeft: '3px solid #0284c7', minWidth: 150 }}><div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{r.label}</div><div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7' }}>{r.activos}</div><div style={{ fontSize: 10, color: '#aaa' }}>{r.total} proyecto{r.total !== 1 ? 's' : ''} en total</div></div>)}
                    <div style={{ background: '#0284c7', borderRadius: 8, padding: '10px 16px', minWidth: 150 }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Total activos</div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{pyr.reduce((s, r) => s + r.activos, 0)}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{pyr.reduce((s, r) => s + r.total, 0)} proyectos</div></div>
                  </div>
                </div>
              ) })()}

              {rep.getPyResumenGrupo && (() => { const grps = rep.getPyResumenGrupo(repParams); if (!grps || !grps.length) return null; return (
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #f0f4f8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Proyectos activos por tipo</div>
                  {grps.map(g => <div key={g.grupo} style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#334', marginBottom: 6, paddingLeft: 4, borderLeft: '3px solid #cbd5e1' }}>{g.grupo}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{g.items.map(r => <div key={r.label} style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 14px', borderLeft: '3px solid #0284c7', minWidth: 120 }}><div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{r.label}</div><div style={{ fontSize: 16, fontWeight: 700, color: '#0284c7' }}>{r.activos}</div><div style={{ fontSize: 10, color: '#aaa' }}>{r.total} total</div></div>)}</div></div>)}
                </div>
              ) })()}

              {rep.getPorIniciarResumen && (() => { const pi = rep.getPorIniciarResumen(repParams); return (
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #f0f4f8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Nombramientos por iniciar</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 16px', borderLeft: '3px solid #854d0e', minWidth: 150 }}><div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Horas/semana</div><div style={{ fontSize: 22, fontWeight: 700, color: '#854d0e' }}>{pi.horas}h</div><div style={{ fontSize: 10, color: '#aaa' }}>{pi.count} nombramiento{pi.count !== 1 ? 's' : ''}</div></div>
                  </div>
                </div>
              ) })()}

              {rep.getResumen && (() => { const resumen = rep.getResumen(repParams); if (!resumen || !resumen.length) return null; const totalH2 = r2(resumen.reduce((s, r) => s + r.horas, 0)); return (
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #f0f4f8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Total de horas por tipo de nombramiento</div>
                  <div style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic', marginBottom: 10 }}>Las horas no asignadas no se están incluyendo.</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    {resumen.map(r => <div key={r.tipo} style={{ background: '#f0f4f8', borderRadius: 8, padding: '10px 16px', borderLeft: '3px solid ' + BLUE, minWidth: 150 }}><div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{r.tipo}</div><div style={{ fontSize: 18, fontWeight: 700, color: BLUE }}>{r2(r.horas)}h</div><div style={{ fontSize: 10, color: '#aaa' }}>{r.count} nombramiento{r.count !== 1 ? 's' : ''}</div></div>)}
                    <div style={{ background: NAVY, borderRadius: 8, padding: '10px 16px', minWidth: 150 }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Total general</div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{totalH2}h</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{resumen.reduce((s, r) => s + r.count, 0)} nombramientos</div></div>
                  </div>
                </div>
              ) })()}

              {rep.getResumenFromRows && (() => { const minH = parseFloat(repParams.minHoras) || 20; const resumen = rep.getResumenFromRows(filteredRows, repParams); if (!resumen || !resumen.length) return null; const totalH2 = r2(resumen.reduce((s, r) => s + r.horas, 0)); return (
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #f0f4f8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>{'Horas activas por profesor (≥' + minH + 'h)'}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    {resumen.map(r => <div key={r.tipo} style={{ background: '#f0f4f8', borderRadius: 8, padding: '10px 16px', borderLeft: '3px solid ' + BLUE, minWidth: 150 }}><div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{r.tipo}</div><div style={{ fontSize: 18, fontWeight: 700, color: BLUE }}>{r2(r.horas)}h</div><div style={{ fontSize: 10, color: '#aaa' }}>{r.count} nombramiento{r.count !== 1 ? 's' : ''}</div></div>)}
                    <div style={{ background: NAVY, borderRadius: 8, padding: '10px 16px', minWidth: 150 }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Total ({resumen.length} prof.)</div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{totalH2}h</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{resumen.reduce((s, r) => s + r.count, 0)} nombramientos</div></div>
                  </div>
                </div>
              ) })()}

              <div style={{ overflowX: 'auto', transform: 'scaleY(-1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 400, transform: 'scaleY(-1)' }}>
                  <thead>
                    <tr style={{ background: NAVY }}>{rep.headers.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '7px 8px', color: '#fff', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
                    <tr style={{ background: '#f0f4f8' }}>{rep.headers.map((h, i) => <th key={i} style={{ padding: '4px 6px' }}><input value={(colFiltros[activeRep] || {})[String(i)] || ''} onChange={e => setColF(i, e.target.value)} placeholder="Filtrar..." style={{ width: '100%', padding: '3px 6px', border: '1px solid #dde3ee', borderRadius: 4, fontSize: 10, outline: 'none', background: '#fff', boxSizing: 'border-box' }} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 && <tr><td colSpan={rep.headers.length} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 12 }}>Sin resultados.</td></tr>}
                    {filteredRows.map((row, i) => {
                      const isTotal = String(row[0] || '').startsWith('→')
                      return (
                        <tr key={i} style={{ background: isTotal ? '#eef2f7' : i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                          {row.map((cell, j) => {
                            const s = String(cell == null ? '' : cell)
                            const isNum = typeof cell === 'number'
                            const isMoney = s.startsWith('₡')
                            const isPct = s.endsWith('%') && !isNaN(parseFloat(s))
                            const col = s.startsWith('🔴') ? RED : s.startsWith('🟡') ? AMBER : s.startsWith('🟠') ? '#ca8a04' : s.startsWith('🟢') ? GREEN : isMoney ? GREEN : isPct ? BLUE : isTotal ? NAVY : '#333'
                            return <td key={j} style={{ padding: '6px 8px', color: col, fontWeight: isTotal ? 700 : isNum || isMoney || isPct ? 600 : 400, textAlign: isNum || isMoney || isPct ? 'right' : 'left', whiteSpace: s.length > 40 ? 'normal' : 'nowrap' }}>{s}</td>
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                  {filteredRows.length > 0 && (
                    <tfoot><tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}>
                      {rep.headers.map((h, i) => {
                        const vals = filteredRows.map(r => r[i]).filter(v => typeof v === 'number' && !isNaN(v))
                        return <td key={i} style={{ padding: '6px 8px', fontWeight: 700, fontSize: 10, textAlign: 'right' }}>
                          {i === 0 ? <span style={{ color: '#888' }}>{filteredRows.length} reg.</span> : vals.length === filteredRows.length && vals.length > 0 ? <span style={{ color: GREEN }}>{vals.reduce((s, v) => s + v, 0).toLocaleString('es-CR')}</span> : null}
                        </td>
                      })}
                    </tr></tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
