import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { formatoCordoba } from '../../utils/formato'

const ESTADOS = ['nueva', 'procesando', 'lista', 'enviada', 'entregada', 'cancelada']

export default function OrdenesOnline() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarOrdenes()
  }, [])

  async function cargarOrdenes() {
    setCargando(true)
    const { data } = await supabase
      .from('ordenes')
      .select('*, orden_items(*), clientes(*)')
      .eq('canal', 'online')
      .order('created_at', { ascending: false })
    setOrdenes(data || [])
    setCargando(false)
  }

  async function cambiarEstado(ordenId, nuevoEstado) {
    await supabase.from('ordenes').update({ estado_orden: nuevoEstado }).eq('id', ordenId)
    cargarOrdenes()
  }

  if (cargando) return <p>Cargando órdenes...</p>

  return (
    <div>
      <h1>Órdenes Online</h1>

      {ordenes.length === 0 && <p>No hay órdenes online todavía.</p>}

      {ordenes.map((orden) => (
        <div key={orden.id} className="orden-card">
          <div className="orden-header">
            <strong>{orden.numero_orden}</strong>
            <span>{new Date(orden.created_at).toLocaleString('es-NI')}</span>
            <span className={`badge-pago badge-${orden.estado_pago}`}>{orden.estado_pago}</span>
          </div>

          <p>Cliente: {orden.clientes?.nombre || 'Sin registrar'} — {orden.clientes?.telefono || ''}</p>
          <p>Envío: {orden.direccion_envio || 'No especificado'}</p>

          <ul>
            {(orden.orden_items || []).map((item) => (
              <li key={item.id}>
                {item.cantidad}x {item.producto_nombre} {[item.talla, item.color, item.tamano].filter(Boolean).join(' / ')} — {formatoCordoba(item.subtotal)}
              </li>
            ))}
          </ul>

          <p><strong>Total: {formatoCordoba(orden.total)}</strong></p>

          <label>
            Estado del pedido
            <select value={orden.estado_orden} onChange={(e) => cambiarEstado(orden.id, e.target.value)}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
        </div>
      ))}
    </div>
  )
}
