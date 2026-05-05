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
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const url = "https://chat-app-backend-h1ex.onrender.com";

  // FETCH FRIENDS
  const fetchFriends = async () => {
    const res = await axios.get(`${url}/api/friends/friends/${user._id}`);
    setFriends(res.data);
  };

  useEffect(() => {
    socket.on("onlineUsers", (users) => {
      console.log("ONLINE USERS:", users); // debug
      setOnlineUsers(users);
    });

    return () => socket.off("onlineUsers");
  }, []);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  // RECEIVE MESSAGE
  useEffect(() => {
    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("receiveMessage");
  }, []);

  // SEND MESSAGE
  const sendMessage = () => {
    if (!selectedFriend || !message) return;

    socket.emit("sendMessage", {
      senderId: user._id,
      receiverId: selectedFriend._id,
      message,
    });

    setMessage("");
  };

  const openChat = async (friend) => {
    setSelectedFriend(friend);
    setMessages([]);

    try {
      const res = await axios.get(
        `${url}/api/messages/${user._id}/${friend._id}`,
      );

      const formatted = res.data.map((msg) => ({
        senderId: String(msg.senderId),
        receiverId: String(msg.receiverId),
        message: msg.message,
        createdAt: new Date(msg.createdAt), 
      }));

      setMessages(formatted);
    } catch (err) {
      console.log(err);
    }
  };

  // LOGIN SCREEN
  if (!user) {
    return <Auth setUser={setUser} />;
  }

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
      typingUser={typingUser}
      openChat={openChat}
      onlineUsers={onlineUsers}
    />
  );
}

export default App;
