import { expect, test } from "@playwright/test";

async function setAdminSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-admin-token");
    localStorage.setItem("user", JSON.stringify({
      id: 1,
      name: "E2E Admin",
      email: "admin@example.com",
      role: "admin",
    }));
  });
}

async function setMemberSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-member-token");
    localStorage.setItem("user", JSON.stringify({
      id: 2,
      name: "E2E Member",
      email: "member@example.com",
      role: "member",
    }));
  });
}

function messageIndexPayload(items, pageNumber = 1, totalCount = items.length) {
  return {
    items,
    meta: {
      page: pageNumber,
      per_page: 10,
      total_count: totalCount,
      total_pages: totalCount > 0 ? Math.ceil(totalCount / 10) : 0,
    },
  };
}

test("login failure shows a Japanese error message", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder("メールアドレス").fill("missing@example.com");
  await page.getByPlaceholder("パスワード", { exact: true }).fill("wrong-password");
  await page.locator("form").getByRole("button", { name: "ログイン", exact: true }).click();

  await expect(page.getByText("メールアドレスまたはパスワードが正しくありません。")).toBeVisible();
  await expect(page.getByText("invalid_email_or_password")).toHaveCount(0);
});

test("new user can post a message and see it after login", async ({ page }, testInfo) => {
  const unique = `${Date.now()}-${testInfo.workerIndex}`;
  const name = `E2E User ${unique}`;
  const email = `e2e-${unique}@example.com`;
  const password = "password123";
  const message = `E2E message ${unique}`;

  await page.goto("/");

  await page.getByRole("button", { name: "新規作成" }).click();
  await page.getByPlaceholder("名前").fill(name);
  await page.getByPlaceholder("メールアドレス").fill(email);
  await page.getByPlaceholder("パスワード", { exact: true }).fill(password);
  await page.getByPlaceholder("パスワード確認").fill(password);
  await page.locator("form").getByRole("button", { name: "作成", exact: true }).click();

  await expect(page.getByRole("heading", { name: "チャット" })).toBeVisible();
  await page.getByPlaceholder("メッセージ").fill(message);
  await page.getByRole("button", { name: "投稿" }).click();

  await expect(page.getByText(message)).toBeVisible();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByRole("heading", { name: "サンプル伝言アプリ" })).toBeVisible();

  await page.getByRole("button", { name: "ログイン" }).click();
  await page.getByPlaceholder("メールアドレス").fill(email);
  await page.getByPlaceholder("パスワード", { exact: true }).fill(password);
  await page.locator("form").getByRole("button", { name: "ログイン", exact: true }).click();

  await expect(page.getByRole("heading", { name: "チャット" })).toBeVisible();
  await expect(page.getByText(message)).toBeVisible();
});

