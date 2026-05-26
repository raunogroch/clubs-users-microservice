# Users Microservice

## Dev

1. Clonar repositorio
2. Instalar dependencias con pnpm
3. Crear un archivo `.env` con las variables de entorno basado en el `.env.example`
4. Ejecutar `pnpm run start:dev`

## Nats

```
docker run -d --name nats-server-local -p 4223:4222 -p 8223:8222 nats
```
