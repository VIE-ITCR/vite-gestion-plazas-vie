import { useState, useMemo } from 'react'
import { NAVY } from '../constants'
import { nh, r2 } from '../utils'
import { Modal, Field, Btn, inp } from './ui'

function ProfesorSearch({ profesores, unidades, value, onChange }) {
  const sel = profesores.find(p => p.id === value)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const normL = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const filtered = useMemo(() => {
    const nq = normL(q)
    const base = [...profesores].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    if (!nq) return base
    return base.filter(p => normL(p.nombre).includes(nq) || normL(p.cedula || '').includes(nq))
  }, [profesores, q])
  const getUnids = p => (p.unidades || []).map(id => unidades.find(u => u.id === id)?.codigo || '').filter(Boolean).join(', ')
  const select = p => { onChange(String(p.id)); setQ(''); setOpen(false) }
  const clear = () => { onChange(''); setQ(''); setOpen(false) }
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input value={open ? q : (sel ? sel.nombre : '')} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => { setQ(''); setOpen(true) }} placeholder="Buscar por nombre o cédula..." style={{ ...inp, paddingRight: 28 }} />
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#aaa', pointerEvents: 'none' }}>🔍</span>
        </div>
        {value && <button type="button" onClick={clear} style={{ background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 6, width: 28, height: 34, cursor: 'pointer', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {filtered.length === 0
            ? <div style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>Sin resultados.</div>
            : filtered.map(p => (
              <div key={p.id} onMouseDown={e => { e.preventDefault(); select(p) }}
                style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f0f0f8', background: p.id === value ? '#eff6ff' : '#fff', display: 'flex', gap: 8, alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f0f4ff' }}
                onMouseLeave={e => { e.currentTarget.style.background = p.id === value ? '#eff6ff' : '#fff' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: NAVY, flexShrink: 0 }}>{(p.nombre || '?').charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: p.id === value ? 700 : 400, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                  {(getUnids(p) || p.cedula) && <div style={{ fontSize: 10, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[getUnids(p), p.cedula].filter(Boolean).join(' · ')}</div>}
                </div>
              </div>
            ))
          }
        </div>
      )}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onMouseDown={() => setOpen(false)} />}
    </div>
  )
}

function ProyectoSearch({ proyectos, value, onChange }) {
  const selPy = proyectos.find(p => p.id === value)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const normL = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const filtered = useMemo(() => {
    const nq = normL(q)
    if (!nq) return [...proyectos].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    return proyectos.filter(p => normL(p.nombre).includes(nq) || normL(p.codigo || '').includes(nq)).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
  }, [proyectos, q])
  const select = p => { onChange(p.id); setQ(''); setOpen(false) }
  const clear = () => { onChange(''); setQ(''); setOpen(false) }
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input value={open ? q : (selPy ? (selPy.codigo ? selPy.codigo + ' — ' : '') + selPy.nombre : '')} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => { setQ(''); setOpen(true) }} placeholder="Buscar por nombre o código..." style={{ ...inp, paddingRight: 28 }} />
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#aaa', pointerEvents: 'none' }}>🔍</span>
        </div>
        {value && <button type="button" onClick={clear} style={{ background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 6, width: 28, height: 34, cursor: 'pointer', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {filtered.length === 0
            ? <div style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>Sin resultados.</div>
            : filtered.map(p => (
              <div key={p.id} onMouseDown={e => { e.preventDefault(); select(p) }}
                style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f0f0f8', background: p.id === value ? '#eff6ff' : '#fff', display: 'flex', gap: 8, alignItems: 'baseline' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f0f4ff' }}
                onMouseLeave={e => { e.currentTarget.style.background = p.id === value ? '#eff6ff' : '#fff' }}
              >
                {p.codigo && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{p.codigo}</span>}
                <span style={{ color: NAVY, fontWeight: p.id === value ? 700 : 400 }}>{p.nombre}</span>
                <span style={{ color: '#aaa', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>{p.estado}</span>
              </div>
            ))
          }
        </div>
      )}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onMouseDown={() => setOpen(false)} />}
    </div>
  )
}

