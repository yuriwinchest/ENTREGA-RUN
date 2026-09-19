# Stage 1: Build do Frontend (Vite + React)
FROM node:22-alpine AS builder

WORKDIR /app

# Instala dependências do client
COPY client/package*.json ./client/
RUN cd client && npm ci

# Copia código e gera o bundle de produção
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Runtime do Servidor (Express)
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Instala dependências do servidor (somente produção)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copia código do servidor
COPY server/server.js ./server/

# Copia o build estático do client para servir na mesma origem
COPY --from=builder /app/client/dist ./client/dist

# Usuário não-root para segurança (Crowley)
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server/server.js"]
