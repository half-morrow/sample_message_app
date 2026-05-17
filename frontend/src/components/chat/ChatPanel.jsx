export function ChatPanel({ chat }) {
  const hasMessages = chat.messages.length > 0;
  const hasPrevious = chat.meta.page > 1;
  const hasNext = chat.meta.total_pages > 0 && chat.meta.page < chat.meta.total_pages;

  return (
    <section className="panel">
      <div className="section-header">
        <h2>チャット</h2>
        <button onClick={() => chat.loadMessages(chat.meta.page)}>更新</button>
      </div>
      <form onSubmit={chat.submit} className="inline-form">
        <input
          value={chat.body}
          onChange={(event) => chat.setBody(event.target.value)}
          placeholder="メッセージ"
          maxLength="500"
          required
        />
        <button type="submit">投稿</button>
      </form>
      {chat.error && <p className="error">{chat.error}</p>}
      <ul className="list">
        {chat.messages.map((message) => (
          <li key={message.id} className="message-item">
            <div className="message-content">
              <strong>{message.user?.name || "不明なユーザー"}</strong>
              {chat.editingId === message.id ? (
                <form className="edit-form" onSubmit={(event) => chat.saveEdit(event, message)}>
                  <input
                    value={chat.editBody}
                    onChange={(event) => chat.setEditBody(event.target.value)}
                    maxLength="500"
                    required
                  />
                  <div className="actions">
                    <button type="submit">保存</button>
                    <button type="button" onClick={chat.cancelEdit}>
                      キャンセル
                    </button>
                  </div>
                </form>
              ) : (
                <span>{message.body}</span>
              )}
              {message.edited && <small className="edited-label">編集済み</small>}
            </div>
            {(message.can_edit || message.can_delete) && chat.editingId !== message.id && (
              <div className="actions">
                {message.can_edit && <button onClick={() => chat.startEdit(message)}>編集</button>}
                {message.can_delete && (
                  <button onClick={() => chat.deleteMessage(message)}>削除</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!chat.error && !hasMessages && <p className="empty">メッセージはまだありません。</p>}
      <div className="pagination">
        <button disabled={!hasPrevious} onClick={() => chat.loadMessages(chat.meta.page - 1)}>
          前へ
        </button>
        <span>
          {chat.meta.total_pages > 0 ? `${chat.meta.page} / ${chat.meta.total_pages}` : "0件"}
        </span>
        <button disabled={!hasNext} onClick={() => chat.loadMessages(chat.meta.page + 1)}>
          次へ
        </button>
      </div>
    </section>
  );
}
