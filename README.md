# PocketPet - Backend

Servidor en Node.js para PocketPet. Entrega la página web (carpeta `public/`) y la API, y se conecta con la base de datos de Supabase (PostgreSQL). Página y API viven en el mismo dominio, lo que permite usar una cookie de sesión segura.

## Requisitos

- Node.js 18 o superior
- Acceso al proyecto de Supabase (pídele a un integrante el valor de `DATABASE_URL`)

## Instalación

1. Clona el repositorio y entra a la carpeta:

   ```bash
   git clone URL_DEL_REPOSITORIO
   cd backend-1
   ```

2. Cambia a la rama de trabajo:

   ```bash
   git checkout template_node
   ```

3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Crea el archivo `.env` en esta carpeta (junto a `server.js`). Copia `.env.example` y reemplaza los valores:

   ```bash
   copy .env.example .env
   ```

   Pide los valores reales a un integrante del equipo **por un medio privado**. Nunca subas el `.env` a GitHub.

5. Arranca el servidor:

   ```bash
   npm start
   ```

   Debe aparecer `Conectado a la base de datos (Supabase)`. La terminal queda ocupada mientras el servidor funciona; para detenerlo usa `Ctrl+C`.

6. Abre **http://localhost:3000** en el navegador. No abras los `.html` con doble clic: la página debe venir del servidor para que funcione la sesión.

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a la base de datos de Supabase |
| `JWT_SECRET` | Clave para firmar las sesiones de los usuarios |
| `PORT` | Puerto del servidor (opcional, por defecto 3000) |
| `NODE_ENV` | `production` en Render: la cookie se marca `Secure` (solo HTTPS). En local no se define |

## Rutas de la API

Todas las rutas, excepto `/api/auth/*` y `/api/health`, requieren iniciar sesión.

### Sesión con cookie

Al registrarse o iniciar sesión, el servidor responde con la cookie `pp_sesion` (un token JWT válido por 7 días):

| Atributo | Para qué |
|---|---|
| `HttpOnly` | El JavaScript de la página no puede leerla: un script malicioso (XSS) no puede robar la sesión |
| `SameSite=Lax` | El navegador no la envía en peticiones POST/DELETE que vengan de otros sitios (CSRF) |
| `Secure` | Solo viaja por HTTPS (en producción) |
| `Path=/`, `Max-Age=604800` | Válida en todo el sitio durante 7 días |

El navegador la envía sola en cada petición; el frontend no guarda ningún token. Además, el servidor rechaza peticiones que modifican datos si su encabezado `Origin` es de otro dominio, y redirige a `login.html` cuando alguien abre una página privada sin sesión.

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/registro` | Crea una cuenta (nombre, email, password) |
| POST | `/api/auth/login` | Inicia sesión (email, password) |
| POST | `/api/auth/logout` | Cierra la sesión (borra la cookie) |
| GET | `/api/auth/me` | Devuelve el usuario con sesión activa |
| GET | `/api/health` | Comprueba que el servidor y la base de datos respondan (no requiere sesión) |
| GET | `/api/ingresos` | Lista los ingresos del usuario |
| POST | `/api/ingresos` | Crea un ingreso (tipo, monto, fecha, notas) |
| GET | `/api/gastos` | Lista los gastos del usuario |
| POST | `/api/gastos` | Crea un gasto (descripcion, monto, categoria, fecha, notas) |
| GET | `/api/ahorros` | Lista los ahorros del usuario |
| POST | `/api/ahorros` | Crea un ahorro (nombre, monto, fecha, notas). Suma el monto a la meta con el mismo nombre |
| GET | `/api/metas` | Lista las metas del usuario |
| POST | `/api/metas` | Crea una meta (nombre, categoria, fecha, objetivo, ahorrado) |
| DELETE | `/api/<recurso>` | Borra todos los registros del usuario en ese recurso |
| DELETE | `/api/<recurso>/<id>` | Borra un registro |

`<recurso>` puede ser `ingresos`, `gastos`, `ahorros` o `metas`.

## Estructura

```
backend/
├── server.js                      # Servidor: API, archivos estáticos y seguridad
├── .env.example                   # Plantilla de variables de entorno (el .env real no se sube)
├── render.yaml                    # Despliegue en Render
├── .github/workflows/keepalive.yml # Ping cada 3 días para que Supabase no se pause
├── public/                        # Página web (HTML, CSS, JS, imágenes)
├── database/
│   ├── connection.js              # Conexión a Supabase (pool de pg)
│   ├── schema.sql                 # Tablas, índices y seguridad (PostgreSQL)
│   └── setup.js                   # Aplica schema.sql: npm run db:setup
├── routes/
│   ├── auth.routes.js             # Registro, login, logout y usuario actual
│   └── recursos.routes.js         # Ingresos, gastos, ahorros y metas
├── controllers/
│   ├── auth.controller.js         # Validación y respuesta de registro/login
│   └── recursos.controller.js     # Validación y respuesta del CRUD
├── models/
│   ├── usuario.model.js           # Consultas a la tabla usuarios
│   └── recurso.model.js           # Consultas genéricas a ingresos/gastos/ahorros/metas
└── utils/
    ├── auth.js                    # Cookie de sesión (crear, leer, borrar)
    ├── http.js                    # Funciones auxiliares de respuesta
    └── static.js                  # Entrega public/ y protege las páginas privadas
