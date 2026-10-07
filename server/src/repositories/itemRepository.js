import { items } from '../data/items.js';

// 하이픈 등 구분 문자를 무시하고 비교한다. (예: 20300636 -> 203-00636)
const normalize = (s) => String(s).toUpperCase().replace(/[^0-9A-Z가-힣]/g, '');

export const SEARCH_MIN_LENGTH = 1;

export const isSearchable = (query) => normalize(query).length >= SEARCH_MIN_LENGTH;

// 아이템 넘버에 검색어가 포함된 품목을 찾는다. 정확히 일치 > 앞부분 일치 > 포함 순으로 정렬한다.
export function search(query, limit = 20) {
  const q = normalize(query);
  if (!isSearchable(query)) return [];
  const rank = (item) => {
    const no = normalize(item.itemNo);
    if (no === q) return 0;
    if (no.startsWith(q)) return 1;
    return no.includes(q) ? 2 : 3;
  };
  return items
    .map((item) => ({ item, rank: rank(item) }))
    .filter((m) => m.rank < 3)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((m) => m.item);
}

export function findByItemNo(itemNo) {
  // 마스터에 소문자가 섞인 번호(예: 210-00008p)가 있어 양쪽 모두 대소문자를 무시하고 비교한다.
  const key = String(itemNo).trim().toUpperCase();
  return items.find((i) => i.itemNo.toUpperCase() === key) ?? null;
}
