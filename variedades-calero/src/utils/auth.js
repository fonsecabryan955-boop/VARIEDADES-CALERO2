// Autenticación simple por PIN para el panel administrativo.
// El PIN se guarda en variable de entorno para no exponerlo en el código.

const SESSION_KEY = 'vc_sesion_empleado'

export function iniciarSesion(nombreEmpleado, pinIngresado) {
  const pinCorrecto = import.meta.env.VITE_ADMIN_PIN

  if (!pinCorrecto) {
    throw new Error('No se ha configurado el PIN de acceso (VITE_ADMIN_PIN)')
  }

  if (pinIngresado !== pinCorrecto) {
    return false
  }

  const sesion = {
    nombre: nombreEmpleado,
    fecha: new Date().toISOString(),
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
  return true
}

export function obtenerSesion() {
  const data = sessionStorage.getItem(SESSION_KEY)
  return data ? JSON.parse(data) : null
}

export function cerrarSesion() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function haySesionActiva() {
  return obtenerSesion() !== null
}
