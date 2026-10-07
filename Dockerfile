# 1) 화면(Vue) 빌드
FROM node:22-bookworm-slim AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2) 서버 + LibreOffice(PDF 변환) + 한글 글꼴
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libreoffice-calc fontconfig fonts-noto-cjk fonts-nanum tzdata \
 && fc-cache -f \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Seoul \
    CLIENT_DIST=/app/client-dist \
    HOME=/home/node

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /client/dist /app/client-dist

USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
