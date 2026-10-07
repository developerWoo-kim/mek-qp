// 메모리 저장소. 서버를 재시작하면 견적서가 사라진다.
const quotes = new Map();
let seq = 0;

export function nextSeq() {
  seq += 1;
  return seq;
}

export function save(quote) {
  quotes.set(quote.id, quote);
  return quote;
}

export function findById(id) {
  return quotes.get(String(id)) ?? null;
}
