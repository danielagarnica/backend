# tecnologias_template_backend

# PocketPet - Backend

API en Node.js para PocketPet. Conecta la página web con la base de datos de Supabase (PostgreSQL).

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

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a la base de datos de Supabase |
| `JWT_SECRET` | Clave para firmar las sesiones de los usuarios |
| `PORT` | Puerto del servidor (opcional, por defecto 3000) |

## Rutas de la API

Todas las rutas, excepto las de `/api/auth`, requieren iniciar sesión. La página envía el token en el encabezado `Authorization: Bearer TOKEN`.

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/registro` | Crea una cuenta (nombre, email, password) |
| POST | `/api/auth/login` | Inicia sesión (email, password) |
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
├── server.js                      # Servidor y CORS
├── .env.example                   # Plantilla de variables de entorno (el .env real no se sube)
├── database/
│   ├── connection.js              # Conexión a Supabase (pool de pg)
│   ├── schema.sql                 # Tablas, índices y seguridad (PostgreSQL)
│   └── setup.js                   # Aplica schema.sql: npm run db:setup
├── routes/
│   ├── auth.routes.js             # Registro y login
│   └── recursos.routes.js         # Ingresos, gastos, ahorros y metas
├── controllers/
│   ├── auth.controller.js         # Validación y respuesta de registro/login
│   └── recursos.controller.js     # Validación y respuesta del CRUD
├── models/
│   ├── usuario.model.js           # Consultas a la tabla usuarios
│   └── recurso.model.js           # Consultas genéricas a ingresos/gastos/ahorros/metas
└── utils/
    ├── auth.js                    # Creación y lectura de tokens
    └── http.js                    # Funciones auxiliares de respuesta
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

La página está en el repositorio `POCKETPET`, rama `conexion-backend`. Para usarla en local:

1. Arranca este backend (`npm start`).
2. Abre `login.html` en el navegador.
3. Si el backend corre en otra dirección o puerto, cambia `API_URL` en `js/storage.js`.
