import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import M from '../config/excelMapping.js';
import { UNIT } from '../config/quoteConfig.js';
import { toKoreanNumber } from '../utils/koreanNumber.js';

const TEMPLATE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../templates/quote.xlsx');
const NUM_FMT = '#,##0';

const splitAddress = (addr) => {
  const [, col, row] = /^([A-Z]+)(\d+)$/.exec(addr);
  return { col, row: Number(row) };
};

// 품목 아래에 있던 행들은 삽입된 행 수(delta)만큼 아래로 밀린다.
function shifter(itemRow, delta) {
  return (addr) => {
    const { col, row } = splitAddress(addr);
    return `${col}${row > itemRow ? row + delta : row}`;
  };
}

// ExcelJS 는 행을 삽입해도 병합 셀과 이미지를 옮기지 않으므로 직접 이동시킨다.
function insertItemRows(ws, itemRow, delta) {
  const below = ws.model.merges
    .map((range) => range.split(':').map(splitAddress))
    .filter(([from]) => from.row > itemRow);

  below.forEach(([from, to]) => ws.unMergeCells(`${from.col}${from.row}:${to.col}${to.row}`));
  ws.duplicateRow(itemRow, delta, true);
  below.forEach(([from, to]) =>
    ws.mergeCells(`${from.col}${from.row + delta}:${to.col}${to.row + delta}`),
  );

  for (const image of ws.getImages()) {
    if (image.range.tl.nativeRow >= itemRow) image.range.tl.nativeRow += delta;
    if (image.range.br.nativeRow >= itemRow) image.range.br.nativeRow += delta;
  }
}

const isRich = (v) => v && typeof v === 'object' && Array.isArray(v.richText);

// 서식 있는 텍스트(richText) 셀은 첫 번째 run 의 서식을 유지한 채 전체 텍스트를 교체한다.
function setText(cell, text) {
  cell.value = isRich(cell.value) ? { richText: [{ ...cell.value.richText[0], text }] } : text;
}

// 셀 안의 {토큰}만 치환하고 나머지 문구와 서식은 유지한다.
// 토큰이 서식 조각(run) 여러 개에 걸쳐 있어도 처리한다. (예: '{' + '귀중' + '}')
function replaceToken(cell, token, text) {
  const v = cell.value;
  if (!isRich(v)) {
    cell.value = String(v ?? '').replace(token, text);
    return;
  }
  const runs = v.richText.map((run) => ({ ...run }));
  const start = runs.map((r) => r.text).join('').indexOf(token);
  if (start < 0) return;
  const end = start + token.length;

  let pos = 0;
  let inserted = false;
  for (const run of runs) {
    const runStart = pos;
    pos += run.text.length;
    if (pos <= start || runStart >= end) continue;
    const before = run.text.slice(0, Math.max(start - runStart, 0));
    const after = run.text.slice(Math.min(end - runStart, run.text.length));
    run.text = before + (inserted ? '' : text) + after;
    inserted = true;
  }
  cell.value = { richText: runs };
}

function overrideFonts(ws, fontName) {
  const withName = (font) => ({ ...font, name: fontName, scheme: undefined });
  ws.eachRow({ includeEmpty: true }, (row) =>
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = withName(cell.font);
      if (isRich(cell.value)) {
        cell.value = { richText: cell.value.richText.map((run) => ({ ...run, font: withName(run.font) })) };
      }
    }),
  );
}

// ExcelJS 는 텍스트 상자 같은 도형을 저장하지 않으므로, 템플릿의 도형을 따로 보관했다가 결과 파일에 다시 넣는다.
let shapesPromise;
function loadTemplateShapes() {
  shapesPromise ??= (async () => {
    const zip = await JSZip.loadAsync(await fs.readFile(TEMPLATE_PATH));
    const shapes = [];
    for (const name of Object.keys(zip.files).filter((n) => /^xl\/drawings\/drawing\d+\.xml$/.test(n))) {
      const xml = await zip.file(name).async('string');
      for (const anchor of xml.match(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g) ?? []) {
        if (/<xdr:sp[ >]/.test(anchor)) shapes.push(anchor);
      }
    }
    return shapes;
  })();
  return shapesPromise;
}

