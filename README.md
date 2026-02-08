# SST Frontend

Frontend del Sistema de Gestión de Seguridad y Salud en el Trabajo (SST).

## Stack Tecnológico

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Axios** (Cliente HTTP)
- **Zod** (Validación)
- **Lucide React** (Iconos)

## Estructura del Proyecto

```
SST-frontend/
├── app/                    # App Router de Next.js
│   ├── login/             # Página de login
│   ├── dashboard/         # Dashboard principal
│   └── layout.tsx         # Layout raíz
├── components/            # Componentes reutilizables
│   └── layout/            # Componentes de layout
├── contexts/              # Context API (Auth, etc.)
├── lib/                   # Utilidades y configuraciones
│   ├── axios.ts          # Cliente Axios con interceptores
│   └── utils.ts          # Funciones utilitarias
├── services/              # Servicios de API
│   └── auth.service.ts   # Servicio de autenticación
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

- ✅ Autenticación con email/password
- ✅ Interceptor de Axios para manejo de tokens
- ✅ Context API para gestión de estado (Auth + RBAC)
- ✅ Layout responsive (Sidebar desktop, Navbar móvil)
- ✅ Dashboard básico con KPIs
- ✅ Protección de rutas
- ✅ Manejo de errores 401 (redirección a login)

## Próximos Pasos

- [ ] Implementar OAuth con Google/Microsoft
- [ ] Completar Dashboard con datos reales del backend
- [ ] Implementar páginas según frontend-specs
- [ ] Agregar validación con Zod en formularios
- [ ] Implementar sistema de notificaciones
