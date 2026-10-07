import { Router } from 'express';
import * as itemRepo from '../repositories/itemRepository.js';

const router = Router();

router.get('/', (req, res) => {
  const q = String(req.query.q ?? '');
  if (!itemRepo.isSearchable(q)) {
    return res.status(400).json({ message: `아이템 넘버를 ${itemRepo.SEARCH_MIN_LENGTH}자 이상 입력하세요.` });
  }
  res.json(itemRepo.search(q));
});

router.get('/:itemNo', (req, res) => {
  const item = itemRepo.findByItemNo(req.params.itemNo);
  if (!item) return res.status(404).json({ message: '존재하지 않는 아이템 넘버입니다.' });
  res.json(item);
});

export default router;
