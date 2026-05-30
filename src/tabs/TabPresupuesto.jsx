import { useState, useMemo, useRef } from 'react'
import { NAVY, GREEN, RED, CATS, CAT_COLORS } from '../constants'
import { nh, r2, match, fmtD, fmtMoney, getAnios } from '../utils'
import { apiPut } from '../api'
import { useToast } from '../context/toast'
import { Badge, Btn, FBar, SearchBar, EmptyState } from '../components/ui'

function BudgetCard({ p, uni, totalProyecto, totalAnio, totalCat, getP, setP, gT }) {
  const toast = useToast()
  const [extrasLocal, setExtrasLocal] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [addingAnio, setAddingAnio] = useState(false)
  const [newAnio, setNewAnio] = useState('')

  const confirmarAnio = () => {
    const a = parseInt(newAnio)
    if (isNaN(a) || a < 2000 || a > 2100) { toast.error('Año inválido (2000-2100).'); return }
    if ([...extrasLocal, ...getAnios(p)].includes(a)) { toast.error('El año ya existe.'); return }
    setExtrasLocal(prev => [...prev, a])
    setAddingAnio(false); setNewAnio('')
  }

  const anios = [...getAnios(p)]
  extrasLocal.forEach(y => { if (!anios.includes(y)) anios.push(y) })
  anios.sort((a, b) => a - b)

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{p.nombre}</span>
            <Badge text={p.estado} />
            {uni && <span style={{ background: '#f0f4f8', color: NAVY, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{uni.codigo}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{gT(p.tipoId)?.nombre || '-'} · {fmtD(p.inicio)} → {fmtD(p.fin)}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: GREEN }}>{fmtMoney(totalProyecto(p.id, anios))}</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>total</div>
        </div>
        <span style={{ color: '#aaa', marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid #f0f4f8', padding: '12px 16px', background: '#fafbff' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 400 }}>
              <thead>
                <tr style={{ background: '#f0f4f8' }}>
                  <th style={{ padding: '7px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: 11 }}>Categoría</th>
                  {anios.map(a => <th key={a} style={{ padding: '7px 14px', textAlign: 'right', color: NAVY, fontWeight: 700, fontSize: 11, minWidth: 110 }}>{a}</th>)}
                  <th style={{ padding: '7px 14px', textAlign: 'right', color: NAVY, fontWeight: 700, fontSize: 11 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {CATS.map(cat => {
                  const ck = cat.toLowerCase()
                  const tot = anios.reduce((s, a) => s + totalCat(p.id, a, ck), 0)
                  return (
                    <tr key={cat} style={{ borderBottom: '1px solid #f0f0f8' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 2, background: CAT_COLORS[cat], display: 'inline-block' }} />
                          <span style={{ fontWeight: 600, color: '#444' }}>{cat}</span>
                        </span>
                      </td>
                      {anios.map(a => (
                        <td key={a} style={{ padding: '6px 10px', textAlign: 'right' }}>
                          <input type="number" min={0} value={getP(p.id, a)[ck]}
                            onChange={e => setP(p.id, a, ck, e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '5px 8px', border: '1.5px solid #e0e0e0', borderRadius: 6, fontSize: 12, textAlign: 'right', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                        </td>
                      ))}
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: CAT_COLORS[cat] }}>{fmtMoney(tot)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0f4f8', borderTop: '2px solid #e0e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: NAVY }}>Total Año</td>
                  {anios.map(a => <td key={a} style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{fmtMoney(totalAnio(p.id, a))}</td>)}
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{fmtMoney(totalProyecto(p.id, anios))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            {addingAnio ? (
              <>
                <input autoFocus type="number" min={2000} max={2100} value={newAnio}
                  onChange={e => setNewAnio(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmarAnio(); if (e.key === 'Escape') { setAddingAnio(false); setNewAnio('') } }}
                  placeholder={String(Math.max(...anios) + 1)}
                  style={{ width: 90, padding: '5px 8px', border: '1.5px solid #e0e0e0', borderRadius: 6, fontSize: 12, outline: 'none' }} />
                <Btn onClick={confirmarAnio} sm color={NAVY}>OK</Btn>
                <Btn onClick={() => { setAddingAnio(false); setNewAnio('') }} sm color="#888">✕</Btn>
              </>
            ) : (
              <Btn onClick={() => { setAddingAnio(true); setNewAnio(String(Math.max(...anios) + 1)) }} sm color={NAVY}>+ Agregar año</Btn>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TabPresupuesto({ data, presupuestos, setPresupuestos, gT }) {
  const toast = useToast()
  const [fBudget, setFBudget] = useState({ q: '' })
  const debounceRef = useRef({})

  const getP = (proyId, anio) => presupuestos[proyId + '_' + anio] || { equipo: 0, operativo: 0, estudiantes: 0 }

  const setP = (proyId, anio, cat, val) => {
    const key = proyId + '_' + anio
    const updated = { ...getP(proyId, anio), [cat]: Number(val) || 0 }
    setPresupuestos(prev => ({ ...prev, [key]: updated }))
    clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(() => {
      apiPut('/presupuesto/' + key, updated).catch(e => toast.error('Error al guardar presupuesto: ' + e.message))
    }, 600)
  }

  const totalCat = (proyId, anio, cat) => nh(getP(proyId, anio)[cat])
  const totalAnio = (proyId, anio) => r2(CATS.reduce((s, c) => s + totalCat(proyId, anio, c.toLowerCase()), 0))
  const totalProyecto = (proyId, anios) => r2(anios.reduce((s, a) => s + totalAnio(proyId, a), 0))

  const filtBudget = useMemo(() =>
    data.proyectos.filter(p => match(p.nombre, fBudget.q) || match(p.codigo, fBudget.q))
  , [data.proyectos, fBudget])

  const allAnios = [...new Set(data.proyectos.flatMap(p => getAnios(p)))].sort((a, b) => a - b)

  return (
    <div>
      <h2 style={{ margin: '0 0 14px', color: NAVY }}>Presupuesto por Proyecto</h2>
      <FBar count={filtBudget.length} total={data.proyectos.length}>
        <SearchBar value={fBudget.q} onChange={v => setFBudget(p => ({ ...p, q: v }))} />
      </FBar>
      {filtBudget.length === 0 && <EmptyState total={data.proyectos.length} noun="proyectos" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtBudget.map(p => {
          const uni = data.unidades.find(u => u.id === p.unidadId)
          return <BudgetCard key={p.id} p={p} uni={uni} totalProyecto={totalProyecto} totalAnio={totalAnio} totalCat={totalCat} getP={getP} setP={setP} gT={gT} />
        })}
      </div>
      {allAnios.length >= 2 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ color: NAVY, fontSize: 14, marginBottom: 10, borderBottom: '2px solid #e8e8f0', paddingBottom: 6 }}>📈 Comparativa Anual</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8f9ff' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontWeight: 700, borderBottom: '1px solid #e8e8f0' }}>Cuenta</th>
                  {allAnios.map((a, i) => [
                    <th key={a} style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 700, borderBottom: '1px solid #e8e8f0' }}>{a}</th>,
                    i > 0 && <th key={a + 'v'} style={{ textAlign: 'right', padding: '6px 8px', color: '#aaa', fontWeight: 600, fontSize: 10, borderBottom: '1px solid #e8e8f0' }}>Var.</th>
                  ])}
                </tr>
              </thead>
              <tbody>
                {CATS.map((cat, ci) => {
                  const ck = cat.toLowerCase()
                  const vals = allAnios.map(a => r2(data.proyectos.reduce((s, p) => s + totalCat(p.id, a, ck), 0)))
                  return (
                    <tr key={cat} style={{ borderBottom: '1px solid #f0f0f8', background: ci % 2 === 0 ? '#fff' : '#fafbff' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: CAT_COLORS[cat] }}>{cat}</td>
                      {vals.map((v, i) => [
                        <td key={i} style={{ textAlign: 'right', padding: '6px 8px', color: v > 0 ? '#333' : '#ccc' }}>{v > 0 ? fmtMoney(v) : '—'}</td>,
                        i > 0 && (() => {
                          const prev = vals[i - 1]; const diff = v - prev
                          const pct = prev > 0 ? Math.round((diff / prev) * 100) : null
                          return <td key={i + 'v'} style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, color: diff > 0 ? GREEN : diff < 0 ? RED : '#aaa', fontWeight: 700 }}>{pct !== null ? (diff >= 0 ? '+' : '') + pct + '%' : '—'}</td>
                        })()
                      ])}
                    </tr>
                  )
                })}
                <tr style={{ background: '#f0f4f8', fontWeight: 700, borderTop: '2px solid #e0e8f0' }}>
                  <td style={{ padding: '6px 10px', color: NAVY }}>Total</td>
                  {allAnios.map((a, i) => {
                    const v = r2(CATS.reduce((s, cat) => s + data.proyectos.reduce((ss, p) => ss + totalCat(p.id, a, cat.toLowerCase()), 0), 0))
                    const prev = i > 0 ? r2(CATS.reduce((s, cat) => s + data.proyectos.reduce((ss, p) => ss + totalCat(p.id, allAnios[i - 1], cat.toLowerCase()), 0), 0)) : null
                    const diff = prev !== null ? r2(v - prev) : null
                    const pct = prev && prev > 0 ? Math.round((diff / prev) * 100) : null
                    return [
                      <td key={a} style={{ textAlign: 'right', padding: '6px 8px', color: GREEN }}>{fmtMoney(v)}</td>,
                      i > 0 && <td key={a + 'v'} style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, color: diff >= 0 ? GREEN : RED, fontWeight: 700 }}>{pct !== null ? (diff >= 0 ? '+' : '') + pct + '%' : '—'}</td>
                    ]
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
