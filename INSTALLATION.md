# Guía de Instalación - Plataforma Procesos Fontan

## Requisitos Previos

- Node.js 18+ instalado
- npm o yarn
- Git (opcional)

## Pasos de Instalación

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
JWT_SECRET=tu-clave-secreta-super-segura-aqui
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Inicializar Base de Datos

Ejecuta las migraciones para crear las tablas:

```bash
npm run db:migrate
```

### 4. Poblar Base de Datos con Usuarios de Prueba

Ejecuta el script de seed:

```bash
npm run db:seed
```

Esto creará los siguientes usuarios de prueba (todos con contraseña: `password123`):

- `empleado@fontan.edu` - Rol: Empleado
- `sistemas@fontan.edu` - Rol: Sistemas
- `gestion@fontan.edu` - Rol: Gestión Humana
- `cartera@fontan.edu` - Rol: Cartera
- `gerencia@fontan.edu` - Rol: Gerencia
- `rectoria@fontan.edu` - Rol: Rectoría

### 5. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
procesos-fontan/
├── app/                    # App Router de Next.js
│   ├── api/                # API Routes
│   ├── login/              # Página de login
│   ├── requests/           # Páginas de solicitudes
│   └── layout.tsx          # Layout principal
├── components/             # Componentes React
│   ├── layout/            # Componentes de layout
│   ├── requests/          # Componentes de solicitudes
│   └── ui/                # Componentes UI reutilizables
├── database/              # Esquemas SQL
│   └── schema.sql        # Esquema de base de datos
├── lib/                   # Utilidades y lógica
│   ├── models/           # Modelos de datos
│   ├── auth.ts           # Autenticación
│   └── db.ts             # Conexión a BD
├── scripts/              # Scripts de utilidad
│   ├── migrate.js       # Migración de BD
│   └── seed.js          # Seed de datos
└── types/               # Tipos TypeScript
```

## Flujos de Aprobación

### Compras/Materiales
1. Empleado crea solicitud
2. Cartera aprueba/rechaza
3. Si aprobada → Gerencia aprueba/rechaza
4. Si aprobada → Rectoría aprueba/rechaza (aprobación final)

### Permisos de Ausencia
1. Empleado crea solicitud
2. Gestión Humana aprueba/rechaza

### Soporte Técnico
1. Empleado crea solicitud
2. Sistemas atiende la solicitud

### Certificados/Documentos
1. Empleado crea solicitud
2. Gestión Humana procesa la solicitud

## Notas Importantes

- La base de datos SQLite se crea automáticamente en `database/procesos.db`
- Los archivos adjuntos se guardan en `uploads/`
- En producción, asegúrate de cambiar el `JWT_SECRET` por una clave segura
- La fuente Neulis Sans se carga desde Google Fonts (Inter como fallback)

## Solución de Problemas

### Error: "Cannot find module 'better-sqlite3'"
Ejecuta `npm install` nuevamente. En algunos sistemas puede requerir herramientas de compilación.

### Error: "Database is locked"
Cierra todas las conexiones a la base de datos y vuelve a intentar.

### Error de autenticación
Verifica que el token JWT sea válido y que la cookie esté configurada correctamente.

