import { useState, useMemo } from 'react'
import { apiPut } from '../api'
import { NAVY, RED, AMBER } from '../constants'
import { nh, r2, match, fmtD } from '../utils'
import { FBar, SearchBar } from '../components/ui'
import { useToast, useConfirm } from '../context/toast'

export function TabAlertas({ data, a30, a60, a90, py30, py60, py90, gP, gPl, gPy, gU, nomEstId, logMov, dU }) {
  const toast = useToast()
  const showConfirm = useConfirm()
  const [fA, setFA] = useState(() => {
    try { return localStorage.getItem('vie_fA') || '' } catch { return '' }
  })

  const profHorasAlerta = useMemo(() => {
    const result = []
    data.tiposNombramiento.forEach(tipo => {
      const nomsT = data.nombramientos.filter(n => n.estado === 'Activo' && n.tipoNombramientoId === tipo.id)
      if (!nomsT.length) return
      const porProf = {}
      nomsT.forEach(n => { porProf[n.profesorId] = r2((porProf[n.profesorId] || 0) + nh(n.horas)) })
      const vals = Object.values(porProf)
      const media = vals.reduce((s, v) => s + v, 0) / vals.length
      Object.entries(porProf).forEach(([profId, horas]) => {
        if (horas > media) result.push({ profesorId: parseInt(profId), tipoId: tipo.id, tipoNombre: tipo.nombre, horas, media: r2(media) })
      })
    })
    return result.sort((a, b) => (b.horas - b.media) - (a.horas - a.media))
  }, [data.nombramientos, data.tiposNombramiento])

  const handleAutoActualizar = async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const nomVenc = data.nombramientos.filter(n => n.estado === 'Activo' && n.fin && n.fin < hoy)
    const pyVenc = data.proyectos.filter(p => p.estado === 'Activo' && p.fin && p.fin < hoy)
    const total = nomVenc.length + pyVenc.length
    if (!total) { toast.info('No hay registros vencidos para actualizar.'); return }
    if (!await showConfirm('¿Marcar como "Finalizado": ' + nomVenc.length + ' nombramiento(s) y ' + pyVenc.length + ' proyecto(s) vencidos?', { okText: 'Finalizar' })) return
    const eFinId = nomEstId('Finalizado')
    await Promise.all([
      ...nomVenc.map(n => apiPut('/nombramientos/' + n.id, { ...n, estadoId: eFinId, estado: 'Finalizado' })),
      ...pyVenc.map(p => apiPut('/proyectos/' + p.id, { ...p, estadoId: eFinId, estado: 'Finalizado' }))
    ]).catch(e => { toast.error('Error: ' + e.message); return })
    logMov('Auto-actualizar estados', 'sistema', total + ' registros finalizados')
    toast.success(total + ' registro(s) actualizados.')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Alertas de Vencimiento</h2>
        <button
          onClick={handleAutoActualizar}
          style={{ background: AMBER, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
        >
          🔄 Auto-actualizar estados
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { ic: '🔴', l: 'Nombr. críticos ≤30d', v: a30.length, c: RED, bg: '#fee2e2' },
          { ic: '🟡', l: 'Nombr. alerta 31-60d', v: a60.length, c: AMBER, bg: '#fef3c7' },
          { ic: '🟠', l: 'Nombr. atención 61-90d', v: a90.length, c: '#ca8a04', bg: '#fef9c3' },
          { ic: '📁', l: 'Proyectos ≤30d', v: py30.length, c: RED, bg: '#fee2e2' },
          { ic: '📁', l: 'Proyectos 31-60d', v: py60.length, c: AMBER, bg: '#fef3c7' },
          { ic: '📁', l: 'Proyectos 61-90d', v: py90.length, c: '#ca8a04', bg: '#fef9c3' }
        ].map(k => (
          <div key={k.l} style={{ background: k.bg, borderRadius: 10, padding: '10px 14px', minWidth: 110, textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18 }}>{k.ic}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 10, color: k.c, fontWeight: 600, marginTop: 2 }}>{k.l}</div>
          </div>
        ))}
      </div>

      <h3 style={{ margin: '0 0 8px', color: NAVY, fontSize: 14, borderBottom: '2px solid #e8e8f0', paddingBottom: 6 }}>
        📝 Alertas de Nombramientos
      </h3>
      <FBar
        count={[...a30, ...a60, ...a90].filter(n => !fA || match(gP(n.profesorId)?.nombre, fA)).length}
        total={a30.length + a60.length + a90.length}
      >
        <SearchBar value={fA} onChange={setFA} />
      </FBar>
      {!a30.length && !a60.length && !a90.length && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', color: '#aaa', marginBottom: 12 }}>
          Sin alertas de nombramientos.
        </div>
      )}
      {[[a30, 'Vencen en los próximos 30 días', '#fee2e2', RED], [a60, 'Vencen entre 31 y 60 días', '#fef3c7', AMBER], [a90, 'Vencen entre 61 y 90 días', '#fef9c3', '#ca8a04']].map(([noms2, label, bg, border]) => {
        const filtered = noms2.filter(n => !fA || match(gP(n.profesorId)?.nombre, fA))
        if (!filtered.length) return null
        return (
          <div key={label} style={{ background: bg, border: '1.5px solid ' + border, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: border }}>{label} ({filtered.length})</h3>
            {filtered.map(n => (
              <div key={n.id} style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '8px 12px', marginBottom: 7, fontSize: 12 }}>
                <strong>{gP(n.profesorId)?.nombre || '-'}</strong> — {gPy(n.proyectoId)?.nombre || '-'}<br />
                <span style={{ color: '#666' }}>
                  Plaza: {gPl(n.plazaId)?.codigo || '-'} · {n.horas}h/sem · Vence: {fmtD(n.fin)} ({dU(n.fin)} días)
                </span>
              </div>
            ))}
          </div>
        )
      })}

      <h3 style={{ margin: '16px 0 8px', color: NAVY, fontSize: 14, borderBottom: '2px solid #e8e8f0', paddingBottom: 6 }}>
        📁 Alertas de Proyectos
      </h3>
      {!py30.length && !py60.length && !py90.length && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', color: '#aaa' }}>
          Sin proyectos próximos a vencer.
        </div>
      )}
      {[[py30, 'Proyectos que vencen en los próximos 30 días', '#fee2e2', RED], [py60, 'Proyectos que vencen entre 31 y 60 días', '#fef3c7', AMBER], [py90, 'Proyectos que vencen entre 61 y 90 días', '#fef9c3', '#ca8a04']].map(([pyArr, label, bg, border]) => {
        if (!pyArr.length) return null
        return (
          <div key={label} style={{ background: bg, border: '1.5px solid ' + border, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: border }}>{label} ({pyArr.length})</h3>
            {[...pyArr].sort((a, b) => dU(a.fin) - dU(b.fin)).map(p => {
              const uni = gU(p.unidadId)
              return (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '8px 12px', marginBottom: 7, fontSize: 12 }}>
                  <strong>{p.nombre}</strong><br />
                  <span style={{ color: '#666' }}>
                    Unidad: {uni?.nombre || '-'} · Fecha fin: {fmtD(p.fin)} · <strong style={{ color: border }}>{dU(p.fin)} días</strong>
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}

      <h3 style={{ margin: '16px 0 8px', color: NAVY, fontSize: 14, borderBottom: '2px solid #e8e8f0', paddingBottom: 6 }}>
        👨‍🏫 Profesores sobre la media de horas por tipo de nombramiento
      </h3>
      {!profHorasAlerta.length && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', color: '#aaa' }}>
          Sin alertas de carga horaria.
        </div>
      )}
      {profHorasAlerta.length > 0 && (() => {
        const tipos = [...new Set(profHorasAlerta.map(x => x.tipoNombre))]
        return tipos.map(tipo => {
          const filas = profHorasAlerta.filter(x => x.tipoNombre === tipo)
          const media = filas[0].media
          return (
            <div key={tipo} style={{ background: '#f0f4ff', border: '1.5px solid #7c3aed', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 13, color: '#7c3aed' }}>
                  Tipo: {tipo} — {filas.length} profesor{filas.length !== 1 ? 'es' : ''} sobre la media
                </h3>
                <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  Media: {media}h/sem
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(124,58,237,0.08)' }}>
                      {['Profesor', 'Horas asignadas', 'Media tipo', 'Exceso', 'Nombramientos activos'].map(h => (
                        <th key={h} style={{ padding: '5px 10px', textAlign: 'left', color: '#7c3aed', fontWeight: 700, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => {
                      const prof = gP(f.profesorId)
                      const noms = data.nombramientos.filter(n =>
                        n.estado === 'Activo' && n.profesorId === f.profesorId && n.tipoNombramientoId === f.tipoId
                      )
                      const exceso = r2(f.horas - f.media)
                      return (
                        <tr key={f.profesorId} style={{ background: i % 2 === 0 ? '#fff' : '#f8f5ff', borderBottom: '1px solid #ede9fe' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: NAVY }}>{prof?.nombre || '-'}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: '#7c3aed' }}>{f.horas}h/sem</td>
                          <td style={{ padding: '6px 10px', color: '#888' }}>{f.media}h/sem</td>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: RED }}>+{exceso}h</td>
                          <td style={{ padding: '6px 10px', color: '#555', fontSize: 11 }}>
                            {noms.map(n => gPy(n.proyectoId)?.nombre || '-').join(', ')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      })()}
    </div>
  )
}
