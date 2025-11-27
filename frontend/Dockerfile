# Node alpine para build
FROM node:20-alpine AS builder

WORKDIR /app

# Argumento para la URL del backend
ARG VITE_API_URL=http://localhost:8090
ENV VITE_API_URL=${VITE_API_URL}

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Producción con nginx
FROM nginx:alpine

# Copiar archivos build desde etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando por defecto de nginx
CMD ["nginx", "-g", "daemon off;"]
