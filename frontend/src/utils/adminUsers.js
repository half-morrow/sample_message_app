import { ADMIN_EMPTY_META } from "../constants/admin";

export function normalizeAdminIndex(payload, requestedPage) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        ...ADMIN_EMPTY_META,
        page: requestedPage,
        total_count: payload.length,
        total_pages: payload.length > 0 ? 1 : 0,
      },
    };
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const rawMeta = payload?.meta || {};
  const perPage = Number(rawMeta.per_page) || ADMIN_EMPTY_META.per_page;
  const totalCount = Number(rawMeta.total_count) || 0;
  const totalPages = Number(rawMeta.total_pages) || 0;
  const page = Number(rawMeta.page) || requestedPage || 1;

  return {
    items,
    meta: {
      page: page >= 1 ? page : 1,
      per_page: perPage,
      total_count: totalCount,
      total_pages: totalPages,
    },
  };
}

export function emptyAdminUserForm() {
  return { name: "", email: "", password: "", password_confirmation: "", role: "member" };
}

export function formatAdminListItem(item) {
  return `${item.name} / ${item.email} / ${item.role}`;
}

export function formatItem(item) {
  return `${item.name}\n${item.email}\n${item.role}`;
}
