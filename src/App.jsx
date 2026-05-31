import { useState, useEffect, useRef, useMemo, Fragment, lazy, Suspense } from 'react'
import { LoginForm } from './components/LoginForm'
import { _currentUser, apiGet, apiPost, apiPut } from './api'
import { logout } from './auth'
import { NAVY, RED, CATS, GRP_ORDER } from './constants'
import { TABS } from './constants'
import { nh, r2, validarPwd, fmtD } from './utils'
import { NomModal } from './components/NomModal'
import { AppProviders, useToast, useConfirm } from './context/toast'
import { GlobalSearch } from './components/GlobalSearch'
import { ErrorBoundary } from './components/ErrorBoundary'

const TabResumen      = lazy(() => import('./tabs/TabResumen').then(m => ({ default: m.TabResumen })))
const TabCatalogos    = lazy(() => import('./tabs/TabCatalogos').then(m => ({ default: m.TabCatalogos })))
const TabProyectos    = lazy(() => import('./tabs/TabProyectos').then(m => ({ default: m.TabProyectos })))
const TabPlazas       = lazy(() => import('./tabs/TabPlazas').then(m => ({ default: m.TabPlazas })))
const TabNombramientos= lazy(() => import('./tabs/TabNombramientos').then(m => ({ default: m.TabNombramientos })))
const TabDisponibilidad=lazy(() => import('./tabs/TabDisponibilidad').then(m => ({ default: m.TabDisponibilidad })))
const TabAlertas      = lazy(() => import('./tabs/TabAlertas').then(m => ({ default: m.TabAlertas })))
const TabPresupuesto  = lazy(() => import('./tabs/TabPresupuesto').then(m => ({ default: m.TabPresupuesto })))
const TabReportes     = lazy(() => import('./tabs/TabReportes').then(m => ({ default: m.TabReportes })))
const TabRepProf      = lazy(() => import('./tabs/TabRepProf').then(m => ({ default: m.TabRepProf })))
const TabDatos        = lazy(() => import('./tabs/TabDatos').then(m => ({ default: m.TabDatos })))
const TabBitacora     = lazy(() => import('./tabs/TabBitacora').then(m => ({ default: m.TabBitacora })))
const TabGantt        = lazy(() => import('./tabs/TabGantt').then(m => ({ default: m.TabGantt })))
const TabUsuarios     = lazy(() => import('./tabs/TabUsuarios').then(m => ({ default: m.TabUsuarios })))

const DATA_INICIAL = {
  unidades: [],
  profesores: [],
  tiposActividad: [],
  tiposNombramiento: [],
  sedes: [],
  proyectos: [],
  plazas: [],
  nombramientos: [],
  verificaciones: [],
  cfs: [],
  vinculaciones: [],
  fuentes: [],
  gestores: [],
  plaza_vigencia: [],
  nombramiento_estado: []
}

const FK_NUM = [
  'sedeId', 'unidadId', 'tipoId', 'tipoNombramientoId',
  'profesorId', 'plazaId', 'proyectoId', 'verificacionId',
  'vigenciaId', 'estadoId'
]

const COLS = [
  'unidades', 'profesores', 'tiposActividad', 'tiposNombramiento',
  'sedes', 'proyectos', 'plazas', 'nombramientos', 'verificaciones',
  'cfs', 'vinculaciones', 'fuentes', 'gestores',
  'plaza_vigencia', 'nombramiento_estado'
]

const SORT_NOMBRE = [
  'unidades', 'profesores', 'tiposActividad', 'tiposNombramiento',
  'sedes', 'verificaciones', 'cfs', 'vinculaciones', 'fuentes', 'gestores'
]

