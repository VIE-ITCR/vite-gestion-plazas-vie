import React, { useState } from 'react'
import { NAVY, BLUE, GREEN, RED, AMBER, TABS_PERMS_LIST, PERM_OPTS } from '../constants'
import { validarPwd } from '../utils'
import { apiPost, apiPut, apiDelete } from '../api'
import { useToast, useConfirm } from '../context/toast'

function PwdStrength({ p }) {
  if (!p) return null
  const req = [
    { ok: p.length >= 6, t: '6+ caracteres' },
    { ok: /[A-Z]/.test(p), t: 'Mayúscula' },
    { ok: /[a-z]/.test(p), t: 'Minúscula' },
    { ok: /\d/.test(p), t: 'Número' },
    { ok: /[!@#$%^&*_\-+=?.,;:]/.test(p), t: 'Carácter especial' },
  ]
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
      {req.map((x, i) => (
        <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, fontWeight: 600, background: x.ok ? '#dcfce7' : '#fee2e2', color: x.ok ? '#16a34a' : '#dc2626' }}>
          {x.ok ? '✓' : '✗'} {x.t}
        </span>
      ))}
    </div>
  )
}

const inp = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }

export function TabUsuarios({ roles, usuariosList, currentUid, setUsuariosList, setRoles, unidades = [] }) {
  const toast = useToast()
  const showConfirm = useConfirm()
  const [sub, setSub] = useState('usuarios')
  const [uModal, setUModal] = useState(null)
  const [uForm, setUForm] = useState({})
  const [uRolesForm, setURolesForm] = useState([])
  const [showUPwd, setShowUPwd] = useState(false)
  const [rModal, setRModal] = useState(null)
  const [rForm, setRForm] = useState({})
  const [uSearch, setUSearch] = useState('')

  const openNewUser = () => { setUModal('new'); setUForm({ activo: true }); setURolesForm([]); setShowUPwd(false) }
  const openEditUser = u => { setUModal('edit'); setUForm({ ...u }); setURolesForm(u.roles ? [...u.roles] : []) }

  const addRolToForm = rolId => {
    if (!rolId || uRolesForm.some(r => r.rolId === rolId)) return
    const rol = roles.find(r => r.id === rolId)
    setURolesForm(p => [...p, { rolId, todasUnidades: !rol?.soloRegistrosPropios, unidades: [] }])
  }
  const removeRolFromForm = rolId => setURolesForm(p => p.filter(r => r.rolId !== rolId))
  const toggleTodasUnidades = (rolId, val) => setURolesForm(p => p.map(r => r.rolId === rolId ? { ...r, todasUnidades: val, unidades: [] } : r))
  const toggleUnidadInForm = (rolId, unidadId) => setURolesForm(p => p.map(r => {
    if (r.rolId !== rolId) return r
    const has = r.unidades.includes(unidadId)
    return { ...r, unidades: has ? r.unidades.filter(x => x !== unidadId) : [...r.unidades, unidadId] }
  }))

  const saveUser = async () => {
    if (!uForm.nombre) { toast.error('Complete el nombre.'); return }
    if (!uRolesForm.length) { toast.error('Asigne al menos un rol.'); return }
    try {
      if (uModal === 'new') {
        if (!uForm.email || !uForm.password) { toast.error('Email y contraseña requeridos.'); return }
        const cErr = validarPwd(uForm.password)
        if (cErr) { toast.error('Contraseña inválida: ' + cErr); return }
        const res = await apiPost('/usuarios', {
          nombre: uForm.nombre, email: uForm.email, password: uForm.password,
          roles: uRolesForm, activo: uForm.activo !== false
        })
        if (res && res.uid) setUsuariosList(prev => [...prev, {
          uid: res.uid, nombre: uForm.nombre, email: uForm.email,
          rolId: uRolesForm[0]?.rolId || '', activo: true, roles: uRolesForm
        }])
      } else {
        await apiPut('/usuarios/' + uForm.uid, {
          nombre: uForm.nombre, roles: uRolesForm, activo: uForm.activo !== false
        })
        setUsuariosList(prev => prev.map(u => u.uid === uForm.uid
          ? { ...u, nombre: uForm.nombre, rolId: uRolesForm[0]?.rolId || u.rolId, activo: uForm.activo !== false, roles: uRolesForm }
          : u))
      }
      setUModal(null); setUForm({}); setURolesForm([])
      toast.success('Usuario guardado.')
    } catch (e) { toast.error('Error: ' + e.message) }
  }

  const delUser = async uid => {
    if (uid === currentUid) { toast.error('No puede eliminar su propio usuario.'); return }
    if (!await showConfirm('¿Eliminar este usuario?', { danger: true, okText: 'Eliminar' })) return
    try {
      await apiDelete('/usuarios/' + uid)
      setUsuariosList(prev => prev.filter(u => u.uid !== uid))
    } catch (e) { toast.error('Error al eliminar: ' + e.message) }
  }

  const saveRole = async () => {
    if (!rForm.nombre) { toast.error('Ingrese nombre del rol.'); return }
    const perms = {}; TABS_PERMS_LIST.forEach(t => { perms[t.k] = rForm.permisos?.[t.k] || 'none' })
    const id = rModal === 'new' ? ('rol_' + Date.now()) : rForm.id
    const roleData = { id, nombre: rForm.nombre, permisos: perms, sistema: rForm.sistema || false, soloRegistrosPropios: rForm.soloRegistrosPropios || false }
    try {
      if (rModal === 'new') {
        await apiPost('/roles', roleData)
        setRoles(prev => [...prev, roleData])
      } else {
        await apiPut('/roles/' + id, roleData)
        setRoles(prev => prev.map(r => r.id === id ? roleData : r))
      }
      setRModal(null); setRForm({})
      toast.success('Rol guardado.')
    } catch (e) { toast.error('Error: ' + e.message) }
  }

  const delRole = async id => {
    if (usuariosList.some(u => (u.roles || []).some(rf => rf.rolId === id) || u.rolId === id)) {
      toast.error('No se puede eliminar: hay usuarios asignados a este rol.'); return
    }
    if (!await showConfirm('¿Eliminar rol "' + roles.find(r => r.id === id)?.nombre + '"?', { danger: true, okText: 'Eliminar' })) return
    try {
      await apiDelete('/roles/' + id)
      setRoles(prev => prev.filter(r => r.id !== id))
    } catch (e) { toast.error('Error al eliminar: ' + e.message) }
  }

  const filtUsers = usuariosList.filter(u => !uSearch ||
    u.nombre?.toLowerCase().includes(uSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(uSearch.toLowerCase()))

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', color: NAVY, fontSize: 17 }}>Usuarios y Roles</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ k: 'usuarios', l: '👤 Usuarios' }, { k: 'roles', l: '🔑 Roles' }].map(s => (
          <button key={s.k} onClick={() => setSub(s.k)}
            style={{ padding: '7px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: sub === s.k ? NAVY : '#e8e8f0', color: sub === s.k ? '#fff' : '#555' }}>
            {s.l}
          </button>
        ))}
      </div>

      {sub === 'usuarios' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <input value={uSearch} onChange={e => setUSearch(e.target.value)} placeholder="🔍 Buscar usuario..."
              style={{ ...inp, maxWidth: 280, background: '#fff' }} />
            <button onClick={openNewUser}
              style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Nuevo Usuario
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtUsers.map(u => {
              const uroles = (u.roles || []).map(rf => roles.find(r => r.id === rf.rolId)).filter(Boolean)
              return (
                <div key={u.uid} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 19, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                    {(u.nombre || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{u.nombre}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                    {uroles.length
                      ? uroles.map(r => <span key={r.id} style={{ background: '#dbeafe', color: BLUE, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.nombre}</span>)
                      : <span style={{ background: '#f3f4f6', color: '#888', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Sin rol</span>}
                  </div>
                  <span style={{ background: u.activo ? '#dcfce7' : '#fee2e2', color: u.activo ? GREEN : RED, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => openEditUser(u)}
                      style={{ background: '#f0f4f8', border: 'none', borderRadius: 6, padding: '5px 11px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Editar</button>
                    {u.uid !== currentUid && (
                      <button onClick={() => delUser(u.uid)}
                        style={{ background: '#fee2e2', color: RED, border: 'none', borderRadius: 6, padding: '5px 11px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
                    )}
                  </div>
                </div>
              )
            })}
            {!filtUsers.length && <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#aaa' }}>Sin usuarios.</div>}
          </div>

          {uModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 380, maxWidth: 460, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: NAVY }}>{uModal === 'new' ? 'Nuevo Usuario' : 'Editar Usuario'}</h3>
                  <button onClick={() => { setUModal(null); setUForm({}); setURolesForm([]) }} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
                </div>
                <div style={{ marginBottom: 11 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 3 }}>Nombre completo</label>
                  <input style={inp} value={uForm.nombre || ''} onChange={e => setUForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                {uModal === 'new' && (
                  <div style={{ marginBottom: 11 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 3 }}>Correo electrónico</label>
                    <input style={inp} type="email" value={uForm.email || ''} onChange={e => setUForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                )}
                {uModal === 'new' && (
                  <div style={{ marginBottom: 11 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 3 }}>Contraseña inicial</label>
                    <div style={{ position: 'relative' }}>
                      <input style={{ ...inp, paddingRight: 36 }} type={showUPwd ? 'text' : 'password'} value={uForm.password || ''} onChange={e => setUForm(p => ({ ...p, password: e.target.value }))} />
                      <button type="button" onClick={() => setShowUPwd(v => !v)}
                        style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 15, padding: 2 }} tabIndex={-1}>
                        {showUPwd ? '🙈' : '👁'}
                      </button>
                    </div>
                    <PwdStrength p={uForm.password || ''} />
                  </div>
                )}
                <div style={{ marginBottom: 11 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Roles asignados</label>
                  {uRolesForm.map(rf => {
                    const rol = roles.find(r => r.id === rf.rolId)
                    return (
                      <div key={rf.rolId} style={{ marginBottom: 8, border: '1px solid #e0e7ef', borderRadius: 8, padding: '10px 12px', background: '#f8faff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: rol?.soloRegistrosPropios ? 0 : 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{rol?.nombre || rf.rolId}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {rol?.soloRegistrosPropios && (
                              <span style={{ background: '#fef3c7', color: AMBER, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>Solo propios</span>
                            )}
                            <button onClick={() => removeRolFromForm(rf.rolId)}
                              style={{ background: '#fee2e2', color: RED, border: 'none', borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                          </div>
                        </div>
                        {!rol?.soloRegistrosPropios && (
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginBottom: 6 }}>
                              <input type="checkbox" checked={rf.todasUnidades} onChange={e => toggleTodasUnidades(rf.rolId, e.target.checked)} />
                              Todas las unidades
                            </label>
                            {!rf.todasUnidades && (
                              <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 6, padding: 6, background: '#fff' }}>
                                {[...unidades].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es')).map(u => (
                                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 12, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={rf.unidades.includes(u.id)} onChange={() => toggleUnidadInForm(rf.rolId, u.id)} />
                                    {u.nombre}{u.codigo ? ` (${u.codigo})` : ''}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <select style={{ ...inp, flex: 1 }} defaultValue="" onChange={e => { addRolToForm(e.target.value); e.target.value = '' }}>
                      <option value="">+ Agregar rol...</option>
                      {roles.filter(r => !uRolesForm.some(rf => rf.rolId === r.id)).map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={uForm.activo !== false} onChange={e => setUForm(p => ({ ...p, activo: e.target.checked }))} />
                    Usuario activo
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => { setUModal(null); setUForm({}); setURolesForm([]) }}
                    style={{ background: '#f0f4f8', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  <button onClick={saveUser}
                    style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Guardar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {sub === 'roles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#888' }}>{roles.length} roles definidos</span>
            <button onClick={() => { const p = {}; TABS_PERMS_LIST.forEach(t => { p[t.k] = 'none' }); setRModal('new'); setRForm({ permisos: p }) }}
              style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              + Nuevo Rol
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roles.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{r.nombre}</span>
                    {r.sistema && <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Sistema</span>}
                    {r.soloRegistrosPropios && <span style={{ background: '#fef3c7', color: AMBER, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Solo propios</span>}
                    <span style={{ background: '#f0f4f8', color: '#888', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                      {usuariosList.filter(u => (u.roles || []).some(rf => rf.rolId === r.id) || u.rolId === r.id).length} usuarios
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setRModal('edit'); setRForm({ ...r, permisos: { ...r.permisos } }) }}
                      style={{ background: '#f0f4f8', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Editar permisos</button>
                    {!r.sistema && (
                      <button onClick={() => delRole(r.id)}
                        style={{ background: '#fee2e2', color: RED, border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {TABS_PERMS_LIST.map(t => {
                    const pv = r.permisos?.[t.k] || 'none'
                    const cfg = { write: { bg: '#dcfce7', c: '#16a34a', ic: '✏️' }, read: { bg: '#fef3c7', c: '#d97706', ic: '👁' }, none: { bg: '#f3f4f6', c: '#94a3b8', ic: '🚫' } }
                    const s = cfg[pv]
                    return <span key={t.k} style={{ background: s.bg, color: s.c, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{s.ic} {t.l}</span>
                  })}
                </div>
              </div>
            ))}
          </div>
          {rModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 480, maxWidth: 580, width: '95%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: NAVY }}>{rModal === 'new' ? 'Nuevo Rol' : 'Editar Rol: ' + rForm.nombre}</h3>
                  <button onClick={() => { setRModal(null); setRForm({}) }} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 3 }}>Nombre del rol</label>
                  <input style={inp} value={rForm.nombre || ''} onChange={e => setRForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Coordinador VIE" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: NAVY }}>
                    <input type="checkbox" checked={rForm.soloRegistrosPropios || false} style={{ accentColor: NAVY, width: 15, height: 15 }}
                      onChange={e => setRForm(p => ({ ...p, soloRegistrosPropios: e.target.checked }))} />
                    Solo ver registros propios
                  </label>
                  {rForm.soloRegistrosPropios && (
                    <div style={{ marginTop: 6, padding: '7px 12px', background: '#fef9c3', borderRadius: 7, fontSize: 11, color: '#92400e' }}>
                      ⚠ Este rol no permite asignar unidades específicas.
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Permisos por pestaña</label>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8f9ff' }}>
                        <th style={{ textAlign: 'left', padding: '7px 10px', color: '#888', fontWeight: 600, fontSize: 11, borderBottom: '2px solid #e8e8f0' }}>Pestaña</th>
                        {PERM_OPTS.map(o => <th key={o.v} style={{ textAlign: 'center', padding: '7px 10px', color: o.c, fontWeight: 700, fontSize: 11, borderBottom: '2px solid #e8e8f0', width: 80 }}>{o.l}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {TABS_PERMS_LIST.map((t, i) => {
                        const showGrp = t.grp && (i === 0 || TABS_PERMS_LIST[i - 1].grp !== t.grp)
                        return (
                          <React.Fragment key={t.k}>
                            {showGrp && (
                              <tr><td colSpan={4} style={{ padding: '5px 10px', background: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.grp}</td></tr>
                            )}
                            <tr style={{ background: i % 2 === 0 ? '#fff' : '#fafbff', borderBottom: '1px solid #f0f0f8' }}>
                              <td style={{ padding: '8px 10px 8px 18px', fontWeight: 600, color: NAVY }}>{t.l}</td>
                              {PERM_OPTS.map(o => (
                                <td key={o.v} style={{ textAlign: 'center', padding: '8px 10px' }}>
                                  <input type="radio" name={'p_' + t.k}
                                    checked={(rForm.permisos?.[t.k] || 'none') === o.v}
                                    onChange={() => setRForm(p => ({ ...p, permisos: { ...p.permisos, [t.k]: o.v } }))}
                                    style={{ accentColor: o.c, width: 15, height: 15, cursor: 'pointer' }} />
                                </td>
                              ))}
                            </tr>
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => { setRModal(null); setRForm({}) }}
                    style={{ background: '#f0f4f8', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  <button onClick={saveRole}
                    style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Guardar Rol</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
