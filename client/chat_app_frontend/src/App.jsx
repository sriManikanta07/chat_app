import { useEffect, useState, useRef } from "react";
import socket from "./socket";
import axios from "axios";
import Auth from "./components/Auth";
import Chat from "./components/Chat";

function App() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [message, setMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const selectedFriendRef = useRef(null);
  const userRef = useRef(null);

  const url = "http://localhost:5000";

  /* ── keep refs current ── */
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  /* ── join + rejoin on reconnect ── */
  useEffect(() => {
    if (!user) return;
    socket.emit("join", user._id);
    const rejoin = () => socket.emit("join", user._id);
    socket.on("connect", rejoin);
    return () => socket.off("connect", rejoin);
  }, [user]);

  /* ── online users ── */
  useEffect(() => {
    socket.on("onlineUsers", (users) => setOnlineUsers(users));
    return () => socket.off("onlineUsers");
  }, []);

  /* ── receive message ── */
  useEffect(() => {
    socket.on("receiveMessage", (data) => {
      const sf = selectedFriendRef.current;
      const me = userRef.current;

      // receiver acknowledges delivery
      if (me && String(data.receiverId) === String(me._id)) {
        socket.emit("messageDelivered", {
          messageId: String(data._id),
          senderId: String(data.senderId),
        });
      }

      if (!sf || !me) return;

      const isRelevant =
        (String(data.senderId) === String(sf._id) &&
          String(data.receiverId) === String(me._id)) ||
        (String(data.senderId) === String(me._id) &&
          String(data.receiverId) === String(sf._id));

      if (isRelevant) setMessages((prev) => [...prev, data]);
    });
    return () => socket.off("receiveMessage");
  }, []);

  // batch delivered — fires when receiver comes online
  useEffect(() => {
    socket.on("messagesDelivered", ({ messageIds }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(String(msg._id)) && msg.status === "sent"
            ? { ...msg, status: "delivered" }
            : msg,
        ),
      );
    });
    return () => socket.off("messagesDelivered");
  }, []);

  /* ── seen ── */
  useEffect(() => {
    socket.on("messagesSeen", ({ receiverId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.receiverId) === String(receiverId)
            ? { ...msg, status: "seen" }
            : msg,
        ),
      );
    });
    return () => socket.off("messagesSeen");
  }, []);

  /* ── fetch friends ── */
  useEffect(() => {
    if (user) {
      axios
        .get(`${url}/api/friends/friends/${user._id}`)
        .then((res) => setFriends(res.data));
    }
  }, [user]);

  /* ── send message ── */
  const sendMessage = () => {
    if (!selectedFriend || !message) return;
    socket.emit("sendMessage", {
      senderId: user._id,
      receiverId: selectedFriend._id,
      message,
    });
    setMessage("");
  };

  /* ── open chat ── */
  const openChat = async (friend) => {
    setSelectedFriend(friend);
    selectedFriendRef.current = friend;
    setMessages([]);

    socket.emit("markAsSeen", {
      senderId: friend._id,
      receiverId: user._id,
    });

    try {
      const res = await axios.get(
        `${url}/api/messages/${user._id}/${friend._id}`,
      );
      setMessages(
        res.data.map((msg) => ({
          _id: String(msg._id),
          senderId: String(msg.senderId),
          receiverId: String(msg.receiverId),
          message: msg.message,
          status: msg.status,
          createdAt: new Date(msg.createdAt),
        })),
      );
    } catch (err) {
      console.log(err);
    }
  };

  if (!user) return <Auth setUser={setUser} />;

  return (
    <Chat
      user={user}
      friends={friends}
      messages={messages}
      selectedFriend={selectedFriend}
      setSelectedFriend={setSelectedFriend}
      sendMessage={sendMessage}
      message={message}
      setMessage={setMessage}
      openChat={openChat}
      onlineUsers={onlineUsers}
    />
  );
}

export default App;
