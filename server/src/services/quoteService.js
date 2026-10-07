import { VAT_RATE, LIMITS } from '../config/quoteConfig.js';
import * as itemRepo from '../repositories/itemRepository.js';
import * as quoteRepo from '../repositories/quoteRepository.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function requireText(value, name, max) {
  const text = value == null ? '' : String(value).trim();
  if (text.length > max) throw new ValidationError(`${name}은(는) ${max}자 이내로 입력하세요.`);
  return text;
}

export function createQuote({ quoteNo, recipient, title, lines } = {}) {
  quoteNo = requireText(quoteNo, '견적번호', LIMITS.quoteNoMax);
  if (!quoteNo) throw new ValidationError('견적번호를 입력하세요.');
  recipient = requireText(recipient, '귀중', LIMITS.recipientMax);
  title = requireText(title, '견적명', LIMITS.titleMax);

  if (!Array.isArray(lines) || lines.length === 0) throw new ValidationError('품목을 1개 이상 추가하세요.');
  if (lines.length > LIMITS.linesMax) throw new ValidationError(`품목은 최대 ${LIMITS.linesMax}개까지 가능합니다.`);

  // 가격은 클라이언트 값을 믿지 않고 마스터에서 다시 조회한다.
  const quoteLines = lines.map((l, idx) => {
    const item = itemRepo.findByItemNo(l?.itemNo ?? '');
    if (!item) throw new ValidationError(`존재하지 않는 아이템 넘버입니다: ${l?.itemNo}`);
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > LIMITS.qtyMax) {
      throw new ValidationError(`수량은 1 이상 ${LIMITS.qtyMax} 이하의 정수여야 합니다. (${item.itemNo})`);
    }
    return {
      no: idx + 1,
      itemNo: item.itemNo,
      name: item.name,
      spec: item.spec,
      unitPrice: item.price,
      qty,
      amount: item.price * qty,
    };
  });

  const supplyTotal = quoteLines.reduce((sum, l) => sum + l.amount, 0);
  const vat = Math.floor(supplyTotal * VAT_RATE);
  const now = new Date();
  const seq = quoteRepo.nextSeq();

  return quoteRepo.save({
    id: String(seq),
    quoteNo,
    createdAt: now.toISOString(),
    recipient,
    title,
    lines: quoteLines,
    supplyTotal,
    vat,
    grandTotal: supplyTotal + vat,
  });
}

export const getQuote = (id) => quoteRepo.findById(id);
