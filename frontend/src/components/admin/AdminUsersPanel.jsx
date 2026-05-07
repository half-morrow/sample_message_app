import { formatAdminListItem } from "../../utils/adminUsers";

export function AdminUsersPanel({ admin, currentUser }) {
  const current = admin.current;
  const hasItems = current.items.length > 0;
  const hasPrevious = current.meta.page > 1;
  const hasNext = current.meta.total_pages > 0 && current.meta.page < current.meta.total_pages;

  return (
    <section className="panel">
      <div className="section-header">
        <h2>ユーザー管理</h2>
      </div>
      <form className="inline-form" onSubmit={admin.search}>
        <input
          className="admin-user-search"
          value={current.query}
          onChange={(event) => admin.updateQuery(event.target.value)}
          placeholder="検索"
        />
        <button type="submit">検索</button>
        <button type="button" onClick={admin.startCreateUser}>追加</button>
      </form>
      {admin.formMode && (
        <form className="form admin-user-form" onSubmit={admin.submitUserForm}>
          <input name="name" value={admin.formValues.name} onChange={admin.updateUserForm} placeholder="名前" required />
          <input name="email" type="email" value={admin.formValues.email} onChange={admin.updateUserForm} placeholder="メールアドレス" required />
          <input name="password" type="password" value={admin.formValues.password} onChange={admin.updateUserForm} placeholder="パスワード" required={admin.formMode === "create"} />
          <input
            name="password_confirmation"
            type="password"
            value={admin.formValues.password_confirmation}
            onChange={admin.updateUserForm}
            placeholder="パスワード確認"
            required={admin.formMode === "create" || Boolean(admin.formValues.password)}
          />
          <select name="role" value={admin.formValues.role} onChange={admin.updateUserForm}>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <div className="actions">
            <button type="submit">{admin.formMode === "create" ? "作成" : "保存"}</button>
            <button type="button" onClick={admin.cancelUserForm}>キャンセル</button>
          </div>
        </form>
      )}
      {current.error && <p className="error">{current.error}</p>}
      <ul className="list">
        {current.items.map((item) => (
          <li key={item.id}>
            <span>{formatAdminListItem(item)}</span>
            <div className="actions">
              <button onClick={() => admin.showItem(item)}>表示</button>
              <button onClick={() => admin.startEditUser(item)}>編集</button>
              {currentUser?.id !== item.id && <button onClick={() => admin.deleteItem(item)}>削除</button>}
            </div>
          </li>
        ))}
      </ul>
      {!current.error && !hasItems && <p className="empty">該当するデータがありません。</p>}
      <div className="pagination">
        <button disabled={!hasPrevious} onClick={() => admin.changePage(current.meta.page - 1)}>前へ</button>
        <span>{current.meta.total_pages > 0 ? `${current.meta.page} / ${current.meta.total_pages}` : "0件"}</span>
        <button disabled={!hasNext} onClick={() => admin.changePage(current.meta.page + 1)}>次へ</button>
      </div>
    </section>
  );
}
