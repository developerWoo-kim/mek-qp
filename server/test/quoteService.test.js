import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuote, getQuote, ValidationError } from '../src/services/quoteService.js';

const valid = { quoteNo: 'T-001', recipient: '테스트', title: '견적', lines: [{ itemNo: '203-00636', qty: 3 }] };

test('금액과 부가세를 서버에서 계산한다', () => {
  const q = createQuote(valid);
  assert.equal(q.supplyTotal, 2109000);
  assert.equal(q.vat, 210900);
  assert.equal(q.grandTotal, 2319900);
  assert.equal(q.lines[0].itemNo, '203-00636');
  assert.equal(createQuote({ ...valid, lines: [{ itemNo: '210-00008P', qty: 1 }] }).lines[0].unitPrice, 31100);
  assert.equal(getQuote(q.id).quoteNo, q.quoteNo);
});

test('잘못된 입력은 거부한다', () => {
  assert.throws(() => createQuote({ ...valid, lines: [] }), ValidationError);
  assert.throws(() => createQuote({ ...valid, lines: [{ itemNo: 'NOPE', qty: 1 }] }), ValidationError);
  assert.throws(() => createQuote({ ...valid, lines: [{ itemNo: '203-00636', qty: 0 }] }), ValidationError);
  assert.throws(() => createQuote({ ...valid, lines: [{ itemNo: '203-00636', qty: 1.5 }] }), ValidationError);
  assert.throws(() => createQuote({ ...valid, recipient: 'a'.repeat(31) }), ValidationError);
});

test('견적번호는 필수이며 입력값 그대로 저장한다', () => {
  assert.equal(createQuote({ ...valid, quoteNo: ' 서충청513-1045 ' }).quoteNo, '서충청513-1045');
  assert.throws(() => createQuote({ ...valid, quoteNo: '' }), ValidationError);
  assert.throws(() => createQuote({ ...valid, quoteNo: '   ' }), ValidationError);
  assert.throws(() => createQuote({ ...valid, quoteNo: 'a'.repeat(31) }), ValidationError);
});
