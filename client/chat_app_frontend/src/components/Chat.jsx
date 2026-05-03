import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";

export default function Chat({
  user,
  friends = [],
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

  const searchUsers = async () => {
    if (!search) return;

    try {
      console.log(`Searching for users with username: ${search}`);
      const res = await axios.get(
        `http://localhost:5000/api/friends/search/${search}`,
      );

      setResults(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    socket.on("typing", ({ senderId }) => {
      console.log("RECEIVED TYPING FROM:", senderId);
      setTypingUser(senderId);
    });

    socket.on("stopTyping", () => {
      setTypingUser(null);
    });

    return () => {
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, []);

  const fetchSentRequests = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/friends/sent/${user._id}`,
      );

      // store only receiver IDs
      const ids = res.data.map((u) => u._id);
      setSentRequests(ids);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/friends/requests/${user._id}`,
      );

      setRequests(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSentRequests();
  }, []);

  const sendRequest = async (receiverId) => {
    try {
      await axios.post("http://localhost:5000/api/friends/send", {
        senderId: user._id,
        receiverId,
      });

      // update UI instantly
      setSentRequests((prev) => [...prev, receiverId]);
    } catch (err) {
      console.log(err);
    }
  };

  const acceptRequest = async (senderId) => {
    await axios.post("http://localhost:5000/api/friends/accept", {
      userId: user._id,
      senderId,
    });

    socket.emit("requestAction", {
      receiverId: senderId,
    });

    // remove instantly from UI
    setRequests((prev) => prev.filter((r) => r._id !== senderId));

    // refresh friends
    window.location.reload(); // simple for now
  };

  const rejectRequest = async (senderId) => {
    await axios.post("http://localhost:5000/api/friends/reject", {
      userId: user._id,
      senderId,
    });

    socket.emit("requestAction", {
      receiverId: senderId,
    });

    setRequests((prev) => prev.filter((r) => r._id !== senderId));
  };

  useEffect(() => {
    socket.on("refreshRequests", fetchRequests);

    return () => socket.off("refreshRequests");
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* HEADER */}
      {/* <div className="bg-blue-500 text-white p-4 text-center font-semibold">
        {activeTab === "chats" &&
          (selectedFriend ? selectedFriend.username : "Chats")}
        {activeTab === "friends" && "Friends"}
        {activeTab === "requests" && "Requests"}
      </div> */}
      <div className="bg-blue-500 text-white p-4 flex items-center gap-3">
        {/* BACK BUTTON */}
        {selectedFriend && (
          <button
            onClick={() => {
              setSelectedFriend(null);
              setActiveTab("chats");
            }}
            className="text-xl font-bold"
          >
            ←
          </button>
        )}

        <div>
          <div className="font-semibold">
            {selectedFriend ? selectedFriend.username : "Chats"}
          </div>

          {selectedFriend && (
            <div className="text-xs text-green-200">
              {onlineUsers.includes(selectedFriend._id) ? "Online" : "Offline"}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {/* CHATS TAB */}
        {activeTab === "chats" && !selectedFriend && (
          <div>
            {friends.length === 0 ? (
              <p className="text-center mt-10 text-gray-500">No friends yet</p>
            ) : (
              friends.map((f) => (
                <div
                  key={f._id}
                  onClick={() => {
                    openChat(f);
                    setActiveTab("chats"); // 🔥 IMPORTANT
                  }}
                  className="p-4 border-b cursor-pointer hover:bg-gray-200"
                >
                  {f.username}
                </div>
              ))
            )}
          </div>
        )}

        {/* CHAT WINDOW */}
        {activeTab === "chats" && selectedFriend && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-3 overflow-y-auto">
              {messages.map((msg, i) => {
                const isMe = String(msg.senderId) === String(user._id);

                return (
                  <div
                    key={i}
                    className={`mb-2 flex ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg max-w-xs ${
                        isMe ? "bg-blue-500 text-white" : "bg-white"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* typing */}
            {/* {String(typingUser) === String(selectedFriend?._id) && (
              <p>typing...</p>
            )} */}
            {typingUser === selectedFriend._id && (
              <div className="px-3 py-1 mx-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
                </div>
              </div>
            )}
            {/* input */}
            <div className="p-3 flex gap-2">
              {/* <input
                className="flex-1 p-2 border rounded-lg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type message"
              /> */}
              <input
                className="flex-1 p-2 border rounded-lg"
                value={message}
                placeholder="Type message"
                onChange={(e) => {
                  const text = e.target.value;
                  setMessage(text);

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
                  }, 1000); // ✅ 1.5 sec
                }}
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 text-white px-4 rounded-lg"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* FRIENDS TAB */}
        {activeTab === "friends" && (
          <div className="p-4">
            {/* SEARCH BOX */}
            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 p-2 border rounded-lg"
                placeholder="Search username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={searchUsers}
                className="bg-blue-500 text-white px-3 rounded-lg"
              >
                Search
              </button>
            </div>

            {/*SEARCH RESULTS */}
            {/* {results.map((u) => (
              <div
                key={u._id}
                className="p-3 border-b flex justify-between items-center"
              >
                <span>{u.username}</span>
                <button
                  onClick={() => sendRequest(u._id)}
                  className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                >
                  Add
                </button>
              </div>
            ))} */}
            {results.map((u) => {
              const isFriend = friends.some((f) => f._id === u._id);
              const isRequested = sentRequests.includes(u._id);

              return (
                <div
                  key={u._id}
                  className="p-3 border-b flex justify-between items-center"
                >
                  <span>{u.username}</span>

                  {isFriend ? (
                    <button className="bg-gray-400 text-white px-3 py-1 rounded-lg text-sm cursor-not-allowed">
                      Friend
                    </button>
                  ) : isRequested ? (
                    <button className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm cursor-not-allowed">
                      Requested
                    </button>
                  ) : (
                    <button
                      onClick={() => sendRequest(u._id)}
                      className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}

            {/* FRIEND LIST */}
            <h3 className="mt-4 mb-2 text-gray-500">Your Friends</h3>

            {friends.length === 0 ? (
              <p className="text-gray-400">No friends yet</p>
            ) : (
              friends.map((f) => {
                const isOnline = onlineUsers.includes(f._id);

                return (
                  <div
                    key={f._id}
                    onClick={() => {
                      openChat(f);
                      setActiveTab("chats");
                    }}
                    className="p-3 border-b flex justify-between items-center cursor-pointer hover:bg-gray-200"
                  >
                    <span>{f.username}</span>
                    <span className="text-sm text-gray-400">
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === "requests" && (
          <div className="p-4">
            {requests.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">No requests</p>
            ) : (
              requests.map((req) => (
                <div
                  key={req._id}
                  className="p-3 border-b flex justify-between items-center"
                >
                  <span>{req.username}</span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(req._id)}
                      className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Accept
                    </button>

                    <button
                      onClick={() => rejectRequest(req._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="flex justify-around bg-white border-t p-2">
        <button onClick={() => setActiveTab("chats")}>Chats</button>
        <button onClick={() => setActiveTab("friends")}>Friends</button>
        <button onClick={() => setActiveTab("requests")}>Requests</button>
      </div>
    </div>
  );
}
