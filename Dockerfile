FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY infra ./infra
RUN mkdir -p data
ENV PORT=8787
EXPOSE 8787
CMD ["node","src/server.mjs"]
