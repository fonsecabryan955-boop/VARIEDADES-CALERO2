import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { formatoCordoba } from '../../utils/formato'

export default function Inventario() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [productoAbierto, setProductoAbierto] = useState(null)
  const [mostrarFormProducto, setMostrarFormProducto] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
      .order('orden')

    const { data: prods } = await supabase
      .from('productos')
      .select('*, variantes(*)')
      .order('created_at', { ascending: false })

    setCategorias(cats || [])
    setProductos(prods || [])
    setCargando(false)
  }

  const productosFiltrados = filtroCategoria
    ? productos.filter((p) => p.categoria_id === filtroCategoria)
    : productos

  function stockTotal(producto) {
    return (producto.variantes || []).reduce((sum, v) => sum + v.stock, 0)
  }

  if (cargando) return <p>Cargando inventario...</p>

  return (
    <div>
      <div className="page-header">
        <h1>Inventario</h1>
        <button onClick={() => setMostrarFormProducto(true)}>+ Nuevo producto</button>
      </div>

      <div className="filtros">
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.categoria_padre_id ? '— ' : ''}
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {mostrarFormProducto && (
        <FormNuevoProducto
          categorias={categorias}
          onCerrar={() => setMostrarFormProducto(false)}
          onGuardado={() => {
            setMostrarFormProducto(false)
            cargarDatos()
          }}
        />
      )}

      <table className="tabla-inventario">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock total</th>
            <th>Variantes</th>
          </tr>
        </thead>
        <tbody>
          {productosFiltrados.map((p) => {
            const cat = categorias.find((c) => c.id === p.categoria_id)
            const stock = stockTotal(p)
            return (
              <>
                <tr
                  key={p.id}
                  className="fila-producto"
                  onClick={() => setProductoAbierto(productoAbierto === p.id ? null : p.id)}
                >
                  <td>{p.nombre}</td>
                  <td>{cat?.nombre || '—'}</td>
                  <td>{formatoCordoba(p.precio_base)}</td>
                  <td className={stock <= 3 ? 'stock-bajo' : ''}>{stock}</td>
                  <td>{(p.variantes || []).length}</td>
                </tr>
                {productoAbierto === p.id && (
                  <tr>
                    <td colSpan={5}>
                      <DetalleVariantes
                        producto={p}
                        onActualizado={cargarDatos}
                      />
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>

      {productosFiltrados.length === 0 && <p>No hay productos en esta categoría todavía.</p>}
    </div>
  )
}

function FormNuevoProducto({ categorias, onCerrar, onGuardado }) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [precioBase, setPrecioBase] = useState('')
  const [costo, setCosto] = useState('')
  const [requiereTalla, setRequiereTalla] = useState(true)
  const [requiereColor, setRequiereColor] = useState(true)
  const [guardando, setGuardando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim() || !categoriaId || !precioBase) return

    setGuardando(true)
    await supabase.from('productos').insert({
      nombre: nombre.trim(),
      categoria_id: categoriaId,
      precio_base: parseFloat(precioBase),
      costo: costo ? parseFloat(costo) : 0,
      requiere_talla: requiereTalla,
      requiere_color: requiereColor,
    })
    setGuardando(false)
    onGuardado()
  }

  return (
    <div className="modal-overlay">
      <form className="modal-form" onSubmit={handleSubmit}>
        <h2>Nuevo producto</h2>

        <label>
          Nombre del producto
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </label>

        <label>
          Categoría
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Selecciona...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.categoria_padre_id ? '— ' : ''}
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          Precio de venta (C$)
          <input type="number" step="0.01" value={precioBase} onChange={(e) => setPrecioBase(e.target.value)} />
        </label>

        <label>
          Costo (opcional, para calcular ganancia)
          <input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={requiereTalla} onChange={(e) => setRequiereTalla(e.target.checked)} />
          Este producto maneja tallas
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={requiereColor} onChange={(e) => setRequiereColor(e.target.checked)} />
          Este producto maneja colores
        </label>

        <div className="modal-botones">
          <button type="button" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar producto'}</button>
        </div>
      </form>
    </div>
  )
}

function DetalleVariantes({ producto, onActualizado }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [talla, setTalla] = useState('')
  const [color, setColor] = useState('')
  const [tamano, setTamano] = useState('')
  const [stock, setStock] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function agregarVariante(e) {
    e.preventDefault()
    setGuardando(true)

    const sku = `${producto.nombre.slice(0, 3).toUpperCase()}-${talla || 'U'}-${(color || 'U').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`

    await supabase.from('variantes').insert({
      producto_id: producto.id,
      talla: talla || null,
      color: color || null,
      tamano: tamano || null,
      stock: parseInt(stock) || 0,
      sku,
    })

    setTalla('')
    setColor('')
    setTamano('')
    setStock('')
    setGuardando(false)
    setMostrarForm(false)
    onActualizado()
  }

  async function actualizarStock(varianteId, nuevoStock) {
    await supabase.from('variantes').update({ stock: parseInt(nuevoStock) || 0 }).eq('id', varianteId)
    onActualizado()
  }

  return (
    <div className="detalle-variantes">
      <table>
        <thead>
          <tr>
            {producto.requiere_talla && <th>Talla</th>}
            {producto.requiere_color && <th>Color</th>}
            <th>Tamaño</th>
            <th>SKU</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {(producto.variantes || []).map((v) => (
            <tr key={v.id}>
              {producto.requiere_talla && <td>{v.talla || '—'}</td>}
              {producto.requiere_color && <td>{v.color || '—'}</td>}
              <td>{v.tamano || '—'}</td>
              <td>{v.sku}</td>
              <td>
                <input
                  type="number"
                  defaultValue={v.stock}
                  className={v.stock <= v.stock_minimo ? 'stock-bajo' : ''}
                  onBlur={(e) => actualizarStock(v.id, e.target.value)}
                  style={{ width: '70px' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mostrarForm ? (
        <form onSubmit={agregarVariante} className="form-variante-inline">
          {producto.requiere_talla && (
            <input placeholder="Talla" value={talla} onChange={(e) => setTalla(e.target.value)} />
          )}
          {producto.requiere_color && (
            <input placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} />
          )}
          <input placeholder="Tamaño (opcional)" value={tamano} onChange={(e) => setTamano(e.target.value)} />
          <input placeholder="Stock inicial" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          <button type="submit" disabled={guardando}>Agregar</button>
          <button type="button" onClick={() => setMostrarForm(false)}>Cancelar</button>
        </form>
      ) : (
        <button onClick={() => setMostrarForm(true)}>+ Agregar variante</button>
      )}
    </div>
  )
}
