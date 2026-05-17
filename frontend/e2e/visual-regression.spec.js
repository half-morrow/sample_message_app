import { expect, test } from "@playwright/test";

const memberUser = {
  id: 2,
  name: "佐藤 花子",
  email: "hanako.sato@example.test",
  role: "member",
};

const adminUser = {
  id: 1,
  name: "管理 太郎",
  email: "admin.taro@example.test",
  role: "admin",
};

const messages = [
  "おはようございます。今日もよろしくお願いします。",
  "昨日の確認事項をまとめました。",
  "午後の打ち合わせは予定どおりです。",
  "資料を共有しましたので確認をお願いします。",
  "対応が終わったらこちらに連絡します。",
  "不明点があれば遠慮なく聞いてください。",
  "先ほどの件、問題なく動作しました。",
  "次の作業に進めても大丈夫です。",
  "レビューありがとうございました。",
  "明日の朝にもう一度確認します。",
].map((body, index) => ({
  id: index + 1,
  body,
  edited: index === 8,
  can_edit: index === 0,
  can_delete: index === 0,
  user: {
    id: index % 3 === 0 ? memberUser.id : index + 10,
    name: index % 3 === 0 ? memberUser.name : ["田中 一郎", "鈴木 美咲", "高橋 健"][index % 3],
  },
}));

const adminUsers = [
  adminUser,
  { id: 2, name: "佐藤 花子", email: "hanako.sato@example.test", role: "member" },
  { id: 3, name: "田中 一郎", email: "ichiro.tanaka@example.test", role: "member" },
  { id: 4, name: "鈴木 美咲", email: "misaki.suzuki@example.test", role: "member" },
  { id: 5, name: "高橋 健", email: "ken.takahashi@example.test", role: "member" },
];

test.use({ viewport: { width: 1280, height: 800 } });

async function setSession(page, user, token) {
  await page.addInitScript(
    ({ storedUser, storedToken }) => {
      localStorage.setItem("token", storedToken);
      localStorage.setItem("user", JSON.stringify(storedUser));
    },
    { storedUser: user, storedToken: token }
  );
}

async function routeMessages(page) {
  await page.route(/\/api\/messages(\/\d+)?(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        items: messages,
        meta: { page: 1, per_page: 10, total_count: messages.length, total_pages: 1 },
      },
    });
  });
}

async function routeAdminUsers(page) {
  await page.route(/\/api\/admin\/users(\/\d+)?(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        items: adminUsers,
        meta: { page: 1, per_page: 10, total_count: adminUsers.length, total_pages: 1 },
      },
    });
  });
}

test("ログイン画面 @visual", async ({ page }) => {
  await page.route("**://*/api/**", async (route) => {
    await route.fulfill({ status: 404, json: { error: "not_found" } });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "サンプル伝言アプリ" })).toBeVisible();

  await expect(page).toHaveScreenshot("login.png");
});

test("一般ユーザーチャット画面 @visual", async ({ page }) => {
  await setSession(page, memberUser, "visual-member-token");
  await routeMessages(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "チャット" })).toBeVisible();
  await expect(page.getByText(messages[0].body)).toBeVisible();

  await expect(page).toHaveScreenshot("user-chat.png");
});

test("管理画面 @visual", async ({ page }) => {
  await setSession(page, adminUser, "visual-admin-token");
  await routeMessages(page);
  await routeAdminUsers(page);

  await page.goto("/");
  const adminPanel = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "ユーザー管理" }) });
  await expect(adminPanel.getByText("佐藤 花子 / hanako.sato@example.test / member")).toBeVisible();

  await expect(page).toHaveScreenshot("admin.png");
});
