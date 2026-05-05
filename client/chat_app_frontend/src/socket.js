import { io } from "socket.io-client";

const socket = io("https://chat-app-backend-h1ex.onrender.com");

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

export default socket;
