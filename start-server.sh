#!/bin/bash
# Script para iniciar y mantener el servidor BitmapCorpServer corriendo

cd /home/candela/BitmapCorpServer

while true; do
    echo "$(date -Iseconds) - Starting server..."
    node dist/index.js >> server.log 2>&1
    echo "$(date -Iseconds) - Server stopped, restarting in 5 seconds..."
    sleep 5
done