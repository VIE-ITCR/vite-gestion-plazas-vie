import { useState, useMemo, useEffect } from 'react'
import { apiPost, apiPut, apiDelete } from '../api'
import { NAVY, BLUE, RED } from '../constants'
import { SUBTABS_CAT } from '../constants'
import { match, fmtD, nh } from '../utils'
import { Modal, Field, Btn, Badge, FBar, FSel, SearchBar, SearchableSelect, inp } from '../components/ui'
import { useToast, useConfirm } from '../context/toast'

const ESTADO_COLORS = {
  Permanente: ['#dbeafe', '#1e40af'],
  Temporal: ['#fef3c7', '#92400e'],
  Consolidado: ['#d1fae5', '#065f46'],
  'Ley de Cemento': ['#ede9fe', '#5b21b6']
}

function CfH({ title, onNew, label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>{title}</h2>
      {onNew && <Btn onClick={onNew}>{label}</Btn>}
    </div>
  )
}

export function NomTable({ noms, showPlaza, showProf, showProy, onEdit, onDelete, gPl, gP, gPy, dU, tiposNombramiento }) {
  if (!noms.length) return <p style={{ margin: 0, fontSize: 12, color: '#bbb' }}>Sin nombramientos.</p>
  const gTN = id => (tiposNombramiento || []).find(x => x.id === Number(id))
  const cols = [
    showPlaza && { l: 'Plaza', r: n => <span style={{ fontWeight: 700, color: BLUE }}>{gPl(n.plazaId)?.codigo || '-'}</span> },
    showProf && { l: 'Profesor', r: n => gP(n.profesorId)?.nombre || '-' },
    showProy && { l: 'Proyecto', r: n => gPy(n.proyectoId)?.nombre || '-' },
    { l: 'Tipo', r: n => n.tipoNombramientoId ? <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{gTN(n.tipoNombramientoId)?.nombre || '-'}</span> : <span style={{ color: '#aaa' }}>-</span> },
    { l: 'Horas', r: n => <strong>{n.horas}h</strong> },
    { l: 'Fin', r: n => <span style={{ color: dU(n.fin) <= 30 && n.estado === 'Activo' ? RED : '#666' }}>{fmtD(n.fin)}</span> },
    { l: 'Estado', r: n => <Badge text={n.estado} /> }
  ].filter(Boolean)
  return (
    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f8f9ff' }}>
          {cols.map((c, i) => <th key={i} style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, color: '#888', fontSize: 10 }}>{c.l}</th>)}
          {(onEdit || onDelete) && <th style={{ padding: '5px 8px' }}></th>}
        </tr>
      </thead>
      <tbody>
        {noms.map((n, i) => (
          <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderTop: '1px solid #f0f0f8' }}>
            {cols.map((c, j) => <td key={j} style={{ padding: '5px 8px' }}>{c.r(n)}</td>)}
            {(onEdit || onDelete) && <td style={{ padding: '4px 8px' }}><div style={{ display: 'flex', gap: 4 }}>{onEdit && <Btn onClick={() => onEdit(n)} sm>Editar</Btn>}{onDelete && <Btn onClick={() => onDelete(n)} color={RED} sm>Eliminar</Btn>}</div></td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TabCatalogos({ data, setData, userPermisos, logMov, bitacora, gSede, gP, gPl, gPy, dU, jumpQ }) {
  const toast = useToast()
  const showConfirm = useConfirm()
  const [subCat, setSubCat] = useState(() => {
    try { return localStorage.getItem('vie_subcat') || 'unidades' } catch { return 'unidades' }
  })

  useEffect(() => {
    if (jumpQ?.tab === 'catalogos' && jumpQ.subCat && jumpQ.q) {
      setSubCat(jumpQ.subCat)
      if (jumpQ.subCat === 'profesores') setFP(p => ({ ...p, q: jumpQ.q }))
    }
  }, [jumpQ])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [histModal, setHistModal] = useState(null)

  const [fU, setFU] = useState('')
  const [fP, setFP] = useState({ q: '', unidad: '', expanded: null })
  const [fT, setFT] = useState('')
  const [fTN, setFTN] = useState('')
  const [fSedes, setFSedes] = useState('')
  const [fVerif, setFVerif] = useState('')
  const [fCF, setFCF] = useState('')
  const [fVig, setFVig] = useState('')
  const [fNomEst, setFNomEst] = useState('')
  const [fVin, setFVin] = useState('')
  const [fGestores, setFGestores] = useState('')
  const [fFuentes, setFFuentes] = useState('')
  const [fAct, setFAct] = useState({ q: '', tipo: '' })

  const pE = k => {
    const p = userPermisos[k]
    return (p !== undefined ? p : userPermisos['catalogos'] || 'none') === 'write'
  }
  const catPk = () => subCat === 'actividades' ? 'plazas' : SUBTABS_CAT.find(s => s.k === subCat)?.pk || 'cat_unidades'

  const closeM = () => { setModal(null); setForm({}) }
  const openNew = t => { if (!pE(catPk())) return; setModal({ type: t, mode: 'new' }); setForm({}) }
  const openEdit = (t, r) => { if (!pE(catPk())) return; setModal({ type: t, mode: 'edit' }); setForm({ ...r }) }
  const ff = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const del = async (type, id) => {
    if (!pE(catPk())) { toast.error('Sin permisos de escritura.'); return }
    const item = data[type]?.find(x => x.id === id)
    const nombre = item ? (item.nombre || item.codigo || ('id=' + id)) : ('id=' + id)
    const refs = {
      unidades: () => data.profesores.some(x => x.unidades?.includes(id)) || data.plazas.some(x => x.unidadId === id) || data.nombramientos.some(x => x.unidadId === id),
      profesores: () => data.nombramientos.some(x => x.profesorId === id),
      tiposActividad: () => data.proyectos.some(x => x.tipoId === id),
      tiposNombramiento: () => data.nombramientos.some(x => x.tipoNombramientoId === id),
      sedes: () => data.proyectos.some(x => x.sedeId === id),
      plazas: () => data.nombramientos.some(x => x.plazaId === id),
      verificaciones: () => data.nombramientos.some(x => x.verificacionId === id),
    }
    if (refs[type] && refs[type]()) {
      toast.error('No se puede eliminar "' + nombre + '" porque está en uso en otros registros.')
      return
    }
    if (!await showConfirm('¿Eliminar "' + nombre + '"?', { danger: true, okText: 'Eliminar' })) return
    apiDelete('/' + type + '/' + id)
      .then(() => setData(prev => ({ ...prev, [type]: (prev[type] || []).filter(x => x.id !== id) })))
      .catch(e => toast.error('Error al eliminar: ' + e.message))
    logMov('Eliminar', type, nombre, id, type)
  }

  const save = async type => {
    if (!pE(catPk())) { toast.error('Sin permisos de escritura.'); return }
    const isNew = modal.mode === 'new'
    const detalle = String(form.nombre || form.codigo || `id=${form.id || 'nuevo'}`)
    const item = Object.fromEntries(Object.entries({ ...form }).filter(([, v]) => v !== undefined))
    if (item.inicio && item.fin) {
      const ini = new Date(item.inicio), fin = new Date(item.fin)
      if (ini.getFullYear() < 2000 || ini.getFullYear() > 2100 || fin.getFullYear() < 2000 || fin.getFullYear() > 2100) {
        toast.error('Las fechas deben estar entre los años 2000 y 2100.'); return
      }
      if (fin <= ini) { toast.error('La fecha de fin debe ser posterior a la fecha de inicio.'); return }
      const diffAnios = (fin - ini) / (1000 * 60 * 60 * 24 * 365.25)
      if (diffAnios > 5 && !await showConfirm(`El registro tiene una duración de ${diffAnios.toFixed(1)} años. ¿Desea continuar?`, { okText: 'Continuar' })) return
    }
    const apiCall = isNew ? apiPost('/' + type, item) : apiPut('/' + type + '/' + item.id, item)
    apiCall.then(res => {
      const saved = isNew ? { ...item, id: res.id } : item
      setData(prev => {
        const arr = prev[type] || []
        return { ...prev, [type]: isNew ? [...arr, saved] : arr.map(x => x.id === saved.id ? saved : x) }
      })
      logMov(isNew ? 'Crear' : 'Editar', type, detalle, saved.id, type)
      closeM()
      toast.success('Guardado.')
    }).catch(e => toast.error('Error al guardar: ' + e.message))
  }

  const filtU = useMemo(() => data.unidades.filter(u => match(u.nombre, fU) || match(u.codigo, fU)), [data.unidades, fU])
  const filtP = useMemo(() => data.profesores.filter(p => match(p.nombre, fP.q) && (!fP.unidad || (p.unidades || []).includes(parseInt(fP.unidad)))), [data.profesores, fP])
  const filtT = useMemo(() => data.tiposActividad.filter(t => match(t.nombre, fT)), [data.tiposActividad, fT])
  const filtTN = useMemo(() => data.tiposNombramiento.filter(t => match(t.nombre, fTN)), [data.tiposNombramiento, fTN])
  const filtSedes = useMemo(() => data.sedes.filter(s => match(s.nombre, fSedes)), [data.sedes, fSedes])
  const filtVerif = useMemo(() => data.verificaciones.filter(v => match(v.nombre, fVerif)), [data.verificaciones, fVerif])
  const filtCF = useMemo(() => data.cfs.filter(c => match(c.nombre, fCF) || match(c.codigo, fCF)), [data.cfs, fCF])
  const filtVig = useMemo(() => (data.plaza_vigencia || []).filter(v => match(v.vigencia, fVig)), [data.plaza_vigencia, fVig])
  const filtNomEst = useMemo(() => (data.nombramiento_estado || []).filter(e => match(e.estado, fNomEst)), [data.nombramiento_estado, fNomEst])
  const filtVin = useMemo(() => data.vinculaciones.filter(v => match(v.nombre, fVin)), [data.vinculaciones, fVin])
  const filtGestores = useMemo(() => data.gestores.filter(g => match(g.nombre, fGestores)), [data.gestores, fGestores])
  const filtFuentes = useMemo(() => data.fuentes.filter(f => match(f.nombre, fFuentes)), [data.fuentes, fFuentes])
  const filtAct = useMemo(() => data.plazas.filter(p => match(p.codigo, fAct.q) && (!fAct.tipo || p.actividad === fAct.tipo)), [data.plazas, fAct])

  const catTabPerm = userPermisos['catalogos'] || 'none'
  const visibleSubs = SUBTABS_CAT.filter(s => {
    const p = userPermisos[s.pk]
    return p !== undefined ? p !== 'none' : catTabPerm !== 'none'
  })
  const activeSub = visibleSubs.find(s => s.k === subCat)?.k || visibleSubs[0]?.k || subCat

  return (
    <div>
      <h2 style={{ margin: '0 0 14px', color: NAVY, fontSize: 17 }}>Catálogos</h2>

      <div style={{ display: 'flex', gap: 2, marginBottom: 18, background: '#e4e9f0', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {visibleSubs.map(s => (
          <button key={s.k} onClick={() => { setSubCat(s.k); try { localStorage.setItem('vie_subcat', s.k) } catch {} }}
            style={{ padding: '7px 16px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: activeSub === s.k ? 700 : 500, background: activeSub === s.k ? '#fff' : 'transparent', color: activeSub === s.k ? NAVY : '#666', boxShadow: activeSub === s.k ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}
          >{s.l}</button>
        ))}
      </div>

      {activeSub === 'unidades' && (
        <div>
          <CfH title="Unidades Académicas" onNew={pE(catPk()) ? () => openNew('unidades') : null} label="+ Nueva Unidad" />
          <FBar count={filtU.length} total={data.unidades.length}><SearchBar value={fU} onChange={setFU} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Código', 'Nombre', 'Sede', 'Profesores', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0', background: '#f8f9ff' }}>{h}</th>)}</tr></thead>
              <tbody>{filtU.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 700, color: BLUE }}>{u.codigo}</td>
                  <td style={{ padding: '9px 10px', fontWeight: 600 }}>{u.nombre}</td>
                  <td style={{ padding: '9px 10px' }}>{gSede(u.sedeId)?.nombre ? <span style={{ background: '#fce7f3', color: '#9d174d', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{gSede(u.sedeId).nombre}</span> : <span style={{ color: '#aaa' }}>—</span>}</td>
                  <td style={{ padding: '9px 10px' }}>{data.profesores.filter(p => (p.unidades || []).includes(u.id)).length}</td>
                  <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {pE(catPk()) && <Btn onClick={() => openEdit('unidades', u)} sm>Editar</Btn>}
                    <Btn onClick={() => setHistModal({ type: 'unidades', id: u.id, nombre: u.nombre || u.codigo })} sm color="#7c3aed">📔</Btn>
                    {pE(catPk()) && <Btn onClick={() => del('unidades', u.id)} color={RED} sm>Eliminar</Btn>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {modal?.type === 'unidades' && (
            <Modal title={modal.mode === 'new' ? 'Nueva Unidad' : 'Editar Unidad'} onClose={closeM}>
              <Field label="Código"><input style={inp} value={form.codigo || ''} onChange={e => ff('codigo', e.target.value)} /></Field>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} /></Field>
              <Field label="Sede">
                <select style={inp} value={form.sedeId || ''} onChange={e => ff('sedeId', parseInt(e.target.value) || '')}>
                  <option value="">Sin sede</option>
                  {[...data.sedes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => save('unidades')}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'profesores' && (
        <div>
          <CfH title="Profesores" onNew={pE(catPk()) ? () => openNew('profesores') : null} label="+ Nuevo Profesor" />
          <FBar count={filtP.length} total={data.profesores.length}>
            <SearchBar value={fP.q} onChange={v => setFP(p => ({ ...p, q: v }))} />
            <FSel value={fP.unidad} onChange={v => setFP(p => ({ ...p, unidad: v }))} placeholder="Todas las unidades" options={[...data.unidades].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(u => ({ v: u.id, l: u.nombre }))} />
          </FBar>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtP.map(p => {
              const noms2 = data.nombramientos.filter(n => n.profesorId === p.id)
              const hAct = noms2.filter(n => n.estado === 'Activo').reduce((s, n) => s + nh(n.horas), 0)
              const exp = fP.expanded === p.id
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: NAVY, flexShrink: 0 }}>{p.nombre.charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nombre}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{(p.unidades || []).map(u => data.unidades.find(x => x.id === u)?.codigo || '').filter(Boolean).join(', ') || 'Sin unidad'}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontWeight: 700, color: BLUE, fontSize: 14 }}>{hAct}h</div>
                      <div style={{ color: '#aaa', fontSize: 9 }}>activas</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      {noms2.length > 0 && <Btn onClick={() => setFP(prev => ({ ...prev, expanded: exp ? null : p.id }))} sm color={exp ? NAVY : '#dbeafe'} style={{ color: exp ? '#fff' : NAVY }}>{exp ? 'Ocultar' : 'Nomb.'}</Btn>}
                      {pE(catPk()) && <Btn onClick={() => openEdit('profesores', p)} sm>Editar</Btn>}
                      <Btn onClick={() => setHistModal({ type: 'profesores', id: p.id, nombre: p.nombre })} sm color="#7c3aed">📔</Btn>
                      {pE(catPk()) && <Btn onClick={() => del('profesores', p.id)} color={RED} sm>Eliminar</Btn>}
                    </div>
                  </div>
                  {exp && (
                    <div style={{ borderTop: '1px solid #f0f0f8', padding: '10px 14px', background: '#f8fbff' }}>
                      <NomTable noms={noms2} showPlaza showProf={false} showProy gPl={gPl} gP={gP} gPy={gPy} dU={dU} tiposNombramiento={data.tiposNombramiento} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {modal?.type === 'profesores' && (
            <Modal title={modal.mode === 'new' ? 'Nuevo Profesor' : 'Editar Profesor'} onClose={closeM}>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} /></Field>
              <Field label="Cédula"><input style={inp} value={form.cedula || ''} onChange={e => ff('cedula', e.target.value)} /></Field>
              <Field label="Email"><input style={inp} value={form.email || ''} onChange={e => ff('email', e.target.value)} /></Field>
              <Field label="Unidades">
                <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 7, padding: 8, maxHeight: 150, overflowY: 'auto', background: '#fafafa' }}>
                  {[...data.unidades].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', cursor: 'pointer', fontSize: 12 }}>
                      <input type="checkbox" checked={(form.unidades || []).includes(u.id)} onChange={e => ff('unidades', e.target.checked ? [...(form.unidades || []), u.id] : (form.unidades || []).filter(x => x !== u.id))} />
                      {u.nombre} ({u.codigo})
                    </label>
                  ))}
                </div>
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => save('profesores')}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'tipos' && (
        <div>
          <CfH title="Tipos de Actividad" onNew={pE(catPk()) ? () => openNew('tiposActividad') : null} label="+ Nuevo Tipo" />
          <FBar count={filtT.length} total={data.tiposActividad.length}><SearchBar value={fT} onChange={setFT} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Tipo', 'Subcategorías', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0', background: '#f8f9ff' }}>{h}</th>)}</tr></thead>
              <tbody>{filtT.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 700 }}>{t.nombre}</td>
                  <td style={{ padding: '9px 10px', color: '#666' }}>{(t.subcategorias || []).join(', ') || '-'}</td>
                  <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {pE(catPk()) && <Btn onClick={() => openEdit('tiposActividad', { ...t, subcatsText: (t.subcategorias || []).join(', ') })} sm>Editar</Btn>}
                    <Btn onClick={() => setHistModal({ type: 'tiposActividad', id: t.id, nombre: t.nombre })} sm color="#7c3aed">📔</Btn>
                    {pE(catPk()) && <Btn onClick={() => del('tiposActividad', t.id)} color={RED} sm>Eliminar</Btn>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {modal?.type === 'tiposActividad' && (
            <Modal title={modal.mode === 'new' ? 'Nuevo Tipo' : 'Editar Tipo'} onClose={closeM}>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} /></Field>
              <Field label="Subcategorías (separadas por coma)">
                <input style={inp} value={form.subcatsText || ''} onChange={e => { ff('subcatsText', e.target.value); ff('subcategorias', e.target.value.split(',').map(s => s.trim()).filter(Boolean)) }} />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => save('tiposActividad')}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'actividades' && (
        <div>
          <CfH title="Actividades de Plazas" />
          <FBar count={filtAct.length} total={data.plazas.length}>
            <SearchBar value={fAct.q} onChange={v => setFAct(p => ({ ...p, q: v }))} />
            <FSel value={fAct.tipo} onChange={v => setFAct(p => ({ ...p, tipo: v }))} placeholder="Tipo" options={[{ v: 'Investigacion', l: 'Investigación' }, { v: 'Extension', l: 'Extensión' }]} />
          </FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['Plaza', 'CF', 'Estado', 'Horas/sem', 'Actividad', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{filtAct.map((p, i) => {
                const esInv = p.actividad === 'Investigacion'
                const [bg, fg] = ESTADO_COLORS[p.estado] || ['#f3f4f6', '#374151']
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: BLUE }}>{p.codigo}</td>
                    <td style={{ padding: '9px 10px' }}>{p.cf}</td>
                    <td style={{ padding: '9px 10px' }}><span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.estado}</span></td>
                    <td style={{ padding: '9px 10px', fontWeight: 600 }}>{p.horasSemanales}h</td>
                    <td style={{ padding: '9px 10px' }}><span style={{ background: esInv ? '#eff6ff' : '#f0fdf4', color: esInv ? BLUE : '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{esInv ? '🔬 Investigación' : '🤝 Extensión'}</span></td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}><Btn sm onClick={() => openEdit('plazas', p)}>Cambiar</Btn></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          {modal?.type === 'plazas' && (
            <Modal title="Cambiar Actividad" onClose={closeM}>
              <Field label="Actividad">
                <select style={inp} value={form.actividad || 'Investigacion'} onChange={e => ff('actividad', e.target.value)}>
                  <option value="Investigacion">🔬 Investigación</option>
                  <option value="Extension">🤝 Extensión</option>
                </select>
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => save('plazas')}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'tiposNom' && (
        <div>
          <CfH title="Tipos de Nombramiento" onNew={pE(catPk()) ? () => openNew('tiposNombramiento') : null} label="+ Nuevo Tipo" />
          <FBar count={filtTN.length} total={data.tiposNombramiento.length}><SearchBar value={fTN} onChange={setFTN} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Nombre', 'En uso', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{filtTN.map((t, i) => {
                const usos = data.nombramientos.filter(n => n.tipoNombramientoId === t.id).length
                return (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{t.nombre}</td>
                    <td style={{ padding: '9px 10px' }}>{usos > 0 ? <span style={{ background: '#dbeafe', color: BLUE, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{usos} nomb.</span> : <span style={{ color: '#aaa', fontSize: 12 }}>Sin uso</span>}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE(catPk()) && <Btn onClick={() => openEdit('tiposNombramiento', t)} sm>Editar</Btn>}
                      <Btn onClick={() => setHistModal({ type: 'tiposNombramiento', id: t.id, nombre: t.nombre })} sm color="#7c3aed">📔</Btn>
                      {pE(catPk()) && <Btn onClick={() => { if (usos > 0) { toast.error('En uso.'); return } del('tiposNombramiento', t.id) }} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          {modal?.type === 'tiposNombramiento' && (
            <Modal title={modal.mode === 'new' ? 'Nuevo Tipo' : 'Editar Tipo'} onClose={closeM}>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => { if (!form.nombre?.trim()) { toast.error('Ingrese un nombre.'); return } save('tiposNombramiento') }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'sedes' && (
        <div>
          <CfH title="Sedes" onNew={pE(catPk()) ? () => openNew('sedes') : null} label="+ Nueva Sede" />
          <FBar count={filtSedes.length} total={data.sedes.length}><SearchBar value={fSedes} onChange={setFSedes} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Nombre', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{filtSedes.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                  <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                  <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{s.nombre}</td>
                  <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {pE(catPk()) && <Btn onClick={() => openEdit('sedes', s)} sm>Editar</Btn>}
                    <Btn onClick={() => setHistModal({ type: 'sedes', id: s.id, nombre: s.nombre })} sm color="#7c3aed">📔</Btn>
                    {pE(catPk()) && <Btn onClick={() => del('sedes', s.id)} color={RED} sm>Eliminar</Btn>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {modal?.type === 'sedes' && (
            <Modal title={modal.mode === 'new' ? 'Nueva Sede' : 'Editar Sede'} onClose={closeM}>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => { if (!form.nombre?.trim()) { toast.error('Ingrese un nombre.'); return } save('sedes') }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'verificaciones' && (
        <div>
          <CfH title="Tipos de Verificación" onNew={pE(catPk()) ? () => openNew('verificaciones') : null} label="+ Nuevo Tipo" />
          <FBar count={filtVerif.length} total={data.verificaciones.length}><SearchBar value={fVerif} onChange={setFVerif} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Nombre', 'Color', 'En uso', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{filtVerif.map((v, i) => {
                const usos = data.nombramientos.filter(n => n.verificacionId === v.id).length
                return (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{v.nombre}</td>
                    <td style={{ padding: '9px 10px' }}><span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', background: v.color || '#e5e7eb', border: '1px solid rgba(0,0,0,0.15)', verticalAlign: 'middle' }} /></td>
                    <td style={{ padding: '9px 10px' }}>{usos > 0 ? <span style={{ background: '#dbeafe', color: BLUE, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{usos} nomb.</span> : <span style={{ color: '#aaa', fontSize: 12 }}>Sin uso</span>}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE(catPk()) && <Btn onClick={() => openEdit('verificaciones', v)} sm>Editar</Btn>}
                      <Btn onClick={() => setHistModal({ type: 'verificaciones', id: v.id, nombre: v.nombre })} sm color="#7c3aed">📔</Btn>
                      {pE(catPk()) && <Btn onClick={() => { if (usos > 0) { toast.error('En uso.'); return } del('verificaciones', v.id) }} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          {modal?.type === 'verificaciones' && (
            <Modal title={modal.mode === 'new' ? 'Nueva Verificación' : 'Editar Verificación'} onClose={closeM}>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} /></Field>
              <Field label="Color de resaltado">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" style={{ width: 48, height: 36, padding: 2, border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: 'none' }} value={form.color || '#4f86c6'} onChange={e => ff('color', e.target.value)} />
                  <span style={{ fontSize: 12, color: '#666' }}>Se usará para resaltar las fechas en Nombramientos</span>
                </div>
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => { if (!form.nombre?.trim()) { toast.error('Ingrese un nombre.'); return } save('verificaciones') }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'cfs' && (
        <div>
          <CfH title="CF de Plazas" onNew={pE(catPk()) ? () => openNew('cfs') : null} label="+ Nuevo CF" />
          <FBar count={filtCF.length} total={data.cfs.length}><SearchBar value={fCF} onChange={setFCF} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['Código', 'Nombre', 'Plazas con este CF', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{filtCF.map((c, i) => {
                const usos = data.plazas.filter(p => p.cf === c.nombre).length
                return (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: BLUE }}>{c.codigo || '—'}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{c.nombre}</td>
                    <td style={{ padding: '9px 10px' }}>{usos > 0 ? <span style={{ background: '#dbeafe', color: BLUE, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{usos} plazas</span> : <span style={{ color: '#aaa', fontSize: 12 }}>Sin uso</span>}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE(catPk()) && <Btn onClick={() => openEdit('cfs', c)} sm>Editar</Btn>}
                      <Btn onClick={() => setHistModal({ type: 'cfs', id: c.id, nombre: c.nombre })} sm color="#7c3aed">📔</Btn>
                      {pE(catPk()) && <Btn onClick={() => { if (usos > 0) { toast.error('En uso en ' + usos + ' plazas.'); return } del('cfs', c.id) }} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          {modal?.type === 'cfs' && (
            <Modal title={modal.mode === 'new' ? 'Nuevo CF' : 'Editar CF'} onClose={closeM}>
              <Field label="Código"><input style={inp} value={form.codigo || ''} onChange={e => ff('codigo', e.target.value)} placeholder="Ej: VIE" /></Field>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} placeholder="Ej: Vicerrectoría de Investigación" /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => { if (!form.nombre?.trim()) { toast.error('Ingrese un nombre.'); return } save('cfs') }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'vigencia' && (
        <div>
          <CfH title="Vigencia de Plazas" onNew={pE('cat_vigencia') ? () => { setModal({ type: 'plaza_vigencia', mode: 'new' }); setForm({}) } : null} label="+ Nueva Vigencia" />
          <FBar count={filtVig.length} total={(data.plaza_vigencia || []).length}><SearchBar value={fVig} onChange={setFVig} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Vigencia', 'Plazas con esta vigencia', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{filtVig.map((v, i) => {
                const usos = data.plazas.filter(p => p.vigenciaId === v.vigenciaid).length
                return (
                  <tr key={v.vigenciaid} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{v.vigencia}</td>
                    <td style={{ padding: '9px 10px' }}>{usos > 0 ? <span style={{ background: '#dbeafe', color: BLUE, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{usos} plaza{usos !== 1 ? 's' : ''}</span> : <span style={{ color: '#aaa', fontSize: 12 }}>Sin uso</span>}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE('cat_vigencia') && <Btn onClick={() => { setModal({ type: 'plaza_vigencia', mode: 'edit' }); setForm({ ...v }) }} sm>Editar</Btn>}
                      {pE('cat_vigencia') && <Btn onClick={async () => {
                        if (usos > 0) { toast.error('No se puede eliminar, está en uso en ' + usos + ' plaza' + (usos !== 1 ? 's' : '') + '.'); return }
                        if (!await showConfirm('¿Eliminar "' + v.vigencia + '"?', { danger: true, okText: 'Eliminar' })) return
                        apiDelete('/plaza_vigencia/' + v.vigenciaid)
                          .then(() => setData(prev => ({ ...prev, plaza_vigencia: (prev.plaza_vigencia || []).filter(x => x.vigenciaid !== v.vigenciaid) })))
                          .catch(e => toast.error('Error: ' + e.message))
                      }} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          {modal?.type === 'plaza_vigencia' && (
            <Modal title={modal.mode === 'new' ? 'Nueva Vigencia' : 'Editar Vigencia'} onClose={closeM}>
              <Field label="Vigencia"><input style={inp} value={form.vigencia || ''} onChange={e => ff('vigencia', e.target.value)} placeholder="Ej: Permanente, Temporal..." /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => {
                  if (!form.vigencia?.trim()) { toast.error('Ingrese la vigencia.'); return }
                  if (modal.mode === 'new') {
                    apiPost('/plaza_vigencia', { vigencia: form.vigencia.trim() })
                      .then(r => { setData(prev => ({ ...prev, plaza_vigencia: [...(prev.plaza_vigencia || []), r] })); closeM(); toast.success('Guardado.') })
                      .catch(e => toast.error('Error: ' + e.message))
                  } else {
                    apiPut('/plaza_vigencia/' + form.vigenciaid, { vigencia: form.vigencia.trim() })
                      .then(() => { setData(prev => ({ ...prev, plaza_vigencia: (prev.plaza_vigencia || []).map(x => x.vigenciaid === form.vigenciaid ? { ...x, vigencia: form.vigencia.trim() } : x) })); closeM(); toast.success('Guardado.') })
                      .catch(e => toast.error('Error: ' + e.message))
                  }
                }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'nomEstado' && (
        <div>
          <CfH title="Estado de Nombramientos" onNew={pE('cat_nomEstado') ? () => { setModal({ type: 'nombramiento_estado', mode: 'new' }); setForm({}) } : null} label="+ Nuevo Estado" />
          <FBar count={filtNomEst.length} total={(data.nombramiento_estado || []).length}><SearchBar value={fNomEst} onChange={setFNomEst} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Estado', 'Nombramientos con este estado', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{filtNomEst.map((e, i) => {
                const usos = data.nombramientos.filter(n => n.estadoId === e.estadoid).length
                return (
                  <tr key={e.estadoid} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{e.estado}</td>
                    <td style={{ padding: '9px 10px' }}>{usos > 0 ? <span style={{ background: '#dbeafe', color: BLUE, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{usos} nomb.</span> : <span style={{ color: '#aaa', fontSize: 12 }}>Sin uso</span>}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE('cat_nomEstado') && <Btn onClick={() => { setModal({ type: 'nombramiento_estado', mode: 'edit' }); setForm({ ...e }) }} sm>Editar</Btn>}
                      {pE('cat_nomEstado') && <Btn onClick={async () => {
                        if (usos > 0) { toast.error('No se puede eliminar, está en uso en ' + usos + ' nombramiento' + (usos !== 1 ? 's' : '') + '.'); return }
                        if (!await showConfirm('¿Eliminar "' + e.estado + '"?', { danger: true, okText: 'Eliminar' })) return
                        apiDelete('/nombramiento_estado/' + e.estadoid)
                          .then(() => setData(prev => ({ ...prev, nombramiento_estado: (prev.nombramiento_estado || []).filter(x => x.estadoid !== e.estadoid) })))
                          .catch(e2 => toast.error('Error: ' + e2.message))
                      }} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          {modal?.type === 'nombramiento_estado' && (
            <Modal title={modal.mode === 'new' ? 'Nuevo Estado' : 'Editar Estado'} onClose={closeM}>
              <Field label="Estado"><input style={inp} value={form.estado || ''} onChange={e => ff('estado', e.target.value)} placeholder="Ej: Activo, Finalizado..." /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => {
                  if (!form.estado?.trim()) { toast.error('Ingrese el estado.'); return }
                  if (modal.mode === 'new') {
                    apiPost('/nombramiento_estado', { estado: form.estado.trim() })
                      .then(r => { setData(prev => ({ ...prev, nombramiento_estado: [...(prev.nombramiento_estado || []), r] })); closeM(); toast.success('Guardado.') })
                      .catch(e => toast.error('Error: ' + e.message))
                  } else {
                    apiPut('/nombramiento_estado/' + form.estadoid, { estado: form.estado.trim() })
                      .then(() => { setData(prev => ({ ...prev, nombramiento_estado: (prev.nombramiento_estado || []).map(x => x.estadoid === form.estadoid ? { ...x, estado: form.estado.trim() } : x) })); closeM(); toast.success('Guardado.') })
                      .catch(e => toast.error('Error: ' + e.message))
                  }
                }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'vinculacion' && (
        <div>
          <CfH title="Tipos de Vinculación" onNew={pE(catPk()) ? () => openNew('vinculaciones') : null} label="+ Nuevo Tipo" />
          <FBar count={filtVin.length} total={data.vinculaciones.length}><SearchBar value={fVin} onChange={setFVin} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Tipo de Vinculación', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtVin.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#aaa' }}>Sin registros.</td></tr>}
                {filtVin.map((v, i) => (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{v.nombre}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE(catPk()) && <Btn onClick={() => openEdit('vinculaciones', v)} sm>Editar</Btn>}
                      <Btn onClick={() => setHistModal({ type: 'vinculaciones', id: v.id, nombre: v.nombre })} sm color="#7c3aed">📔</Btn>
                      {pE(catPk()) && <Btn onClick={() => del('vinculaciones', v.id)} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {modal?.type === 'vinculaciones' && (
            <Modal title={modal.mode === 'new' ? 'Nuevo Tipo de Vinculación' : 'Editar Tipo de Vinculación'} onClose={closeM}>
              <Field label="Tipo de Vinculación"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} placeholder="Ej: Investigación, Extensión..." /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => { if (!form.nombre?.trim()) { toast.error('Ingrese el tipo.'); return } save('vinculaciones') }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'gestores' && (
        <div>
          <CfH title="Gestores" onNew={pE(catPk()) ? () => openNew('gestores') : null} label="+ Nuevo Gestor" />
          <FBar count={filtGestores.length} total={data.gestores.length}><SearchBar value={fGestores} onChange={setFGestores} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Nombre', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtGestores.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#aaa' }}>Sin registros.</td></tr>}
                {filtGestores.map((g, i) => (
                  <tr key={g.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{g.nombre}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE(catPk()) && <Btn onClick={() => openEdit('gestores', g)} sm>Editar</Btn>}
                      <Btn onClick={() => setHistModal({ type: 'gestores', id: g.id, nombre: g.nombre })} sm color="#7c3aed">📔</Btn>
                      {pE(catPk()) && <Btn onClick={() => del('gestores', g.id)} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {modal?.type === 'gestores' && (
            <Modal title={modal.mode === 'new' ? 'Nuevo Gestor' : 'Editar Gestor'} onClose={closeM}>
              <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} placeholder="Nombre del gestor..." /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => { if (!form.nombre?.trim()) { toast.error('Ingrese el nombre.'); return } save('gestores') }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {activeSub === 'fuentes' && (
        <div>
          <CfH title="Fuentes de Financiamiento" onNew={pE(catPk()) ? () => openNew('fuentes') : null} label="+ Nueva Fuente" />
          <FBar count={filtFuentes.length} total={data.fuentes.length}><SearchBar value={fFuentes} onChange={setFFuentes} /></FBar>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8f9ff' }}>{['#', 'Financiamiento', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtFuentes.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#aaa' }}>Sin registros.</td></tr>}
                {filtFuentes.map((f, i) => (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    <td style={{ padding: '9px 10px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: NAVY }}>{f.nombre}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pE(catPk()) && <Btn onClick={() => openEdit('fuentes', f)} sm>Editar</Btn>}
                      <Btn onClick={() => setHistModal({ type: 'fuentes', id: f.id, nombre: f.nombre })} sm color="#7c3aed">📔</Btn>
                      {pE(catPk()) && <Btn onClick={() => del('fuentes', f.id)} color={RED} sm>Eliminar</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {modal?.type === 'fuentes' && (
            <Modal title={modal.mode === 'new' ? 'Nueva Fuente' : 'Editar Fuente'} onClose={closeM}>
              <Field label="Financiamiento"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} placeholder="Ej: CONARE, MICITT..." /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn onClick={closeM} color="#888">Cancelar</Btn>
                <Btn onClick={() => { if (!form.nombre?.trim()) { toast.error('Ingrese el financiamiento.'); return } save('fuentes') }}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {histModal && (
        <Modal title={'📔 Historial: ' + histModal.nombre} onClose={() => setHistModal(null)}>
          {(() => {
            const entries = bitacora.filter(b => b.refType === histModal.type && String(b.refId) === String(histModal.id))
            if (!entries.length) return <p style={{ color: '#aaa', fontSize: 12 }}>Sin historial registrado para este elemento.</p>
            return (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {[...entries].reverse().map((b, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f8', fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{b.accion}</span>
                      <span style={{ color: '#888', fontSize: 10 }}>{fmtD(b.fecha)} {b.hora}</span>
                      <span style={{ color: '#aaa', fontSize: 10 }}>{b.usuario}</span>
                    </div>
                    <div style={{ color: '#555' }}>{b.detalle}</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </Modal>
      )}
    </div>
  )
}
