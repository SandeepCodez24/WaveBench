#!/bin/bash
# =============================================================
# WaveBench Studio — Docker Container Startup Script
# 
# Starts the Java Gateway (which in turn spawns the C++ engine)
# and then launches nginx in the foreground.
# =============================================================
set -e

echo "============================================"
echo "  WaveBench Studio — Container Startup"
echo "============================================"

# Start the Java Gateway in the background.
# The gateway's Main.java will spawn the C++ engine as a subprocess.
echo "[start.sh] Starting Java Gateway..."
java -jar /app/gateway.jar &
JAVA_PID=$!

# Give the gateway time to:
#   1. Spawn the C++ engine (which binds to TCP 5050)
#   2. Bind the WS server (8080) and HTTP server (8081)
echo "[start.sh] Waiting for gateway to initialize (5s)..."
sleep 5

echo "[start.sh] Starting nginx on port ${PORT:-10000}..."
# Replace the PORT placeholder in the nginx config if Render provides a custom $PORT
sed -i "s/listen 10000/listen ${PORT:-10000}/" /etc/nginx/nginx.conf

# Start nginx in the foreground (keeps container alive)
nginx -g 'daemon off;'

# If nginx exits, kill the Java process too
kill $JAVA_PID 2>/dev/null || true