test("admin area is user management only", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await setAdminSession(page);
  await page.route("**/api/messages**", async (route) => {
    await route.fulfill({ json: messageIndexPayload([]) });
  });
  await page.route(/\/api\/admin\/users(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        items: [{ id: 1, name: "E2E Admin", email: "admin@example.com", role: "admin" }],
        meta: { page: 1, per_page: 10, total_count: 1, total_pages: 1 },
      },
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ユーザー管理" })).toBeVisible();
  await expect(page.getByRole("button", { name: "メッセージ" })).toHaveCount(0);
  await expect(page.getByText("管理メッセージ")).toHaveCount(0);
  await expect(page.getByText("E2E Admin / admin@example.com / admin")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("admin user form creates and edits users without prompts", async ({ page }) => {
  await setAdminSession(page);

  const dialogs = [];
  let createPayload = null;
  let updatePayload = null;
  const users = [
    { id: 1, name: "E2E Admin", email: "admin@example.com", role: "admin" },
    { id: 2, name: "Edit Target", email: "edit@example.com", role: "member" },
  ];

  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.route("**/api/messages**", async (route) => {
    await route.fulfill({ json: messageIndexPayload([]) });
  });
  await page.route(/\/api\/admin\/users(\/\d+)?(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "POST") {
      createPayload = JSON.parse(route.request().postData() || "{}");
      users.push({ id: 3, name: createPayload.name, email: createPayload.email, role: createPayload.role });
      await route.fulfill({ status: 201, json: users.at(-1) });
      return;
    }

    if (method === "PATCH") {
      updatePayload = JSON.parse(route.request().postData() || "{}");
      const id = Number(url.pathname.split("/").pop());
      const user = users.find((item) => item.id === id);
      Object.assign(user, updatePayload);
      await route.fulfill({ json: user });
      return;
    }

    await route.fulfill({
      json: {
        items: users,
        meta: { page: 1, per_page: 10, total_count: users.length, total_pages: 1 },
      },
    });
  });

  await page.goto("/");

  const adminPanel = page.locator("section").filter({ has: page.getByRole("heading", { name: "ユーザー管理" }) });
  const selfRow = adminPanel.locator("li").filter({ hasText: "E2E Admin / admin@example.com / admin" });
  const editRow = adminPanel.locator("li").filter({ hasText: "Edit Target / edit@example.com / member" });
  await expect(selfRow.getByRole("button", { name: "削除" })).toHaveCount(0);
  await expect(adminPanel.getByRole("button", { name: "削除" })).toHaveCount(1);

  await adminPanel.getByRole("button", { name: "追加" }).click();
  const createForm = adminPanel.locator(".admin-user-form");
  await createForm.getByPlaceholder("名前").fill("Created User");
  await createForm.getByPlaceholder("メールアドレス").fill("created@example.com");
  await createForm.getByPlaceholder("パスワード", { exact: true }).fill("password123");
  await createForm.getByPlaceholder("パスワード確認").fill("password123");
  await createForm.locator('select[name="role"]').selectOption("admin");
  await createForm.getByRole("button", { name: "作成" }).click();

  await expect.poll(() => createPayload?.role).toBe("admin");
  expect(createPayload).toEqual({
    name: "Created User",
    email: "created@example.com",
    password: "password123",
    password_confirmation: "password123",
    role: "admin",
  });
  await expect(adminPanel.getByText("Created User / created@example.com / admin")).toBeVisible();

  await editRow.getByRole("button", { name: "編集" }).click();
  const editForm = adminPanel.locator(".admin-user-form");
  await expect(editForm.getByPlaceholder("名前")).toHaveValue("Edit Target");
  await expect(editForm.getByPlaceholder("メールアドレス")).toHaveValue("edit@example.com");
  await expect(editForm.locator('select[name="role"]')).toHaveValue("member");
  await editForm.getByPlaceholder("名前").fill("Edited Target");
  await editForm.getByPlaceholder("メールアドレス").fill("edited@example.com");
  await editForm.locator('select[name="role"]').selectOption("admin");
  await editForm.getByRole("button", { name: "保存" }).click();

  await expect.poll(() => updatePayload?.role).toBe("admin");
  expect(updatePayload).toEqual({
    name: "Edited Target",
    email: "edited@example.com",
    role: "admin",
  });
  await expect(adminPanel.getByText("Edited Target / edited@example.com / admin")).toBeVisible();
  expect(dialogs).toEqual([]);
});

test("admin user pagination, search, and delete confirm work", async ({ page }) => {
  await setAdminSession(page);

  let userLoads = 0;
  let deleteRequests = 0;
  const userRequests = [];
  const makeUsers = (pageNumber) => Array.from({ length: pageNumber === 1 ? 10 : 2 }, (_, index) => ({
    id: pageNumber * 100 + index,
    name: `User ${pageNumber}-${index}`,
    email: `user-${pageNumber}-${index}@example.com`,
    role: "member",
  }));

  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
  });
  await page.route("**/api/messages**", async (route) => {
    await route.fulfill({ json: messageIndexPayload([]) });
  });
  await page.route(/\/api\/admin\/users(\/\d+)?(\?.*)?$/, async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests += 1;
      await route.fulfill({ status: 204 });
      return;
    }

    userLoads += 1;
    const url = new URL(route.request().url());
    userRequests.push(url);
    const pageNumber = Number(url.searchParams.get("page")) || 1;
    await route.fulfill({
      json: {
        items: makeUsers(pageNumber),
        meta: { page: pageNumber, per_page: 10, total_count: 12, total_pages: 2 },
      },
    });
  });

  await page.goto("/");

  const adminPanel = page.locator("section").filter({ has: page.getByRole("heading", { name: "ユーザー管理" }) });
  await expect(page.getByText("User 1-0 / user-1-0@example.com / member")).toBeVisible();
  await expect(page.getByText("User 1-9 / user-1-9@example.com / member")).toBeVisible();
  await adminPanel.getByRole("button", { name: "次へ" }).click();
  await expect(page.getByText("User 2-0 / user-2-0@example.com / member")).toBeVisible();

  await adminPanel.getByPlaceholder("検索").fill("user-only");
  await adminPanel.getByRole("button", { name: "検索" }).click();
  await expect.poll(() => userRequests.at(-1).searchParams.get("q")).toBe("user-only");
  await expect.poll(() => userRequests.at(-1).searchParams.get("page")).toBe("1");
  await expect(page.getByPlaceholder("検索")).toHaveValue("user-only");

  const loadsBeforeDelete = userLoads;
  await adminPanel.getByRole("button", { name: "削除" }).first().click();
  await expect.poll(() => deleteRequests).toBe(0);
  expect(userLoads).toBe(loadsBeforeDelete);
});

