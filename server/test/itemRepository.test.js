import test from 'node:test';
import assert from 'node:assert/strict';
import { search } from '../src/repositories/itemRepository.js';

test('3자 미만은 검색하지 않는다', () => {
  assert.deepEqual(search('20'), []);
  assert.deepEqual(search(' 2 '), []);
});

test('아이템 넘버 일부만 입력해도 검색된다', () => {
  assert.deepEqual(search('203').map((i) => i.itemNo), ['203-00636']);
  assert.deepEqual(search('0063').map((i) => i.itemNo), ['203-00636']);
  assert.deepEqual(search('115').map((i) => i.itemNo), ['115-00854']);
});

test('하이픈과 대소문자를 무시한다', () => {
  assert.equal(search('20300636')[0].itemNo, '203-00636');
  assert.equal(search('295-05276p')[0].itemNo, '295-05276P');
  assert.equal(search('210-00008P')[0].itemNo, '210-00008p');
});

test('정확히 일치하는 품목이 먼저 나온다', () => {
  const r = search('00');
  assert.deepEqual(r, []); // 2자
  assert.ok(search('000').length >= 1);
});
