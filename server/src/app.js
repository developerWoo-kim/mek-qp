import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import itemsRouter from './routes/items.js';
import quotesRouter from './routes/quotes.js';

const app = express();
app.use(express.json());

app.use('/api/items', itemsRouter);
app.use('/api/quotes', quotesRouter);

// 운영(Docker)에서는 빌드된 화면(client/dist)을 같은 서버에서 서비스한다. 개발 중에는 CLIENT_DIST 를 지정하지 않는다.
const clientDist = process.env.CLIENT_DIST;
if (clientDist && fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // 화면 경로(/quotes/1 등)로 직접 접속하거나 새로고침해도 화면이 열리도록 index.html 로 보낸다.
  app.use((req, res, next) => {
    // API 와 파일 요청(확장자 있음)은 제외해서, 없는 파일이 index.html 로 응답되지 않게 한다.
    if (req.method !== 'GET' || req.path.startsWith('/api') || path.extname(req.path)) return next();
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 && !err.status ? '서버 오류가 발생했습니다.' : err.message });
});

export default app;
