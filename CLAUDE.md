# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos principales

```bash
npm run dev       # Servidor de desarrollo en http://localhost:3000
npm run build     # Build de producción
npm run lint      # ESLint sobre el proyecto
```

No hay tests configurados aún.

## Variables de entorno

Requiere un `.env` con las siguientes variables (ver `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Arquitectura

Proyecto **Next.js 16** con App Router, **React 19**, **TypeScript** y **Tailwind CSS v4**.

### Backend: Supabase
- Cliente singleton exportado desde `src/lib/supabase.ts` como `supabase`.
- Todas las operaciones de base de datos deben importar desde ahí: `import { supabase } from '@/lib/supabase'`.
- Las variables de entorno son públicas (`NEXT_PUBLIC_*`), por lo que el cliente usa la anon key y confía en las políticas RLS de Supabase para seguridad.

### Estructura de directorios
- `app/` — Rutas y layouts con App Router. `app/layout.tsx` es el root layout, `app/page.tsx` es la home.
- `src/lib/` — Utilidades compartidas (actualmente solo el cliente de Supabase).
- `public/` — Assets estáticos.

### Estilos
- Tailwind CSS v4 vía `@tailwindcss/postcss`.
- Usa `clsx` + `tailwind-merge` para combinar clases condicionalmente.
- Fuentes: Geist Sans y Geist Mono (cargadas con `next/font/google`).

### Iconos
- `lucide-react` para íconos SVG.

## Agentes especializados (`.claude/agents/`)

| Agente | Archivo | Responsabilidad |
|--------|---------|----------------|
| `db-schema` | `db-schema.md` | Migraciones SQL, RLS, tipos TypeScript de la DB |
| `api-backend` | `api-backend.md` | API Routes (`app/api/`), lógica de negocio, asignación de riders |
| `realtime-tracking` | `realtime-tracking.md` | Supabase Realtime, GPS, canales de ubicación en vivo |
| `dashboard-admin` | `dashboard-admin.md` | Panel de control para admins y dispatchers (mapa, pedidos) |
| `rider-app` | `rider-app.md` | PWA móvil para repartidores (aceptar pedidos, GPS, entrega) |
| `auth-roles` | `auth-roles.md` | Supabase Auth, middleware de roles, protección de rutas |

**Orden de dependencias:** `db-schema` → `auth-roles` → `api-backend` → `realtime-tracking` → (`dashboard-admin` ∥ `rider-app`)

## Base de datos

Schema inicial en `supabase/migrations/001_initial_schema.sql`.

### Tablas principales
| Tabla | Propósito |
|-------|-----------|
| `profiles` | Extiende `auth.users`, contiene el `role` del usuario |
| `riders` | Posición actual, estado y vehículo del repartidor |
| `customers` | Clientes con dirección predeterminada |
| `zones` | Zonas de cobertura con polígono GeoJSON |
| `orders` | Pedidos con puntos pickup/delivery, estado, tarifas |
| `rider_location_history` | Historial GPS para replay de rutas |
| `order_status_history` | Auditoría de cambios de estado |
| `notifications` | Notificaciones en base de datos |

### Roles de usuario
`admin` · `dispatcher` · `rider` · `customer`

### Tablas con Realtime habilitado
`riders`, `orders`, `rider_location_history`, `notifications`
