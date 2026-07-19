# ============================================================
# Stage 1: Build the C++ simulation engine (Linux binary)
# ============================================================
FROM debian:bookworm-slim AS cpp-builder

RUN apt-get update && apt-get install -y \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY backend/src/ ./backend/src/

RUN mkdir -p backend/build && \
    g++ -std=c++17 -O2 -static-libgcc -static-libstdc++ \
        backend/src/*.cpp \
        -lpthread \
        -o backend/build/wavebench_engine

# ============================================================
# Stage 2: Build the Java Gateway fat JAR
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS java-builder

WORKDIR /workspace
COPY gateway/pom.xml ./gateway/pom.xml
COPY gateway/src/    ./gateway/src/

RUN mvn -f gateway/pom.xml package -DskipTests --no-transfer-progress

# ============================================================
# Stage 3: Runtime image
# ============================================================
FROM eclipse-temurin:17-jre-jammy

# Install nginx for single-port reverse proxy
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the C++ binary
COPY --from=cpp-builder /workspace/backend/build/wavebench_engine ./backend/build/wavebench_engine
RUN chmod +x ./backend/build/wavebench_engine

# Copy the gateway fat JAR
COPY --from=java-builder /workspace/gateway/target/gateway-1.0-SNAPSHOT.jar ./gateway.jar

# Copy initial data files
COPY gateway/users.json ./users.json

# Create persistent data directories
RUN mkdir -p saved_projects

# Copy nginx config and startup script
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Render expects the app to listen on $PORT (default 10000)
EXPOSE 10000

CMD ["./start.sh"]