const escapeXml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function injectShapes(buffer, values, fontName) {
  const shapes = await loadTemplateShapes();
  if (!shapes.length) return buffer;

  const zip = await JSZip.loadAsync(buffer);
  const name = Object.keys(zip.files).find((n) => /^xl\/drawings\/drawing\d+\.xml$/.test(n));
  if (!name) return buffer;

  const filled = shapes.map((shape, i) => {
    let xml = shape
      .replace(/<xdr:cNvPr id="\d+"/, `<xdr:cNvPr id="${1000 + i}"`)
      // 흰 배경 상자가 바로 아래 표 머리글을 가리지 않도록 투명하게 만든다.
      .replace(/(<xdr:spPr>[\s\S]*?)<a:solidFill><a:srgbClr val="FFFFFF"\/><\/a:solidFill>/, '$1<a:noFill/>')
      // 글자가 아래 정렬이므로 아래쪽 여백을 늘려 글자를 위로 올린다.
      .replace(/bIns="(\d+)"/, (_, v) => `bIns="${Number(v) + M.textBoxBottomInsetEmu}"`);
    for (const [token, value] of Object.entries(values)) xml = xml.replaceAll(token, escapeXml(value));
    return fontName ? xml.replace(/typeface="[^"]*"/g, `typeface="${fontName}"`) : xml;
  });
  const drawing = (await zip.file(name).async('string')).replace('</xdr:wsDr>', `${filled.join('')}</xdr:wsDr>`);
  zip.file(name, drawing);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const pad = (n) => String(n).padStart(2, '0');
const formatIssueDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()} . ${pad(d.getMonth() + 1)} . ${pad(d.getDate())} .`;
};

// 템플릿의 빈 합계 칸에는 글꼴이 지정돼 있지 않으므로 품목 금액 칸의 글꼴을 따라가게 한다.
// 값이 커서 칸 폭을 넘으면 엑셀이 ### 로 표시하므로, 넘칠 때는 글자를 줄여서 맞추도록 shrinkToFit 을 건다.
function setNumber(cell, value, refCell) {
  cell.value = value;
  cell.numFmt = NUM_FMT;
  cell.alignment = { ...cell.alignment, shrinkToFit: true };
  if (refCell) cell.font = { ...cell.font, name: refCell.font?.name, size: refCell.font?.size };
}

function setDash(cell, refCell) {
  cell.value = '-';
  cell.alignment = { ...cell.alignment, horizontal: 'right' };
  if (refCell) cell.font = { ...cell.font, name: refCell.font?.name, size: refCell.font?.size };
}

// options.fontName: 지정하면 모든 글꼴을 해당 글꼴로 교체한다. (PDF 변환 서버에 템플릿 글꼴이 없을 때 사용)
export async function buildQuoteXlsx(quote, { fontName } = {}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.worksheets[0];
  ws._rows.length = Math.min(ws._rows.length, M.printArea.lastRow + 5); // 템플릿 끝에 남은 빈 행 제거

  const { itemRow, columns: col } = M.items;
  const delta = quote.lines.length - 1;
  if (delta > 0) insertItemRows(ws, itemRow, delta);
  const at = shifter(itemRow, delta);

  // 머리글
  const { header, totals } = M;
  replaceToken(ws.getCell(header.recipient.cell), '{귀중}', quote.recipient);
  replaceToken(ws.getCell(header.title.cell), '{견적명}', quote.title);
  setText(ws.getCell(header.amountText), `일금 : ${toKoreanNumber(quote.grandTotal)}원정`);
  setText(ws.getCell(header.vatNotice), `₩${quote.grandTotal.toLocaleString('en-US')} VAT포함 입니다.`);

  // 품목 행
  quote.lines.forEach((line, i) => {
    const r = itemRow + i;
    setText(ws.getCell(`${col.name}${r}`), line.name);
    setText(ws.getCell(`${col.spec}${r}`), line.spec);
    setText(ws.getCell(`${col.unit}${r}`), UNIT);
    setNumber(ws.getCell(`${col.qty}${r}`), line.qty);
    setNumber(ws.getCell(`${col.unitPrice}${r}`), line.unitPrice);
    setNumber(ws.getCell(`${col.amount}${r}`), line.amount);
  });

  // 합계 영역
  const ref = ws.getCell(`${col.amount}${itemRow}`);
  setNumber(ws.getCell(at(totals.materialSubtotal)), quote.supplyTotal, ref);
  totals.dashes.forEach((addr) => setDash(ws.getCell(at(addr)), ref));
  setNumber(ws.getCell(at(totals.supply)), quote.supplyTotal, ref);
  setNumber(ws.getCell(at(totals.vat)), quote.vat, ref);
  setNumber(ws.getCell(at(totals.grand)), quote.grandTotal); // 총합계는 템플릿의 굵은 글꼴 유지

  // 인쇄 영역: 행이 늘어난 만큼 확장하고, A4 세로 한 페이지 폭에 맞춘다. (품목이 많으면 여러 페이지)
  const pa = M.printArea;
  Object.assign(ws.pageSetup, {
    printArea: `${pa.firstCol}1:${pa.lastCol}${pa.lastRow + delta}`,
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: quote.lines.length <= 8 ? 1 : 0,
  });

  if (fontName) overrideFonts(ws, fontName);

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return injectShapes(
    buffer,
    { '{작성일자}': formatIssueDate(quote.createdAt), '{견적번호}': quote.quoteNo },
    fontName,
  );
}
