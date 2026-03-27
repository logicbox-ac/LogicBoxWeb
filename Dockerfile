FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV CI=true
ENV NO_SOURCE_MAPS=true
ENV NODE_OPTIONS=--max-old-space-size=768

COPY . .
RUN npm install --no-audit --no-fund \
 && NODE_ENV=production npm run build -- --parallelism 1 \
 && rm -rf node_modules /root/.npm

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
