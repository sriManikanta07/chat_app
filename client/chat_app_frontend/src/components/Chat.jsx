import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";

/* ─── helpers ─── */
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const avatarColor = (name = "") => {
  const palette = [
    "#00a884",
    "#25d366",
    "#128c7e",
    "#075e54",
    "#34b7f1",
    "#dfe5e7",
  ];
  let h = 0;
  for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return palette[h % palette.length];
};

const Avatar = ({ name, size = 40 }) => (
  <div
    style={{
      width: size,
      height: size,
      minWidth: size,
      borderRadius: "50%",
      background: avatarColor(name),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.38,
      fontWeight: 700,
      color: "#fff",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      flexShrink: 0,
    }}
  >
    {getInitials(name)}
  </div>
);

const formatTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ─── font ─── */
if (typeof document !== "undefined" && !document.getElementById("wa-noto")) {
  const l = document.createElement("link");
  l.id = "wa-noto";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600&display=swap";
  document.head.appendChild(l);
}

/* ═══════════════════════════════════════
   COMPONENT
═══════════════════════════════════════ */
export default function Chat({
  user,
  messages = [],
  selectedFriend,
  openChat,
  sendMessage,
  message,
  setMessage,
  setSelectedFriend,
  onlineUsers = [],
}) {
  const [activeTab, setActiveTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [requests, setRequests] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [showFriends, setShowFriends] = useState([]);
  const bottomRef = useRef(null);
  const [botLoading, setBotLoading] = useState(false);
  const [botResult, setBotResult] = useState(null); // { summaryText, count }
  const [botError, setBotError] = useState(null);

  const url = "http://localhost:5000";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const fetchFriends = async () => {
    const r = await axios.get(`${url}/api/friends/friends/${user._id}`);
    setFriends(r.data);
  };
  const fetchSentRequests = async () => {
    try {
      const r = await axios.get(`${url}/api/friends/sent/${user._id}`);
      setSentRequests(r.data.map((u) => u._id));
    } catch {}
  };
  const fetchRequests = async () => {
    try {
      const r = await axios.get(`${url}/api/friends/requests/${user._id}`);
      setRequests(r.data);
    } catch {}
  };
  const updateShowFriends = async () => {
    const r = await axios.get(`${url}/api/friends/friends/${user._id}`);
    setShowFriends(r.data);
  };
  const searchUsers = async () => {
    if (!search) return;
    try {
      const r = await axios.get(`${url}/api/friends/search/${search}`);
      setResults(r.data);
      setTimeout(() => setResults([]), 5000);
    } catch {}
  };
  const sendRequest = async (receiverId) => {
    try {
      await axios.post(`${url}/api/friends/send`, {
        senderId: user._id,
        receiverId,
      });
      setSentRequests((p) => [...p, receiverId]);
    } catch {}
  };
  const acceptRequest = async (senderId) => {
    await axios.post(`${url}/api/friends/accept`, {
      userId: user._id,
      senderId,
    });
    socket.emit("requestAction", { receiverId: senderId });
    setRequests((p) => p.filter((r) => r._id !== senderId));
  };
  const rejectRequest = async (senderId) => {
    await axios.post(`${url}/api/friends/reject`, {
      userId: user._id,
      senderId,
    });
    socket.emit("requestAction", { receiverId: senderId });
    setRequests((p) => p.filter((r) => r._id !== senderId));
  };

  useEffect(() => {
    socket.on("typing", ({ senderId }) => setTypingUser(senderId));
    socket.on("stopTyping", () => setTypingUser(null));
    return () => {
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, []);
  useEffect(() => {
    fetchRequests();
  }, [activeTab]);
  useEffect(() => {
    fetchRequests();
    fetchFriends();
    setShowFriends(friends);
  }, []);
  useEffect(() => {
    updateShowFriends();
    fetchSentRequests();
  }, [activeTab]);
  useEffect(() => {
    socket.on("refreshRequests", fetchRequests);
    return () => socket.off("refreshRequests");
  }, []);

  const summarizeUnseen = async () => {
    setBotLoading(true);
    setBotError(null);
    setBotResult(null);

    try {
      const { data } = await axios.post(
        `${url}/api/messages/summarize/${user._id}`,
      );

      setBotResult({
        summaryText: data.summary, // null if no unread messages
        count: data.count,
      });
    } catch (err) {
      console.error(err);
      setBotError("Something went wrong. Please try again.");
    } finally {
      setBotLoading(false);
    }
  };
  const waBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cg opacity='.04' fill='%23fff'%3E%3Ccircle cx='10' cy='10' r='3'/%3E%3Ccircle cx='30' cy='10' r='3'/%3E%3Ccircle cx='50' cy='10' r='3'/%3E%3Ccircle cx='20' cy='25' r='3'/%3E%3Ccircle cx='40' cy='25' r='3'/%3E%3Ccircle cx='10' cy='40' r='3'/%3E%3Ccircle cx='30' cy='40' r='3'/%3E%3Ccircle cx='50' cy='40' r='3'/%3E%3Ccircle cx='20' cy='55' r='3'/%3E%3Ccircle cx='40' cy='55' r='3'/%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .wa-root {
          height: 100svh; display: flex; flex-direction: column;
          background: #111b21; font-family: 'Noto Sans', 'Segoe UI', system-ui, sans-serif;
          color: #e9edef; overflow: hidden;
        }
        .wa-header {
          background: #202c33; padding: 10px 16px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-shrink: 0; min-height: 59px;
        }
        .wa-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
        .wa-back-btn { background: none; border: none; color: #aebac1; cursor: pointer; font-size: 22px; padding: 0 4px; line-height: 1; transition: color .15s; }
        .wa-back-btn:hover { color: #e9edef; }
        .wa-header-info { min-width: 0; flex: 1; }
        .wa-header-name { font-size: 16px; font-weight: 600; color: #e9edef; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
        .wa-header-sub { font-size: 12px; margin-top: 1px; }
        .wa-online { color: #00a884; }
        .wa-offline { color: #8696a0; }
        .wa-header-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
        .wa-icon-btn { background: none; border: none; cursor: pointer; color: #aebac1; padding: 8px; border-radius: 50%; font-size: 20px; transition: background .15s, color .15s; position: relative; display: flex; align-items: center; justify-content: center; }
        .wa-icon-btn:hover { background: #2a3942; color: #e9edef; }
        .wa-badge { position: absolute; top: 2px; right: 2px; background: #00a884; color: #111b21; font-size: 9px; font-weight: 700; min-width: 15px; height: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 2px solid #202c33; }
        .wa-search-wrap { background: #111b21; padding: 8px 12px; flex-shrink: 0; }
        .wa-search-inner { display: flex; align-items: center; gap: 8px; background: #202c33; border-radius: 8px; padding: 7px 12px; }
        .wa-search-icon { color: #8696a0; font-size: 15px; flex-shrink: 0; }
        .wa-search-input { flex: 1; background: none; border: none; outline: none; font-size: 14px; color: #e9edef; font-family: inherit; }
        .wa-search-input::placeholder { color: #8696a0; }
        .wa-search-go { background: #00a884; border: none; border-radius: 6px; padding: 5px 12px; color: #111b21; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background .15s; white-space: nowrap; }
        .wa-search-go:hover { background: #06cf9c; }
        .wa-content { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #2a3942 transparent; }
        .wa-content::-webkit-scrollbar { width: 6px; }
        .wa-content::-webkit-scrollbar-thumb { background: #2a3942; border-radius: 3px; }
        .wa-section-label { padding: 18px 16px 6px; font-size: 12px; font-weight: 600; color: #00a884; letter-spacing: .04em; text-transform: uppercase; }
        .wa-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; transition: background .1s; position: relative; }
        .wa-row::after { content: ''; position: absolute; bottom: 0; left: 72px; right: 0; height: 1px; background: #1f2c33; }
        .wa-row:hover { background: #2a3942; }
        .wa-row-body { flex: 1; min-width: 0; }
        .wa-row-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .wa-row-name { font-size: 16px; font-weight: 500; color: #e9edef; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wa-row-sub { font-size: 13px; color: #8696a0; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wa-row-sub.online-sub { color: #00a884; }
        .wa-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px 32px; gap: 14px; }
        .wa-empty-icon { font-size: 52px; opacity: .35; }
        .wa-empty-text { color: #8696a0; font-size: 14px; text-align: center; line-height: 1.6; }
        .wa-messages-wrap { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .wa-messages-bg { flex: 1; overflow-y: auto; padding: 10px 5%; display: flex; flex-direction: column; gap: 2px; scrollbar-width: thin; scrollbar-color: #2a3942 transparent; background-color: #0b141a; background-image: ${waBg}; }
        .wa-messages-bg::-webkit-scrollbar { width: 6px; }
        .wa-messages-bg::-webkit-scrollbar-thumb { background: #2a3942; border-radius: 3px; }
        .wa-date-chip { align-self: center; background: #182229; color: #8696a0; font-size: 11.5px; padding: 5px 12px; border-radius: 8px; margin: 8px 0; box-shadow: 0 1px 2px #0003; }
        .wa-bubble-row { display: flex; flex-direction: column; }
        .wa-bubble-row.me { align-items: flex-end; }
        .wa-bubble-row.them { align-items: flex-start; }
        .wa-bubble { max-width: 72%; padding: 7px 10px 4px; border-radius: 7.5px; font-size: 14.2px; line-height: 1.5; word-break: break-word; position: relative; box-shadow: 0 1px 2px #0003; margin-bottom: 2px; }
        .wa-bubble.me { background: #005c4b; color: #e9edef; border-top-right-radius: 0; }
        .wa-bubble.them { background: #202c33; color: #e9edef; border-top-left-radius: 0; }
        .wa-bubble-meta { display: flex; align-items: center; justify-content: flex-end; gap: 3px; margin-top: 3px; }
        .wa-bubble-time { font-size: 10.5px; color: #8696a0; }
        .wa-tick { font-size: 13px; color: #53bdeb; }
        .wa-typing-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 2px; }
        .wa-typing-bubble { background: #202c33; border-radius: 7.5px; border-top-left-radius: 0; padding: 12px 16px; display: flex; gap: 5px; align-items: center; box-shadow: 0 1px 2px #0003; }
        .wa-typing-bubble span { width: 8px; height: 8px; border-radius: 50%; background: #8696a0; animation: waBounce 1.2s infinite ease-in-out; display: inline-block; }
        .wa-typing-bubble span:nth-child(2) { animation-delay: .2s; }
        .wa-typing-bubble span:nth-child(3) { animation-delay: .4s; }
        @keyframes waBounce { 0%,80%,100% { transform: scale(1); opacity: .5; } 40% { transform: scale(1.3); opacity: 1; } }
        .wa-input-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #202c33; flex-shrink: 0; }
        .wa-msg-input { flex: 1; background: #2a3942; border: none; border-radius: 24px; padding: 10px 16px; font-size: 15px; color: #e9edef; outline: none; font-family: inherit; transition: background .15s; }
        .wa-msg-input::placeholder { color: #8696a0; }
        .wa-msg-input:focus { background: #3b4a54; }
        .wa-send-btn { width: 46px; height: 46px; border-radius: 50%; border: none; background: #00a884; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background .15s, transform .1s; box-shadow: 0 2px 8px #00a88440; }
        .wa-send-btn:hover { background: #06cf9c; }
        .wa-send-btn:active { transform: scale(.93); }
        .wa-send-btn svg { width: 20px; height: 20px; fill: #fff; }
        .wa-tag { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
        .wa-tag-friend { background: #2a3942; color: #8696a0; }
        .wa-tag-pending { background: #2a2010; color: #e9a43a; border: 1px solid #5a4020; }
        .wa-btn-add { font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 20px; border: none; cursor: pointer; background: #00a884; color: #111b21; transition: background .15s; font-family: inherit; }
        .wa-btn-add:hover { background: #06cf9c; }
        .wa-btn-accept { font-size: 20px; background: none; border: none; cursor: pointer; color: #00a884; padding: 4px 8px; border-radius: 50%; transition: background .15s; }
        .wa-btn-accept:hover { background: #0f2922; }
        .wa-btn-reject { font-size: 20px; background: none; border: none; cursor: pointer; color: #f15c6d; padding: 4px 8px; border-radius: 50%; transition: background .15s; }
        .wa-btn-reject:hover { background: #2d1018; }
        .wa-bottom-nav { display: flex; background: #202c33; border-top: 1px solid #1f2c33; flex-shrink: 0; }
        .wa-nav-btn { flex: 1; background: none; border: none; cursor: pointer; padding: 10px 8px; display: flex; flex-direction: column; align-items: center; gap: 3px; color: #8696a0; font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; font-family: inherit; transition: color .15s; position: relative; }
        .wa-nav-btn.active { color: #00a884; }
        .wa-nav-btn.active::after { content: ''; position: absolute; top: 0; left: 25%; right: 25%; height: 2px; background: #00a884; border-radius: 0 0 3px 3px; }
        .wa-nav-icon { font-size: 21px; line-height: 1; }
        .wa-nav-badge { position: absolute; top: 6px; right: calc(50% - 18px); background: #00a884; color: #111b21; font-size: 9px; font-weight: 800; min-width: 15px; height: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 2px solid #202c33; }
      `}</style>

      <div className="wa-root">
        {/* ══════ HEADER ══════ */}
        <header className="wa-header">
          <div className="wa-header-left">
            {selectedFriend && (
              <button
                className="wa-back-btn"
                onClick={() => {
                  setSelectedFriend(null);
                  setActiveTab("chats");
                }}
              >
                ←
              </button>
            )}
            {selectedFriend ? (
              <>
                <Avatar name={selectedFriend.username} size={40} />
                <div className="wa-header-info">
                  <div className="wa-header-name">
                    {selectedFriend.username}
                  </div>
                  <div
                    className={`wa-header-sub ${onlineUsers.includes(selectedFriend._id) ? "wa-online" : "wa-offline"}`}
                  >
                    {onlineUsers.includes(selectedFriend._id)
                      ? "online"
                      : "last seen recently"}
                  </div>
                </div>
              </>
            ) : (
              <div
                className="wa-header-name"
                style={{ fontSize: 20, fontWeight: 700 }}
              >
                {activeTab === "chats" && "ChatsApp"}
                {activeTab === "friends" && "Friends"}
                {activeTab === "requests" && "Requests"}
                {activeTab === "bot" && "AI Assistant"}
              </div>
            )}
          </div>
          <div className="wa-header-actions">
            <button
              className="wa-icon-btn"
              title="Find friends"
              onClick={() => setActiveTab("friends")}
            >
              🔍
            </button>
            <button
              className="wa-icon-btn"
              title="Requests"
              onClick={() =>
                setActiveTab(activeTab === "requests" ? "chats" : "requests")
              }
            >
              🔔
              {requests.length > 0 && (
                <span className="wa-badge">{requests.length}</span>
              )}
            </button>
            <button className="wa-icon-btn" title="More">
              ⋮
            </button>
          </div>
        </header>

        {/* ══════ CONTENT ══════ */}
        <div className="wa-content">
          {/* ── CHATS LIST ── */}
          {activeTab === "chats" && !selectedFriend && (
            <>
              <div className="wa-search-wrap">
                <div className="wa-search-inner">
                  <span className="wa-search-icon">🔍</span>
                  <input
                    className="wa-search-input"
                    placeholder="Search or start new chat"
                    readOnly
                    onClick={() => setActiveTab("friends")}
                  />
                </div>
              </div>
              {friends.length === 0 ? (
                <div className="wa-empty">
                  <div className="wa-empty-icon">💬</div>
                  <div className="wa-empty-text">
                    No chats yet.
                    <br />
                    Add friends to get started.
                  </div>
                </div>
              ) : (
                friends.map((f) => {
                  const isOnline = onlineUsers.includes(f._id);
                  return (
                    <div
                      key={f._id}
                      className="wa-row"
                      onClick={() => {
                        openChat(f);
                        setActiveTab("chats");
                      }}
                    >
                      <Avatar name={f.username} size={49} />
                      <div className="wa-row-body">
                        <div className="wa-row-top">
                          <span className="wa-row-name">{f.username}</span>
                          {isOnline && (
                            <span
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                background: "#00a884",
                                flexShrink: 0,
                                display: "inline-block",
                              }}
                            />
                          )}
                        </div>
                        <div
                          className={`wa-row-sub ${isOnline ? "online-sub" : ""}`}
                        >
                          {isOnline ? "online" : "Tap to chat"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ── CHAT WINDOW ── */}
          {activeTab === "chats" && selectedFriend && (
            <div
              className="wa-messages-wrap"
              style={{ height: "100%", overflow: "hidden" }}
            >
              <div className="wa-messages-bg">
                <div className="wa-date-chip">Dead End</div>
                {messages.length === 0 && (
                  <div className="wa-empty" style={{ paddingTop: 32 }}>
                    <div className="wa-empty-icon">🔒</div>
                    <div className="wa-empty-text" style={{ fontSize: 12 }}>
                      Messages are end-to-end encrypted.
                      <br />
                      Say hi!
                    </div>
                  </div>
                )}
                {/* messages rendering */}
                {(() => {
                  const getDateLabel = (dateStr) => {
                    const msgDate = new Date(dateStr);
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);

                    const isSameDay = (a, b) =>
                      a.getFullYear() === b.getFullYear() &&
                      a.getMonth() === b.getMonth() &&
                      a.getDate() === b.getDate();

                    if (isSameDay(msgDate, today)) return "Today";
                    if (isSameDay(msgDate, yesterday)) return "Yesterday";

                    return msgDate.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }); // e.g. "2 May 2026"
                  };

                  const getMsgDay = (dateStr) => {
                    const d = new Date(dateStr);
                    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  };

                  let lastDay = null;

                  return messages.map((msg, i) => {
                    const isMe = String(msg.senderId) === String(user._id);
                    const msgDay = getMsgDay(msg.createdAt);
                    const showDateChip = msgDay !== lastDay;
                    lastDay = msgDay;

                    return (
                      <div key={i}>
                        {showDateChip && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              margin: "10px 0",
                            }}
                          >
                            <div className="wa-date-chip">
                              {getDateLabel(msg.createdAt)}
                            </div>
                          </div>
                        )}

                        <div
                          className={`wa-bubble-row ${isMe ? "me" : "them"}`}
                        >
                          <div className={`wa-bubble ${isMe ? "me" : "them"}`}>
                            {msg.message}
                            <div className="wa-bubble-meta">
                              <span className="wa-bubble-time">
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  },
                                )}
                              </span>
                              {isMe && (
                                <span
                                  className="wa-tick"
                                  style={{
                                    color:
                                      msg.status === "seen"
                                        ? "#53bdeb"
                                        : "#8696a0",
                                  }}
                                >
                                  {msg.status === "sent" && "✓"}
                                  {msg.status === "delivered" && "✓✓"}
                                  {msg.status === "seen" && "✓✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                {typingUser === selectedFriend._id && (
                  <div className="wa-typing-row">
                    <div className="wa-typing-bubble">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="wa-input-bar">
                <button
                  className="wa-icon-btn"
                  style={{ color: "#8696a0", fontSize: 22 }}
                >
                  😊
                </button>
                <input
                  className="wa-msg-input"
                  value={message}
                  placeholder="Message"
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (!selectedFriend) return;
                    socket.emit("typing", {
                      senderId: user._id,
                      receiverId: selectedFriend._id,
                    });
                    clearTimeout(window.typingTimeout);
                    window.typingTimeout = setTimeout(() => {
                      socket.emit("stopTyping", {
                        senderId: user._id,
                        receiverId: selectedFriend._id,
                      });
                    }, 1000);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                />
                <button
                  className="wa-send-btn"
                  onClick={sendMessage}
                  aria-label="Send"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === "bot" && (
            <div
              style={{
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* intro card */}
              <div
                style={{
                  background: "#202c33",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{ fontSize: 15, fontWeight: 700, color: "#e9edef" }}
                >
                  🤖 AI Message Assistant
                </div>
                <div
                  style={{ fontSize: 13, color: "#8696a0", lineHeight: 1.6 }}
                >
                  Summarizes all your unread messages so you know what everyone
                  is saying — without opening each chat.
                </div>
              </div>

              {/* action button */}
              <button
                onClick={summarizeUnseen}
                disabled={botLoading}
                style={{
                  padding: "13px",
                  background: botLoading ? "#2a3942" : "#00a884",
                  border: "none",
                  borderRadius: 10,
                  color: botLoading ? "#8696a0" : "#111b21",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: botLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background .2s",
                }}
              >
                {botLoading
                  ? "⏳ Summarizing..."
                  : "✨ Summarize Unread Messages"}
              </button>

              {/* error */}
              {botError && (
                <div
                  style={{
                    background: "#2d1018",
                    border: "1px solid #5a2030",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "#f15c6d",
                    fontSize: 13,
                  }}
                >
                  {botError}
                </div>
              )}

              {/* no unread */}
              {botResult?.count === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#8696a0",
                    fontSize: 14,
                    padding: "32px 0",
                  }}
                >
                  🎉 You're all caught up — no unread messages!
                </div>
              )}

              {/* summary result */}
              {botResult?.summaryText && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#00a884",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Summary · {botResult.count}{" "}
                    {botResult.count === 1 ? "person" : "people"}
                  </div>

                  {/* render each **Name**: summary line as its own card */}
                  {botResult.summaryText
                    .split("\n")
                    .filter((line) => line.trim())
                    .map((line, i) => {
                      const match = line.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
                      if (match) {
                        return (
                          <div
                            key={i}
                            style={{
                              background: "#202c33",
                              borderRadius: 10,
                              padding: "12px 14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#00a884",
                                fontSize: 13,
                              }}
                            >
                              {match[1]}
                            </div>
                            <div
                              style={{
                                color: "#e9edef",
                                fontSize: 14,
                                lineHeight: 1.5,
                              }}
                            >
                              {match[2]}
                            </div>
                          </div>
                        );
                      }
                      // fallback for lines that don't match the pattern
                      return (
                        <div key={i} style={{ color: "#8696a0", fontSize: 13 }}>
                          {line}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ── FRIENDS TAB ── */}
          {activeTab === "friends" && (
            <>
              <div style={{ padding: "10px 12px 6px" }}>
                <div
                  className="wa-search-inner"
                  style={{ background: "#2a3942", borderRadius: 8 }}
                >
                  <span className="wa-search-icon">🔍</span>
                  <input
                    className="wa-search-input"
                    placeholder="Search username…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") searchUsers();
                    }}
                  />
                  <button className="wa-search-go" onClick={searchUsers}>
                    Search
                  </button>
                </div>
              </div>

              {results.length > 0 && (
                <>
                  <div className="wa-section-label">Results</div>
                  {results.map((u) => {
                    const isFriend = friends.some((f) => f._id === u._id);
                    const isRequested = sentRequests.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        className="wa-row"
                        style={{ cursor: "default" }}
                      >
                        <Avatar name={u.username} size={49} />
                        <div className="wa-row-body">
                          <div className="wa-row-name">{u.username}</div>
                        </div>
                        {isFriend ? (
                          <span className="wa-tag wa-tag-friend">Friends</span>
                        ) : isRequested ? (
                          <span className="wa-tag wa-tag-pending">
                            Already requested
                          </span>
                        ) : (
                          <button
                            className="wa-btn-add"
                            onClick={() => sendRequest(u._id)}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div
                    style={{
                      height: 1,
                      background: "#1f2c33",
                      margin: "4px 0",
                    }}
                  />
                </>
              )}

              <div className="wa-section-label">Friends on App</div>
              {showFriends.length === 0 ? (
                <div className="wa-empty" style={{ paddingTop: 24 }}>
                  <div className="wa-empty-icon">🤝</div>
                  <div className="wa-empty-text">
                    No friends yet.
                    <br />
                    Search and add someone!
                  </div>
                </div>
              ) : (
                showFriends.map((f) => {
                  const isOnline = onlineUsers.includes(f._id);
                  return (
                    <div
                      key={f._id}
                      className="wa-row"
                      onClick={() => {
                        openChat(f);
                        setActiveTab("chats");
                      }}
                    >
                      <Avatar name={f.username} size={49} />
                      <div className="wa-row-body">
                        <div className="wa-row-name">{f.username}</div>
                        <div
                          className={`wa-row-sub ${isOnline ? "online-sub" : ""}`}
                        >
                          {isOnline ? "online" : "offline"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ── REQUESTS TAB ── */}
          {activeTab === "requests" && (
            <>
              <div className="wa-section-label">Pending Requests</div>
              {requests.length === 0 ? (
                <div className="wa-empty">
                  <div className="wa-empty-icon">📭</div>
                  <div className="wa-empty-text">No pending requests</div>
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req._id}
                    className="wa-row"
                    style={{ cursor: "default" }}
                  >
                    <Avatar name={req.username} size={49} />
                    <div className="wa-row-body">
                      <div className="wa-row-name">{req.username}</div>
                      <div className="wa-row-sub">
                        Wants to connect with you
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button
                        className="wa-btn-accept"
                        title="Accept"
                        onClick={() => acceptRequest(req._id)}
                      >
                        ✔
                      </button>
                      <button
                        className="wa-btn-reject"
                        title="Reject"
                        onClick={() => rejectRequest(req._id)}
                      >
                        ✖
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* ══════ BOTTOM NAV ══════ */}
        <nav className="wa-bottom-nav">
          <button
            className={`wa-nav-btn ${activeTab === "chats" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("chats");
              setSelectedFriend(null);
            }}
          >
            <span className="wa-nav-icon">💬</span>Chats
          </button>
          <button
            className={`wa-nav-btn ${activeTab === "friends" ? "active" : ""}`}
            onClick={() => setActiveTab("friends")}
          >
            <span className="wa-nav-icon">👥</span>Friends
          </button>
          <button
            className={`wa-nav-btn ${activeTab === "bot" ? "active" : ""}`}
            onClick={() => setActiveTab("bot")}
          >
            <span className="wa-nav-icon">🤖</span>Assistant
          </button>
        </nav>
      </div>
    </>
  );
}
