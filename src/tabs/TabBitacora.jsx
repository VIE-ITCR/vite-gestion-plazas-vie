import { useState, useMemo } from 'react'
import { NAVY, GREEN, BLUE, RED, AMBER } from '../constants'
import { fmtD, exportXLSX } from '../utils'
import { SearchBar, Btn, inp } from '../components/ui'

const ACCION_C = {
  Crear: [GREEN, '#dcfce7'],
  Editar: [BLUE, '#dbeafe'],
  Eliminar: [RED, '#fee2e2'],
  'Finalizar masivo': [AMBER, '#fef3c7'],
  'Auto-actualizar estados': ['#7c3aed', '#ede9fe']
}

const TODAS_ENTIDADES = [
  { v: 'proyectos', l: 'Proyectos' }, { v: 'plazas', l: 'Plazas' },
  { v: 'nombramientos', l: 'Nombramientos' }, { v: 'profesores', l: 'Profesores' },
  { v: 'unidades', l: 'Unidades' }, { v: 'tiposActividad', l: 'Tipos de Actividad' },
  { v: 'tiposNombramiento', l: 'Tipos de Nombramiento' }, { v: 'sedes', l: 'Sedes' },
  { v: 'verificaciones', l: 'Verificación' }, { v: 'sistema', l: 'Sistema' }
]

export function TabBitacora({ bitacora, userProfile }) {
  const [fq, setFq] = useState('')
  const [fAcc, setFAcc] = useState('')
  const [fEnt, setFEnt] = useState('')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')

  const filtered = useMemo(() => bitacora.filter(e => {
    const passQ = !fq || [e.usuario, e.accion, e.entidad, e.detalle, e.fecha].some(v => String(v || '').toLowerCase().includes(fq.toLowerCase()))
    const passAcc = !fAcc || e.accion === fAcc
    const passEnt = !fEnt || e.entidad === fEnt
    const passDesde = !fDesde || e.fecha >= fDesde
    const passHasta = !fHasta || e.fecha <= fHasta
    return passQ && passAcc && passEnt && passDesde && passHasta
  }), [bitacora, fq, fAcc, fEnt, fDesde, fHasta])

  const handleExport = () => exportXLSX(
    'Bitacora',
    ['#', 'Fecha', 'Hora', 'Usuario', 'Accion', 'Pestana', 'Detalle'],
    bitacora.map(e => [e.id, fmtD(e.fecha), e.hora, e.usuario, e.accion, e.entidad, e.detalle])
  )

  const clearFilters = () => { setFq(''); setFAcc(''); setFEnt(''); setFDesde(''); setFHasta('') }
  const hasFilters = fq || fAcc || fEnt || fDesde || fHasta

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Bitácora de Cambios</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Usuario activo:</label>
          <span style={{ fontSize: 12, padding: '6px 10px', color: NAVY, fontWeight: 600 }}>
            {userProfile?.nombre || userProfile?.email || '—'}
          </span>
          <Btn onClick={handleExport} color={GREEN} sm>⬇ Excel</Btn>
        </div>
      </div>

      <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBar value={fq} onChange={setFq} placeholder="Buscar en bitácora..." />
        <select
          value={fAcc}
          onChange={e => setFAcc(e.target.value)}
          style={{ ...inp, width: 'auto', minWidth: 140, background: '#fff', border: '1.5px solid #e8e8f0' }}
        >
          <option value="">Todas las acciones</option>
          {['Crear', 'Editar', 'Eliminar', 'Finalizar masivo', 'Auto-actualizar estados'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={fEnt}
          onChange={e => setFEnt(e.target.value)}
          style={{ ...inp, width: 'auto', minWidth: 160, background: '#fff', border: '1.5px solid #e8e8f0' }}
        >
          <option value="">Todas las pestañas</option>
          {TODAS_ENTIDADES.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>Desde</label>
          <input
            type="date"
            value={fDesde}
            onChange={e => setFDesde(e.target.value)}
            style={{ ...inp, width: 'auto', padding: '5px 8px', fontSize: 11, background: '#fff', border: '1.5px solid #e8e8f0' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>Hasta</label>
          <input
            type="date"
            value={fHasta}
            onChange={e => setFHasta(e.target.value)}
            style={{ ...inp, width: 'auto', padding: '5px 8px', fontSize: 11, background: '#fff', border: '1.5px solid #e8e8f0' }}
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ background: 'none', border: '1.5px solid #e8e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#888', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ✕ Limpiar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>{filtered.length} de {bitacora.length} registros</span>
      </div>

      {bitacora.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#aaa', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📔</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sin movimientos registrados</div>
          <div style={{ fontSize: 12 }}>Cada vez que cree, edite o elimine un registro, quedará registrado aquí.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: NAVY }}>
                  {['#', 'Fecha', 'Hora', 'Usuario', 'Acción', 'Pestaña', 'Detalle'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#fff', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...filtered].reverse().map((e, i) => {
                  const [col, bg] = ACCION_C[e.accion] || [NAVY, '#f0f4f8']
                  return (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                      <td style={{ padding: '7px 10px', color: '#ccc', fontSize: 10 }}>{e.id}</td>
                      <td style={{ padding: '7px 10px', color: '#555', whiteSpace: 'nowrap' }}>{fmtD(e.fecha)}</td>
                      <td style={{ padding: '7px 10px', color: '#888', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{e.hora}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: NAVY }}>{e.usuario}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ background: bg, color: col, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{e.accion}</span>
                      </td>
                      <td style={{ padding: '7px 10px', color: '#555', fontWeight: 500 }}>{e.entidad}</td>
                      <td style={{ padding: '7px 10px', color: '#333', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.detalle}>{e.detalle}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
