-- ============================================
-- VARIEDADES CALERO - ESQUEMA DE BASE DE DATOS
-- ============================================

-- CATEGORÍAS (jerárquicas: categoría padre + subcategoría)
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_padre_id uuid references categorias(id),
  orden integer default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

-- PRODUCTOS (el producto "base", ej: "Blusa floral manga corta")
create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  categoria_id uuid references categorias(id),
  precio_base numeric(10,2) not null default 0,
  costo numeric(10,2) default 0,
  imagen_url text,
  requiere_talla boolean default true,
  requiere_color boolean default true,
  activo boolean default true,
  vendible_online boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- VARIANTES (cada combinación talla/color/tamaño con su propio stock)
create table variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete cascade,
  talla text,          -- ej: 'S', 'M', 'L', '32', '6', null si no aplica
  color text,          -- ej: 'Rojo', 'Negro', null si no aplica
  tamano text,         -- ej: '50ml', '100ml', 'Mini', 'Grande' (para perfumes/carteras)
  sku text unique,
  precio numeric(10,2), -- si es null, usa precio_base del producto
  stock integer not null default 0,
  stock_minimo integer default 3,
  imagen_url text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- CLIENTES
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  created_at timestamptz default now()
);

-- SESIONES DE CAJA (apertura/cierre de turno)
create table sesiones_caja (
  id uuid primary key default gen_random_uuid(),
  empleado_nombre text not null,
  monto_apertura numeric(10,2) not null default 0,
  monto_cierre_esperado numeric(10,2),
  monto_cierre_real numeric(10,2),
  diferencia numeric(10,2),
  fecha_apertura timestamptz default now(),
  fecha_cierre timestamptz,
  estado text default 'abierta' check (estado in ('abierta','cerrada')),
  notas text
);

-- ÓRDENES (ventas físicas y online, unificado)
create table ordenes (
  id uuid primary key default gen_random_uuid(),
  numero_orden text unique not null,
  canal text not null check (canal in ('tienda','online')),
  cliente_id uuid references clientes(id),
  sesion_caja_id uuid references sesiones_caja(id), -- null si es online
  subtotal numeric(10,2) not null default 0,
  descuento numeric(10,2) default 0,
  total numeric(10,2) not null default 0,
  metodo_pago text check (metodo_pago in ('efectivo','tarjeta','transferencia','lafise')),
  estado_pago text default 'pendiente' check (estado_pago in ('pendiente','pagado','rechazado','reembolsado')),
  estado_orden text default 'nueva' check (estado_orden in ('nueva','procesando','lista','enviada','entregada','cancelada')),
  direccion_envio text,
  notas text,
  created_at timestamptz default now()
);

-- DETALLE DE ORDEN (items de cada venta)
create table orden_items (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid references ordenes(id) on delete cascade,
  variante_id uuid references variantes(id),
  producto_nombre text not null, -- guardado por si el producto cambia después
  talla text,
  color text,
  tamano text,
  cantidad integer not null default 1,
  precio_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

-- MOVIMIENTOS DE INVENTARIO (auditoría: entradas, salidas, ajustes)
create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid references variantes(id),
  tipo text check (tipo in ('entrada','venta','ajuste','devolucion')),
  cantidad integer not null, -- positivo o negativo
  motivo text,
  orden_id uuid references ordenes(id),
  created_at timestamptz default now()
);

-- PROMOCIONES
create table promociones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text check (tipo in ('porcentaje','monto_fijo')),
  valor numeric(10,2) not null,
  categoria_id uuid references categorias(id), -- null = aplica a todo
  producto_id uuid references productos(id),   -- null = aplica a categoría o todo
  fecha_inicio date,
  fecha_fin date,
  activo boolean default true
);

-- GASTOS (para reportes de rentabilidad)
create table gastos (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  monto numeric(10,2) not null,
  categoria text, -- 'renta', 'servicios', 'mercaderia', etc.
  fecha date default current_date,
  notas text,
  created_at timestamptz default now()
);

-- ============================================
-- ÍNDICES para mejorar performance
-- ============================================
create index idx_variantes_producto on variantes(producto_id);
create index idx_variantes_sku on variantes(sku);
create index idx_ordenes_canal on ordenes(canal);
create index idx_ordenes_estado on ordenes(estado_orden);
create index idx_ordenes_fecha on ordenes(created_at);
create index idx_orden_items_orden on orden_items(orden_id);
create index idx_movimientos_variante on movimientos_inventario(variante_id);
create index idx_productos_categoria on productos(categoria_id);

-- ============================================
-- FUNCIÓN: descontar stock automáticamente al vender
-- ============================================
create or replace function descontar_stock()
returns trigger as $$
begin
  update variantes
  set stock = stock - new.cantidad
  where id = new.variante_id;

  insert into movimientos_inventario (variante_id, tipo, cantidad, motivo, orden_id)
  values (new.variante_id, 'venta', -new.cantidad, 'Venta orden ' || new.orden_id, new.orden_id);

  return new;
end;
$$ language plpgsql;

create trigger trg_descontar_stock
after insert on orden_items
for each row execute function descontar_stock();

-- ============================================
-- CATEGORÍAS INICIALES (según lo que maneja la tienda)
-- ============================================
insert into categorias (nombre, orden) values
  ('Ropa Mujer', 1),
  ('Ropa Hombre', 2),
  ('Ropa Niña', 3),
  ('Ropa Niño', 4),
  ('Ropa Recién Nacido', 5),
  ('Ropa Íntima', 6),
  ('Calzado', 7),
  ('Accesorios', 8),
  ('Belleza', 9);

-- Subcategorías de ejemplo (se pueden agregar más luego desde el panel)
insert into categorias (nombre, categoria_padre_id, orden)
select 'Vestidos', id, 1 from categorias where nombre = 'Ropa Mujer'
union all
select 'Blusas', id, 2 from categorias where nombre = 'Ropa Mujer'
union all
select 'Jeans', id, 3 from categorias where nombre = 'Ropa Mujer'
union all
select 'Shorts', id, 4 from categorias where nombre = 'Ropa Mujer'
union all
select 'Bodys', id, 5 from categorias where nombre = 'Ropa Mujer'
union all
select 'Camisas', id, 1 from categorias where nombre = 'Ropa Hombre'
union all
select 'Jeans', id, 2 from categorias where nombre = 'Ropa Hombre'
union all
select 'Calzones', id, 1 from categorias where nombre = 'Ropa Íntima'
union all
select 'Boxers', id, 2 from categorias where nombre = 'Ropa Íntima'
union all
select 'Calcetines', id, 3 from categorias where nombre = 'Ropa Íntima'
union all
select 'Zapatos Mujer', id, 1 from categorias where nombre = 'Calzado'
union all
select 'Zapatos Hombre', id, 2 from categorias where nombre = 'Calzado'
union all
select 'Zapatos Niños', id, 3 from categorias where nombre = 'Calzado'
union all
select 'Carteras', id, 1 from categorias where nombre = 'Accesorios'
union all
select 'Mochilas', id, 2 from categorias where nombre = 'Accesorios'
union all
select 'Cosméticos', id, 1 from categorias where nombre = 'Belleza'
union all
select 'Productos para el Pelo', id, 2 from categorias where nombre = 'Belleza'
union all
select 'Perfumes', id, 3 from categorias where nombre = 'Belleza';
