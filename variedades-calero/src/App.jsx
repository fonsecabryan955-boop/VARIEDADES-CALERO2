import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminLayout from './pages/admin/AdminLayout'
import RutaProtegida from './components/admin/RutaProtegida'
import Caja from './pages/admin/Caja'
import PuntoVenta from './pages/admin/PuntoVenta'
import Inventario from './pages/admin/Inventario'
import OrdenesOnline from './pages/admin/OrdenesOnline'
import Reportes from './pages/admin/Reportes'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <RutaProtegida>
              <AdminLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="/admin/caja" replace />} />
          <Route path="caja" element={<Caja />} />
          <Route path="venta" element={<PuntoVenta />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="ordenes" element={<OrdenesOnline />} />
          <Route path="reportes" element={<Reportes />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
