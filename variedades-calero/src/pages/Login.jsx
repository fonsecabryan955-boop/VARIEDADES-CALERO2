import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { iniciarSesion } from '../utils/auth'

export default function Login() {
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('Escribe tu nombre')
      return
    }

    try {
      const ok = iniciarSesion(nombre.trim(), pin.trim())
      if (ok) {
        navigate('/admin')
      } else {
        setError('PIN incorrecto')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Variedades Calero</h1>
        <p>Panel administrativo</p>

        <label>
          Nombre del empleado
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </label>

        <label>
          PIN de acceso
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </label>

        {error && <p className="error-msg">{error}</p>}

        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}
