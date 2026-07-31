import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { formatoCordoba } from '../../utils/formato'
import { obtenerSesion } from '../../utils/auth'

export default function Caja() {
  const [sesionCaja, setSesionCaja] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [montoApertura, setMontoApertura] = useState('')
  const [montoCierre, setMontoCierre] = useState('')
  const [ventasDelTurno, setVentasDelTurno] = useState(null)
  const empleado = obtenerSesion()

  useEffect(() => {
    cargarSesionAbierta()
  }, [])

  async function cargarSesionAbierta() {
    setCargando(true)
    const { data } = await supabase
      .from('sesiones_caja')
      .select('*')
      .eq('estado', 'abierta')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle()

    setSesionCaja(data)

    if (data) {
      const { data: ordenes } = await supabase
        .from('ordenes')
        .select('total')
        .eq('sesion_caja_id', data.id)
        .eq('estado_pago', 'pagado')

      const total = (ordenes || []).reduce((sum, o) => sum + Number(o.total), 0)
      setVentasDelTurno(total)
    }

    setCargando(false)
  }

  async function abrirCaja(e) {
    e.preventDefault()
    if (!montoApertura) return

    const { data } = await supabase
      .from('sesiones_caja')
      .insert({
        empleado_nombre: empleado?.nombre || 'Sin nombre',
        monto_apertura: parseFloat(montoApertura),
      })
      .select()
      .single()

    setSesionCaja(data)
    setMontoApertura('')
    setVentasDelTurno(0)
  }

  async function cerrarCaja(e) {
    e.preventDefault()
    if (!montoCierre) return

    const montoEsperado = Number(sesionCaja.monto_apertura) + Number(ventasDelTurno)
    const diferencia = parseFloat(montoCierre) - montoEsperado

    await supabase
      .from('sesiones_caja')
      .update({
        monto_cierre_esperado: montoEsperado,
        monto_cierre_real: parseFloat(montoCierre),
        diferencia,
        fecha_cierre: new Date().toISOString(),
        estado: 'cerrada',
      })
      .eq('id', sesionCaja.id)

    setSesionCaja(null)
    setMontoCierre('')
    setVentasDelTurno(null)
  }

  if (cargando) return <p>Cargando caja...</p>

  if (!sesionCaja) {
    return (
      <div className="caja-container">
        <h1>Caja cerrada</h1>
        <p>No hay ningún turno abierto. Abre uno para empezar a vender.</p>
        <form onSubmit={abrirCaja} className="form-caja">
          <label>
            Monto de apertura (efectivo inicial en caja)
            <input
              type="number"
              step="0.01"
              value={montoApertura}
              onChange={(e) => setMontoApertura(e.target.value)}
              autoFocus
            />
          </label>
          <button type="submit">Abrir caja</button>
        </form>
      </div>
    )
  }

  const montoEsperado = Number(sesionCaja.monto_apertura) + Number(ventasDelTurno || 0)

  return (
    <div className="caja-container">
      <h1>Caja abierta</h1>
      <div className="caja-resumen">
        <p>Empleado: <strong>{sesionCaja.empleado_nombre}</strong></p>
        <p>Abierta desde: {new Date(sesionCaja.fecha_apertura).toLocaleString('es-NI')}</p>
        <p>Monto de apertura: <strong>{formatoCordoba(sesionCaja.monto_apertura)}</strong></p>
        <p>Ventas en efectivo del turno: <strong>{formatoCordoba(ventasDelTurno)}</strong></p>
        <p>Monto esperado en caja: <strong>{formatoCordoba(montoEsperado)}</strong></p>
      </div>

      <form onSubmit={cerrarCaja} className="form-caja">
        <label>
          Monto real contado al cerrar
          <input
            type="number"
            step="0.01"
            value={montoCierre}
            onChange={(e) => setMontoCierre(e.target.value)}
          />
        </label>
        <button type="submit">Cerrar caja</button>
      </form>
    </div>
  )
}
