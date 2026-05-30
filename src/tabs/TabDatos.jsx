import { useState } from 'react'
import * as XLSX from 'xlsx'
import { NAVY, BLUE, GREEN, RED, AMBER, TEAL } from '../constants'
import { nh, r2, fmtD, getAnios } from '../utils'
import { apiPost, apiPut } from '../api'
import { useToast } from '../context/toast'

function InconsistenciasPanel({ data }) {
  const toast = useToast()
  const isEmpty = v => v === undefined || v === null || v === '' || v === 0
  const ENTITIES = [
    { k: 'profesores', label: 'Profesores', icon: '👨‍🏫', fields: ['nombre', 'cedula', 'email'] },
    { k: 'plazas', label: 'Plazas', icon: '📋', fields: ['codigo', 'horasSemanales', 'cf', 'estado', 'actividad'] },
    { k: 'proyectos', label: 'Proyectos', icon: '📁', fields: ['nombre', 'codigo', 'sedeId', 'unidadId', 'tipoId', 'inicio', 'fin', 'estado'] },
    { k: 'nombramientos', label: 'Nombramientos', icon: '📝', fields: ['plazaId', 'profesorId', 'tipoNombramientoId', 'horas', 'inicio', 'fin', 'estado'] },
    { k: 'unidades', label: 'Unidades', icon: '🏛️', fields: ['nombre', 'codigo'] },
    { k: 'sedes', label: 'Sedes', icon: '📍', fields: ['nombre'] },
    { k: 'cfs', label: 'CFs', icon: '💰', fields: ['codigo', 'nombre'] },
    { k: 'verificaciones', label: 'Verificaciones', icon: '✅', fields: ['nombre'] },
    { k: 'tiposNombramiento', label: 'Tipos Nombramiento', icon: '🏷️', fields: ['nombre'] },
    { k: 'tiposActividad', label: 'Tipos Actividad', icon: '🎯', fields: ['nombre'] },
    { k: 'fuentes', label: 'Fuentes', icon: '🔗', fields: ['nombre'] },
    { k: 'gestores', label: 'Gestores', icon: '👤', fields: ['nombre'] },
    { k: 'vinculaciones', label: 'Vinculaciones', icon: '🔄', fields: ['nombre'] },
  ]
  const getInc = ent => (data[ent.k] || []).map(r => { const faltantes = ent.fields.filter(f => isEmpty(r[f])); return faltantes.length ? { ...r, _faltantes: faltantes.join(', ') } : null }).filter(Boolean)
  const dlInc = ent => { const inc = getInc(ent); if (!inc.length) return; const ws = XLSX.utils.json_to_sheet(inc); const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, ws, ent.label.substring(0, 31)); XLSX.writeFile(wb2, 'inconsistencias_' + ent.k + '_' + new Date().toISOString().slice(0, 10) + '.xlsx') }
  const dlTodas = () => { const wb2 = XLSX.utils.book_new(); let hayAlgo = false; ENTITIES.forEach(ent => { const inc = getInc(ent); if (!inc.length) return; hayAlgo = true; const ws = XLSX.utils.json_to_sheet(inc); XLSX.utils.book_append_sheet(wb2, ws, ent.label.substring(0, 31)) }); if (!hayAlgo) { toast.info('No hay inconsistencias en ninguna colección.'); return } XLSX.writeFile(wb2, 'inconsistencias_todas_' + new Date().toISOString().slice(0, 10) + '.xlsx') }

  const mkIds = arr => new Set((arr || []).map(x => Number(x.id)))
  const plazaIds = mkIds(data.plazas); const profIds = mkIds(data.profesores); const proyIds = mkIds(data.proyectos)
  const tipoNomIds = mkIds(data.tiposNombramiento); const sedeIds = mkIds(data.sedes); const unidadIds = mkIds(data.unidades)
  const tipoActIds = mkIds(data.tiposActividad); const fuenteIds = mkIds(data.fuentes); const gestorIds = mkIds(data.gestores); const vincIds = mkIds(data.vinculaciones)

  const CROSS = [
    { id: 'nom_fecha', icon: '📝', label: 'Nombramientos: fin < inicio', desc: 'Fecha fin anterior al inicio', run: () => (data.nombramientos || []).filter(n => n.fin && n.inicio && n.fin < n.inicio).map(n => ({ id: n.id, inicio: n.inicio, fin: n.fin, estado: n.estado, _problema: 'fin antes de inicio' })) },
    { id: 'nom_plaza', icon: '📝', label: 'Nombramientos: plaza inválida', desc: 'plazaId no existe en plazas', run: () => (data.nombramientos || []).filter(n => !isEmpty(n.plazaId) && !plazaIds.has(Number(n.plazaId))).map(n => ({ id: n.id, plazaId: n.plazaId, estado: n.estado, _problema: 'plazaId inválido' })) },
    { id: 'nom_prof', icon: '📝', label: 'Nombramientos: profesor inválido', desc: 'profesorId no existe en profesores', run: () => (data.nombramientos || []).filter(n => !isEmpty(n.profesorId) && !profIds.has(Number(n.profesorId))).map(n => ({ id: n.id, profesorId: n.profesorId, estado: n.estado, _problema: 'profesorId inválido' })) },
    { id: 'nom_proy', icon: '📝', label: 'Nombramientos: proyecto inválido', desc: 'proyectoId no existe en proyectos', run: () => (data.nombramientos || []).filter(n => !isEmpty(n.proyectoId) && !proyIds.has(Number(n.proyectoId))).map(n => ({ id: n.id, proyectoId: n.proyectoId, estado: n.estado, _problema: 'proyectoId inválido' })) },
    { id: 'nom_tipo', icon: '📝', label: 'Nombramientos: tipo inválido', desc: 'tipoNombramientoId no existe', run: () => (data.nombramientos || []).filter(n => !isEmpty(n.tipoNombramientoId) && !tipoNomIds.has(Number(n.tipoNombramientoId))).map(n => ({ id: n.id, tipoNombramientoId: n.tipoNombramientoId, estado: n.estado, _problema: 'tipoNombramientoId inválido' })) },
    { id: 'plaza_horas', icon: '📋', label: 'Plazas: horas excedidas', desc: 'Suma activos > horasSemanales', run: () => (data.plazas || []).map(pl => { const usadas = (data.nombramientos || []).filter(n => Number(n.plazaId) === pl.id && n.estado === 'Activo').reduce((s, n) => s + parseFloat(n.horas || 0), 0); const hs = parseFloat(pl.horasSemanales || 0); return usadas > hs ? { id: pl.id, codigo: pl.codigo, horasSemanales: hs, horasUsadas: Math.round(usadas * 100) / 100, _problema: 'excede en ' + (Math.round((usadas - hs) * 100) / 100) + 'h' } : null }).filter(Boolean) },
    { id: 'plaza_dup', icon: '📋', label: 'Plazas: código duplicado', desc: 'Dos plazas con el mismo código', run: () => { const c = {}; (data.plazas || []).forEach(p => { if (p.codigo) c[p.codigo] = (c[p.codigo] || 0) + 1 }); return (data.plazas || []).filter(p => p.codigo && c[p.codigo] > 1).map(p => ({ id: p.id, codigo: p.codigo, _problema: 'código duplicado' })) } },
    { id: 'prof_dup', icon: '👨‍🏫', label: 'Profesores: cédula duplicada', desc: 'Dos profesores con la misma cédula', run: () => { const c = {}; (data.profesores || []).forEach(p => { if (p.cedula) c[p.cedula] = (c[p.cedula] || 0) + 1 }); return (data.profesores || []).filter(p => p.cedula && c[p.cedula] > 1).map(p => ({ id: p.id, nombre: p.nombre, cedula: p.cedula, _problema: 'cédula duplicada' })) } },
    { id: 'proy_fecha', icon: '📁', label: 'Proyectos: fin < inicio', desc: 'Fecha fin anterior al inicio', run: () => (data.proyectos || []).filter(p => p.fin && p.inicio && p.fin < p.inicio).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, inicio: p.inicio, fin: p.fin, _problema: 'fin antes de inicio' })) },
    { id: 'proy_sede', icon: '📁', label: 'Proyectos: sede inválida', desc: 'sedeId no existe en sedes', run: () => (data.proyectos || []).filter(p => !isEmpty(p.sedeId) && !sedeIds.has(Number(p.sedeId))).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, sedeId: p.sedeId, _problema: 'sedeId inválido' })) },
    { id: 'proy_unidad', icon: '📁', label: 'Proyectos: unidad inválida', desc: 'unidadId no existe en unidades', run: () => (data.proyectos || []).filter(p => !isEmpty(p.unidadId) && !unidadIds.has(Number(p.unidadId))).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, unidadId: p.unidadId, _problema: 'unidadId inválido' })) },
    { id: 'proy_tipo', icon: '📁', label: 'Proyectos: tipo actividad inválido', desc: 'tipoId no existe en tiposActividad', run: () => (data.proyectos || []).filter(p => !isEmpty(p.tipoId) && !tipoActIds.has(Number(p.tipoId))).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, tipoId: p.tipoId, _problema: 'tipoId inválido' })) },
    { id: 'proy_fuente', icon: '📁', label: 'Proyectos: fuente inválida', desc: 'fuenteId definido pero no existe', run: () => (data.proyectos || []).filter(p => !isEmpty(p.fuenteId) && !fuenteIds.has(Number(p.fuenteId))).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, fuenteId: p.fuenteId, _problema: 'fuenteId inválido' })) },
    { id: 'proy_gestor', icon: '📁', label: 'Proyectos: gestor inválido', desc: 'gestorId definido pero no existe', run: () => (data.proyectos || []).filter(p => !isEmpty(p.gestorId) && !gestorIds.has(Number(p.gestorId))).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, gestorId: p.gestorId, _problema: 'gestorId inválido' })) },
    { id: 'proy_vinc', icon: '📁', label: 'Proyectos: vinculación inválida', desc: 'vinculacionId definido pero no existe', run: () => (data.proyectos || []).filter(p => !isEmpty(p.vinculacionId) && !vincIds.has(Number(p.vinculacionId))).map(p => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, vinculacionId: p.vinculacionId, _problema: 'vinculacionId inválido' })) },
  ]
  const dlCross = ch => { const rows = ch.run(); if (!rows.length) return; const ws = XLSX.utils.json_to_sheet(rows); const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, ws, ch.label.substring(0, 31)); XLSX.writeFile(wb2, 'inc_rel_' + ch.id + '_' + new Date().toISOString().slice(0, 10) + '.xlsx') }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, marginBottom: 2 }}>Campos obligatorios</div>
          <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Registros con campos requeridos vacíos.</p>
        </div>
        <button onClick={dlTodas} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬇️ Descargar todas</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12, marginBottom: 28 }}>
        {ENTITIES.map(ent => {
          const inc = getInc(ent); const total = (data[ent.k] || []).length; const ok = inc.length === 0
          const camposAfect = [...new Set(inc.flatMap(r => r._faltantes.split(', ')))]
          return (
            <div key={ent.k} style={{ background: '#fff', border: '1.5px solid ' + (ok ? '#dcfce7' : '#fde68a'), borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 20 }}>{ent.icon}</span><div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{ent.label}</div></div>
              <div style={{ fontSize: 12, color: '#777' }}>{total} registros totales</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: ok ? GREEN : AMBER }}>{ok ? '✓ Sin problemas' : '⚠️ ' + inc.length + ' con datos faltantes'}</div>
              {!ok && <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>Campos: {camposAfect.join(', ')}</div>}
              <button onClick={() => dlInc(ent)} disabled={ok} style={{ marginTop: 4, padding: '5px 12px', border: 'none', borderRadius: 6, cursor: ok ? 'default' : 'pointer', fontSize: 12, background: ok ? '#f5f5f5' : AMBER, color: ok ? '#bbb' : '#fff', fontWeight: 600, opacity: ok ? 0.6 : 1 }}>
                ⬇️ Descargar{!ok ? ' (' + inc.length + ')' : ''}
              </button>
            </div>
          )
        })}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, marginBottom: 4 }}>Relaciones e integridad referencial</div>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 14px' }}>Referencias inválidas, duplicados y reglas de negocio.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
        {CROSS.map(ch => {
          const rows = ch.run(); const ok = rows.length === 0
          return (
            <div key={ch.id} style={{ background: '#fff', border: '1.5px solid ' + (ok ? '#dcfce7' : '#fee2e2'), borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 20 }}>{ch.icon}</span><div style={{ fontWeight: 700, fontSize: 12, color: NAVY, lineHeight: 1.3 }}>{ch.label}</div></div>
              <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>{ch.desc}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: ok ? GREEN : RED }}>{ok ? '✓ Sin problemas' : '✗ ' + rows.length + ' registro' + (rows.length !== 1 ? 's' : '')}</div>
              <button onClick={() => dlCross(ch)} disabled={ok} style={{ marginTop: 4, padding: '5px 12px', border: 'none', borderRadius: 6, cursor: ok ? 'default' : 'pointer', fontSize: 12, background: ok ? '#f5f5f5' : RED, color: ok ? '#bbb' : '#fff', fontWeight: 600, opacity: ok ? 0.6 : 1 }}>
                ⬇️ Descargar{!ok ? ' (' + rows.length + ')' : ''}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ImportadorExcel({ data, presupuestos }) {
  const toast = useToast()
  const [entity, setEntity] = useState('proyectos')
  const [rows, setRows] = useState([])
  const [colMap, setColMap] = useState({})
  const [headers, setHeaders] = useState([])
  const [preview, setPreview] = useState([])
  const [status, setStatus] = useState('')
  const [importing, setImporting] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)

  const normI = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

  const ENTITY_CONFIG = {
    unidades: { label: 'Unidades', icon: '🏛️', key: 'codigo', fields: ['codigo', 'nombre'], required: ['nombre'] },
    sedes: { label: 'Sedes', icon: '📍', key: 'nombre', fields: ['nombre'], required: ['nombre'] },
    cfs: { label: 'CF de Plazas', icon: '🏷️', key: 'codigo', fields: ['codigo', 'nombre'], required: ['nombre'] },
    verificaciones: { label: 'Verificaciones', icon: '✅', key: 'nombre', fields: ['nombre', 'color'], required: ['nombre'] },
    tiposNombramiento: { label: 'Tipos Nombramiento', icon: '📄', key: 'nombre', fields: ['nombre'], required: ['nombre'] },
    tiposActividad: { label: 'Tipos Actividad', icon: '🏷️', key: 'nombre', fields: ['nombre', 'subcategorias'], required: ['nombre'] },
    fuentes: { label: 'Fuentes', icon: '💼', key: 'nombre', fields: ['nombre'], required: ['nombre'] },
    gestores: { label: 'Gestores', icon: '👤', key: 'nombre', fields: ['nombre'], required: ['nombre'] },
    vinculaciones: { label: 'Vinculaciones', icon: '🔗', key: 'nombre', fields: ['nombre'], required: ['nombre'] },
    profesores: { label: 'Profesores', icon: '👨‍🏫', key: 'cedula', fields: ['nombre', 'cedula', 'email'], required: ['nombre'] },
    plazas: { label: 'Plazas', icon: '📋', key: 'codigo', fields: ['codigo', 'cf', 'horasSemanales', 'estado', 'actividad', 'interno'], required: ['codigo'] },
    proyectos: { label: 'Proyectos', icon: '📁', key: 'codigo', fields: ['codigo', 'nombre', 'sede', 'unidad', 'tipo', 'subcategoria', 'inicio', 'fin', 'estado', 'fuente', 'gestor', 'vinculacion', 'coordinador'], required: ['nombre'], fk: { sede: { col: 'sedes', key: 'nombre', id: 'sedeId' }, unidad: { col: 'unidades', key: 'nombre', id: 'unidadId' }, tipo: { col: 'tiposActividad', key: 'nombre', id: 'tipoId' }, fuente: { col: 'fuentes', key: 'nombre', id: 'fuenteId' }, gestor: { col: 'gestores', key: 'nombre', id: 'gestorId' }, vinculacion: { col: 'vinculaciones', key: 'nombre', id: 'vinculacionId' }, coordinador: { col: 'profesores', key: 'nombre', id: 'coordinadorId' } } },
    nombramientos: { label: 'Nombramientos', icon: '📝', key: null, fields: ['plaza', 'profesor', 'proyecto', 'tipoNombramiento', 'unidad', 'horas', 'inicio', 'fin', 'estado', 'observaciones'], required: ['plaza', 'profesor'], fk: { plaza: { col: 'plazas', key: 'codigo', id: 'plazaId' }, profesor: { col: 'profesores', key: 'nombre', id: 'profesorId' }, proyecto: { col: 'proyectos', key: 'codigo', id: 'proyectoId' }, tipoNombramiento: { col: 'tiposNombramiento', key: 'nombre', id: 'tipoNombramientoId' }, unidad: { col: 'unidades', key: 'nombre', id: 'unidadId' } } },
    presupuesto: { label: 'Presupuesto', icon: '💰', key: null, fields: ['proyecto', 'anio', 'equipo', 'operativo', 'estudiantes'], required: ['proyecto', 'anio'], fk: { proyecto: { col: 'proyectos', key: 'codigo', id: 'proyectoId' } }, special: 'presupuesto' },
  }

  const TEMPLATES = {
    unidades: { headers: ['codigo', 'nombre'], rows: [['U-01', 'Escuela de Ingeniería en Computación'], ['U-02', 'Escuela de Química']] },
    sedes: { headers: ['nombre'], rows: [['Sede Central'], ['Sede Regional San Carlos']] },
    cfs: { headers: ['codigo', 'nombre'], rows: [['CF-01', 'Categoría Funcional 1'], ['CF-02', 'Categoría Funcional 2']] },
    verificaciones: { headers: ['nombre', 'color'], rows: [['Verificado', '#16a34a'], ['Pendiente', '#d97706']] },
    tiposNombramiento: { headers: ['nombre'], rows: [['Tiempo completo'], ['Tiempo parcial']] },
    tiposActividad: { headers: ['nombre', 'subcategorias'], rows: [['Investigación', 'Básica,Aplicada,Desarrollo'], ['Extensión', 'Acción Social,Transferencia']] },
    fuentes: { headers: ['nombre'], rows: [['FEES'], ['CONARE']] },
    gestores: { headers: ['nombre'], rows: [['Gestor Administrativo'], ['Coordinador VIE']] },
    vinculaciones: { headers: ['nombre'], rows: [['Empresa privada'], ['Institución pública']] },
    profesores: { headers: ['nombre', 'cedula', 'email'], rows: [['Pérez Rodríguez, Juan Carlos', '101110001', 'jperez@itcr.ac.cr'], ['Mora Jiménez, Ana', '202220002', 'amora@itcr.ac.cr']] },
    plazas: { headers: ['codigo', 'cf', 'horasSemanales', 'estado', 'actividad', 'interno'], rows: [['P-01', 'CF-01', '40', 'Activo', 'Docencia', 'Sí'], ['P-02', 'CF-02', '20', 'Activo', 'Investigación', 'No']] },
    proyectos: { headers: ['codigo', 'nombre', 'sede', 'unidad', 'tipo', 'subcategoria', 'inicio', 'fin', 'estado', 'fuente', 'gestor', 'vinculacion', 'coordinador'], rows: [['VIE-001', 'Proyecto de ejemplo', 'Sede Central', 'Escuela de Química', 'Investigación', 'Aplicada', '2025-01-01', '2026-12-31', 'Activo', 'FEES', 'Gestor Administrativo', 'Empresa privada', 'Pérez Rodríguez, Juan Carlos']] },
    nombramientos: { headers: ['plaza', 'profesor', 'proyecto', 'tipoNombramiento', 'unidad', 'horas', 'inicio', 'fin', 'estado', 'observaciones'], rows: [['P-01', 'Pérez Rodríguez, Juan Carlos', 'VIE-001', 'Tiempo completo', 'Escuela de Química', '40', '2025-01-01', '2025-12-31', 'Activo', '']] },
    presupuesto: { headers: ['proyecto', 'anio', 'equipo', 'operativo', 'estudiantes'], rows: [['VIE-001', '2025', '5000000', '2000000', '1000000']] },
  }

  const cfg = ENTITY_CONFIG[entity]
  const currentRecs = entity === 'presupuesto'
    ? Object.entries(presupuestos || {}).map(([k, v]) => { const [pid, anio] = k.split('_'); const pr = data.proyectos.find(p => p.id === parseInt(pid)); return { proyecto: pr?.codigo || pid, anio: parseInt(anio), equipo: v.equipo || 0, operativo: v.operativo || 0, estudiantes: v.estudiantes || 0 } })
    : data[entity] || []
  const previewFields = cfg.fields.slice(0, 4)

  const dlTemplate = () => { const t = TEMPLATES[entity]; const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet([t.headers, ...t.rows]); ws['!cols'] = t.headers.map(() => ({ wch: 26 })); XLSX.utils.book_append_sheet(wb, ws, 'Plantilla'); XLSX.writeFile(wb, 'plantilla_' + entity + '_' + new Date().toISOString().slice(0, 10) + '.xlsx') }

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (!arr.length) { setStatus('Archivo vacío.'); return }
      const hdrs = arr[0].map(String)
      setHeaders(hdrs)
      const dataRows = arr.slice(1).filter(r => r.some(c => c !== ''))
      setRows(dataRows)
      const map = {}
      cfg.fields.forEach(field => { const idx = hdrs.findIndex(h => normI(h) === normI(field) || normI(h).includes(normI(field))); if (idx >= 0) map[field] = idx })
      setColMap(map); setPreview(dataRows.slice(0, 5)); setStatus(dataRows.length + ' filas cargadas.')
    }
    reader.readAsArrayBuffer(f)
  }

  const getVal = (row, field) => { const idx = colMap[field]; return idx !== undefined ? String(row[idx] || '').trim() : '' }
  const resolveFk = (field, val) => { if (!val || !cfg.fk || !cfg.fk[field]) return null; const { col, key } = cfg.fk[field]; const found = (data[col] || []).find(x => normI(x[key] || '') === normI(val)); return found ? found.id : null }

  const doImport = async () => {
    if (!rows.length) { toast.error('Cargue un archivo primero.'); return }
    setImporting(true); setStatus('Importando...')
    try {
      if (cfg.special === 'presupuesto') {
        let created = 0, updated = 0, skipped = 0; const fkErrors = []
        for (const row of rows) {
          const proyVal = getVal(row, 'proyecto'); const anio = parseInt(getVal(row, 'anio') || 0)
          if (!proyVal || !anio) { skipped++; continue }
          const proyId = resolveFk('proyecto', proyVal)
          if (proyId == null) { fkErrors.push('proyecto: "' + proyVal + '"'); skipped++; continue }
          const key = proyId + '_' + anio
          const exists = !!(presupuestos || {})[key]
          const obj = { equipo: parseFloat(getVal(row, 'equipo') || 0) || 0, operativo: parseFloat(getVal(row, 'operativo') || 0) || 0, estudiantes: parseFloat(getVal(row, 'estudiantes') || 0) || 0 }
          if (exists) updated++; else created++
          await (exists ? apiPut('/presupuesto/' + key, obj) : apiPost('/presupuesto', { ...obj, id: key }))
        }
        let msg = '✅ ' + created + ' nuevos, ' + updated + ' actualizados, ' + skipped + ' omitidos.'
        if (fkErrors.length) msg += ' ⚠️ Sin resolver: ' + [...new Set(fkErrors)].slice(0, 4).join('; ')
        setStatus(msg); setImporting(false); return
      }
      const existing = data[entity] || []; let created = 0, updated = 0, skipped = 0; const fkErrors = []
      for (const row of rows) {
        const obj = {}
        cfg.fields.forEach(f => {
          const v = getVal(row, f); if (!v) return
          if (cfg.fk && cfg.fk[f]) { const id = resolveFk(f, v); if (id != null) obj[cfg.fk[f].id] = id; else fkErrors.push(f + ': "' + v + '"') }
          else if (f === 'subcategorias') obj[f] = v.split(',').map(s => s.trim()).filter(Boolean)
          else if (f === 'horasSemanales') obj[f] = parseFloat(v) || 0
          else obj[f] = v
        })
        const req = cfg.required || []; if (req.some(r => !getVal(row, r))) { skipped++; continue }
        let id, ex = null
        if (cfg.key) { ex = existing.find(x => normI(x[cfg.key] || '') === normI(obj[cfg.key] || '')) }
        if (ex) { id = ex.id; updated++ } else { id = Date.now() + created; obj.id = id; created++ }
        if (ex) { await apiPut('/' + entity + '/' + id, { ...obj, id }) } else { await apiPost('/' + entity, { ...obj, id }) }
      }
      let msg = '✅ ' + created + ' nuevos, ' + updated + ' actualizados, ' + skipped + ' omitidos.'
      if (fkErrors.length) msg += ' ⚠️ Sin resolver: ' + [...new Set(fkErrors)].slice(0, 4).join('; ')
      setStatus(msg)
    } catch (e) { setStatus('❌ Error: ' + e.message); toast.error('Error al importar: ' + e.message) }
    setImporting(false)
  }

  const changeEntity = v => { setEntity(v); setRows([]); setHeaders([]); setColMap({}); setPreview([]); setStatus(''); setShowCurrent(false) }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8, marginBottom: 20 }}>
        {Object.entries(ENTITY_CONFIG).map(([k, c]) => (
          <div key={k} onClick={() => changeEntity(k)} style={{ background: entity === k ? NAVY : '#fff', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '2px solid ' + (entity === k ? NAVY : 'transparent'), transition: 'all .15s' }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{c.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: entity === k ? '#fff' : NAVY }}>{c.label}</div>
            <div style={{ fontSize: 11, color: entity === k ? '#93c5fd' : '#888', marginTop: 1 }}>{(data[k] || []).length} registros</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, color: NAVY, fontSize: 15 }}>{cfg.icon} {cfg.label}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowCurrent(v => !v)} style={{ background: showCurrent ? '#e0e7ff' : '#f1f5f9', color: showCurrent ? BLUE : '#555', border: 'none', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {showCurrent ? '▲ Ocultar datos' : '📊 Ver datos actuales (' + currentRecs.length + ')'}
            </button>
            <button onClick={dlTemplate} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📥 Descargar plantilla</button>
          </div>
        </div>
        {showCurrent && (
          <div style={{ marginBottom: 16, border: '1px solid #e0e7ff', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#f0f4ff', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: NAVY }}>{currentRecs.length} registros actuales</div>
            <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ background: '#f8f9ff' }}>{previewFields.map(f => <th key={f} style={{ padding: '6px 10px', textAlign: 'left', color: '#888', fontWeight: 700, borderBottom: '1px solid #e8e8f0', whiteSpace: 'nowrap' }}>{f}</th>)}</tr></thead>
                <tbody>{currentRecs.slice(0, 50).map((r, i) => <tr key={i} style={{ borderBottom: '1px solid #f0f0f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>{previewFields.map(f => <td key={f} style={{ padding: '5px 10px', color: '#444', whiteSpace: 'nowrap' }}>{String(r[f] || '—').slice(0, 40)}</td>)}</tr>)}</tbody>
              </table>
              {currentRecs.length > 50 && <div style={{ padding: '6px 12px', fontSize: 10, color: '#aaa' }}>Mostrando 50 de {currentRecs.length}</div>}
            </div>
          </div>
        )}
        <div style={{ borderTop: '1px solid #f0f4f8', paddingTop: 16 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, color: NAVY }}>⬆️ Importar desde Excel</h4>
          <div style={{ background: '#f8f9ff', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 11, color: '#555' }}>
            <strong>Campos:</strong> {cfg.fields.join(', ')}
            {cfg.fk && <span style={{ color: AMBER, marginLeft: 6 }}>· Campos FK en texto (nombre/código), no IDs.</span>}
          </div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ fontSize: 12, marginBottom: 12 }} />
          {headers.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Mapeo de columnas</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {cfg.fields.map(field => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#555', marginBottom: 3 }}>{field}</label>
                    <select value={colMap[field] != null ? colMap[field] : ''} onChange={e => setColMap(prev => ({ ...prev, [field]: e.target.value === '' ? undefined : parseInt(e.target.value) }))} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 11 }}>
                      <option value="">— No mapear —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
          {preview.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Vista previa</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr style={{ background: '#f8f9ff' }}>{cfg.fields.map(f => <th key={f} style={{ padding: '5px 8px', textAlign: 'left', color: '#888', fontWeight: 700, borderBottom: '1px solid #e8e8f0', whiteSpace: 'nowrap' }}>{f}</th>)}</tr></thead>
                  <tbody>{preview.map((r, i) => <tr key={i} style={{ borderBottom: '1px solid #f0f0f8' }}>{cfg.fields.map(f => <td key={f} style={{ padding: '5px 8px', color: '#444', whiteSpace: 'nowrap' }}>{getVal(r, f) || <span style={{ color: '#ccc' }}>—</span>}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {status && <div style={{ marginBottom: 12, fontSize: 12, padding: '8px 12px', borderRadius: 7, background: status.startsWith('✅') ? '#dcfce7' : status.startsWith('❌') ? '#fee2e2' : '#fef3c7', color: status.startsWith('✅') ? GREEN : status.startsWith('❌') ? RED : AMBER }}>{status}</div>}
          {rows.length > 0 && <button onClick={doImport} disabled={importing} style={{ background: importing ? '#94a3b8' : NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: importing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>{importing ? 'Importando...' : '⬆️ Importar ' + rows.length + ' filas'}</button>}
        </div>
      </div>
    </div>
  )
}

export function TabDatos({ data, gT, gU, gSede, gPl, gPy, gTN, gP, a30, a60, a90, getP, totalCat, bitacora, presupuestos }) {
  const [importTab, setImportTab] = useState('export')
  const dU = d => Math.ceil((new Date(d) - new Date()) / 86400000)
  const gUN = id => { const u = gU(id); return u ? u.nombre || u.codigo || '-' : '-' }
  const gFuente = id => (data.fuentes || []).find(x => x.id === Number(id))
  const gGestor = id => (data.gestores || []).find(x => x.id === Number(id))
  const gVin = id => (data.vinculaciones || []).find(x => x.id === Number(id))
  const gVig = id => (data.plaza_vigencia || []).find(x => x.vigenciaid === Number(id))

  const buildSheets = () => {
    const plazas = { headers: ['Código', 'Horas/sem', 'CF', 'Vigencia', 'Actividad', 'Interno'], rows: data.plazas.map(p => [p.codigo, p.horasSemanales, p.cf, gVig(p.vigenciaId)?.vigencia || '-', p.actividad, p.interno]) }
    const profesores = { headers: ['Nombre', 'Cédula', 'Email', 'Unidades'], rows: data.profesores.map(p => [p.nombre, p.cedula, p.email, (p.unidades || []).map(id => { const u = gU(id); return u ? u.nombre || u.codigo || '' : '' }).filter(Boolean).join(' / ')]) }
    const proyectos = { headers: ['Código', 'Nombre', 'Sede', 'Unidad', 'Tipo', 'Subcategoría', 'Inicio', 'Fin', 'Estado', 'Fuente', 'Gestor', 'Vinculación', 'Coordinador'], rows: data.proyectos.map(p => [p.codigo || '-', p.nombre, gSede(p.sedeId)?.nombre || '-', gUN(p.unidadId), gT(p.tipoId)?.nombre || '-', p.subcategoria || '-', fmtD(p.inicio), fmtD(p.fin), p.estado, gFuente(p.fuenteId)?.nombre || '-', gGestor(p.gestorId)?.nombre || '-', gVin(p.vinculacionId)?.nombre || '-', gP(p.coordinadorId)?.nombre || '-']) }
    const nombramientos = { headers: ['Plaza', 'CF', 'Profesor', 'Cédula', 'Unidad', 'Proyecto', 'Tipo Nombramiento', 'Horas', '%', 'Inicio', 'Fin', 'Estado', 'Verificación', 'Observaciones'], rows: data.nombramientos.map(n => { const pl = gPl(n.plazaId); const prof = gP(n.profesorId); const verif = data.verificaciones.find(v => v.id === n.verificacionId)?.nombre || '-'; return [pl?.codigo || '-', pl?.cf || '-', prof?.nombre || '-', prof?.cedula || '-', gUN(n.unidadId), gPy(n.proyectoId)?.nombre || '-', gTN(n.tipoNombramientoId)?.nombre || '-', n.horas, Math.round(parseFloat(n.horas || 0) / 40 * 100), fmtD(n.inicio), fmtD(n.fin), n.estado, verif, n.observaciones || ''] }) }
    const unidades = { headers: ['Código', 'Nombre'], rows: data.unidades.map(u => [u.codigo, u.nombre]) }
    const sedes = { headers: ['Nombre'], rows: data.sedes.map(s => [s.nombre]) }
    const tiposNom = { headers: ['Nombre'], rows: data.tiposNombramiento.map(t => [t.nombre]) }
    const tiposAct = { headers: ['Nombre', 'Subcategorías'], rows: data.tiposActividad.map(t => [t.nombre, (t.subcategorias || []).join(', ')]) }
    const disponibilidad = {
      headers: ['Plaza', 'CF', 'Horas Totales', 'Horas Usadas', 'Horas Libres', 'Vigencia', 'Actividad', 'Noms. Activos'],
      rows: data.plazas.map(pl => { const nomsAct = data.nombramientos.filter(n => n.plazaId === pl.id && n.estado === 'Activo'); const usadas = r2(nomsAct.reduce((s, n) => s + nh(n.horas), 0)); return [pl.codigo, pl.cf, pl.horasSemanales, usadas, r2(pl.horasSemanales - usadas), gVig(pl.vigenciaId)?.vigencia || '-', pl.actividad, nomsAct.length] })
    }
    const todasAlertas = [...a30.map(n => ({ ...n, rango: '0-30 días' })), ...a60.map(n => ({ ...n, rango: '31-60 días' })), ...a90.map(n => ({ ...n, rango: '61-90 días' }))]
    const alertas = { headers: ['Rango', 'Plaza', 'Profesor', 'Unidad', 'Proyecto', 'Tipo Nomb.', 'Horas', '%', 'Inicio', 'Fin', 'Días Rest.'], rows: todasAlertas.map(n => [n.rango, gPl(n.plazaId)?.codigo || '-', gP(n.profesorId)?.nombre || '-', gUN(n.unidadId), gPy(n.proyectoId)?.nombre || '-', gTN(n.tipoNombramientoId)?.nombre || '-', n.horas, Math.round(parseFloat(n.horas || 0) / 40 * 100), fmtD(n.inicio), fmtD(n.fin), n.fin ? dU(n.fin) : '']) }
    const presupRows = []
    data.proyectos.forEach(p => { const anios = getAnios(p); anios.forEach(a => { const eq = totalCat(p.id, a, 'equipo'), op = totalCat(p.id, a, 'operativo'), est = totalCat(p.id, a, 'estudiantes'), tot = eq + op + est; if (tot > 0) presupRows.push([p.nombre, gT(p.tipoId)?.nombre || '-', gUN(p.unidadId), a, eq, op, est, tot]) }) })
    const presupuesto = { headers: ['Proyecto', 'Tipo', 'Unidad', 'Año', 'Equipo', 'Operativo', 'Estudiantes', 'Total'], rows: presupRows }
    const verificaciones = { headers: ['Nombre', 'Color'], rows: data.verificaciones.map(v => [v.nombre, v.color || '']) }
    const cfs = { headers: ['Código', 'Nombre'], rows: data.cfs.map(c => [c.codigo || '', c.nombre || '']) }
    const fuentes = { headers: ['Nombre'], rows: (data.fuentes || []).map(f => [f.nombre]) }
    const gestores = { headers: ['Nombre'], rows: (data.gestores || []).map(g => [g.nombre]) }
    const vinculaciones = { headers: ['Nombre'], rows: (data.vinculaciones || []).map(v => [v.nombre]) }
    const bitacoraSheet = { headers: ['#', 'Fecha', 'Hora', 'Usuario', 'Acción', 'Pestaña', 'Detalle'], rows: (bitacora || []).map(e => [e.id, fmtD(e.fecha), e.hora, e.usuario, e.accion, e.entidad, e.detalle]) }
    return { plazas, profesores, proyectos, nombramientos, disponibilidad, alertas, presupuesto, unidades, sedes, tiposNom, tiposAct, verificaciones, cfs, fuentes, gestores, vinculaciones, bitacora: bitacoraSheet }
  }

  const dlSheet = (nombre, sheet) => { const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]); XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31)); XLSX.writeFile(wb, nombre + '_' + new Date().toISOString().slice(0, 10) + '.xlsx') }
  const dlTodo = () => {
    const sheets = buildSheets(); const wb = XLSX.utils.book_new()
    const defs = [{ key: 'plazas', label: 'Plazas' }, { key: 'profesores', label: 'Profesores' }, { key: 'proyectos', label: 'Proyectos' }, { key: 'nombramientos', label: 'Nombramientos' }, { key: 'disponibilidad', label: 'Disponibilidad' }, { key: 'alertas', label: 'Alertas' }, { key: 'presupuesto', label: 'Presupuesto' }, { key: 'unidades', label: 'Unidades' }, { key: 'sedes', label: 'Sedes' }, { key: 'tiposNom', label: 'Tipos Nombramiento' }, { key: 'tiposAct', label: 'Tipos Actividad' }, { key: 'verificaciones', label: 'Verificaciones' }, { key: 'cfs', label: 'CF de Plazas' }, { key: 'fuentes', label: 'Fuentes' }, { key: 'gestores', label: 'Gestores' }, { key: 'vinculaciones', label: 'Vinculaciones' }, { key: 'bitacora', label: 'Bitácora' }]
    defs.forEach(d => { const ws = XLSX.utils.aoa_to_sheet([sheets[d.key].headers, ...sheets[d.key].rows]); XLSX.utils.book_append_sheet(wb, ws, d.label) })
    XLSX.writeFile(wb, 'GestionPlazasVIE_' + new Date().toISOString().slice(0, 10) + '.xlsx')
  }

  const CARDS = [
    { key: 'plazas', label: 'Plazas', icon: '📋', desc: 'Código, horas, CF, estado, actividad' },
    { key: 'profesores', label: 'Profesores', icon: '👨‍🏫', desc: 'Nombre, cédula, email, unidades' },
    { key: 'proyectos', label: 'Proyectos', icon: '📁', desc: 'Código, nombre, sede, unidad, tipo, subcategoría, fechas, estado, fuente, gestor, vinculación, coordinador' },
    { key: 'nombramientos', label: 'Nombramientos', icon: '📝', desc: 'Plaza, profesor, proyecto, horas, fechas' },
    { key: 'disponibilidad', label: 'Disponibilidad', icon: '⏱️', desc: 'Horas totales, usadas y libres por plaza' },
    { key: 'alertas', label: 'Alertas', icon: '🔔', desc: 'Nombramientos próximos a vencer (30/60/90 días)' },
    { key: 'presupuesto', label: 'Presupuesto', icon: '💰', desc: 'Presupuesto por proyecto, unidad y año' },
    { key: 'unidades', label: 'Unidades', icon: '🏛️', desc: 'Código y nombre de cada unidad' },
    { key: 'sedes', label: 'Sedes', icon: '📍', desc: 'Listado de sedes' },
    { key: 'tiposNom', label: 'Tipos de Nombramiento', icon: '📄', desc: 'Listado de tipos de nombramiento' },
    { key: 'tiposAct', label: 'Tipos de Actividad', icon: '🏷️', desc: 'Nombre y subcategorías' },
    { key: 'verificaciones', label: 'Verificaciones', icon: '✅', desc: 'Tipos de verificación y color' },
    { key: 'cfs', label: 'CF de Plazas', icon: '🏷️', desc: 'Código y nombre de cada CF' },
    { key: 'fuentes', label: 'Fuentes', icon: '💼', desc: 'Listado de fuentes de financiamiento' },
    { key: 'gestores', label: 'Gestores', icon: '👤', desc: 'Listado de gestores' },
    { key: 'vinculaciones', label: 'Vinculaciones', icon: '🔗', desc: 'Listado de tipos de vinculación' },
    { key: 'bitacora', label: 'Bitácora', icon: '📔', desc: 'Registro de acciones del sistema' },
  ]

  const sheets = buildSheets()

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 18, background: '#e4e9f0', borderRadius: 10, padding: 4 }}>
        {[{ k: 'export', l: '⬇️ Exportar' }, { k: 'import', l: '⬆️ Importar Excel' }, { k: 'inconsistencias', l: '⚠️ Inconsistencias' }].map(s => (
          <button key={s.k} onClick={() => setImportTab(s.k)} style={{ padding: '7px 18px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: importTab === s.k ? 700 : 500, background: importTab === s.k ? '#fff' : 'transparent', color: importTab === s.k ? NAVY : '#666', boxShadow: importTab === s.k ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>{s.l}</button>
        ))}
      </div>

      {importTab === 'export' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Exportar Datos</h2>
            <button onClick={dlTodo} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>⬇️ Descargar Todo (Excel)</button>
          </div>
          <p style={{ color: '#888', fontSize: 12, marginTop: -12, marginBottom: 20 }}>Descarga todas las hojas en un solo archivo o cada sección por separado.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {CARDS.map(c => (
              <div key={c.key} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <div><div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{c.label}</div><div style={{ fontSize: 11, color: '#aaa' }}>{c.desc}</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0f0f8', paddingTop: 10 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>{sheets[c.key].rows.length} registros</span>
                  <button onClick={() => dlSheet(c.label, sheets[c.key])} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⬇️ Descargar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {importTab === 'import' && <ImportadorExcel data={data} presupuestos={presupuestos} />}
      {importTab === 'inconsistencias' && <InconsistenciasPanel data={data} />}
    </div>
  )
}
