# syntax=docker/dockerfile:1

# Base image with Node.js 22
FROM node:22-slim AS build

WORKDIR /app

# Copy and build client
COPY client ./client
WORKDIR /app/client
RUN npm install && npm run build

# Copy and build server
COPY server ../server
WORKDIR /app/server
RUN npm install

# ---- Production Image ----
FROM node:22-slim

# Install Nginx
RUN apt-get update && apt-get install -y libreoffice nginx qpdf && apt-get clean

# Set workdir
WORKDIR /app

# Copy built client and server from build stage
COPY --from=build /app/client/build /var/www/html
COPY --from=build /app/server /app/server

# Copy Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy server start script
COPY start-server.sh /app/start-server.sh
RUN chmod +x /app/start-server.sh

# Expose port 3000
EXPOSE 3000

CMD ["/app/start-server.sh"]