import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { formatoCordoba, generarNumeroOrden } from '../../utils/formato'

export default function PuntoVenta() {
  const [busqueda, setBusqueda] = useState('')
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [sesionCaja, setSesionCaja] = useState(null)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarProductos()
    verificarCaja()
  }, [])

  async function verificarCaja() {
    const { data } = await supabase
      .from('sesiones_caja')
      .select('*')
      .eq('estado', 'abierta')
      .maybeSingle()
    setSesionCaja(data)
  }

  async function cargarProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*, variantes(*)')
      .eq('activo', true)
    setProductos(data || [])
  }

  const resultados = busqueda.length > 0
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : []

  function agregarAlCarrito(producto, variante) {
    const yaExiste = carrito.find((item) => item.varianteId === variante.id)

    if (yaExiste) {
      if (yaExiste.cantidad >= variante.stock) {
        setMensaje('No hay más stock disponible de esta variante')
        return
      }
      setCarrito(carrito.map((item) =>
        item.varianteId === variante.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      if (variante.stock <= 0) {
        setMensaje('Sin stock disponible')
        return
      }
      setCarrito([...carrito, {
        varianteId: variante.id,
        productoNombre: producto.nombre,
        talla: variante.talla,
        color: variante.color,
        tamano: variante.tamano,
        precio: variante.precio || producto.precio_base,
        cantidad: 1,
        stockDisponible: variante.stock,
      }])
    }
    setBusqueda('')
    setMensaje('')
  }

  function cambiarCantidad(varianteId, delta) {
    setCarrito(carrito.map((item) => {
      if (item.varianteId !== varianteId) return item
      const nuevaCantidad = item.cantidad + delta
      if (nuevaCantidad < 1) return item
      if (nuevaCantidad > item.stockDisponible) return item
      return { ...item, cantidad: nuevaCantidad }
    }))
  }

  function quitarDelCarrito(varianteId) {
    setCarrito(carrito.filter((item) => item.varianteId !== varianteId))
  }

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

  async function procesarVenta() {
    if (!sesionCaja) {
      setMensaje('Debes abrir la caja antes de vender')
      return
    }
    if (carrito.length === 0) return

    setProcesando(true)

    const numeroOrden = generarNumeroOrden('tienda')

    const { data: orden, error: errorOrden } = await supabase
      .from('ordenes')
      .insert({
        numero_orden: numeroOrden,
        canal: 'tienda',
        sesion_caja_id: sesionCaja.id,
        subtotal: total,
        total: total,
        metodo_pago: metodoPago,
        estado_pago: 'pagado',
        estado_orden: 'entregada',
      })
      .select()
      .single()

    if (errorOrden) {
      setMensaje('Error al crear la orden: ' + errorOrden.message)
      setProcesando(false)
      return
    }

    const items = carrito.map((item) => ({
      orden_id: orden.id,
      variante_id: item.varianteId,
      producto_nombre: item.productoNombre,
      talla: item.talla,
      color: item.color,
      tamano: item.tamano,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      subtotal: item.precio * item.cantidad,
    }))

    const { error: errorItems } = await supabase.from('orden_items').insert(items)

    if (errorItems) {
      setMensaje('Error al guardar los productos: ' + errorItems.message)
      setProcesando(false)
      return
    }

    setCarrito([])
    setMensaje(`Venta ${numeroOrden} completada — ${formatoCordoba(total)}`)
    setProcesando(false)
    cargarProductos()
  }

  return (
    <div className="pos-container">
      <h1>Punto de Venta</h1>

      {!sesionCaja && (
        <p className="error-msg">⚠️ La caja está cerrada. Ve a "Caja" para abrir un turno antes de vender.</p>
      )}

      <div className="pos-layout">
        <div className="pos-busqueda">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {resultados.map((p) => (
            <div key={p.id} className="resultado-producto">
              <strong>{p.nombre}</strong> — {formatoCordoba(p.precio_base)}
              <div className="lista-variantes-pos">
                {(p.variantes || []).filter(v => v.activo).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => agregarAlCarrito(p, v)}
                    disabled={v.stock <= 0}
                    className="btn-variante"
                  >
                    {[v.talla, v.color, v.tamano].filter(Boolean).join(' / ') || 'Único'}
                    {' '}({v.stock} disp.)
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pos-carrito">
          <h2>Carrito</h2>
          {carrito.length === 0 && <p>Vacío</p>}

          {carrito.map((item) => (
            <div key={item.varianteId} className="item-carrito">
              <div>
                <strong>{item.productoNombre}</strong>
                <p>{[item.talla, item.color, item.tamano].filter(Boolean).join(' / ')}</p>
              </div>
              <div className="controles-cantidad">
                <button onClick={() => cambiarCantidad(item.varianteId, -1)}>-</button>
                <span>{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(item.varianteId, 1)}>+</button>
              </div>
              <span>{formatoCordoba(item.precio * item.cantidad)}</span>
              <button onClick={() => quitarDelCarrito(item.varianteId)}>✕</button>
            </div>
          ))}

          {carrito.length > 0 && (
            <>
              <div className="pos-total">
                <strong>Total: {formatoCordoba(total)}</strong>
              </div>

              <label>
                Método de pago
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </label>

              <button
                className="btn-cobrar"
                onClick={procesarVenta}
                disabled={procesando || !sesionCaja}
              >
                {procesando ? 'Procesando...' : 'Cobrar'}
              </button>
            </>
          )}

          {mensaje && <p className="mensaje-pos">{mensaje}</p>}
        </div>
      </div>
    </div>
  )
}
