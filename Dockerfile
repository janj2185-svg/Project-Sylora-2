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
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY infra ./infra
RUN mkdir -p data
EXPOSE 8787
CMD ["node", "src/server.mjs"]
