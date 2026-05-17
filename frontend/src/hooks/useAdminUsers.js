import { useEffect, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from "../actions/adminUserActions";
import { ADMIN_INITIAL_STATE } from "../constants/admin";
import { emptyAdminUserForm, formatItem, normalizeAdminIndex } from "../utils/adminUsers";

export function useAdminUsers(api, enabled = true) {
  const [adminState, setAdminState] = useState(ADMIN_INITIAL_STATE);
  const [formMode, setFormMode] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formValues, setFormValues] = useState(emptyAdminUserForm());
  const current = adminState.users;

  function updateTabState(targetTab, changes) {
    setAdminState((state) => ({
      ...state,
      [targetTab]: { ...state[targetTab], ...changes },
    }));
  }

  async function load(page = adminState.users.page, query = adminState.users.query) {
    updateTabState("users", { error: "" });
    try {
      const payload = await fetchAdminUsers(api, page, query);
      const normalized = normalizeAdminIndex(payload, page);
      updateTabState("users", {
        items: normalized.items,
        meta: normalized.meta,
        page: normalized.meta.page,
        error: "",
      });
    } catch (err) {
      updateTabState("users", { items: [], error: err.message });
    }
  }

  function updateQuery(value) {
    updateTabState("users", { query: value });
  }

  function search(event) {
    event.preventDefault();
    updateTabState("users", { page: 1 });
    load(1, current.query);
  }

  function changePage(nextPage) {
    load(nextPage, current.query);
  }

  function startCreateUser() {
    updateTabState("users", { error: "" });
    setFormMode("create");
    setEditingUserId(null);
    setFormValues(emptyAdminUserForm());
  }

  function startEditUser(item) {
    updateTabState("users", { error: "" });
    setFormMode("edit");
    setEditingUserId(item.id);
    setFormValues({
      name: item.name || "",
      email: item.email || "",
      password: "",
      password_confirmation: "",
      role: item.role || "member",
    });
  }

  function cancelUserForm() {
    setFormMode(null);
    setEditingUserId(null);
    setFormValues(emptyAdminUserForm());
  }

  function updateUserForm(event) {
    setFormValues({ ...formValues, [event.target.name]: event.target.value });
  }

  function userFormPayload() {
    const payload = {
      name: formValues.name,
      email: formValues.email,
      role: formValues.role,
    };

    if (formMode === "create" || formValues.password) {
      payload.password = formValues.password;
      payload.password_confirmation = formValues.password_confirmation;
    }

    return payload;
  }

  async function submitUserForm(event) {
    event.preventDefault();
    updateTabState("users", { error: "" });

    try {
      if (formMode === "edit") {
        await updateAdminUser(api, editingUserId, userFormPayload());
      } else {
        await createAdminUser(api, userFormPayload());
      }
      cancelUserForm();
      await load(adminState.users.page, adminState.users.query);
    } catch (err) {
      updateTabState("users", { error: err.message });
    }
  }

  async function showItem(item) {
    updateTabState("users", { error: "" });
    try {
      const payload = await fetchAdminUser(api, item.id);
      window.alert(formatItem(payload));
    } catch (err) {
      updateTabState("users", { error: err.message });
    }
  }

  async function deleteItem(item) {
    if (!window.confirm("削除しますか？")) return;

    updateTabState("users", { error: "" });
    try {
      await deleteAdminUser(api, item.id);
      const nextPage =
        current.items.length === 1 && current.page > 1 ? current.page - 1 : current.page;
      await load(nextPage, current.query);
    } catch (err) {
      updateTabState("users", { error: err.message });
    }
  }

  useEffect(() => {
    if (!enabled) return;

    let isCurrent = true;
    const initialPage = ADMIN_INITIAL_STATE.users.page;
    const initialQuery = ADMIN_INITIAL_STATE.users.query;

    fetchAdminUsers(api, initialPage, initialQuery)
      .then((payload) => {
        if (!isCurrent) return;

        const normalized = normalizeAdminIndex(payload, initialPage);
        updateTabState("users", {
          items: normalized.items,
          meta: normalized.meta,
          page: normalized.meta.page,
          error: "",
        });
      })
      .catch((err) => {
        if (!isCurrent) return;

        updateTabState("users", { items: [], error: err.message });
      });

    return () => {
      isCurrent = false;
    };
  }, [api, enabled]);

  return {
    current,
    formMode,
    formValues,
    updateQuery,
    search,
    changePage,
    startCreateUser,
    startEditUser,
    cancelUserForm,
    updateUserForm,
    submitUserForm,
    showItem,
    deleteItem,
  };
}
