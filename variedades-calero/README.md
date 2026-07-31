# Variedades Calero

Sistema de punto de venta e inventario para Variedades Calero (tienda física + online).

## Configuración inicial

1. Copia `.env.example` a `.env.local` y llena los valores:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: los sacas de tu proyecto en Supabase (Settings > API)
   - `VITE_ADMIN_PIN`: el PIN de 4 dígitos que van a usar los empleados para entrar al panel

2. Instala dependencias:
   ```
   npm install
   ```

3. Corre en desarrollo:
   ```
   npm run dev
   ```

## Deploy en Vercel

1. Sube este proyecto a un repositorio de GitHub
2. Conecta el repo en Vercel
3. En Vercel, ve a Settings > Environment Variables y agrega las mismas 3 variables del .env.local
4. Deploy