test("admin delete confirm accepts and reloads the list", async ({ page }) => {
  await setAdminSession(page);

  let userLoads = 0;
  let deleteRequests = 0;
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.route("**/api/messages**", async (route) => {
    await route.fulfill({ json: messageIndexPayload([]) });
  });
  await page.route(/\/api\/admin\/users(\/\d+)?(\?.*)?$/, async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests += 1;
      await route.fulfill({ status: 204 });
      return;
    }

    userLoads += 1;
    const items = userLoads === 1
      ? [{ id: 3, name: "Delete Me", email: "delete-me@example.com", role: "member" }]
      : [];

    await route.fulfill({
      json: {
        items,
        meta: { page: 1, per_page: 10, total_count: items.length, total_pages: items.length > 0 ? 1 : 0 },
      },
    });
  });
  await page.goto("/");

  const adminPanel = page.locator("section").filter({ has: page.getByRole("heading", { name: "ユーザー管理" }) });
  await expect(page.getByText("Delete Me / delete-me@example.com / member")).toBeVisible();
  await adminPanel.getByRole("button", { name: "削除" }).first().click();

  await expect.poll(() => deleteRequests).toBe(1);
  await expect.poll(() => userLoads).toBe(2);
  await expect(page.getByText("該当するデータがありません。")).toBeVisible();
});

test("member can page messages and edit only own message", async ({ page }) => {
  await setMemberSession(page);

  const messages = Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    body: `Message ${index + 1}`,
    edited: false,
    can_edit: index === 0,
    can_delete: false,
    user: { id: index === 0 ? 2 : 3, name: index === 0 ? "E2E Member" : "Other User" },
  }));

  await page.route(/\/api\/messages(\/\d+)?(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "PATCH") {
      const id = Number(url.pathname.split("/").pop());
      const body = JSON.parse(route.request().postData() || "{}").body;
      const message = messages.find((item) => item.id === id);
      message.body = body;
      message.edited = true;
      await route.fulfill({ json: message });
      return;
    }

    const pageNumber = Number(url.searchParams.get("page")) || 1;
    const start = (pageNumber - 1) * 10;
    await route.fulfill({ json: messageIndexPayload(messages.slice(start, start + 10), pageNumber, messages.length) });
  });

  await page.goto("/");

  const chat = page.locator("section").filter({ has: page.getByRole("heading", { name: "チャット" }) });
  await expect(chat.getByText("Message 1", { exact: true })).toBeVisible();
  await expect(chat.getByText("Message 10", { exact: true })).toBeVisible();
  await expect(chat.getByRole("button", { name: "削除" })).toHaveCount(0);
  await expect(chat.getByRole("button", { name: "編集" })).toHaveCount(1);

  await chat.getByRole("button", { name: "次へ" }).click();
  await expect(chat.getByText("Message 11", { exact: true })).toBeVisible();
  await chat.getByRole("button", { name: "前へ" }).click();

  await chat.getByRole("button", { name: "編集" }).click();
  await chat.locator(".edit-form input").fill("Edited own message");
  await chat.getByRole("button", { name: "保存" }).click();

  await expect(chat.getByText("Edited own message", { exact: true })).toBeVisible();
  await expect(chat.getByText("編集済み")).toBeVisible();
});

