# 🏓 Ping Pong API

API RESTful para la gestión de torneos de tenis de mesa. Construida con un enfoque fuertemente tipado, validación estricta, arquitectura limpia y orientada a pruebas (TDD).

## 🛠️ Stack Tecnológico

- **Entorno:** Node.js + Express
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL (Dockerizado)
- **ORM:** Prisma
- **Validación:** Zod
- **Testing:** Vitest + Supertest (Mocks de BD)
- **Documentación:** Swagger (OpenAPI 3.0)

---

## 🏗️ Arquitectura y Decisiones Técnicas

Durante el desarrollo, hemos establecido las siguientes convenciones y reglas de arquitectura:

1. **Convención de Nombres:** Uso estricto de `kebab-case` para todos los archivos y carpetas (ej. `user-type.routes.ts`), garantizando compatibilidad en entornos Linux/Unix.
2. **Identificadores (IDs):** Uso de **UUIDs** automáticos en lugar de enteros autoincrementales para mayor seguridad y escalabilidad.
3. **Documentación como Código:** Swagger configurado mediante objetos de TypeScript centralizados en lugar de comentarios YAML propensos a errores de formato.
4. **Validación en Capas:** Zod actúa como "portero" en las rutas, asegurando que los datos tienen el formato exacto antes de tocar la base de datos o el ORM.

---

## 📁 Estructura Principal del Proyecto

```text
/
├── api/
│   ├── prisma/
│   │   ├── schema.prisma         # Modelos de base de datos (User, UserType)
│   │   └── seed.ts               # Sembrado inicial de roles
│   ├── src/
│   │   ├── index.ts              # Punto de entrada y middlewares
│   │   ├── db.ts                 # Instancia global de PrismaClient
│   │   ├── swagger.ts            # Configuración y esquemas de documentación
│   │   ├── routes/
│   │   │   ├── index.ts          # Router centralizado
│   │   │   ├── user.routes.ts    # CRUD de Usuarios
│   │   │   └── user-type.routes.ts # Lectura de Tipos de Usuario
│   │   └── schemas/
│   │       └── user.schema.ts    # Esquemas de validación con Zod
│   ├── tests/
│   │   └── routes/
│   │       ├── user.test.ts      # Pruebas unitarias de usuarios
│   │       └── user-type.test.ts # Pruebas unitarias de roles
│   └── package.json              # Dependencias y scripts (tsx, vitest, seed)
└── docker-compose.yml            # Orquestación de PostgreSQL y la API
```

---

## 🚀 Historial de Pasos y Evolución

### 1. Configuración Inicial y Docker

- Creación del contenedor de PostgreSQL y la API con `docker compose`.
- Inicialización de Express con TypeScript y configuración de recarga en caliente (`tsx watch`).

### 2. Base de Datos y ORM (Prisma)

- Creación de los modelos relacionales `UserType` (Roles) y `User` (Jugadores).
- **Refactorización crítica:** Migración de IDs enteros (`Int`) a `String` con `@default(uuid())` para cumplir con estándares de producción.
- Configuración del campo `name` en `UserType` como `@unique` para evitar roles duplicados.

### 3. Sembrado de Datos (Seeding)

- Creación del script `seed.ts` para popular automáticamente la base de datos con los roles fundamentales (`Admin` y `Player`) usando `upsert` para garantizar la idempotencia.
- Integración del comando de sembrado en el `package.json`.

### 4. Sistema de Rutas Centralizado

- Implementación de un `Router` principal en `src/routes/index.ts` que delega
