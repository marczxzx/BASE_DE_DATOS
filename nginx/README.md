<div align="center">
<table>
    <thead>
        <tr>
            <th>
                <img src="https://github.com/RodrigoStranger/imagenes-la-salle/blob/main/logo_secundario_color.png?raw=true" width="150"/>
            </th>
            <th>
                <span style="font-weight:bold;">UNIVERSIDAD LA SALLE DE AREQUIPA</span><br />
                <span style="font-weight:bold;">FACULTAD DE INGENIERÍAS Y ARQUITECTURA</span><br />
                <span style="font-weight:bold;">DEPARTAMENTO ACADEMICO DE INGENIERÍA Y MATEMÁTICAS</span><br />
                <span style="font-weight:bold;">CARRERA PROFESIONAL DE INGENIERÍA DE SOFTWARE</span>
            </th>
        </tr>
    </thead>
</table>
</div>

<div align="center">
  <h2 style="font-weight:bold;">SOCIAL GRAPH ANALYZER - NGINX</h2>
</div>

## Tecnologías utilizadas

[![Nginx][Nginx]][nginx-site]
[![Docker][Docker]][docker-site]
[![Alpine Linux][Alpine]][alpine-site]

[Nginx]: https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white
[nginx-site]: https://nginx.org/

[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[docker-site]: https://www.docker.com/

[Alpine]: https://img.shields.io/badge/Alpine_Linux-0D597F?style=for-the-badge&logo=alpine-linux&logoColor=white
[alpine-site]: https://www.alpinelinux.org/

## Propósito del Proxy Reverso

Nginx actúa como **proxy reverso** para unificar el acceso al frontend y backend en un solo puerto (8090). Los usuarios solo necesitan acceder a `http://localhost:8090` y Nginx internamente enruta las peticiones al servicio correspondiente.

## ¿Qué es un Proxy Reverso?

Un **proxy reverso** es un servidor que recibe peticiones de clientes y las reenvía a otros servidores backend. A diferencia de un proxy tradicional (que actúa en nombre del cliente), el proxy reverso actúa en nombre de los servidores.

```
Cliente → Nginx (Puerto 8090) → Backend (Puerto 8000 interno)
                               → Frontend (Puerto 80 interno)
```

**Ventajas**:
- **Un solo punto de entrada**: Todo en `localhost:8090`
- **Sin CORS**: Frontend y backend comparten el mismo origen
- **Seguridad**: Backend y frontend no están expuestos directamente
- **Escalabilidad**: Fácil agregar balanceo de carga o SSL

## Configuración de Upstreams

El archivo `nginx.conf` define dos upstreams (servidores backend):

```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}
```

**Explicación**:
- `backend:8000`: Servicio FastAPI corriendo internamente en puerto 8000
- `frontend:80`: Servicio frontend (React) corriendo internamente en puerto 80
- Los nombres `backend` y `frontend` son resueltos por Docker Compose mediante DNS interno

## Enrutamiento de Peticiones

### 1. Rutas de API → Backend (`/api`)

```nginx
location /api {
    proxy_pass http://backend;
}
```

**Funcionamiento**:
- Petición: `http://localhost:8090/api/v1/usuarios`
- Nginx reenvía a: `http://backend:8000/api/v1/usuarios`
- El backend responde y Nginx devuelve la respuesta al cliente

### 2. Documentación de API → Backend (`/docs`, `/redoc`)

```nginx
location ~ ^/(docs|redoc|openapi.json) {
    proxy_pass http://backend;
}
```

**Funcionamiento**:
- Petición: `http://localhost:8090/docs`
- Nginx reenvía a: `http://backend:8000/docs`
- FastAPI devuelve la interfaz Swagger UI

### 3. Aplicación Web → Frontend (`/`)

```nginx
location / {
    proxy_pass http://frontend;
}
```

**Funcionamiento**:
- Petición: `http://localhost:8090/`
- Nginx reenvía a: `http://frontend:80/`
- El frontend (React) responde con la aplicación web

### 4. Health Check → Nginx (`/health`)

```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
}
```

**Funcionamiento**:
- Petición: `http://localhost:8090/health`
- Nginx responde directamente con "healthy"
- No genera logs de acceso (optimización)

## Headers de Proxy

Nginx configura headers especiales para que los servicios backend sepan de dónde viene la petición original:

```nginx
proxy_set_header Host $host;                      # Hostname original (localhost:8090)
proxy_set_header X-Real-IP $remote_addr;          # IP real del cliente
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # Cadena de proxies
proxy_set_header X-Forwarded-Proto $scheme;       # Protocolo (http/https)
proxy_set_header X-Forwarded-Host $host;          # Host original
proxy_set_header X-Forwarded-Port $server_port;   # Puerto original
```

**Por qué son importantes**:
- **Logging**: El backend puede registrar la IP real del cliente
- **Seguridad**: Útil para rate limiting por IP
- **HTTPS**: Si se agrega SSL, el backend sabrá que la petición original era HTTPS

## Timeouts

```nginx
proxy_connect_timeout 60s;  # Tiempo máximo para conectar al backend
proxy_send_timeout 60s;     # Tiempo máximo para enviar la petición
proxy_read_timeout 60s;     # Tiempo máximo para leer la respuesta
```

Estos valores evitan que peticiones lentas bloqueen indefinidamente el proxy.

## Dockerfile

El `Dockerfile` crea una imagen ligera de Nginx basada en Alpine Linux:

```dockerfile
FROM nginx:alpine                                    # Imagen base (solo ~23MB)
COPY nginx.conf /etc/nginx/conf.d/default.conf      # Copia configuración personalizada
RUN rm -f /etc/nginx/conf.d/default.conf.template   # Elimina configuración por defecto
EXPOSE 80                                           # Expone puerto interno 80
CMD ["nginx", "-g", "daemon off;"]                  # Inicia Nginx en foreground
```

**Nota**: El puerto 80 interno se mapea al puerto 8090 externo en `docker-compose.yml`:
```yaml
ports:
  - "8090:80"
```

## Flujo Completo de una Petición

### Ejemplo: Obtener lista de usuarios

1. **Cliente** hace fetch a: `http://localhost:8090/api/v1/usuarios`
2. **Nginx** recibe en puerto 8090
3. **Nginx** detecta `/api` y enruta a `http://backend:8000/api/v1/usuarios`
4. **Backend** (FastAPI) procesa la petición y consulta PostgreSQL
5. **Backend** responde con JSON
6. **Nginx** reenvía la respuesta al cliente
7. **Cliente** recibe los datos

### Ejemplo: Cargar la aplicación web

1. **Usuario** abre navegador en: `http://localhost:8090/`
2. **Nginx** recibe petición en puerto 8090
3. **Nginx** detecta `/` y enruta a `http://frontend:80/`
4. **Frontend** (Nginx interno) sirve `index.html` de React
5. **Nginx** reenvía el HTML al navegador
6. **React** se ejecuta en el navegador y hace peticiones a `/api/*`
7. **Nginx** enruta esas peticiones al backend (volviendo al Ejemplo 1)

## Verificar Configuración

Para verificar que Nginx está funcionando correctamente:

```bash
# Ver configuración actual
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

# Verificar sintaxis
docker-compose exec nginx nginx -t

# Recargar configuración sin reiniciar
docker-compose exec nginx nginx -s reload

# Ver logs en tiempo real
docker-compose logs -f nginx

# Probar health check
curl http://localhost:8090/health
# Respuesta: healthy
```

## Troubleshooting

### Backend no responde (502 Bad Gateway)

```bash
# Verificar que backend esté corriendo
docker-compose ps backend

# Ver logs del backend
docker-compose logs backend

# Verificar conectividad desde nginx
docker-compose exec nginx wget -O- http://backend:8000/api/
```

### Frontend no carga (502 Bad Gateway)

```bash
# Verificar que frontend esté corriendo
docker-compose ps frontend

# Ver logs del frontend
docker-compose logs frontend

# Verificar conectividad desde nginx
docker-compose exec nginx wget -O- http://frontend/
```

### Cambios en nginx.conf no se aplican

```bash
# Reconstruir la imagen de nginx
docker-compose up -d --build nginx

# O recargar configuración
docker-compose exec nginx nginx -s reload
```

## Referencias

1. Nginx Inc. (2024). *Nginx Documentation*. Nginx. Recuperado de https://nginx.org/en/docs/
2. Nginx Inc. (2024). *Nginx Reverse Proxy Guide*. Nginx. Recuperado de https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
3. Docker Inc. (2024). *Networking in Compose*. Docker. Recuperado de https://docs.docker.com/compose/networking/