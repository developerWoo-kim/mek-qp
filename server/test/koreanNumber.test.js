import test from 'node:test';
import assert from 'node:assert/strict';
import { toKoreanNumber } from '../src/utils/koreanNumber.js';

test('금액을 한글로 변환한다', () => {
  assert.equal(toKoreanNumber(0), '영');
  assert.equal(toKoreanNumber(1), '일');
  assert.equal(toKoreanNumber(10), '십');
  assert.equal(toKoreanNumber(1298500), '백이십구만팔천오백');
  assert.equal(toKoreanNumber(10000), '일만');
  assert.equal(toKoreanNumber(110000), '십일만');
  assert.equal(toKoreanNumber(959200), '구십오만구천이백');
  assert.equal(toKoreanNumber(100000000), '일억');
  assert.equal(toKoreanNumber(100010001), '일억일만일');
});
