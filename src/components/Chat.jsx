import { useState, useEffect, useRef } from "react";
import { watchMessages, sendMessage, markRead, notifySierra, notifyClientMessage } from "../lib/data";
import "./Chat.css";

function fmtWhen(ts) {
  const d = ts?.toDate?.();
  if (!d) return "Sending…";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function Chat({ clientUid, isAdmin, authorName, firmName }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    if (!clientUid) return;
    return watchMessages(clientUid, setMessages);
  }, [clientUid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!clientUid || messages.length === 0) return;
    markRead(clientUid, messages, isAdmin).catch(() => {});
  }, [clientUid, messages, isAdmin]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true); setErr("");
    setDraft("");
    try {
      await sendMessage(clientUid, { text, fromAdmin: isAdmin, authorName });
      if (!isAdmin) notifySierra("new_message", firmName);
      else          notifyClientMessage(clientUid);
    } catch {
      setErr("That message didn't send. Try again.");
      setDraft(text);
    }
    setSending(false);
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const other = isAdmin ? firmName : "Sierra";

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 ? (
          <div className="empty">
            <h3>No messages yet</h3>
            <p>
              {isAdmin
                ? `Start the conversation with ${firmName}.`
                : "Ask Sierra anything about your calendar, a post, or your plan."}
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.fromAdmin === isAdmin;
            const prev = messages[i - 1];
            const grouped = prev && prev.fromAdmin === m.fromAdmin;

            return (
              <div
                key={m.id}
                className={`chat-row${mine ? " is-mine" : ""}${grouped ? " is-grouped" : ""}`}
              >
                <div className="chat-bubble">
                  {!grouped && !mine && (
                    <span className="chat-who">{m.authorName || other}</span>
                  )}
                  <p>{m.text}</p>
                  <span className="chat-when">{fmtWhen(m.sentAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {err && <p className="chat-err">{err}</p>}

      <div className="chat-composer">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Message ${other}…`}
          rows={1}
          aria-label="Your message"
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={!draft.trim() || sending}
        >
          Send
        </button>
      </div>
    </div>
  );
}
