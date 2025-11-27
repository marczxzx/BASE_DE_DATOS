# Dockerfile para Nginx Proxy Reverso
FROM nginx:alpine

# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remover configuración por defecto
RUN rm -f /etc/nginx/conf.d/default.conf.template

# Exponer puerto 80
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
