import { useState, useMemo } from 'react'
import { NAVY, BLUE, GREEN, RED, AMBER } from '../constants'
import { nh, r2, match } from '../utils'
import { FBar, FSel, SearchBar } from '../components/ui'
import { NomTable } from './TabCatalogos'

export function TabDisponibilidad({ data, hUsadas, gP, gPl, gPy, dU }) {
  const [fD, setFD] = useState({ q: '', cf: '', estado: '' })

  const filtD = useMemo(() =>
    data.plazas.filter(p =>
      match(p.codigo, fD.q) &&
      (!fD.cf || p.cf === fD.cf) &&
      (!fD.estado || (fD.estado === 'libre' ? hUsadas(p.id) < p.horasSemanales : hUsadas(p.id) >= p.horasSemanales))
    )
  , [data.plazas, data.nombramientos, fD])

  const dTotH = r2(filtD.reduce((s, p) => s + nh(p.horasSemanales), 0))
  const dUsadH = r2(filtD.reduce((s, p) => s + hUsadas(p.id), 0))
  const dLibH = r2(dTotH - dUsadH)
  const dPct = dTotH > 0 ? Math.round((dUsadH / dTotH) * 100) : 0

  return (
    <div>
      <h2 style={{ margin: '0 0 12px', color: NAVY, fontSize: 17 }}>Disponibilidad de Plazas</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { l: 'Horas totales', v: dTotH, c: NAVY, bg: '#f0f4f8' },
          { l: 'Horas en uso', v: dUsadH, c: BLUE, bg: '#eff6ff' },
          { l: 'Horas libres', v: dLibH, c: dLibH > 0 ? GREEN : RED, bg: dLibH > 0 ? '#f0fdf4' : '#fef2f2' },
          { l: '% Ocupación', v: dPct + '%', c: dPct >= 100 ? RED : dPct > 70 ? AMBER : GREEN, bg: '#fafafa' }
        ].map(k => (
          <div key={k.l} style={{ background: k.bg, borderRadius: 10, padding: '10px 16px', flex: 1, minWidth: 120, border: '1.5px solid ' + k.c + '22' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>
      <FBar count={filtD.length} total={data.plazas.length}>
        <SearchBar value={fD.q} onChange={v => setFD(p => ({ ...p, q: v }))} />
        <FSel value={fD.cf} onChange={v => setFD(p => ({ ...p, cf: v }))} placeholder="Todos los CF"
          options={[...data.cfs].map(c => ({ v: c.nombre || c.codigo, l: (c.nombre || c.codigo || '').trim() })).sort((a, b) => a.l.toLowerCase() < b.l.toLowerCase() ? -1 : 1)} />
        <FSel value={fD.estado} onChange={v => setFD(p => ({ ...p, estado: v }))} placeholder="Todas"
          options={[{ v: 'libre', l: 'Con horas libres' }, { v: 'ocupada', l: 'Sin horas libres' }]} />
      </FBar>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtD.map(p => {
          const noms2 = data.nombramientos.filter(n => n.plazaId === p.id && n.estado === 'Activo')
          const u = r2(noms2.reduce((s, n) => s + nh(n.horas), 0))
          const lib = r2(p.horasSemanales - u)
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>
                  {p.codigo} <span style={{ color: '#888', fontSize: 11, fontWeight: 400 }}>- {p.cf}</span>
                </span>
                <span style={{ fontSize: 13, color: lib > 0 ? GREEN : RED, fontWeight: 700 }}>{lib}h libres</span>
              </div>
              {noms2.length === 0
                ? <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>Sin nombramientos activos.</p>
                : <NomTable noms={noms2} showPlaza={false} showProf showProy gPl={gPl} gP={gP} gPy={gPy} dU={dU} tiposNombramiento={data.tiposNombramiento} />
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}
