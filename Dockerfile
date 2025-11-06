# 1) Installallation deps 
FROM node:20-alpine AS deps
WORKDIR /app
# Copie uniquement les fichiers de deps pour des caches plus stables
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
# Installe avec le gestionnaire dispo (pnpm > npm > yarn)
RUN if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    else npm i -g pnpm && pnpm install; fi

# 2) Builder Next en "standalone"
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Conseil: build en prod
RUN npm run build || (npm i -g pnpm && pnpm build)

# 3) Runner minimal
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next standalone + assets statiques
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Expose le port
ENV PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
# Lance le serveur Next standalone
CMD ["node", "server.js"]
