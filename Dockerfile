FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV CI=true
ENV NO_SOURCE_MAPS=true
ENV NODE_OPTIONS=--max-old-space-size=768

COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY patches ./patches
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build -- --parallelism 1

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
