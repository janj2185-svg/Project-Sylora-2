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
RUN npm ci --omit=dev \
  && addgroup -S sylora && adduser -S sylora -G sylora
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY infra ./infra
RUN mkdir -p data && chown -R sylora:sylora /app
USER sylora
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.mjs"]
