const won = new Intl.NumberFormat('ko-KR');

export const formatWon = (n) => won.format(n);

export const formatDate = (iso) => iso.slice(0, 10);
