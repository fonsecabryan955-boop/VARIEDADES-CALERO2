import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { formatoCordoba } from '../../utils/formato'

export default function Reportes() {
  const [desde, setDesde] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10))
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10))
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    generarReporte()
  }, [])

  async function generarReporte() {
    setCargando(true)

    const { data: ordenes } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .eq('estado_pago', 'pagado')
      .gte('created_at', desde)
      .lte('created_at', hasta + 'T23:59:59')

    const ventasTienda = (ordenes || []).filter((o) => o.canal === 'tienda')
    const ventasOnline = (ordenes || []).filter((o) => o.canal === 'online')

    const totalTienda = ventasTienda.reduce((sum, o) => sum + Number(o.total), 0)
    const totalOnline = ventasOnline.reduce((sum, o) => sum + Number(o.total), 0)

    const productosVendidos = {}
    ;(ordenes || []).forEach((o) => {
      ;(o.orden_items || []).forEach((item) => {
        const key = item.producto_nombre
        productosVendidos[key] = (productosVendidos[key] || 0) + item.cantidad
      })
    })

    const topProductos = Object.entries(productosVendidos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const { data: gastos } = await supabase
      .from('gastos')
      .select('*')
      .gte('fecha', desde)
      .lte('fecha', hasta)

    const totalGastos = (gastos || []).reduce((sum, g) => sum + Number(g.monto), 0)

    setResumen({
      totalTienda,
      totalOnline,
      totalGeneral: totalTienda + totalOnline,
      numOrdenes: (ordenes || []).length,
      topProductos,
      totalGastos,
      utilidad: totalTienda + totalOnline - totalGastos,
    })

    setCargando(false)
  }

  return (
    <div>
      <h1>Reportes</h1>

      <div className="filtros-reporte">
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <button onClick={generarReporte}>Actualizar</button>
      </div>

      {cargando && <p>Calculando...</p>}

      {resumen && !cargando && (
        <div className="resumen-reporte">
          <div className="tarjetas-resumen">
            <div className="tarjeta"><h3>Ventas tienda</h3><p>{formatoCordoba(resumen.totalTienda)}</p></div>
            <div className="tarjeta"><h3>Ventas online</h3><p>{formatoCordoba(resumen.totalOnline)}</p></div>
            <div className="tarjeta"><h3>Total ventas</h3><p>{formatoCordoba(resumen.totalGeneral)}</p></div>
            <div className="tarjeta"><h3>Gastos</h3><p>{formatoCordoba(resumen.totalGastos)}</p></div>
            <div className="tarjeta"><h3>Utilidad</h3><p>{formatoCordoba(resumen.utilidad)}</p></div>
            <div className="tarjeta"><h3># Órdenes</h3><p>{resumen.numOrdenes}</p></div>
          </div>

          <h2>Productos más vendidos</h2>
          <ol>
            {resumen.topProductos.map(([nombre, cantidad]) => (
              <li key={nombre}>{nombre} — {cantidad} unidades</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
