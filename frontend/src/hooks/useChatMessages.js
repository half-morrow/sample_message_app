import { useEffect, useState } from "react";
import { createMessage, deleteMessage, fetchMessages, updateMessage } from "../actions/messageActions";
import { CHAT_EMPTY_META } from "../constants/chat";
import { normalizeMessagesIndex } from "../utils/messages";

export function useChatMessages(api) {
  const [messages, setMessages] = useState([]);
  const [meta, setMeta] = useState(CHAT_EMPTY_META);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function loadMessages(nextPage = meta.page) {
    setError("");
    cancelEdit();
    try {
      const payload = await fetchMessages(api, nextPage);
      const normalized = normalizeMessagesIndex(payload, nextPage);
      setMessages(normalized.items);
      setMeta(normalized.meta);
    } catch (err) {
      setMessages([]);
      setMeta({ ...CHAT_EMPTY_META, page: nextPage });
      setError(err.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await createMessage(api, body);
      setBody("");
      await loadMessages(1);
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(message) {
    setEditingId(message.id);
    setEditBody(message.body || "");
    setError("");
  }

  async function saveEdit(event, message) {
    event.preventDefault();
    setError("");
    try {
      await updateMessage(api, message.id, editBody);
      cancelEdit();
      await loadMessages(meta.page);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMessage(message) {
    if (!window.confirm("削除しますか？")) return;

    setError("");
    try {
      await deleteMessage(api, message.id);
      const nextPage = messages.length === 1 && meta.page > 1 ? meta.page - 1 : meta.page;
      await loadMessages(nextPage);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMessages(1);
  }, []);

  return {
    messages,
    meta,
    body,
    setBody,
    error,
    editingId,
    editBody,
    setEditBody,
    loadMessages,
    submit,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteMessage: removeMessage,
  };
}
