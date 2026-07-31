import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { obtenerSesion, cerrarSesion } from '../../utils/auth'

export default function AdminLayout() {
  const sesion = obtenerSesion()
  const navigate = useNavigate()

  function handleCerrarSesion() {
    cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>Variedades Calero</h2>
        <nav>
          <NavLink to="/admin/caja">Caja</NavLink>
          <NavLink to="/admin/venta">Punto de Venta</NavLink>
          <NavLink to="/admin/inventario">Inventario</NavLink>
          <NavLink to="/admin/ordenes">Órdenes Online</NavLink>
          <NavLink to="/admin/reportes">Reportes</NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <p>{sesion?.nombre}</p>
          <button onClick={handleCerrarSesion}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}
