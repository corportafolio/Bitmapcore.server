#!/bin/bash
cd /home/candela/BitmapCorpServer

while true; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting BitmapCorpServer..."
    node dist/index.js >> server.log 2>&1
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Server stopped, restarting in 5 seconds..."
    sleep 5
done