export function NomModal({ open, mode, initialForm, onClose, onSave, data, hUsadas }) {
  const [f, setF] = useState(initialForm || {})
  useMemo(() => { setF(initialForm || {}) }, [open])
  if (!open) return null
  const ff = (k, v) => setF(p => ({ ...p, [k]: v }))
  const handleProfesor = id => {
    const profId = parseInt(id) || ''
    const prof = data.profesores.find(p => p.id === profId)
    const unis = prof ? (prof.unidades || []) : []
    ff('profesorId', profId)
    ff('unidadId', unis.length === 1 ? unis[0] : '')
  }
  const prof = f.profesorId ? data.profesores.find(p => p.id === f.profesorId) : null
  const unidadesProf = prof && (prof.unidades || []).length > 0
    ? data.unidades.filter(u => (prof.unidades || []).includes(u.id))
    : data.unidades
  const plaza = f.plazaId ? data.plazas.find(p => p.id === f.plazaId) : null
  const estadoNom = (data.nombramiento_estado || []).find(e => e.estadoid === f.estadoId)?.estado || ''
  const usadas = hUsadas ? hUsadas(f.plazaId) : 0
  const disp = plaza ? Math.round((plaza.horasSemanales - (usadas || 0)) * 100) / 100 : 0
  const excedeActivo = estadoNom === 'Activo' && nh(f.horas) > disp
  const usadasPeriodo = estadoNom === 'Por iniciar' && f.inicio
    ? r2(data.nombramientos.filter(n =>
        n.plazaId === f.plazaId &&
        (n.estado === 'Activo' || n.estado === 'Por iniciar') &&
        (mode === 'new' || n.id !== f.id) &&
        (!n.fin || n.fin >= f.inicio) &&
        (!f.fin || !n.inicio || n.inicio <= f.fin)
      ).reduce((s, n) => s + nh(n.horas), 0))
    : 0
  const dispPeriodo = plaza ? r2(plaza.horasSemanales - usadasPeriodo) : 0
  const excedePorIniciar = estadoNom === 'Por iniciar' && !!f.inicio && plaza && nh(f.horas) > dispPeriodo
  const excedeTotal = estadoNom === 'Finalizado' && plaza && nh(f.horas) > nh(plaza.horasSemanales)
  const excede = excedeActivo || excedePorIniciar || excedeTotal
  return (
    <Modal title={mode === 'new' ? 'Nuevo Nombramiento' : 'Editar Nombramiento'} onClose={onClose}>
      <Field label="Plaza">
        <select style={inp} value={f.plazaId || ''} onChange={e => ff('plazaId', parseInt(e.target.value) || '')}>
          <option value="">Seleccione...</option>
          {[...data.plazas].sort((a, b) => a.codigo.localeCompare(b.codigo)).map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.horasSemanales - (hUsadas ? hUsadas(p.id) : 0)}h disp.</option>)}
        </select>
      </Field>
      <Field label="Profesor">
        <ProfesorSearch profesores={data.profesores} unidades={data.unidades} value={f.profesorId || ''} onChange={handleProfesor} />
      </Field>
      <Field label="Unidad">
        <select style={{ ...inp, borderColor: !f.unidadId ? '#f59e0b' : '#e0e0e0' }} value={f.unidadId || ''} onChange={e => ff('unidadId', parseInt(e.target.value) || '')} disabled={!f.profesorId}>
          <option value="">Seleccione...</option>
          {[...unidadesProf].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.codigo})</option>)}
        </select>
      </Field>
      <Field label="Proyecto">
        <ProyectoSearch proyectos={data.proyectos} value={f.proyectoId || ''} onChange={v => ff('proyectoId', v)} />
      </Field>
      <Field label="Tipo de Nombramiento">
        <select style={inp} value={f.tipoNombramientoId || ''} onChange={e => ff('tipoNombramientoId', parseInt(e.target.value) || '')}>
          <option value="">Seleccione...</option>
          {[...data.tiposNombramiento].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </Field>
      <Field label="Verificación">
        <select style={inp} value={f.verificacionId || ''} onChange={e => ff('verificacionId', parseInt(e.target.value) || '')}>
          <option value="">Sin verificación</option>
          {[...data.verificaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Field label="Horas por Semana">
            <input type="number" style={inp} min={0} max={40} step={0.5} value={f.horas || ''} onChange={e => ff('horas', e.target.value)} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="% (base 40h)">
            <input type="number" style={inp} min={0} max={100} step={0.5}
              value={f.horas != null && f.horas !== '' ? Math.round(parseFloat(f.horas) / 40 * 10000) / 100 : ''}
              onChange={e => { const p = parseFloat(e.target.value); ff('horas', isNaN(p) ? '' : Math.round(p / 100 * 40 * 100) / 100) }} />
          </Field>
        </div>
      </div>
      {f.plazaId && <small style={{ fontSize: 11, color: excede ? '#dc2626' : '#16a34a', fontWeight: 600, marginTop: -8, marginBottom: 10, display: 'block' }}>{excedeActivo ? '⚠ Solo ' + disp + 'h disponibles' : excedePorIniciar ? '⚠ Solo ' + dispPeriodo + 'h disponibles en ese período' : excedeTotal ? '⚠ Excede el total de la plaza (' + nh(plaza.horasSemanales) + 'h)' : estadoNom === 'Activo' ? '✓ ' + disp + 'h disponibles' : estadoNom === 'Por iniciar' && f.inicio ? '✓ ' + dispPeriodo + 'h disponibles en ese período' : '✓ Máx. ' + nh(plaza?.horasSemanales || 0) + 'h en esta plaza'}</small>}
      <Field label="Fecha Inicio"><input type="date" style={inp} value={(f.inicio || '').slice(0, 10)} onChange={e => ff('inicio', e.target.value)} /></Field>
      <Field label="Fecha Fin"><input type="date" style={inp} value={(f.fin || '').slice(0, 10)} onChange={e => ff('fin', e.target.value)} /></Field>
      <Field label="Estado">
        <select style={{ ...inp, borderColor: !f.estadoId ? '#f59e0b' : '#e0e0e0' }} value={f.estadoId || ''} onChange={e => ff('estadoId', parseInt(e.target.value) || '')}>
          <option value="">Seleccione...</option>
          {(data.nombramiento_estado || []).map(e => <option key={e.estadoid} value={e.estadoid}>{e.estado}</option>)}
        </select>
      </Field>
      <Field label="Observaciones">
        <textarea style={{ ...inp, height: 72, resize: 'vertical', fontFamily: 'inherit' }} value={f.observaciones || ''} onChange={e => ff('observaciones', e.target.value)} placeholder="Notas o comentarios adicionales..." maxLength={500} />
      </Field>
      <Field label="Acuerdo">
        <input type="text" style={inp} value={f.acuerdo || ''} onChange={e => ff('acuerdo', e.target.value)} placeholder="N.° de acuerdo..." maxLength={100} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn onClick={onClose} color="#888">Cancelar</Btn>
        <Btn onClick={() => onSave(f)} disabled={excede} style={excede ? { opacity: .45, cursor: 'not-allowed' } : {}}>Guardar</Btn>
      </div>
    </Modal>
  )
}
