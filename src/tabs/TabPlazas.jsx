import { useState, useMemo, useEffect, useRef } from 'react'
import { NAVY, BLUE, RED, AMBER, GREEN, ESTADO_COLORS } from '../constants'
import { nh, match, fmtD } from '../utils'
import { apiPost, apiPut, apiDelete } from '../api'
import { Modal, Field, Btn, Badge, FBar, FSel, SearchBar, EmptyState, inp } from '../components/ui'
import { useToast, useConfirm } from '../context/toast'

const ALL_PLZ_NOM_COLS = {
  profesor: true, unidad: true, sede: false, codigo: false,
  proyecto: true, tipoNom: true, verificacion: true, horas: true,
  inicio: true, fin: true, estado: true, obs: false, acuerdo: false
}

const PLZ_COL_DEFS = [
  ['profesor', 'Profesor'], ['unidad', 'Unidad'], ['sede', 'Sede'],
  ['codigo', 'Código'], ['proyecto', 'Proyecto'], ['tipoNom', 'Tipo Nomb.'],
  ['verificacion', 'Verificación'], ['horas', 'Horas / %'], ['inicio', 'Inicio'],
  ['fin', 'Fin'], ['estado', 'Estado'], ['obs', 'Obs.'], ['acuerdo', 'Acuerdo']
]