function AppInner() {
  const toast = useToast()
  const showConfirm = useConfirm()
  const [authUser] = useState(_currentUser)
  const [data, setData] = useState(DATA_INICIAL)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('vie_tab') || 'resumen' } catch { return 'resumen' }
  })
  const [userPermisos, setUserPermisos] = useState({})
  const [userProfile, setUserProfile] = useState(null)
  const [bitacora, setBitacora] = useState([])
  const [presupuestos, setPresupuestos] = useState({})
  const [roles, setRoles] = useState([])
  const [usuariosList, setUsuariosList] = useState([])
  const [globalSearch, setGlobalSearch] = useState('')
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [jumpQ, setJumpQ] = useState(null)
  const _acc = useRef(DATA_INICIAL)

  const reloadCol = useCallback(async (col) => {
    try {
      if (col === 'presupuesto') {
        const rawP = await apiGet('/presupuesto')
        if (rawP && typeof rawP === 'object') setPresupuestos(rawP)
        return
      }
      if (col === 'bitacora') {
        const rawB = await apiGet('/bitacora')
        if (Array.isArray(rawB)) setBitacora([...rawB].sort((a, b) =>
          a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.hora || '').localeCompare(b.hora || '')))
        return
      }
      let arr = await apiGet('/' + col)
      if (!Array.isArray(arr)) arr = []
      arr = arr.map(dat => {
        const d = { ...dat, id: Number(dat.id) || 0 }
        FK_NUM.forEach(k => { if (d[k] !== undefined && d[k] !== null && d[k] !== '') d[k] = Number(d[k]) || d[k] })
        if (Array.isArray(d.unidades)) d.unidades = d.unidades.map(x => Number(x) || x)
        return d
      })
      if (SORT_NOMBRE.includes(col)) arr.sort((a, b) => {
        const x = (a.nombre || a.codigo || '').trim().toLowerCase()
        const y = (b.nombre || b.codigo || '').trim().toLowerCase()
        return x < y ? -1 : 1
      })
      if (col === 'nombramientos' || col === 'proyectos') {
        const eNomMap = {}
        ;(_acc.current.nombramiento_estado || []).forEach(e => { eNomMap[e.estadoid] = e.estado })
        arr = arr.map(item => ({ ...item, estado: eNomMap[item.estadoId] || item.estado || '' }))
      }
      _acc.current = { ..._acc.current, [col]: arr }
      setData(prev => ({ ...prev, [col]: arr }))
    } catch (e) {
      console.error('reloadCol error:', col, e.message)
    }
  }, [])

  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowGlobalSearch(s => !s) }
      if (e.key === 'Escape') setShowGlobalSearch(false)
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (!authUser) return
    const loadAuth = async () => {
      try {
        const [usuarios, roles] = await Promise.all([
          apiGet('/usuarios'),
          apiGet('/roles')
        ])
        const uList = Array.isArray(usuarios) ? usuarios : []
        const rList = Array.isArray(roles) ? roles : []
        const myProfile = uList.find(u => u.uid === authUser.uid) || null
        setUserProfile(myProfile)
        setRoles(rList)
        setUsuariosList(uList)
        if (myProfile) {
          const profileRolIds = (myProfile.roles || []).length > 0
            ? myProfile.roles.map(rf => Number(rf.rolId) || rf.rolId)
            : myProfile.rolId ? [Number(myProfile.rolId) || myProfile.rolId] : []
          const ORDER = { write: 2, read: 1, none: 0 }
          const merged = {}
          for (const rolId of profileRolIds) {
            const role = rList.find(r => Number(r.id) === Number(rolId) || String(r.id) === String(rolId))
            if (!role) continue
            const sp = typeof role.permisos === 'string' ? JSON.parse(role.permisos) : role.permisos || {}
            const def = (role.sistema && sp.usuarios === 'write') ? 'write' : 'none'
            TABS.forEach(t => {
              const v = sp[t.k] || def
              if ((ORDER[v] || 0) > (ORDER[merged[t.k]] || 0)) merged[t.k] = v
            })
            Object.keys(sp).forEach(k => {
              if ((ORDER[sp[k]] || 0) > (ORDER[merged[k]] || 0)) merged[k] = sp[k]
            })
          }
          // catalogos tab visibility is driven by any cat_* sub-permission
          if (!merged['catalogos'] || merged['catalogos'] === 'none') {
            const catVals = Object.keys(merged).filter(k => k.startsWith('cat_')).map(k => merged[k])
            if (catVals.some(v => v === 'write')) merged['catalogos'] = 'write'
            else if (catVals.some(v => v === 'read')) merged['catalogos'] = 'read'
          }
          setUserPermisos(merged)
        }
      } catch (e) {
        console.error('Auth error:', e)
        toast.error('Error al cargar permisos: ' + e.message + '. Intente cerrar sesión y volver a ingresar.')
      }
    }
    loadAuth()
  }, [authUser])

  useEffect(() => {
    if (!authUser) {
      setLoading(false)
      return
    }
    setLoading(true)
    let pollDelay = 120000
    let pollTimer = null

    function loadAll(silent) {
      return Promise.all([
        ...COLS.map(col => apiGet('/' + col)),
        apiGet('/presupuesto'),
        apiGet('/bitacora')
      ]).then(results => {
        pollDelay = 30000
        const newData = {}
        COLS.forEach((col, i) => {
          let arr = results[i]
          if (!Array.isArray(arr)) arr = []
          arr = arr.map(dat => {
            const d = { ...dat, id: Number(dat.id) || 0 }
            FK_NUM.forEach(k => {
              if (d[k] !== undefined && d[k] !== null && d[k] !== '') {
                d[k] = Number(d[k]) || d[k]
              }
            })
            if (Array.isArray(d.unidades)) {
              d.unidades = d.unidades.map(x => Number(x) || x)
            }
            return d
          })
          if (SORT_NOMBRE.includes(col)) {
            arr.sort((a, b) => {
              const x = (a.nombre || a.codigo || '').trim().toLowerCase()
              const y = (b.nombre || b.codigo || '').trim().toLowerCase()
              return x < y ? -1 : 1
            })
          }
          newData[col] = arr
        })

        const eNomMap = {}
        const nomEstados = newData.nombramiento_estado || []
        nomEstados.forEach(e => { eNomMap[e.estadoid] = e.estado })

        newData.nombramientos = (newData.nombramientos || []).map(n => ({
          ...n,
          estado: eNomMap[n.estadoId] || n.estado || ''
        }))
        newData.proyectos = (newData.proyectos || []).map(p => ({
          ...p,
          estado: eNomMap[p.estadoId] || p.estado || ''
        }))

        _acc.current = { ...newData }
        setData({ ...newData })

        const rawP = results[COLS.length]
        if (Array.isArray(rawP)) {
          const p = {}
          rawP.forEach(x => {
            if (x.id) {
              p[x.id] = {
                equipo: x.equipo || 0,
                operativo: x.operativo || 0,
                estudiantes: x.estudiantes || 0
              }
            }
          })
          setPresupuestos(p)
        } else if (rawP && typeof rawP === 'object') {
          setPresupuestos(rawP)
        }

        const rawB = results[COLS.length + 1]
        if (Array.isArray(rawB)) {
          setBitacora([...rawB].sort((a, b) =>
            a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1
            : (a.hora || '').localeCompare(b.hora || '')
          ))
        }

        setLastSync(new Date())
        if (!silent) setLoading(false)
      }).catch(e => {
        console.error('Load error:', e)
        if (!silent) toast.error('Error al cargar datos: ' + e.message)
        pollDelay = Math.min(pollDelay * 2, 300000)
        if (!silent) setLoading(false)
      })
    }

    function schedulePoll() {
      pollTimer = setTimeout(() => {
        loadAll(true).finally(schedulePoll)
      }, pollDelay)
    }

    function handleVisibility() {
      if (document.hidden) {
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
      } else {
        if (!pollTimer) loadAll(true).finally(schedulePoll)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    loadAll(false)
    schedulePoll()
    return () => {
      if (pollTimer) clearTimeout(pollTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [authUser])

  const today = new Date()
  const dU = d => Math.ceil((new Date(d) - today) / 86400000)
  const hUsadasMap = useMemo(() => {
    const m = {}
    data.nombramientos
      .filter(n => n.estado === 'Activo')
      .forEach(n => { m[n.plazaId] = (m[n.plazaId] || 0) + nh(n.horas) })
    return m
  }, [data.nombramientos])
  const hUsadas = id => r2(hUsadasMap[id] || 0)
  const gP = id => data.profesores.find(x => x.id === Number(id)) || { nombre: '(desconocido)', unidades: [] }
  const gPl = id => data.plazas.find(x => x.id === Number(id))
  const gPy = id => data.proyectos.find(x => x.id === Number(id))
  const gT = id => data.tiposActividad.find(x => x.id === Number(id))
  const gTN = id => data.tiposNombramiento.find(x => x.id === Number(id))
  const gU = id => data.unidades.find(x => x.id === Number(id))
  const gSede = id => data.sedes.find(x => x.id === Number(id))
  const gVerif = id => data.verificaciones.find(x => x.id === Number(id))
  const gVig = id => (data.plaza_vigencia || []).find(x => x.vigenciaid === Number(id))
  const gNomEst = id => (data.nombramiento_estado || []).find(x => x.estadoid === Number(id))
  const gFuente = id => data.fuentes.find(x => x.id === Number(id))
  const gVin = id => data.vinculaciones.find(x => x.id === Number(id))
  const gGestor = id => data.gestores.find(x => x.id === Number(id))
  const nomEstId = nombre => (data.nombramiento_estado || []).find(x => x.estado === nombre)?.estadoid || null

  const getP = (proyId, anio) => presupuestos[proyId + '_' + anio] || { equipo: 0, operativo: 0, estudiantes: 0 }
  const totalCat = (proyId, anio, cat) => nh(getP(proyId, anio)[cat])
  const totalAnio = (proyId, anio) => r2(CATS.reduce((s, c) => s + totalCat(proyId, anio, c.toLowerCase()), 0))
  const totalProyecto = (proyId, anios) => r2(anios.reduce((s, a) => s + totalAnio(proyId, a), 0))

  const totalH = useMemo(() =>
    r2(data.plazas.filter(x => x.interno !== 'No').reduce((s, x) => s + nh(x.horasSemanales), 0))
  , [data.plazas])

  const asigH = useMemo(() => {
    const ids = new Set(data.plazas.filter(x => x.interno !== 'No').map(x => x.id))
    return r2(data.nombramientos.filter(n => n.estado === 'Activo' && ids.has(n.plazaId)).reduce((s, n) => s + nh(n.horas), 0))
  }, [data.nombramientos, data.plazas])

  const a30 = useMemo(() =>
    data.nombramientos.filter(n =>
      n.estado === 'Activo' && n.fin && dU(n.fin) >= 0 && dU(n.fin) <= 30
    )
  , [data.nombramientos])

  const a60 = useMemo(() =>
    data.nombramientos.filter(n =>
      n.estado === 'Activo' && n.fin && dU(n.fin) > 30 && dU(n.fin) <= 60
    )
  , [data.nombramientos])

  const a90 = useMemo(() =>
    data.nombramientos.filter(n =>
      n.estado === 'Activo' && n.fin && dU(n.fin) > 60 && dU(n.fin) <= 90
    )
  , [data.nombramientos])

  const py30 = useMemo(() =>
    data.proyectos.filter(p =>
      p.estado === 'Activo' && p.fin && dU(p.fin) >= 0 && dU(p.fin) <= 30
    )
  , [data.proyectos])

  const py60 = useMemo(() =>
    data.proyectos.filter(p =>
      p.estado === 'Activo' && p.fin && dU(p.fin) > 30 && dU(p.fin) <= 60
    )
  , [data.proyectos])

  const py90 = useMemo(() =>
    data.proyectos.filter(p =>
      p.estado === 'Activo' && p.fin && dU(p.fin) > 60 && dU(p.fin) <= 90
    )
  , [data.proyectos])

  const logMov = (accion, entidad, detalle, refId = null, refType = null) => {
    const now = new Date()
    apiPost('/bitacora', {
      id: Date.now(),
      usuario: userProfile?.nombre || userProfile?.email || 'Sistema',
      accion,
      entidad,
      detalle,
      fecha: now.toISOString().slice(0, 10),
      hora: now.toTimeString().slice(0, 8),
      ...(refId ? { refId, refType } : {})
    }).catch(e => console.error('Error bitácora:', e))
  }

  const [lastSync, setLastSync] = useState(null)
  const [syncLabel, setSyncLabel] = useState('')
  const [openGrp, setOpenGrp] = useState(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const grpRefs = useRef({})
  const contentRef = useRef(null)
  const scrollPos = useRef({})
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pwdForm, setPwdForm] = useState({ ca: '', np: '', nc: '' })
  const [pwdErr, setPwdErr] = useState('')
  const [pwdOk, setPwdOk] = useState(false)
  const [showPwdCa, setShowPwdCa] = useState(false)
  const [showPwdNp, setShowPwdNp] = useState(false)
  const [showPwdNc, setShowPwdNc] = useState(false)

  const changePwd = async () => {
    setPwdErr(''); setPwdOk(false)
    if (!pwdForm.ca) { setPwdErr('Ingrese su contraseña actual.'); return }
    const _e = validarPwd(pwdForm.np)
    if (_e) { setPwdErr(_e); return }
    if (pwdForm.np !== pwdForm.nc) { setPwdErr('Las contraseñas no coinciden.'); return }
    try {
      await apiPost('/cambiarPassword', { passwordActual: pwdForm.ca, passwordNuevo: pwdForm.np })
      setPwdOk(true); setPwdForm({ ca: '', np: '', nc: '' })
      setTimeout(() => { setShowPwdModal(false); setPwdOk(false) }, 1500)
    } catch (e) { setPwdErr('Error: ' + e.message) }
  }

  const [nomModal, setNomModal] = useState({ open: false, mode: 'new', form: {} })
  const openNewNom = () => setNomModal({ open: true, mode: 'new', form: {} })
  const openEditNom = n => setNomModal({ open: true, mode: 'edit', form: { ...n } })
  const closeNomModal = () => setNomModal({ open: false, mode: 'new', form: {} })

  const saveNom = async f => {
    if ((userPermisos['nombramientos'] || 'none') !== 'write') { toast.error('Sin permisos de escritura en Nombramientos.'); return }
    if (!f.plazaId) { toast.error('Seleccione una plaza.'); return }
    if (!f.profesorId) { toast.error('Seleccione un profesor.'); return }
    if (!f.unidadId) { toast.error('Seleccione una unidad.'); return }
    if (!f.proyectoId) { toast.error('Seleccione un proyecto.'); return }
    if (!f.estadoId) { toast.error('Seleccione un estado.'); return }
    const horas = nh(f.horas)
    if (horas <= 0) { toast.error('Horas deben ser mayor a 0.'); return }
    if (f.inicio && f.fin) {
      const ini = new Date(f.inicio), fin = new Date(f.fin)
      if (ini.getFullYear() < 2000 || ini.getFullYear() > 2100 || fin.getFullYear() < 2000 || fin.getFullYear() > 2100) {
        toast.error('Las fechas deben estar entre los años 2000 y 2100.'); return
      }
      if (fin <= ini) { toast.error('La fecha de fin debe ser posterior a la fecha de inicio.'); return }
      const diffAnios = (fin - ini) / (1000 * 60 * 60 * 24 * 365.25)
      if (diffAnios > 5 && !await showConfirm(`El nombramiento tiene una duración de ${diffAnios.toFixed(1)} años. ¿Desea continuar?`, { okText: 'Continuar' })) return
    }
    if (f.proyectoId) {
      const pyV = data.proyectos.find(x => x.id === f.proyectoId)
      if (pyV) {
        if (f.inicio && pyV.inicio && f.inicio < pyV.inicio) {
          toast.error('La fecha de inicio del nombramiento (' + fmtD(f.inicio) + ') es anterior al inicio del proyecto (' + fmtD(pyV.inicio) + ').'); return
        }
        if (f.inicio && pyV.fin && f.inicio > pyV.fin) {
          toast.error('La fecha de inicio del nombramiento (' + fmtD(f.inicio) + ') es posterior al fin del proyecto (' + fmtD(pyV.fin) + ').'); return
        }
        if (f.fin && pyV.fin && f.fin > pyV.fin) {
          toast.error('La fecha de fin del nombramiento (' + fmtD(f.fin) + ') es posterior al fin del proyecto (' + fmtD(pyV.fin) + ').'); return
        }
        if (f.fin && pyV.inicio && f.fin < pyV.inicio) {
          toast.error('La fecha de fin del nombramiento (' + fmtD(f.fin) + ') es anterior al inicio del proyecto (' + fmtD(pyV.inicio) + ').'); return
        }
      }
    }
    if (gNomEst(f.estadoId)?.estado === 'Activo') {
      const plaza = data.plazas.find(x => x.id === f.plazaId)
      const usadas = r2(data.nombramientos.filter(n => n.plazaId === f.plazaId && n.estado === 'Activo' && (nomModal.mode === 'new' || n.id !== f.id)).reduce((s, n) => s + nh(n.horas), 0))
      const dispSave = r2(plaza.horasSemanales - usadas)
      if (horas > dispSave) { toast.error('Solo ' + dispSave + 'h disponibles.'); return }
    }
    const isNewNom = nomModal.mode === 'new'
    const prof2 = data.profesores.find(x => x.id === f.profesorId)
    const plaza2 = data.plazas.find(x => x.id === f.plazaId)
    const item = Object.fromEntries(Object.entries({ ...f, horas: nh(f.horas) }).filter(([, v]) => v !== undefined))
    item.estado = gNomEst(item.estadoId)?.estado || item.estado || ''
    const apiCallNom = isNewNom ? apiPost('/nombramientos', item) : apiPut('/nombramientos/' + item.id, item)
    apiCallNom.then(res => {
      const saved = isNewNom ? { ...item, id: res.id } : item
      setData(prev => {
        const arr = prev.nombramientos || []
        return { ...prev, nombramientos: isNewNom ? [...arr, saved] : arr.map(x => x.id === saved.id ? saved : x) }
      })
      logMov(isNewNom ? 'Crear' : 'Editar', 'nombramientos', `${prof2?.nombre || '?'} → ${plaza2?.codigo || '?'}`, saved.id, 'nombramientos')
      closeNomModal()
      toast.success('Nombramiento guardado.')
      reloadCol('nombramientos')
    }).catch(e => toast.error('Error al guardar: ' + e.message))
  }

  const initials = name => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }

  useEffect(() => {
    const fmt = () => {
      if (!lastSync) return ''
      const s = Math.floor((Date.now() - lastSync.getTime()) / 1000)
      if (s < 60) return 'hace unos segundos'
      if (s < 3600) return `hace ${Math.floor(s / 60)} min`
      return `hace ${Math.floor(s / 3600)} h`
    }
    setSyncLabel(fmt())
    const id = setInterval(() => setSyncLabel(fmt()), 30000)
    return () => clearInterval(id)
  }, [lastSync])

  const changeTab = k => {
    if (contentRef.current) scrollPos.current[tab] = contentRef.current.scrollTop
    setTab(k)
    try { localStorage.setItem('vie_tab', k) } catch {}
  }

  const onJump = result => {
    changeTab(result.tab)
    setJumpQ({ ...result, _v: Date.now() })
  }

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = scrollPos.current[tab] || 0
  }, [tab])

  if (!authUser) return <LoginForm />

  if (loading) {
    const sk = (w, h, r = 8) => (
      <div style={{ width: w, height: h, borderRadius: r, background: '#e2e8f0', animation: 'vie-shimmer 1.4s ease-in-out infinite' }} />
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Inter,sans-serif', background: '#eef2f7' }}>
        <div style={{ background: NAVY, height: 50, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
          <div style={{ width: 130, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.15)', animation: 'vie-shimmer 1.4s ease-in-out infinite' }} />
          <div style={{ width: 170, height: 28, borderRadius: 20, background: 'rgba(255,255,255,0.1)', animation: 'vie-shimmer 1.4s ease-in-out infinite' }} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {[80, 90, 75, 85, 80, 70].map((w, i) => (
              <div key={i} style={{ width: w, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.1)', animation: 'vie-shimmer 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sk('28%', 26, 6)}
          <div style={{ height: 4 }} />
          {sk('100%', 50, 10)}
          <div style={{ height: 4 }} />
          {[120, 90, 110].map((h, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sk('45%', 14, 6)}
              {sk('100%', 8, 20)}
              {sk('70%', 10, 6)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const tabsVisibles = TABS.filter(t => (userPermisos[t.k] || 'none') !== 'none')

  const soloTabs = tabsVisibles.filter(t => !t.grp)
  const grpMap = GRP_ORDER.map(grp => ({
    grp,
    tabs: tabsVisibles.filter(t => t.grp === grp).sort((a, b) => a.l.localeCompare(b.l, 'es'))
  })).filter(g => g.tabs.length > 0)
  const activeGrp = tabsVisibles.find(t => t.k === tab)?.grp || null

  const tabBtn = (t, onClick) => (
    <button
      key={t.k}
      title={t.l}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '0 12px', minHeight: 50,
        background: 'none', border: 'none',
        borderBottom: tab === t.k ? '3px solid #60a5fa' : '3px solid transparent',
        color: tab === t.k ? '#fff' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer', fontSize: 11,
        fontWeight: tab === t.k ? 700 : 400,
        whiteSpace: 'nowrap', flexShrink: 0
      }}
    >
      <span style={{ fontSize: 13 }}>{t.ic}</span>
      {t.l}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Inter,sans-serif', background: '#eef2f7' }}>

      {showGlobalSearch && (
        <GlobalSearch data={data} onJump={onJump} onClose={() => setShowGlobalSearch(false)} />
      )}

      {openGrp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpenGrp(null)} />
      )}

      {openGrp && (() => {
        const grpData = grpMap.find(g => g.grp === openGrp)
        if (!grpData) return null
        return (
          <div style={{
            position: 'fixed', top: dropPos.top, left: dropPos.left,
            background: NAVY, zIndex: 30,
            minWidth: 180, overflow: 'hidden',
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none'
          }}>
            {grpData.tabs.map(t => (
              <button key={t.k}
                onClick={() => { changeTab(t.k); setOpenGrp(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '10px 16px',
                  background: tab === t.k ? 'rgba(96,165,250,0.15)' : 'none',
                  border: 'none',
                  borderLeft: tab === t.k ? '3px solid #60a5fa' : '3px solid transparent',
                  color: tab === t.k ? '#fff' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer', fontSize: 12,
                  fontWeight: tab === t.k ? 700 : 400,
                  textAlign: 'left', whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: 14 }}>{t.ic}</span>
                {t.l}
                {t.k === 'alertas' && a30.length > 0 && (
                  <span style={{ background: RED, color: '#fff', borderRadius: 20, padding: '0 6px', fontSize: 9, fontWeight: 700, marginLeft: 'auto' }}>
                    {a30.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )
      })()}

      <div style={{ background: NAVY, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', position: 'relative', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto' }}>

          <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, minHeight: 50 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>Gestión de Plazas</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>VIE - ITCR</div>
              {syncLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: (() => {
                      if (!lastSync) return '#94a3b8'
                      const min = Math.floor((Date.now() - lastSync.getTime()) / 60000)
                      return min < 2 ? '#4ade80' : min < 10 ? '#fbbf24' : '#f87171'
                    })()
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>{syncLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', flexShrink: 0 }}>
            <button
              onClick={() => setShowGlobalSearch(true)}
              title="Búsqueda global (Ctrl+K)"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '4px 12px', fontSize: 11, cursor: 'pointer', width: 160 }}
            >
              <span>🔍</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Buscar...</span>
              <kbd style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.2)' }}>Ctrl K</kbd>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div title={userProfile?.nombre || userProfile?.email || ''} style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: 0.5 }}>
              {initials(userProfile?.nombre || userProfile?.email)}
            </div>
            <button
              title="Cambiar contraseña"
              onClick={() => { setShowPwdModal(true); setPwdErr(''); setPwdOk(false); setPwdForm({ ca: '', np: '', nc: '' }); setShowPwdCa(false); setShowPwdNp(false); setShowPwdNc(false) }}
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              Contraseña
            </button>
            <button
              title="Cerrar sesión"
              onClick={logout}
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>

          {soloTabs.map(t => tabBtn(t, () => { changeTab(t.k); setOpenGrp(null) }))}

          {soloTabs.length > 0 && grpMap.length > 0 && (
            <div style={{ width: 1, background: 'rgba(255,255,255,0.15)', alignSelf: 'stretch', margin: '10px 2px' }} />
          )}

          {grpMap.map(({ grp }) => {
            const isActive = activeGrp === grp
            const hasAlert = grp === 'Gestión' && a30.length > 0
            return (
              <button
                key={grp}
                ref={el => { grpRefs.current[grp] = el }}
                onClick={() => {
                  if (openGrp === grp) { setOpenGrp(null); return }
                  const rect = grpRefs.current[grp]?.getBoundingClientRect()
                  if (rect) setDropPos({ top: rect.bottom, left: rect.left })
                  setOpenGrp(grp)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '0 14px', minHeight: 50,
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap', flexShrink: 0
                }}
              >
                {grp}
                {hasAlert && (
                  <span style={{ background: RED, color: '#fff', borderRadius: 20, padding: '0 5px', fontSize: 9, fontWeight: 700 }}>
                    {a30.length}
                  </span>
                )}
                <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 1 }}>{openGrp === grp ? '▲' : '▼'}</span>
              </button>
            )
          })}

        </div>
      </div>

      <Suspense fallback={
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: NAVY, fontSize: 13, fontWeight: 600, opacity: 0.5 }}>Cargando...</div>
        </div>
      }>
      <div ref={contentRef} style={{ flex: 1, overflow: 'auto', padding: 22 }}>
        {tab === 'catalogos' && (
          <ErrorBoundary name="Catálogos"><TabCatalogos
            data={data}
            setData={setData}
            userPermisos={userPermisos}
            logMov={logMov}
            bitacora={bitacora}
            gSede={gSede}
            gP={gP}
            gPl={gPl}
            gPy={gPy}
            dU={dU}
            jumpQ={jumpQ}
          /></ErrorBoundary>
        )}
        {tab === 'proyectos' && (
          <ErrorBoundary name="Proyectos"><TabProyectos
            data={data}
            setData={setData}
            userPermisos={userPermisos}
            logMov={logMov}
            bitacora={bitacora}
            dU={dU}
            gP={gP}
            gPl={gPl}
            gPy={gPy}
            openEditNom={openEditNom}
            jumpQ={jumpQ}
            reloadCol={reloadCol}
          /></ErrorBoundary>
        )}
        {tab === 'plazas' && (
          <ErrorBoundary name="Plazas"><TabPlazas
            data={data}
            setData={setData}
            userPermisos={userPermisos}
            logMov={logMov}
            bitacora={bitacora}
            dU={dU}
            hUsadas={hUsadas}
            gP={gP}
            gPl={gPl}
            gPy={gPy}
            openEditNom={openEditNom}
            jumpQ={jumpQ}
            reloadCol={reloadCol}
          /></ErrorBoundary>
        )}
        {tab === 'nombramientos' && (
          <ErrorBoundary name="Nombramientos"><TabNombramientos
            data={data}
            setData={setData}
            userPermisos={userPermisos}
            logMov={logMov}
            bitacora={bitacora}
            dU={dU}
            gP={gP}
            gPl={gPl}
            gPy={gPy}
            openNewNom={openNewNom}
            openEditNom={openEditNom}
            jumpQ={jumpQ}
          /></ErrorBoundary>
        )}
        {tab === 'alertas' && (
          <ErrorBoundary name="Alertas"><TabAlertas
            data={data}
            a30={a30} a60={a60} a90={a90}
            py30={py30} py60={py60} py90={py90}
            gP={gP} gPl={gPl} gPy={gPy} gU={gU}
            nomEstId={nomEstId}
            logMov={logMov}
            dU={dU}
          /></ErrorBoundary>
        )}
        {tab === 'bitacora' && (
          <ErrorBoundary name="Bitácora"><TabBitacora bitacora={bitacora} userProfile={userProfile} /></ErrorBoundary>
        )}
        {tab === 'resumen' && (
          <ErrorBoundary name="Resumen"><TabResumen
            data={data}
            today={today}
            totalH={totalH}
            asigH={asigH}
            a30={a30}
            hUsadas={hUsadas}
            presupuestos={presupuestos}
          /></ErrorBoundary>
        )}
        {tab === 'disponibilidad' && (
          <ErrorBoundary name="Disponibilidad"><TabDisponibilidad data={data} hUsadas={hUsadas} gP={gP} gPl={gPl} gPy={gPy} dU={dU} /></ErrorBoundary>
        )}
        {tab === 'presupuesto' && (
          <ErrorBoundary name="Presupuesto"><TabPresupuesto data={data} presupuestos={presupuestos} setPresupuestos={setPresupuestos} gT={gT} /></ErrorBoundary>
        )}
        {tab === 'reportes' && (
          <ErrorBoundary name="Reportes"><TabReportes
            data={data}
            presupuestos={presupuestos}
            gP={gP} gPl={gPl} gPy={gPy} gT={gT} gTN={gTN}
            gU={gU} gSede={gSede} gVerif={gVerif} gFuente={gFuente}
            gVin={gVin} gGestor={gGestor} gVig={gVig}
            hUsadas={hUsadas} totalH={totalH} asigH={asigH}
            a30={a30} a60={a60} a90={a90} dU={dU}
            totalCat={totalCat} totalProyecto={totalProyecto}
            today={today}
          /></ErrorBoundary>
        )}
        {tab === 'repProf' && (
          <ErrorBoundary name="Reporte Profesores"><TabRepProf data={data} gP={gP} gPl={gPl} gPy={gPy} gTN={gTN} dU={dU} /></ErrorBoundary>
        )}
        {tab === 'datos' && (
          <ErrorBoundary name="Datos"><TabDatos
            data={data} gT={gT} gU={gU} gSede={gSede}
            gPl={gPl} gPy={gPy} gTN={gTN} gP={gP}
            a30={a30} a60={a60} a90={a90}
            getP={getP} totalCat={totalCat}
            bitacora={bitacora} presupuestos={presupuestos}
          /></ErrorBoundary>
        )}
        {tab === 'usuarios' && (
          <ErrorBoundary name="Usuarios"><TabUsuarios
            roles={roles} usuariosList={usuariosList}
            currentUid={authUser?.uid}
            setUsuariosList={setUsuariosList}
            setRoles={setRoles}
            unidades={data.unidades}
          /></ErrorBoundary>
        )}
        {tab === 'gantt' && (
          <ErrorBoundary name="Gantt"><TabGantt data={data} gP={gP} gPl={gPl} gPy={gPy} /></ErrorBoundary>
        )}
      </div>
      </Suspense>

      {showPwdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 360, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e3a5f', marginBottom: 4 }}>Cambiar contraseña</div>
            <div>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Contraseña actual</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwdCa ? 'text' : 'password'} value={pwdForm.ca} onChange={e => setPwdForm(p => ({ ...p, ca: e.target.value }))}
                  style={{ width: '100%', padding: '8px 36px 8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} placeholder="Ingrese su contraseña actual" />
                <button type="button" onClick={() => setShowPwdCa(v => !v)} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 15, padding: 2 }} tabIndex={-1}>{showPwdCa ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 4 }} />
            <div>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwdNp ? 'text' : 'password'} value={pwdForm.np} onChange={e => setPwdForm(p => ({ ...p, np: e.target.value }))}
                  style={{ width: '100%', padding: '8px 36px 8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} placeholder="Mayúscula, minúscula, número y carácter especial" />
                <button type="button" onClick={() => setShowPwdNp(v => !v)} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 15, padding: 2 }} tabIndex={-1}>{showPwdNp ? '🙈' : '👁'}</button>
              </div>
              {pwdForm.np && (() => {
                const req = [
                  { ok: pwdForm.np.length >= 6, t: '6+ caracteres' },
                  { ok: /[A-Z]/.test(pwdForm.np), t: 'Mayúscula' },
                  { ok: /[a-z]/.test(pwdForm.np), t: 'Minúscula' },
                  { ok: /\d/.test(pwdForm.np), t: 'Número' },
                  { ok: /[!@#$%^&*_\-+=?.,;:]/.test(pwdForm.np), t: 'Carácter especial' },
                ]
                return <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>{req.map((x, i) => <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, fontWeight: 600, background: x.ok ? '#dcfce7' : '#fee2e2', color: x.ok ? '#16a34a' : '#dc2626' }}>{x.ok ? '✓' : '✗'} {x.t}</span>)}</div>
              })()}
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Confirmar contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwdNc ? 'text' : 'password'} value={pwdForm.nc} onChange={e => setPwdForm(p => ({ ...p, nc: e.target.value }))}
                  style={{ width: '100%', padding: '8px 36px 8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} placeholder="Repita la contraseña" />
                <button type="button" onClick={() => setShowPwdNc(v => !v)} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 15, padding: 2 }} tabIndex={-1}>{showPwdNc ? '🙈' : '👁'}</button>
              </div>
              {pwdForm.nc && <div style={{ fontSize: 11, marginTop: 5, fontWeight: 600, color: pwdForm.np === pwdForm.nc ? '#16a34a' : '#dc2626' }}>{pwdForm.np === pwdForm.nc ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}</div>}
            </div>
            {pwdErr && <div style={{ color: '#dc2626', fontSize: 12, background: '#fef2f2', padding: '8px 10px', borderRadius: 6 }}>{pwdErr}</div>}
            {pwdOk && <div style={{ color: '#16a34a', fontSize: 12, background: '#f0fdf4', padding: '8px 10px', borderRadius: 6 }}>Contraseña actualizada correctamente.</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setShowPwdModal(false)} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #d1d5db', background: '#f9fafb', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={changePwd} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <NomModal
        open={nomModal.open}
        mode={nomModal.mode}
        initialForm={nomModal.form}
        onClose={closeNomModal}
        onSave={saveNom}
        data={data}
        hUsadas={hUsadas}
      />

    </div>
  )
}

export function App() {
  return <AppProviders><AppInner /></AppProviders>
}
