export const ADMIN_EMPTY_META = { page: 1, per_page: 10, total_count: 0, total_pages: 0 };

export const ADMIN_INITIAL_STATE = {
  users: { query: "", items: [], error: "", page: 1, meta: ADMIN_EMPTY_META },
};
