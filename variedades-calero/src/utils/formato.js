export function formatoCordoba(valor) {
  const numero = Number(valor) || 0
  return `C$${numero.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generarNumeroOrden(canal) {
  const prefijo = canal === 'online' ? 'ON' : 'VC'
  const fecha = new Date()
  const yymmdd = fecha.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${prefijo}-${yymmdd}-${random}`
}