export function TabPlazas({ data, setData, userPermisos, logMov, bitacora, dU, hUsadas, gP, gPl, gPy, openEditNom, jumpQ }) {
  const toast = useToast()
  const showConfirm = useConfirm()
  const pE = k => (userPermisos[k] || 'none') === 'write'

  const gVig = id => (data.plaza_vigencia || []).find(x => x.vigenciaid === Number(id))
  const gU = id => data.unidades.find(x => x.id === Number(id))
  const gSede = id => data.sedes.find(x => x.id === Number(id))
  const gTN = id => data.tiposNombramiento.find(x => x.id === Number(id))
  const gVerif = id => data.verificaciones.find(x => x.id === Number(id))

  const [fPl, setFPl] = useState({ q: '', cf: '', vigencia: '' })

  useEffect(() => {
    if (jumpQ?.tab === 'plazas' && jumpQ.q) setFPl(p => ({ ...p, q: jumpQ.q }))
  }, [jumpQ])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [histModal, setHistModal] = useState(null)
  const [plzNomCols, setPlzNomCols] = useState(ALL_PLZ_NOM_COLS)
  const [plzNomColsOpen, setPlzNomColsOpen] = useState(false)

  const filtPl = useMemo(() =>
    data.plazas.filter(p => {
      const textMatch = !fPl.q ||
        match(p.codigo, fPl.q) || match(p.cf, fPl.q) ||
        match(gVig(p.vigenciaId)?.vigencia, fPl.q) ||
        data.nombramientos.filter(n => n.plazaId === p.id).some(n => {
          const profPl = gP(n.profesorId), uniPl = gU(n.unidadId), pyPl = gPy(n.proyectoId)
          return match(profPl?.nombre, fPl.q) ||
            match(uniPl?.codigo, fPl.q) || match(uniPl?.nombre, fPl.q) ||
            match(gSede(uniPl?.sedeId)?.nombre, fPl.q) ||
            match(pyPl?.nombre, fPl.q) || match(pyPl?.codigo, fPl.q) ||
            match(gTN(n.tipoNombramientoId)?.nombre, fPl.q) ||
            match(gVerif(n.verificacionId)?.nombre, fPl.q) ||
            match(n.estado, fPl.q) || match(String(n.horas || ''), fPl.q) ||
            match(n.observaciones, fPl.q) || match(n.acuerdo, fPl.q)
        })
      return textMatch &&
        (!fPl.vigencia || p.vigenciaId === Number(fPl.vigencia)) &&
        (!fPl.cf || p.cf === fPl.cf)
    })
  , [data.plazas, data.nombramientos, data.profesores, data.unidades, data.sedes, data.proyectos, data.tiposNombramiento, data.verificaciones, data.plaza_vigencia, fPl])

  const plazaScrollRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    setScrollTop(0)
    if (plazaScrollRef.current) plazaScrollRef.current.scrollTop = 0
  }, [filtPl])

  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const closeM = () => { setModal(null); setForm({}) }
  const openNew = () => { if (!pE('plazas')) return; setModal({ mode: 'new' }); setForm({}) }
  const openEdit = r => { if (!pE('plazas')) return; setModal({ mode: 'edit' }); setForm({ ...r }) }

  const del = async id => {
    if (!pE('plazas')) { toast.error('Sin permisos de escritura.'); return }
    const item = data.plazas.find(x => x.id === id)
    const nombre = item ? (item.nombre || item.codigo || 'id=' + id) : 'id=' + id
    if (data.nombramientos.some(x => x.plazaId === id)) {
      toast.error('No se puede eliminar "' + nombre + '" porque está en uso en otros registros.')
      return
    }
    if (!await showConfirm('¿Eliminar "' + nombre + '"?', { danger: true, okText: 'Eliminar' })) return
    apiDelete('/plazas/' + id).then(() => {
      setData(prev => ({ ...prev, plazas: prev.plazas.filter(x => x.id !== id) }))
    }).catch(e => toast.error('Error al eliminar: ' + e.message))
    logMov('Eliminar', 'plazas', nombre, id, 'plazas')
  }

  const delNom = async n => {
    if (!pE('nombramientos')) { toast.error('Sin permisos de escritura.'); return }
    if (!await showConfirm('¿Eliminar este nombramiento?', { danger: true, okText: 'Eliminar' })) return
    apiDelete('/nombramientos/' + n.id)
      .then(() => setData(prev => ({ ...prev, nombramientos: prev.nombramientos.filter(x => x.id !== n.id) })))
      .catch(e => toast.error('Error: ' + e.message))
    logMov('Eliminar', 'nombramientos', gP(n.profesorId)?.nombre || 'id=' + n.id, n.id, 'nombramientos')
  }

  const save = () => {
    if (!pE('plazas')) { toast.error('Sin permisos de escritura.'); return }
    const isNew = modal.mode === 'new'
    const detalle = String(form.nombre || form.codigo || 'id=' + (form.id || 'nuevo'))
    const item = Object.fromEntries(Object.entries({ ...form }).filter(([, v]) => v !== undefined))
    const apiCall = isNew ? apiPost('/plazas', item) : apiPut('/plazas/' + item.id, item)
    apiCall.then(res => {
      const saved = isNew ? { ...item, id: res.id } : item
      setData(prev => {
        const arr = prev.plazas || []
        return { ...prev, plazas: isNew ? [...arr, saved] : arr.map(x => x.id === saved.id ? saved : x) }
      })
      logMov(isNew ? 'Crear' : 'Editar', 'plazas', detalle, saved.id, 'plazas')
      closeM()
      toast.success('Plaza guardada.')
    }).catch(e => toast.error('Error al guardar: ' + e.message))
  }

  const ROW_H = 120, CONTAINER_H = 620, OVERSCAN = 6
  const vStart = filtPl.length > 50 ? Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN) : 0
  const vEnd = filtPl.length > 50 ? Math.min(filtPl.length, Math.ceil((scrollTop + CONTAINER_H) / ROW_H) + OVERSCAN) : filtPl.length
  const vItems = filtPl.slice(vStart, vEnd)
  const padTop = vStart * ROW_H
  const padBot = (filtPl.length - vEnd) * ROW_H

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Plazas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => setPlzNomColsOpen(o => !o)} color="#475569">Columnas {plzNomColsOpen ? '▴' : '▾'}</Btn>
          {pE('plazas') && <Btn onClick={openNew}>+ Nueva Plaza</Btn>}
        </div>
      </div>
      <FBar count={filtPl.length} total={data.plazas.length}>
        <SearchBar value={fPl.q} onChange={v => setFPl(p => ({ ...p, q: v }))} />
        <FSel value={fPl.cf} onChange={v => setFPl(p => ({ ...p, cf: v }))} placeholder="CF"
          options={[...data.cfs].map(c => ({ v: c.nombre || c.codigo, l: (c.nombre || c.codigo || '').trim() }))
            .sort((a, b) => a.l.toLowerCase() < b.l.toLowerCase() ? -1 : a.l.toLowerCase() > b.l.toLowerCase() ? 1 : 0)} />
        <FSel value={fPl.vigencia} onChange={v => setFPl(p => ({ ...p, vigencia: v }))} placeholder="Vigencia"
          options={(data.plaza_vigencia || []).map(v => ({ v: String(v.vigenciaid), l: v.vigencia }))} />
      </FBar>
      {plzNomColsOpen && (
        <div style={{ background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e8f0', padding: '10px 16px', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: '6px 22px', alignItems: 'center' }}>
          {PLZ_COL_DEFS.map(([k, l]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, userSelect: 'none' }}>
              <input type="checkbox" checked={!!plzNomCols[k]} onChange={e => setPlzNomCols(p => ({ ...p, [k]: e.target.checked }))} />
              {l}
            </label>
          ))}
          <Btn sm onClick={() => setPlzNomCols(ALL_PLZ_NOM_COLS)}>Restaurar</Btn>
        </div>
      )}
      <div ref={plazaScrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: CONTAINER_H, overflowY: 'auto' }}
        onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
        {filtPl.length === 0 && <EmptyState total={data.plazas.length} noun="plazas" />}
        {padTop > 0 && <div style={{ height: padTop, flexShrink: 0 }} />}
        {vItems.map(p => {
          const u = hUsadas(p.id)
          const lib = p.horasSemanales - u
          const pct = Math.min(100, Math.round((u / p.horasSemanales) * 100))
          const noms2 = data.nombramientos.filter(n => n.plazaId === p.id)
          const vigNombre = gVig(p.vigenciaId)?.vigencia || '—'
          const [bg, fg] = ESTADO_COLORS[vigNombre] || ['#f3f4f6', '#374151']
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{p.codigo}</span>
                  {(() => {
                    const c = pct >= 100 ? RED : pct > 70 ? AMBER : GREEN
                    return <span title={(pct >= 100 ? 'Saturada' : pct > 70 ? 'Alta carga' : 'Disponible') + ' (' + pct + '%)'}
                      style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
                  })()}
                  <span style={{ background: bg, color: fg, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{vigNombre}</span>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{p.cf}</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {pE('plazas') && <Btn onClick={() => openEdit(p)} sm>Editar</Btn>}
                  <Btn onClick={() => setHistModal({ type: 'plazas', id: p.id, nombre: p.codigo })} sm color="#7c3aed">📔</Btn>
                  {pE('plazas') && <Btn onClick={() => del(p.id)} color={RED} sm>Eliminar</Btn>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, marginBottom: 4 }}>
                <span>Total: <strong>{p.horasSemanales}h</strong></span>
                <span style={{ color: BLUE }}>En uso: <strong>{u}h</strong></span>
                <span style={{ color: lib > 0 ? GREEN : RED }}>Libres: <strong>{lib}h</strong></span>
              </div>
              <div style={{ background: '#e8e8f0', borderRadius: 20, height: 5, marginBottom: noms2.length ? 8 : 0 }}>
                <div style={{ width: pct + '%', background: pct >= 100 ? RED : pct > 70 ? AMBER : BLUE, height: '100%', borderRadius: 20 }} />
              </div>
              {noms2.length > 0 && (
                <div style={{ borderTop: '1px solid #f0f0f8', paddingTop: 7, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8f9ff' }}>
                        {PLZ_COL_DEFS.map(([k, l]) => plzNomCols[k]
                          ? <th key={k} style={{ textAlign: 'left', padding: '5px 8px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0', whiteSpace: 'nowrap' }}>{l}</th>
                          : null)}
                        <th style={{ padding: '5px 8px', borderBottom: '2px solid #e8e8f0' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {noms2.map((n, i) => {
                        const profN = gP(n.profesorId), uniN = gU(n.unidadId), pyN = gPy(n.proyectoId)
                        const vCol = gVerif(n.verificacionId)?.color || ''
                        return (
                          <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                            {plzNomCols.profesor && <td style={{ padding: '6px 8px', fontWeight: 600 }}>{profN?.nombre || '-'}</td>}
                            {plzNomCols.unidad && <td style={{ padding: '6px 8px' }}>
                              {uniN ? <span style={{ background: '#dbeafe', color: NAVY, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{uniN.codigo}</span>
                                : <span style={{ color: '#aaa' }}>—</span>}
                            </td>}
                            {plzNomCols.sede && <td style={{ padding: '6px 8px' }}>
                              {gSede(uniN?.sedeId)
                                ? <span style={{ background: '#fce7f3', color: '#9d174d', padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{gSede(uniN.sedeId).nombre}</span>
                                : <span style={{ color: '#aaa' }}>—</span>}
                            </td>}
                            {plzNomCols.codigo && <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 700, color: NAVY }}>{pyN?.codigo || '-'}</td>}
                            {plzNomCols.proyecto && <td style={{ padding: '6px 8px' }}>{pyN?.nombre || '-'}</td>}
                            {plzNomCols.tipoNom && <td style={{ padding: '6px 8px' }}>
                              {n.tipoNombramientoId
                                ? <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{gTN(n.tipoNombramientoId)?.nombre || '-'}</span>
                                : <span style={{ color: '#aaa' }}>-</span>}
                            </td>}
                            {plzNomCols.verificacion && <td style={{ padding: '6px 8px' }}>
                              {n.verificacionId
                                ? <span style={{ background: vCol ? vCol + '33' : '#dcfce7', color: vCol || '#16a34a', padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: vCol ? '1px solid ' + vCol + '66' : 'none' }}>{gVerif(n.verificacionId)?.nombre || '-'}</span>
                                : <span style={{ color: '#aaa' }}>-</span>}
                            </td>}
                            {plzNomCols.horas && <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 700 }}>{n.horas}h</span>
                              <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>({Math.round(parseFloat(n.horas || 0) / 40 * 100)}%)</span>
                            </td>}
                            {plzNomCols.inicio && <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                              {vCol
                                ? <span style={{ background: vCol + '22', color: vCol, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid ' + vCol + '55' }}>{fmtD(n.inicio) || '-'}</span>
                                : <span style={{ color: '#666' }}>{fmtD(n.inicio) || '-'}</span>}
                            </td>}
                            {plzNomCols.fin && <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                              {(() => {
                                const warn = n.fin && dU(n.fin) <= 30 && n.estado === 'Activo'
                                const col = warn ? RED : vCol
                                return col
                                  ? <span style={{ background: col + '22', color: col, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid ' + col + '55' }}>{fmtD(n.fin) || '-'}</span>
                                  : <span style={{ color: '#666' }}>{fmtD(n.fin) || '-'}</span>
                              })()}
                            </td>}
                            {plzNomCols.estado && <td style={{ padding: '6px 8px' }}><Badge text={n.estado} /></td>}
                            {plzNomCols.obs && <td style={{ padding: '6px 8px', maxWidth: 160 }}>
                              {n.observaciones
                                ? <span title={n.observaciones} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555', fontSize: 11 }}>{n.observaciones}</span>
                                : <span style={{ color: '#ddd', fontSize: 11 }}>—</span>}
                            </td>}
                            {plzNomCols.acuerdo && <td style={{ padding: '6px 8px', maxWidth: 140 }}>
                              {n.acuerdo
                                ? <span title={n.acuerdo} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555', fontSize: 11 }}>{n.acuerdo}</span>
                                : <span style={{ color: '#ddd', fontSize: 11 }}>—</span>}
                            </td>}
                            <td style={{ padding: '6px 8px' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                {pE('nombramientos') && <Btn onClick={() => openEditNom(n)} sm>Editar</Btn>}
                                {pE('nombramientos') && <Btn onClick={() => delNom(n)} color={RED} sm>Eliminar</Btn>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
        {padBot > 0 && <div style={{ height: padBot, flexShrink: 0 }} />}
      </div>

      {modal && (
        <Modal title={modal.mode === 'new' ? 'Nueva Plaza' : 'Editar Plaza'} onClose={closeM}>
          <Field label="Código"><input style={inp} value={form.codigo || ''} onChange={e => ff('codigo', e.target.value)} /></Field>
          <Field label="Horas Semanales">
            <input type="number" style={inp} value={form.horasSemanales || 40} onChange={e => ff('horasSemanales', parseInt(e.target.value))} />
          </Field>
          <Field label="CF">
            <select style={inp} value={form.cf || ''} onChange={e => ff('cf', e.target.value)}>
              <option value="">Seleccione...</option>
              {[...data.cfs].map(c => ({ ...c, _l: (c.nombre || c.codigo || '').trim().toLowerCase() }))
                .sort((a, b) => a._l < b._l ? -1 : a._l > b._l ? 1 : 0)
                .map(c => <option key={c.id} value={c.nombre || c.codigo}>{c.nombre || c.codigo}</option>)}
            </select>
          </Field>
          <Field label="Vigencia">
            <select style={inp} value={form.vigenciaId || ''} onChange={e => ff('vigenciaId', parseInt(e.target.value) || '')}>
              <option value="">Seleccione...</option>
              {(data.plaza_vigencia || []).map(v => <option key={v.vigenciaid} value={v.vigenciaid}>{v.vigencia}</option>)}
            </select>
          </Field>
          <Field label="Actividad">
            <select style={inp} value={form.actividad || 'Investigacion'} onChange={e => ff('actividad', e.target.value)}>
              <option>Investigacion</option>
              <option>Extension</option>
            </select>
          </Field>
          <Field label="Interno">
            <select style={inp} value={form.interno || 'Sí'} onChange={e => ff('interno', e.target.value)}>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </select>
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
