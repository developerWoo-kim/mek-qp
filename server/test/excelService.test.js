import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildQuoteXlsx } from '../src/services/excelService.js';

const quote = {
  quoteNo: 'T-001',
  recipient: '현장 A',
  title: '견적',
  createdAt: '2026-10-14T00:00:00.000Z',
  lines: [{ name: '품목', spec: '규격', qty: 1, unitPrice: 100, amount: 100 }],
  supplyTotal: 100,
  vat: 10,
  grandTotal: 110,
};

async function worksheetName(recipient) {
  const buffer = await buildQuoteXlsx({ ...quote, recipient });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets[0].name;
}

test('엑셀 시트명을 현장명으로 설정한다', async () => {
  assert.equal(await worksheetName('현장 A'), '현장 A');
});

test('엑셀 시트명에 허용되지 않는 문자를 안전하게 바꾼다', async () => {
  assert.equal(await worksheetName('현장/동 A'), '현장_동 A');
});
