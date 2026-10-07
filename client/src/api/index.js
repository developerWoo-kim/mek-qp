async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? '요청에 실패했습니다.');
  return body;
}

export const searchItems = (query) => request(`/api/items?q=${encodeURIComponent(query.trim())}`);

export const createQuote = (payload) =>
  request('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const getQuote = (id) => request(`/api/quotes/${encodeURIComponent(id)}`);

export const downloadUrl = (id, format) => `/api/quotes/${encodeURIComponent(id)}/download?format=${format}`;