```

## Base de datos

El esquema está en [`database/schema.sql`](database/schema.sql) y sigue el diagrama `Modelo de datos.jpeg` del repositorio `POCKETPET`.

| Tabla | Relación | Notas |
|---|---|---|
| `usuarios` | — | `email` único y en minúsculas; la contraseña se guarda solo como hash bcrypt |
| `categorias` | 1 — N `gastos` | Catálogo fijo; `codigo` coincide con los valores del formulario de gastos |
| `ingresos` | `usuarios` 1 — N | |
| `gastos` | `usuarios` 1 — N, `categorias` 1 — N | `categoria` es FK a `categorias.codigo` |
| `metas` | `usuarios` 1 — N | `progreso` (0–100) se calcula solo |
| `ahorros` | `usuarios` 1 — N, `metas` 1 — N | `meta_id` se llena si el nombre del ahorro coincide con una meta |

Todas las tablas tienen RLS activado y sin permisos para `anon`/`authenticated`: los datos solo se leen a través de este backend, nunca directamente con la clave pública de Supabase.

**Probar la conexión:** `npm run db:check`. Comprueba `DATABASE_URL`, explica el error si no conecta y compara las tablas de Supabase con las que usa el backend (no modifica nada).

> Usa siempre la URL del **Session pooler** (`…pooler.supabase.com:5432`, usuario `postgres.<id-del-proyecto>`). La conexión directa `db.<id>.supabase.co` solo funciona con IPv6 y falla en Render y en muchas redes.

**Crear las tablas** (una de las dos opciones; se puede repetir sin problema):

- Con el `.env` configurado: `npm run db:setup`
- O pegando el contenido de `database/schema.sql` en el SQL Editor de Supabase.

> Si las tablas ya existían con otra estructura, `schema.sql` **no las modifica** (usa `CREATE TABLE IF NOT EXISTS`). Revisa las columnas en el Table Editor antes de usarlo sobre una base con datos.

## Trabajar en equipo

- Cada persona trabaja en su propia rama:

  ```bash
  git checkout -b nombre-de-tu-rama
  ```

- Antes de empezar, trae los cambios de los demás con `git pull`.
- Revisa con `git status` que `.env` no aparezca antes de hacer commit.
- Los cambios se unen a la rama principal con Pull Request.

## Problemas frecuentes

| Mensaje | Causa y solución |
|---|---|
| `injected env (0)` | No existe el `.env` en la raíz de esta carpeta |
| `Falta JWT_SECRET` | Falta esa línea en el `.env` |
| `EADDRINUSE ... 3000` | Ya hay un servidor corriendo. Ciérralo con `Ctrl+C` o usa otro `PORT` |
| `password authentication failed` | La contraseña de `DATABASE_URL` es incorrecta |
| `relation "..." does not exist` | La tabla no existe en Supabase o tiene otro nombre |
| `null value in column "id"` | La columna `id` no se genera sola. Ver nota abajo |

Si falla `null value in column "id"`, ejecuta en el SQL Editor de Supabase (cambiando el nombre de la tabla):

```sql
ALTER TABLE ingresos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
```

## Página web

La página está en `public/`. Se copió del repositorio `POCKETPET` (rama `conexion-backend`) y a partir de ahora **se edita aquí**. Para verla en local, arranca el servidor y abre http://localhost:3000.

## Despliegue en Render

1. En [render.com](https://render.com), crea una cuenta con GitHub.
2. **New > Blueprint** y selecciona este repositorio y la rama de trabajo. Render lee `render.yaml`.
3. Escribe el valor de `DATABASE_URL` cuando lo pida. `JWT_SECRET` se genera solo y `NODE_ENV` ya viene en `production`.
4. Al terminar, la página queda en `https://pocketpet.onrender.com` (o el nombre que asigne Render).

El plan gratuito se duerme tras 15 minutos sin visitas; la primera visita después tarda cerca de un minuto.

### Evitar que Supabase se pause

`.github/workflows/keepalive.yml` llama a `/api/health` cada 3 días. Esa ruta hace una consulta a la base, lo que cuenta como actividad para Supabase. Para activarlo:

1. En GitHub: **Settings > Secrets and variables > Actions > Variables > New repository variable**.
2. Nombre `HEALTH_URL`, valor `https://TU-APP.onrender.com/api/health`.
3. En la pestaña **Actions**, ejecútalo una vez a mano (*Run workflow*) para comprobarlo.

GitHub solo ejecuta las tareas programadas desde la **rama por defecto** del repositorio, así que este archivo debe estar en esa rama.
