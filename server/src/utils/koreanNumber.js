const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const SMALL_UNITS = ['', '십', '백', '천'];
const BIG_UNITS = ['', '만', '억', '조'];

// 4자리 이하 숫자를 한글로 변환. 십/백/천 앞의 '일'은 생략한다. (예: 1500 -> 천오백)
function under10000(n) {
  let out = '';
  for (let pos = 3; pos >= 0; pos -= 1) {
    const d = Math.floor(n / 10 ** pos) % 10;
    if (d) out += (d === 1 && pos > 0 ? '' : DIGITS[d]) + SMALL_UNITS[pos];
  }
  return out;
}

// 1298500 -> 백이십구만팔천오백, 10000 -> 일만
export function toKoreanNumber(value) {
  let n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) throw new RangeError('invalid amount');
  if (n === 0) return '영';
  let out = '';
  for (let i = 0; n > 0; i += 1) {
    const chunk = n % 10000;
    if (chunk) out = (chunk === 1 && i > 0 ? '일' : under10000(chunk)) + BIG_UNITS[i] + out;
    n = Math.floor(n / 10000);
  }
  return out;
}
