#!/bin/bash

# Start Node.js server in background
cd /app/server
# Install dependencies
ls -lrt;
node server.js &

# Start Nginx in foreground
nginx -g "daemon off;"