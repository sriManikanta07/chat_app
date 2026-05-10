const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const Message = require("./models/Message");
const messageRoutes = require("./routes/messageRoutes");
const friendRoutes = require("./routes/friendRoutes");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Server is running"));
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);

const PORT = process.env.PORT || 5000;
connectDB();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* ── JOIN ── */
  socket.on("join", async (userId) => {
    onlineUsers[String(userId)] = socket.id;
    io.emit("onlineUsers", Object.keys(onlineUsers));

    // find all messages sent TO this user that are still "sent"
    try {
      const pending = await Message.find({
        receiverId: userId,
        status: "sent",
      });

      if (pending.length > 0) {
        await Message.updateMany(
          { receiverId: userId, status: "sent" },
          { $set: { status: "delivered" } },
        );

        // group by senderId so we notify each sender once
        const grouped = {};
        pending.forEach((m) => {
          const sid = m.senderId.toString();
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push(m._id.toString());
        });

        Object.entries(grouped).forEach(([sid, messageIds]) => {
          const senderSocket = onlineUsers[sid];
          if (senderSocket) {
            io.to(senderSocket).emit("messagesDelivered", { messageIds });
          }
        });
      }
    } catch (err) {
      console.log("join delivery error:", err);
    }
  });

  /* ── SEND MESSAGE ── */
  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    try {
      const saved = await new Message({
        senderId,
        receiverId,
        message,
        status: "sent",
      }).save();

      const receiverSocketId = onlineUsers[String(receiverId)];
      let status = "sent";

      if (receiverSocketId) {
        status = "delivered";
        await Message.findByIdAndUpdate(saved._id, { status: "delivered" });
      }

      const payload = {
        _id: saved._id.toString(),
        senderId: saved.senderId.toString(),
        receiverId: saved.receiverId.toString(),
        message: saved.message,
        status,
        createdAt: saved.createdAt,
      };

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", payload);
      }
      socket.emit("receiveMessage", payload);
    } catch (err) {
      console.log("sendMessage error:", err);
    }
  });

  /* ── DELIVERED ACK (receiver confirms) ── */
  socket.on("messageDelivered", async ({ messageId, senderId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { status: "delivered" });
      const senderSocket = onlineUsers[String(senderId)];
      if (senderSocket) {
        io.to(senderSocket).emit("messageDelivered", { messageId });
      }
    } catch (err) {
      console.log("messageDelivered error:", err);
    }
  });

  /* ── MARK AS SEEN ── */
  socket.on("markAsSeen", async ({ senderId, receiverId }) => {
    try {
      await Message.updateMany(
        { senderId, receiverId, status: { $ne: "seen" } },
        { $set: { status: "seen" } },
      );
      const senderSocket = onlineUsers[String(senderId)];
      if (senderSocket) {
        io.to(senderSocket).emit("messagesSeen", { receiverId });
      }
    } catch (err) {
      console.log("markAsSeen error:", err);
    }
  });

  /* ── TYPING ── */
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers[String(receiverId)];
    if (receiverSocket) io.to(receiverSocket).emit("typing", { senderId });
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers[String(receiverId)];
    if (receiverSocket) io.to(receiverSocket).emit("stopTyping", { senderId });
  });

  /* ── FRIEND REQUESTS ── */
  socket.on("requestAction", ({ receiverId }) => {
    const receiverSocket = onlineUsers[String(receiverId)];
    if (receiverSocket) io.to(receiverSocket).emit("refreshRequests");
  });

  /* ── DISCONNECT ── */
  socket.on("disconnect", () => {
    for (let userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
      }
    }
    io.emit("onlineUsers", Object.keys(onlineUsers));
    console.log("User disconnected");
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
