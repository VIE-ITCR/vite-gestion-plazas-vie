import { useState, useMemo, useEffect } from 'react'
import { NAVY, BLUE, RED } from '../constants'
import { nh, match, fmtD } from '../utils'
import { apiPost, apiPut, apiDelete } from '../api'
import { Modal, Field, Btn, Badge, FBar, FSel, SearchBar, SearchableSelect, EmptyState, inp } from '../components/ui'
import { NomTable } from './TabCatalogos'
import { useToast, useConfirm } from '../context/toast'

export function TabProyectos({ data, setData, userPermisos, logMov, bitacora, dU, gP, gPl, gPy, openEditNom, jumpQ, reloadCol }) {
  const toast = useToast()
  const showConfirm = useConfirm()
  const pE = k => (userPermisos[k] || 'none') === 'write'

  const gT = id => data.tiposActividad.find(x => x.id === Number(id))
  const gU = id => data.unidades.find(x => x.id === Number(id))
  const gSede = id => data.sedes.find(x => x.id === Number(id))
  const gFuente = id => data.fuentes.find(x => x.id === Number(id))
  const gVin = id => data.vinculaciones.find(x => x.id === Number(id))
  const gGestor = id => data.gestores.find(x => x.id === Number(id))
  const gNomEst = id => (data.nombramiento_estado || []).find(x => x.estadoid === Number(id))

  const [fPy, setFPy] = useState({ q: '', tipo: '', estado: '', unidad: '', subcat: '', gestor: '', coordinador: '' })

  useEffect(() => {
    if (jumpQ?.tab === 'proyectos' && jumpQ.q) setFPy(p => ({ ...p, q: jumpQ.q }))
  }, [jumpQ])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [histModal, setHistModal] = useState(null)

  const filtPy = useMemo(() =>
    data.proyectos.filter(p => {
      const uni = gU(p.unidadId)
      const textMatch = !fPy.q ||
        match(p.nombre, fPy.q) || match(p.codigo, fPy.q) || match(p.estado, fPy.q) ||
        match(gT(p.tipoId)?.nombre, fPy.q) || match(p.subcategoria, fPy.q) ||
        match(gFuente(p.fuenteId)?.nombre, fPy.q) || match(gVin(p.vinculacionId)?.nombre, fPy.q) ||
        match(gGestor(p.gestorId)?.nombre, fPy.q) || match(gP(p.coordinadorId)?.nombre, fPy.q) ||
        match(uni?.nombre, fPy.q) || match(uni?.codigo, fPy.q) ||
        match(gSede(uni?.sedeId)?.nombre, fPy.q)
      return textMatch &&
        (!fPy.tipo || Number(p.tipoId) === Number(fPy.tipo)) &&
        (!fPy.estado || p.estado === fPy.estado) &&
        (!fPy.unidad || Number(p.unidadId) === Number(fPy.unidad)) &&
        (!fPy.subcat || (p.subcategoria || '') === fPy.subcat) &&
        (!fPy.gestor || Number(p.gestorId) === Number(fPy.gestor)) &&
        (!fPy.coordinador || Number(p.coordinadorId) === Number(fPy.coordinador))
    }).sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || '')))
  , [data.proyectos, data.tiposActividad, data.fuentes, data.vinculaciones, data.gestores, data.profesores, data.unidades, data.sedes, fPy])

  const subcats = form.tipoId
    ? (data.tiposActividad.find(t => t.id === parseInt(form.tipoId))?.subcategorias || [])
    : []

  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const closeM = () => { setModal(null); setForm({}) }
  const openNew = () => { if (!pE('proyectos')) return; setModal({ mode: 'new' }); setForm({}) }
  const openEdit = r => { if (!pE('proyectos')) return; setModal({ mode: 'edit' }); setForm({ ...r }) }

  const del = async id => {
    if (!pE('proyectos')) { toast.error('Sin permisos de escritura.'); return }
    const item = data.proyectos.find(x => x.id === id)
    const nombre = item ? (item.nombre || item.codigo || 'id=' + id) : 'id=' + id
    if (data.plazas.some(x => x.proyectoId === id) || data.nombramientos.some(x => x.proyectoId === id)) {
      toast.error('No se puede eliminar "' + nombre + '" porque está en uso en otros registros.')
      return
    }
    if (!await showConfirm('¿Eliminar "' + nombre + '"?', { danger: true, okText: 'Eliminar' })) return
    apiDelete('/proyectos/' + id).then(() => {
      setData(prev => ({ ...prev, proyectos: prev.proyectos.filter(x => x.id !== id) }))
      reloadCol?.('proyectos')
    }).catch(e => toast.error('Error al eliminar: ' + e.message))
    logMov('Eliminar', 'proyectos', nombre, id, 'proyectos')
  }

  const delNom = async n => {
    if (!pE('nombramientos')) { toast.error('Sin permisos de escritura.'); return }
    if (!await showConfirm('¿Eliminar este nombramiento?', { danger: true, okText: 'Eliminar' })) return
    apiDelete('/nombramientos/' + n.id)
      .then(() => setData(prev => ({ ...prev, nombramientos: prev.nombramientos.filter(x => x.id !== n.id) })))
      .catch(e => toast.error('Error: ' + e.message))
    logMov('Eliminar', 'nombramientos', gP(n.profesorId)?.nombre || 'id=' + n.id, n.id, 'nombramientos')
  }

  const save = async () => {
    if (!pE('proyectos')) { toast.error('Sin permisos de escritura.'); return }
    const isNew = modal.mode === 'new'
    const detalle = String(form.nombre || form.codigo || 'id=' + (form.id || 'nuevo'))
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
    if (!isNew && (item.inicio || item.fin)) {
      const nomsP = data.nombramientos.filter(n => n.proyectoId === item.id)
      for (const n of nomsP) {
        const profN = data.profesores.find(p => p.id === n.profesorId)
        const lbl = (profN?.nombre || '?') + ' (' + fmtD(n.inicio) + (n.fin ? ' – ' + fmtD(n.fin) : '') + ')'
        if (item.inicio && n.inicio && n.inicio < item.inicio) {
          toast.error('Conflicto con el nombramiento de ' + lbl + ': su inicio es anterior al nuevo inicio del proyecto.'); return
        }
        if (item.fin && n.fin && n.fin > item.fin) {
          toast.error('Conflicto con el nombramiento de ' + lbl + ': su fin es posterior al nuevo fin del proyecto.'); return
        }
        if (item.fin && n.inicio && n.inicio > item.fin) {
          toast.error('Conflicto con el nombramiento de ' + lbl + ': su inicio es posterior al nuevo fin del proyecto.'); return
        }
        if (item.inicio && n.fin && n.fin < item.inicio) {
          toast.error('Conflicto con el nombramiento de ' + lbl + ': su fin es anterior al nuevo inicio del proyecto.'); return
        }
      }
    }
    const apiCall = isNew ? apiPost('/proyectos', item) : apiPut('/proyectos/' + item.id, item)
    apiCall.then(res => {
      const saved = isNew ? { ...item, id: res.id } : item
      setData(prev => {
        const arr = prev.proyectos || []
        return { ...prev, proyectos: isNew ? [...arr, saved] : arr.map(x => x.id === saved.id ? saved : x) }
      })
      logMov(isNew ? 'Crear' : 'Editar', 'proyectos', detalle, saved.id, 'proyectos')
      closeM()
      toast.success('Proyecto guardado.')
      reloadCol?.('proyectos')
    }).catch(e => toast.error('Error al guardar: ' + e.message))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Proyectos</h2>
        {pE('proyectos') && <Btn onClick={openNew}>+ Nuevo Proyecto</Btn>}
      </div>
      <FBar count={filtPy.length} total={data.proyectos.length}>
        <SearchBar value={fPy.q} onChange={v => setFPy(p => ({ ...p, q: v }))} />
        <FSel value={fPy.unidad} onChange={v => setFPy(p => ({ ...p, unidad: v }))} placeholder="Todas las unidades"
          options={[...data.unidades].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(u => ({ v: u.id, l: u.nombre + ' (' + u.codigo + ')' }))} />
        <FSel value={fPy.tipo} onChange={v => setFPy(p => ({ ...p, tipo: v, subcat: '' }))} placeholder="Todos los tipos"
          options={[...data.tiposActividad].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => ({ v: t.id, l: t.nombre }))} />
        <FSel value={fPy.subcat} onChange={v => setFPy(p => ({ ...p, subcat: v }))} placeholder="Todas las subcategorías"
          options={(fPy.tipo ? data.tiposActividad.filter(t => Number(t.id) === Number(fPy.tipo)) : [...data.tiposActividad])
            .flatMap(t => t.subcategorias || []).filter((s, i, a) => s && a.indexOf(s) === i).sort().map(s => ({ v: s, l: s }))} />
        <FSel value={fPy.estado} onChange={v => setFPy(p => ({ ...p, estado: v }))} placeholder="Todos los estados"
          options={(data.nombramiento_estado || []).map(e => ({ v: e.estado, l: e.estado }))} />
        <FSel value={fPy.gestor || ''} onChange={v => setFPy(p => ({ ...p, gestor: v }))} placeholder="Todos los gestores"
          options={[...data.gestores].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(g => ({ v: g.id, l: g.nombre }))} />
        <SearchableSelect value={String(fPy.coordinador || '')} onChange={v => setFPy(p => ({ ...p, coordinador: v }))}
          placeholder="Todos los coordinadores"
          options={[...data.profesores].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => ({ v: p.id, l: p.nombre }))}
          style={{ minWidth: 200, flex: '0 0 200px' }} />
      </FBar>
      {filtPy.length === 0 && <EmptyState total={data.proyectos.length} noun="proyectos" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtPy.map(p => {
          const uni = gU(p.unidadId)
          const sedeUni = gSede(uni?.sedeId)
          const noms2 = data.nombramientos.filter(n => n.proyectoId === p.id)
          const th = noms2.filter(n => n.estado === 'Activo').reduce((s, n) => s + nh(n.horas), 0)
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    {p.codigo && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{p.codigo}</span>}
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{p.nombre}</span>
                    <Badge text={p.estado} />
                    {uni && <span style={{ background: '#f0f4f8', color: NAVY, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{uni.codigo}</span>}
                    {sedeUni && <span style={{ background: '#fce7f3', color: '#9d174d', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{sedeUni.nombre}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {gT(p.tipoId)?.nombre || '-'}{p.subcategoria ? ' - ' + p.subcategoria : ''} · {fmtD(p.inicio)} - {fmtD(p.fin)} ·{' '}
                    <strong style={{ color: BLUE }}>{th}h/sem</strong>
                    {gFuente(p.fuenteId) && <span style={{ marginLeft: 6, background: '#fef9c3', color: '#92400e', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{gFuente(p.fuenteId).nombre}</span>}
                    {gVin(p.vinculacionId) && <span style={{ marginLeft: 4, background: '#ede9fe', color: '#5b21b6', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{gVin(p.vinculacionId).nombre}</span>}
                    {gGestor(p.gestorId) && <span style={{ marginLeft: 4, background: '#dcfce7', color: '#166534', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{gGestor(p.gestorId).nombre}</span>}
                    {p.coordinadorId && gP(p.coordinadorId) && <span style={{ marginLeft: 4, background: '#e0f2fe', color: '#0c4a6e', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>👤 {gP(p.coordinadorId).nombre}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {pE('proyectos') && <Btn onClick={() => openEdit(p)} sm>Editar</Btn>}
                  {pE('proyectos') && <Btn onClick={() => del(p.id)} color={RED} sm>Eliminar</Btn>}
                  <Btn onClick={() => setHistModal({ type: 'proyectos', id: p.id, nombre: p.nombre })} sm color="#7c3aed">📔</Btn>
                </div>
              </div>
              {noms2.length > 0 && (
                <div style={{ borderTop: '1px solid #f0f0f8', paddingTop: 7 }}>
                  <NomTable noms={noms2} showPlaza showProf showProy={false} gPl={gPl} gP={gP} gPy={gPy} dU={dU} tiposNombramiento={data.tiposNombramiento}
                    onEdit={pE('nombramientos') ? openEditNom : null}
                    onDelete={pE('nombramientos') ? delNom : null} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title={modal.mode === 'new' ? 'Nuevo Proyecto' : 'Editar Proyecto'} onClose={closeM}>
          <Field label="Código"><input style={inp} value={form.codigo || ''} onChange={e => ff('codigo', e.target.value)} placeholder="Ej: VIE-2024-001" /></Field>
          <Field label="Nombre"><input style={inp} value={form.nombre || ''} onChange={e => ff('nombre', e.target.value)} /></Field>
          <Field label="Sede">
            <select style={inp} value={form.sedeId || ''} onChange={e => ff('sedeId', parseInt(e.target.value) || '')}>
              <option value="">Seleccione...</option>
              {[...data.sedes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Field>
          <Field label="Unidad">
            <select style={inp} value={form.unidadId || ''} onChange={e => ff('unidadId', parseInt(e.target.value))}>
              <option value="">Seleccione...</option>
              {[...data.unidades].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.codigo})</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select style={inp} value={form.tipoId || ''} onChange={e => { ff('tipoId', parseInt(e.target.value)); ff('subcategoria', '') }}>
              <option value="">Seleccione...</option>
              {[...data.tiposActividad].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </Field>
          <Field label="Subcategoría">
            <select style={inp} value={form.subcategoria || ''} onChange={e => ff('subcategoria', e.target.value)} disabled={!form.tipoId}>
              <option value="">Seleccione...</option>
              {subcats.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Fecha Inicio"><input type="date" style={inp} value={(form.inicio || '').slice(0, 10)} onChange={e => ff('inicio', e.target.value)} /></Field>
          <Field label="Fecha Fin"><input type="date" style={inp} value={(form.fin || '').slice(0, 10)} onChange={e => ff('fin', e.target.value)} /></Field>
          <Field label="Estado">
            <select style={inp} value={form.estadoId || ''} onChange={e => { const id = parseInt(e.target.value) || ''; ff('estadoId', id); ff('estado', gNomEst(id)?.estado || '') }}>
              <option value="">Seleccione...</option>
              {(data.nombramiento_estado || []).map(e => <option key={e.estadoid} value={e.estadoid}>{e.estado}</option>)}
            </select>
          </Field>
          <Field label="Fuente de Financiamiento">
            <select style={inp} value={form.fuenteId || ''} onChange={e => ff('fuenteId', parseInt(e.target.value) || '')}>
              <option value="">Sin fuente</option>
              {[...data.fuentes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
          <Field label="Vinculación">
            <select style={inp} value={form.vinculacionId || ''} onChange={e => ff('vinculacionId', parseInt(e.target.value) || '')}>
              <option value="">Sin vinculación</option>
              {[...data.vinculaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Field>
          <Field label="Gestor">
            <select style={inp} value={form.gestorId || ''} onChange={e => ff('gestorId', parseInt(e.target.value) || '')}>
              <option value="">Sin gestor</option>
              {[...data.gestores].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </Field>
          <Field label="Persona Coordinadora">
            <SearchableSelect value={String(form.coordinadorId || '')} onChange={v => ff('coordinadorId', parseInt(v) || '')}
              placeholder="Sin coordinador"
              options={[...data.profesores].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => ({ v: p.id, l: p.nombre }))} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={closeM} color="#888">Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
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
