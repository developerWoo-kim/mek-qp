import { Router } from 'express';
import * as quoteService from '../services/quoteService.js';
import { buildQuoteXlsx } from '../services/excelService.js';
import { buildQuotePdf } from '../services/pdfService.js';

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

router.post('/', (req, res) => {
  res.status(201).json(quoteService.createQuote(req.body));
});

function findOr404(req, res) {
  const quote = quoteService.getQuote(req.params.id);
  if (!quote) res.status(404).json({ message: '견적서를 찾을 수 없습니다.' });
  return quote;
}

router.get('/:id', (req, res) => {
  const quote = findOr404(req, res);
  if (quote) res.json(quote);
});

router.get('/:id/download', wrap(async (req, res) => {
  const quote = findOr404(req, res);
  if (!quote) return;

  const { format } = req.query;
  if (format !== 'xlsx' && format !== 'pdf') {
    return res.status(400).json({ message: 'format 은 xlsx 또는 pdf 여야 합니다.' });
  }

  const buffer = format === 'xlsx' ? await buildQuoteXlsx(quote) : await buildQuotePdf(quote);
  const contentType = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';
  res
    .type(contentType)
    .attachment(`${quote.quoteNo.replace(/[\\/:*?"<>|]/g, '_')}.${format}`)
    .send(buffer);
}));

export default router;
