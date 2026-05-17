import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "../docs/screenshots");

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
  "細かい修正を反映しました。",
  "進捗に大きな遅れはありません。",
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
  { id: 6, name: "伊藤 葵", email: "aoi.ito@example.test", role: "member" },
  { id: 7, name: "渡辺 翔", email: "sho.watanabe@example.test", role: "member" },
  { id: 8, name: "山本 結衣", email: "yui.yamamoto@example.test", role: "member" },
  { id: 9, name: "中村 大輔", email: "daisuke.nakamura@example.test", role: "member" },
  { id: 10, name: "小林 里奈", email: "rina.kobayashi@example.test", role: "member" },
  { id: 11, name: "加藤 直人", email: "naoto.kato@example.test", role: "admin" },
  { id: 12, name: "吉田 真央", email: "mao.yoshida@example.test", role: "member" },
];

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeAll(async () => {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
});

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
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get("page")) || 1;
    const start = (pageNumber - 1) * 10;

    await route.fulfill({
      json: {
        items: messages.slice(start, start + 10),
        meta: {
          page: pageNumber,
          per_page: 10,
          total_count: messages.length,
          total_pages: Math.ceil(messages.length / 10),
        },
      },
    });
  });
}

async function routeAdminUsers(page) {
  await page.route(/\/api\/admin\/users(\/\d+)?(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        items: adminUsers.slice(0, 10),
        meta: {
          page: 1,
          per_page: 10,
          total_count: adminUsers.length,
          total_pages: Math.ceil(adminUsers.length / 10),
        },
      },
    });
  });
}

test("README用ログイン画面 @screenshots", async ({ page }) => {
  await page.route("**://*/api/**", async (route) => {
    await route.fulfill({ status: 404, json: { error: "not_found" } });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "サンプル伝言アプリ" })).toBeVisible();
  await expect(page.getByPlaceholder("メールアドレス")).toBeVisible();

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "login.png") });
});

test("README用一般ユーザーチャット画面 @screenshots", async ({ page }) => {
  await setSession(page, memberUser, "screenshot-member-token");
  await routeMessages(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "チャット" })).toBeVisible();
  await expect(page.getByText(messages[0].body)).toBeVisible();
  await expect(page.getByText(messages[9].body)).toBeVisible();

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "user-chat.png") });
});

test("README用管理画面 @screenshots", async ({ page }) => {
  await setSession(page, adminUser, "screenshot-admin-token");
  await routeMessages(page);
  await routeAdminUsers(page);

  await page.goto("/");
  const adminPanel = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "ユーザー管理" }) });
  await expect(adminPanel.getByText("佐藤 花子 / hanako.sato@example.test / member")).toBeVisible();
  await expect(
    adminPanel.getByText("小林 里奈 / rina.kobayashi@example.test / member")
  ).toBeVisible();
  await adminPanel.scrollIntoViewIfNeeded();

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "admin.png") });
});
