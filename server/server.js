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

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Server is running");
});
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.use("/api/friends", friendRoutes);

const PORT = process.env.PORT || 5000;
connectDB();
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // user joins
  socket.on("join", (userId) => {
    console.log("JOIN EVENT:", userId);
    console.log("socket:", socket.id);

    onlineUsers[userId] = socket.id;

    console.log("Online Users:", onlineUsers);

    io.emit("onlineUsers", Object.keys(onlineUsers));
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    try {
      // Save message
      const newMessage = new Message({
        senderId,
        receiverId,
        message,
      });

      const savedMessage = await newMessage.save();

      // Send to receiver
      const receiverSocket = onlineUsers[receiverId];
      if (receiverSocket) {
        await savedMessage.save();

        io.to(receiverSocket).emit("receiveMessage", savedMessage);
      }

      // ALSO send back to sender (IMPORTANT)
      socket.emit("receiveMessage", savedMessage);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers[receiverId];
    console.log("TYPING:", senderId, "->", receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", {
        senderId,
      });
    }
  });

  socket.on("requestAction", ({ receiverId }) => {
    const receiverSocket = onlineUsers[receiverId];

    if (receiverSocket) {
      io.to(receiverSocket).emit("refreshRequests");
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers[receiverId];

    if (receiverSocket) {
      io.to(receiverSocket).emit("stopTyping", {
        senderId,
      });
    }
  });

  // disconnect
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
