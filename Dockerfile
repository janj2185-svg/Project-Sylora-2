FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package.json package-lock.json ./

FROM base AS test
RUN npm ci
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY infra ./infra
COPY tests ./tests
RUN mkdir -p data
CMD ["npm", "test"]

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=8787
ENV SYLORA_DATA_DIR=/app/data
RUN npm ci --omit=dev \
  && apk add --no-cache su-exec \
  && addgroup -S sylora && adduser -S sylora -G sylora
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY infra ./infra
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /app/data \
  && chown -R sylora:sylora /app \
  && chmod 755 /usr/local/bin/docker-entrypoint.sh /app/data
# Entrypoint starts as root only to chown the mounted volume, then drops to sylora.
USER root
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node scripts/migrate.mjs && node src/server.mjs"]
