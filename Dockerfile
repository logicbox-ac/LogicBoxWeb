FROM node:20-bookworm-slim AS builder

WORKDIR /app
ARG NODE_HEAP_MB=2048
ENV CI=true
ENV NO_SOURCE_MAPS=true
ENV NODE_OPTIONS=--max-old-space-size=${NODE_HEAP_MB}

COPY . .
RUN npm install --ignore-scripts --no-audit --no-fund \
 && node scripts/patch-scratch-blocks.js \
 && node scripts/patch-scratch-vm-handpose.js \
 && test -f node_modules/scratch-vm/src/extensions/scratch3_handpose2scratch/index.js \
 && mkdir -p src/generated \
 && echo "module.exports = 'https://downloads.scratch.mit.edu/microbit/scratch-microbit.hex';" > src/generated/microbit-hex-url.cjs \
 && NODE_ENV=production npm run build -- --parallelism 1 \
 && mkdir -p build/chunks \
 && cp -f node_modules/scratch-storage/dist/web/chunks/fetch-worker.* build/chunks/ \
 && rm -rf node_modules /root/.npm

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