test("admin can edit and delete messages from the chat list", async ({ page }) => {
  await setAdminSession(page);

  let deleteRequests = 0;
  let acceptDelete = false;
  const messages = [
    { id: 1, body: "Admin editable", edited: false, can_edit: true, can_delete: true, user: { id: 2, name: "Other User" } },
    { id: 2, body: "Admin deletable", edited: false, can_edit: true, can_delete: true, user: { id: 3, name: "Another User" } },
  ];

  page.on("dialog", async (dialog) => {
    if (acceptDelete) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
  await page.route(/\/api\/messages(\/\d+)?(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "PATCH") {
      const id = Number(url.pathname.split("/").pop());
      const body = JSON.parse(route.request().postData() || "{}").body;
      const message = messages.find((item) => item.id === id);
      message.body = body;
      message.edited = true;
      await route.fulfill({ json: message });
      return;
    }

    if (method === "DELETE") {
      deleteRequests += 1;
      const id = Number(url.pathname.split("/").pop());
      const index = messages.findIndex((item) => item.id === id);
      if (index >= 0) messages.splice(index, 1);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ json: messageIndexPayload(messages, 1, messages.length) });
  });
  await page.route(/\/api\/admin\/users(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        items: [{ id: 1, name: "E2E Admin", email: "admin@example.com", role: "admin" }],
        meta: { page: 1, per_page: 10, total_count: 1, total_pages: 1 },
      },
    });
  });

  await page.goto("/");

  const chat = page.locator("section").filter({ has: page.getByRole("heading", { name: "チャット" }) });
  await expect(chat.getByRole("button", { name: "編集" })).toHaveCount(2);
  await expect(chat.getByRole("button", { name: "削除" })).toHaveCount(2);

  await chat.getByRole("button", { name: "編集" }).first().click();
  await chat.locator(".edit-form input").fill("Admin edited");
  await chat.getByRole("button", { name: "保存" }).click();
  await expect(chat.getByText("Admin edited", { exact: true })).toBeVisible();

  await chat.getByRole("button", { name: "削除" }).first().click();
  await expect.poll(() => deleteRequests).toBe(0);
  acceptDelete = true;
  await chat.getByRole("button", { name: "削除" }).first().click();
  await expect.poll(() => deleteRequests).toBe(1);
  await expect(chat.getByText("Admin edited", { exact: true })).toHaveCount(0);
  await expect(chat.getByRole("button", { name: "削除" })).toHaveCount(1);
});

test("admin user search form stays usable on mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setAdminSession(page);

  await page.route("**/api/messages**", async (route) => {
    await route.fulfill({ json: messageIndexPayload([]) });
  });
  await page.route(/\/api\/admin\/users(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        items: [{ id: 1, name: "Mobile User", email: "mobile@example.com", role: "member" }],
        meta: { page: 1, per_page: 10, total_count: 1, total_pages: 1 },
      },
    });
  });
  await page.goto("/");

  const input = page.locator(".admin-user-search");
  await expect(input).toBeVisible();
  const box = await input.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThan(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  await expect(page.getByRole("button", { name: "検索" })).toBeVisible();
});
