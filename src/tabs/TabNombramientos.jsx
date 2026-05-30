import { useState, useMemo, useEffect, useRef } from 'react'
import { NAVY, BLUE, RED, AMBER } from '../constants'
import { nh, match, fmtD } from '../utils'
import { apiPut, apiDelete } from '../api'
import { Modal, Btn, Badge, FBar, FSel, SearchBar, inp } from '../components/ui'
import { useToast, useConfirm } from '../context/toast'

const ALL_NOM_COLS = {
  plaza: true, profesor: true, unidad: true, sede: false, codigo: false,
  proyecto: true, tipoNom: true, verificacion: true, horas: true,
  inicio: true, fin: true, estado: true, obs: false, acuerdo: false
}

const COL_DEFS = [
  ['plaza', 'Plaza'], ['profesor', 'Profesor'], ['unidad', 'Unidad'], ['sede', 'Sede'],
  ['codigo', 'Código'], ['proyecto', 'Proyecto'], ['tipoNom', 'Tipo Nomb.'],
  ['verificacion', 'Verificación'], ['horas', 'Horas / %'], ['inicio', 'Inicio'],
  ['fin', 'Fin'], ['estado', 'Estado'], ['obs', 'Obs.'], ['acuerdo', 'Acuerdo']
]

export function TabNombramientos({ data, setData, userPermisos, logMov, bitacora, dU, gP, gPl, gPy, openNewNom, openEditNom, jumpQ }) {
  const toast = useToast()
  const showConfirm = useConfirm()
  const pE = k => (userPermisos[k] || 'none') === 'write'

  const gU = id => data.unidades.find(x => x.id === Number(id))
  const gSede = id => data.sedes.find(x => x.id === Number(id))
  const gTN = id => data.tiposNombramiento.find(x => x.id === Number(id))
  const gVerif = id => data.verificaciones.find(x => x.id === Number(id))
  const nomEstId = nombre => (data.nombramiento_estado || []).find(x => x.estado === nombre)?.estadoid || null

  const [fN, setFN] = useState({ q: '', estado: '', verificacion: '', sede: '' })

  useEffect(() => {
    if (jumpQ?.tab === 'nombramientos' && jumpQ.q) setFN(p => ({ ...p, q: jumpQ.q }))
  }, [jumpQ])
  const [nomCols, setNomCols] = useState(ALL_NOM_COLS)
  const [nomColsOpen, setNomColsOpen] = useState(false)
  const [histModal, setHistModal] = useState(null)
  const [scrollTop, setScrollTop] = useState(0)
  const tableScrollRef = useRef(null)

  const filtN = useMemo(() =>
    data.nombramientos.filter(n => {
      const prof = gP(n.profesorId), plz = gPl(n.plazaId), proy = gPy(n.proyectoId), uni = gU(n.unidadId)
      const textMatch = !fN.q ||
        match(prof?.nombre, fN.q) || match(plz?.codigo, fN.q) || match(plz?.cf, fN.q) ||
        match(proy?.nombre, fN.q) || match(proy?.codigo, fN.q) ||
        match(uni?.codigo, fN.q) || match(uni?.nombre, fN.q) ||
        match(gSede(uni?.sedeId)?.nombre, fN.q) ||
        match(gTN(n.tipoNombramientoId)?.nombre, fN.q) ||
        match(gVerif(n.verificacionId)?.nombre, fN.q) ||
        match(n.estado, fN.q) || match(String(n.horas || ''), fN.q) ||
        match(n.observaciones, fN.q) || match(n.acuerdo, fN.q)
      return textMatch &&
        (!fN.estado || n.estado === fN.estado) &&
        (!fN.verificacion || n.verificacionId === Number(fN.verificacion)) &&
        (!fN.sede || gSede(uni?.sedeId)?.id === Number(fN.sede))
    })
  , [data.nombramientos, data.profesores, data.plazas, data.proyectos, data.unidades, data.sedes, data.tiposNombramiento, data.verificaciones, fN])

  useEffect(() => {
    setScrollTop(0)
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0
  }, [filtN])

  const finalizarVencidos = async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const v = data.nombramientos.filter(n => n.estado === 'Activo' && n.fin && n.fin < hoy)
    if (!v.length) { toast.info('Sin vencidos.'); return }
    if (!await showConfirm('¿Finalizar ' + v.length + ' nombramientos vencidos?', { okText: 'Finalizar' })) return
    const eId = nomEstId('Finalizado')
    await Promise.all(v.map(n => apiPut('/nombramientos/' + n.id, { ...n, estadoId: eId, estado: 'Finalizado' })))
      .catch(e => { toast.error('Error: ' + e.message); return })
    setData(prev => ({
      ...prev,
      nombramientos: prev.nombramientos.map(n =>
        v.some(x => x.id === n.id) ? { ...n, estadoId: eId, estado: 'Finalizado' } : n
      )
    }))
    logMov('Finalizar masivo', 'nombramientos', v.length + ' nombramientos vencidos finalizados')
  }

  const delNom = async n => {
    if (!await showConfirm('¿Eliminar este nombramiento?', { danger: true, okText: 'Eliminar' })) return
    apiDelete('/nombramientos/' + n.id)
      .then(() => setData(prev => ({ ...prev, nombramientos: prev.nombramientos.filter(x => x.id !== n.id) })))
      .catch(e => toast.error('Error: ' + e.message))
    logMov('Eliminar', 'nombramientos', gP(n.profesorId)?.nombre || 'id=' + n.id, n.id, 'nombramientos')
  }

  const ROW_H = 44, CONTAINER_H = 572, OVERSCAN = 4  // CONTAINER_H = 13 rows
  const virtual = filtN.length > 50
  const vStart = virtual ? Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN) : 0
  const vEnd   = virtual ? Math.min(filtN.length, Math.ceil((scrollTop + CONTAINER_H) / ROW_H) + OVERSCAN) : filtN.length
  const topPad    = virtual ? vStart * ROW_H : 0
  const bottomPad = virtual ? (filtN.length - vEnd) * ROW_H : 0
  const vRows  = filtN.slice(vStart, vEnd)
  const vCols  = COL_DEFS.filter(([k]) => nomCols[k]).length + 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Nombramientos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => setNomColsOpen(o => !o)} color="#475569">Columnas {nomColsOpen ? '▴' : '▾'}</Btn>
          {pE('nombramientos') && <Btn color={AMBER} onClick={finalizarVencidos}>Finalizar vencidos</Btn>}
          {pE('nombramientos') && <Btn onClick={openNewNom}>+ Nuevo Nombramiento</Btn>}
        </div>
      </div>
      <FBar count={filtN.length} total={data.nombramientos.length}>
        <SearchBar value={fN.q} onChange={v => setFN(p => ({ ...p, q: v }))} />
        <FSel value={fN.estado} onChange={v => setFN(p => ({ ...p, estado: v }))} placeholder="Estado"
          options={(data.nombramiento_estado || []).map(e => ({ v: e.estado, l: e.estado }))} />
        <FSel value={fN.verificacion} onChange={v => setFN(p => ({ ...p, verificacion: v }))} placeholder="Verificación"
          options={[...data.verificaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(v => ({ v: v.id, l: v.nombre }))} />
        <FSel value={fN.sede || ''} onChange={v => setFN(p => ({ ...p, sede: v }))} placeholder="Todas las sedes"
          options={[...data.sedes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(s => ({ v: s.id, l: s.nombre }))} />
      </FBar>
      {nomColsOpen && (
        <div style={{ background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e8f0', padding: '10px 16px', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: '6px 22px', alignItems: 'center' }}>
          {COL_DEFS.map(([k, l]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, userSelect: 'none' }}>
              <input type="checkbox" checked={!!nomCols[k]} onChange={e => setNomCols(p => ({ ...p, [k]: e.target.checked }))} />
              {l}
            </label>
          ))}
          <Btn sm onClick={() => setNomCols(ALL_NOM_COLS)}>Restaurar</Btn>
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div
          ref={tableScrollRef}
          style={{ overflowX: 'auto', ...(virtual ? { maxHeight: CONTAINER_H, overflowY: 'auto' } : {}) }}
          onScroll={virtual ? e => setScrollTop(e.currentTarget.scrollTop) : undefined}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 950 }}>
            <thead style={virtual ? { position: 'sticky', top: 0, zIndex: 1, background: '#f8f9ff' } : undefined}>
              <tr style={{ background: '#f8f9ff' }}>
                {COL_DEFS.map(([k, l]) => nomCols[k]
                  ? <th key={k} style={{ textAlign: 'left', padding: '7px 10px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e8e8f0', whiteSpace: 'nowrap' }}>{l}</th>
                  : null
                )}
                <th style={{ padding: '7px 10px', borderBottom: '2px solid #e8e8f0' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtN.length === 0 && (
                <tr><td colSpan={20} style={{ padding: '44px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{data.nombramientos.length === 0 ? '📭' : '🔍'}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#888', marginBottom: 4 }}>
                    {data.nombramientos.length === 0 ? 'No hay nombramientos todavía' : 'Sin resultados'}
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
                    {data.nombramientos.length === 0 ? 'Agrega el primer registro con el botón de arriba.' : 'Ningún resultado coincide con los filtros aplicados.'}
                  </div>
                </td></tr>
              )}
              {virtual && topPad > 0 && <tr><td colSpan={vCols} style={{ height: topPad, padding: 0 }} /></tr>}
              {vRows.map((n, localIdx) => { const i = vStart + localIdx;
                const prof = gP(n.profesorId)
                const uni = gU(n.unidadId)
                const py2 = gPy(n.proyectoId)
                const vCol = gVerif(n.verificacionId)?.color || ''
                return (
                  <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                    {nomCols.plaza && <td style={{ padding: '8px 10px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{gPl(n.plazaId)?.codigo || '-'}</td>}
                    {nomCols.profesor && <td style={{ padding: '8px 10px', fontWeight: 600 }}>{prof.nombre || '-'}</td>}
                    {nomCols.unidad && <td style={{ padding: '8px 10px' }}>
                      {uni ? <span style={{ background: '#dbeafe', color: NAVY, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{uni.codigo}</span>
                        : <span style={{ color: '#aaa' }}>—</span>}
                    </td>}
                    {nomCols.sede && <td style={{ padding: '8px 10px' }}>
                      {gSede(uni?.sedeId)
                        ? <span style={{ background: '#fce7f3', color: '#9d174d', padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{gSede(uni.sedeId).nombre}</span>
                        : <span style={{ color: '#aaa' }}>—</span>}
                    </td>}
                    {nomCols.codigo && <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontWeight: 700, color: NAVY }}>{py2?.codigo || '-'}</td>}
                    {nomCols.proyecto && <td style={{ padding: '8px 10px' }}>{py2?.nombre || '-'}</td>}
                    {nomCols.tipoNom && <td style={{ padding: '8px 10px' }}>
                      {n.tipoNombramientoId
                        ? <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{gTN(n.tipoNombramientoId)?.nombre || '-'}</span>
                        : <span style={{ color: '#aaa' }}>-</span>}
                    </td>}
                    {nomCols.verificacion && <td style={{ padding: '8px 10px' }}>
                      {n.verificacionId
                        ? <span style={{ background: vCol ? vCol + '33' : '#dcfce7', color: vCol || '#16a34a', padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: vCol ? '1px solid ' + vCol + '66' : 'none' }}>{gVerif(n.verificacionId)?.nombre || '-'}</span>
                        : <span style={{ color: '#aaa' }}>-</span>}
                    </td>}
                    {nomCols.horas && <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{n.horas}h</span>
                      <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>({Math.round(parseFloat(n.horas || 0) / 40 * 100)}%)</span>
                    </td>}
                    {nomCols.inicio && <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {vCol
                        ? <span style={{ background: vCol + '22', color: vCol, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid ' + vCol + '55' }}>{fmtD(n.inicio) || '-'}</span>
                        : <span style={{ color: '#666' }}>{fmtD(n.inicio) || '-'}</span>}
                    </td>}
                    {nomCols.fin && <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const warn = n.fin && dU(n.fin) <= 30 && n.estado === 'Activo'
                        const col = warn ? RED : vCol
                        return col
                          ? <span style={{ background: col + '22', color: col, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid ' + col + '55' }}>{fmtD(n.fin) || '-'}</span>
                          : <span style={{ color: '#666' }}>{fmtD(n.fin) || '-'}</span>
                      })()}
                    </td>}
                    {nomCols.estado && <td style={{ padding: '8px 10px' }}><Badge text={n.estado} /></td>}
                    {nomCols.obs && <td style={{ padding: '8px 10px', maxWidth: 160 }}>
                      {n.observaciones
                        ? <span title={n.observaciones} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555', fontSize: 11, cursor: 'default' }}>{n.observaciones}</span>
                        : <span style={{ color: '#ddd', fontSize: 11 }}>—</span>}
                    </td>}
                    {nomCols.acuerdo && <td style={{ padding: '8px 10px', maxWidth: 140 }}>
                      {n.acuerdo
                        ? <span title={n.acuerdo} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555', fontSize: 11, cursor: 'default' }}>{n.acuerdo}</span>
                        : <span style={{ color: '#ddd', fontSize: 11 }}>—</span>}
                    </td>}
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        {pE('nombramientos') && <Btn onClick={() => openEditNom(n)} sm>Editar</Btn>}
                        <Btn onClick={() => setHistModal({ type: 'nombramientos', id: n.id, nombre: (gP(n.profesorId)?.nombre || '?') + ' → ' + (gPl(n.plazaId)?.codigo || '?') })} sm color="#7c3aed">📔</Btn>
                        {pE('nombramientos') && <Btn onClick={() => delNom(n)} color={RED} sm>Eliminar</Btn>}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {virtual && bottomPad > 0 && <tr><td colSpan={vCols} style={{ height: bottomPad, padding: 0 }} /></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {histModal && (
        <Modal title={'📔 Historial: ' + histModal.nombre} onClose={() => setHistModal(null)}>
          {(() => {
            const entries = bitacora.filter(b => b.refType === histModal.type && String(b.refId) === String(histModal.id))
            if (!entries.length) return <p style={{ color: '#aaa', fontSize: 12 }}>Sin historial registrado para este elemento.</p>
            return (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {[...entries].reverse().map((b, idx) => (
                  <div key={idx} style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f8', fontSize: 12 }}>
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
