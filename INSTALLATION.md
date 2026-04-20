# Guía de Instalación - Plataforma Procesos Fontan

## Stack actual

- **Next.js 15** (App Router, React 19)
- **Neon** (PostgreSQL serverless) — `@neondatabase/serverless`
- **Vercel Blob** — almacenamiento de adjuntos e imágenes
- **Vercel** (despliegue)
- SMTP (Office 365) para correos

## Requisitos previos

- Node.js 18+
- Una cuenta en [Vercel](https://vercel.com) (incluye Neon y Blob en el mismo dashboard)
- Git

## Pasos de instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear los stores en Vercel

Desde el dashboard del proyecto en Vercel:

1. **Storage → Create → Neon (Postgres)** → conectar al proyecto en Dev/Preview/Prod.
   Esto expone `DATABASE_URL` como variable de entorno.
2. **Storage → Create → Blob** → conectar al proyecto en Dev/Preview/Prod.
   Esto expone `BLOB_READ_WRITE_TOKEN`.

### 3. Configurar variables de entorno locales

Vincula el repo con Vercel y descarga las variables:

```bash
npx vercel link
npx vercel env pull .env.local
```

Edita `.env.local` si hace falta. Variables mínimas esperadas:

```env
JWT_SECRET=tu-clave-secreta
NEXT_PUBLIC_BASE_URL=http://localhost:3000

DATABASE_URL=postgresql://...   # inyectada por Neon
BLOB_READ_WRITE_TOKEN=...       # inyectada por Vercel Blob

# SMTP (Office 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=...
EMAIL_FROM_NAME=Sistema de Procesos Fontán
```

### 4. Crear el esquema en Neon (primera vez)

```bash
npm run db:migrate
```

Esto ejecuta `scripts/create-schema.js`, que crea tipos/enums, tablas e índices de manera idempotente.

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### 6. Desplegar a producción

`git push` a la rama conectada en Vercel o `npx vercel --prod`.

## Scripts disponibles

- `npm run dev` — servidor Next.js en local
- `npm run build` — build de producción
- `npm run start` — correr el build localmente
- `npm run lint` — ESLint
- `npm run db:migrate` — aplicar esquema a Neon

Otros scripts útiles en `scripts/`:

- `check-neon-users.js` — listar usuarios de Neon
- `list-users.js` — listar usuarios (utilidad)
- `delete-user.js` — borrar un usuario
- `grant-admin-access.js` — promover a admin
- `add-reset-token.js` — migración one-shot que añadió `reset_token` a `users`
- `clear-db.js` — ⚠️ vacía **todas** las tablas (sólo para entornos de prueba)
- `test-email.js` — probar el SMTP

## Estructura del proyecto

```
procesos-fontan/
├── app/                    # App Router (Next.js)
│   ├── api/                # Rutas API
│   │   ├── uploads/        # Firma tokens de Vercel Blob (handleUpload)
│   │   └── requests/[id]/attachments/   # Registra adjuntos en Neon
│   └── ...
├── components/             # Componentes React
├── database/
│   └── postgresql_schema.sql   # Esquema Neon de referencia
├── lib/
│   ├── models/            # Modelos (RequestModel, AttachmentModel, UserModel)
│   ├── hooks/             # Helpers de cliente (uploadAttachment, useAuth)
│   ├── storage.ts         # Helpers de URLs/constantes para adjuntos
│   ├── auth.ts, jwt.ts
│   ├── db.ts              # Cliente de Neon
│   └── email.ts
├── scripts/               # Utilidades de mantenimiento
└── types/
```

## Adjuntos e imágenes

El flujo es **client upload** a Vercel Blob:

1. El navegador llama a `upload(...)` de `@vercel/blob/client` contra `/api/uploads`, que firma un token si hay sesión válida.
2. El archivo se sube directo al Blob Store (sin pasar por nuestras funciones, por lo que no aplica el límite de 4.5 MB de las rutas API).
3. El cliente envía los metadatos resultantes a `/api/requests/{id}/attachments`, que los persiste en Neon (`path` guarda la URL pública del blob).

El tamaño máximo por archivo se define en `lib/storage.ts` (`MAX_ATTACHMENT_MB`).

## Flujos de aprobación

### Compras/Materiales
1. Empleado crea solicitud
2. Cartera aprueba/rechaza
3. Si aprobada → Gerencia aprueba/rechaza
4. Si aprobada → Rectoría aprueba/rechaza (aprobación final)

### Permisos de ausencia
1. Empleado crea solicitud
2. Gestión Humana aprueba/rechaza

### Soporte técnico
1. Empleado crea solicitud
2. Sistemas atiende

### Certificados/Documentos
1. Empleado crea solicitud
2. Gestión Humana procesa

### Solicitudes personalizadas / Reenvío
Cualquier responsable puede reenviar a otra área/persona desde la pantalla de detalle.

## Solución de problemas

### `DATABASE_URL` no encontrada
Asegúrate de haber corrido `vercel env pull .env.local` o de haber definido la variable manualmente con la cadena de conexión de Neon.

### `BLOB_READ_WRITE_TOKEN` no encontrada
Crea el Blob Store en Vercel y vuelve a correr `vercel env pull .env.local`.

### Error de autenticación
Verifica `JWT_SECRET` y que la cookie `auth-token` se esté seteando correctamente (dominio/secure en producción).
