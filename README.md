# SST Frontend

Frontend del Sistema de Gestión de Seguridad y Salud en el Trabajo (SST).

## Stack Tecnológico

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Axios** (Cliente HTTP)
- **Zod** (Validación)
- **React Hook Form** (Formularios)
- **Sonner** (Notificaciones Toast)
- **Lucide React** (Iconos)

## Estructura del Proyecto

```
SST-frontend/
├── app/                    # App Router de Next.js
│   ├── login/             # Página de login
│   ├── dashboard/         # Dashboard principal
│   ├── empresas/          # Gestión de empresas
│   ├── trabajadores/      # Gestión de trabajadores
│   └── usuarios/          # Vinculación de usuarios
├── components/            # Componentes reutilizables
│   ├── auth/              # Componentes de autenticación
│   ├── layout/            # Componentes de layout
│   └── ui/                # Componentes UI base
├── contexts/              # Context API (Auth, etc.)
├── lib/                   # Utilidades y configuraciones
│   ├── axios.ts          # Cliente Axios con interceptores
│   └── utils.ts          # Funciones utilitarias
├── services/              # Servicios de API
│   ├── auth.service.ts   # Servicio de autenticación
│   ├── empresas.service.ts
│   ├── trabajadores.service.ts
│   └── usuarios.service.ts
└── types/                 # Tipos TypeScript
```

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
# Crear archivo .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. Ejecutar en desarrollo:
```bash
npm run dev
```

## Características Implementadas

### Fase 1 ✅
- ✅ Autenticación con email/password
- ✅ Interceptor de Axios para manejo de tokens
- ✅ Context API para gestión de estado (Auth + RBAC)
- ✅ Layout responsive (Sidebar desktop, Navbar móvil)
- ✅ Dashboard básico con KPIs
- ✅ Protección de rutas
- ✅ Manejo de errores 401 (redirección a login)

### Fase 2 ✅
- ✅ Gestión de Empresas (CRUD completo)
- ✅ Gestión de Trabajadores (CRUD con filtros)
- ✅ Vinculación de Usuarios (estructura lista)
- ✅ Formularios con React Hook Form + Zod
- ✅ Tablas con estados de carga (skeleton loaders)
- ✅ Notificaciones Toast (Sonner)
- ✅ Protección RBAC en todas las rutas
- ✅ Componentes UI reutilizables

## Páginas Implementadas

### `/empresas`
- Listado de empresas con tabla responsive
- Crear/Editar/Eliminar empresas
- Gestión de áreas por empresa
- Protección: SUPER_ADMIN, ADMIN_EMPRESA

### `/trabajadores`
- Listado de trabajadores con filtros por empresa
- Formulario completo con todos los campos
- Validación con Zod
- Protección: SUPER_ADMIN, ADMIN_EMPRESA, INGENIERO_SST

### `/usuarios/vinculacion`
- Vinculación de usuarios con empresas y trabajadores
- Asignación de roles
- **Nota:** Requiere endpoints GET y PATCH /usuarios en el backend

## Endpoints del Backend Requeridos

### Implementados ✅
- `POST /auth/login`
- `GET /empresas`
- `POST /empresas`
- `PATCH /empresas/:id`
- `DELETE /empresas/:id`
- `GET /empresas/:id/areas`
- `POST /empresas/:id/areas`
- `GET /trabajadores`
- `POST /trabajadores`
- `PATCH /trabajadores/:id`
- `DELETE /trabajadores/:id`

### Pendientes de Implementar ⚠️
- `GET /usuarios` (Listar todos los usuarios)
- `GET /usuarios/:id` (Obtener un usuario)
- `PATCH /usuarios/:id` (Actualizar usuario, roles, empresa, trabajador)

## Próximos Pasos

- [ ] Implementar OAuth con Google/Microsoft
- [ ] Completar Dashboard con datos reales del backend
- [ ] Implementar páginas según frontend-specs restantes
- [ ] Agregar paginación a las tablas
- [ ] Implementar búsqueda y filtros avanzados
- [ ] Agregar exportación de datos (Excel/PDF)
