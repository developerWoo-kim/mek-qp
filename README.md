# 엘리베이터 견적서 자동화

아이템 넘버로 품목을 조회하고 수량을 입력해 견적서를 만든 뒤 엑셀/PDF 로 내려받는다.

- `client/` Vue 3 + Vite 화면
- `server/` Node.js(Express) API, 엑셀 생성(ExcelJS), PDF 변환(LibreOffice)

## 로컬 개발
```bash
cd server && npm ci && npm run dev   # http://localhost:3000
cd client && npm ci && npm run dev   # http://localhost:5173 (/api 는 3000 으로 프록시)
```
PDF 변환에는 LibreOffice 가 필요하다. (macOS: `brew install --cask libreoffice`)

## 배포 (Docker)
```bash
docker compose up -d --build   # http://서버주소:3000
docker compose logs -f
```
이미지에 LibreOffice, 한글 글꼴, 타임존(Asia/Seoul)이 포함되어 있다.

## 주의
- 견적서는 서버 메모리에 저장되므로 재시작하면 사라진다. 인스턴스는 1개만 실행한다.
- 로그인이 없으므로 사내망/VPN 안에서 운영하거나 접근 제한을 따로 건다.
- 품목 마스터는 `server/src/data/items.js` 에 하드코딩되어 있다.
- 엑셀 양식은 `server/templates/quote.xlsx`, 셀 위치는 `server/src/config/excelMapping.js`.
