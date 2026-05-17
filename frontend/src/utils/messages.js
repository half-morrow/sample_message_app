import { CHAT_EMPTY_META } from "../constants/chat";

export function normalizeMessagesIndex(payload, requestedPage) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        ...CHAT_EMPTY_META,
        page: requestedPage,
        total_count: payload.length,
        total_pages: payload.length > 0 ? 1 : 0,
      },
    };
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const rawMeta = payload?.meta || {};
  const perPage = Number(rawMeta.per_page) || CHAT_EMPTY_META.per_page;
  const totalCount = Number(rawMeta.total_count) || 0;
  const totalPages = Number(rawMeta.total_pages) || 0;
  const rawPage = Number(rawMeta.page) || requestedPage || 1;
  const normalizedPage = rawPage >= 1 ? rawPage : 1;

  return {
    items,
    meta: {
      page: normalizedPage,
      per_page: perPage,
      total_count: totalCount,
      total_pages: totalPages,
    },
  };
}
