import { useState } from "react";
import axios from "axios";
import socket from "../socket";

export default function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleSubmit = async () => {
    try {
      const url = isLogin
        ? "http://localhost:5000/api/auth/login"
        : "http://localhost:5000/api/auth/register";

      const res = await axios.post(url, form);

      const user = res.data.user;

      setUser(user);

      socket.emit("join", user._id);
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Login" : "Register"}
        </h2>

        {!isLogin && (
          <input
            className="w-full p-3 mb-3 border rounded-lg"
            placeholder="Username"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        )}

        <input
          className="w-full p-3 mb-3 border rounded-lg"
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          className="w-full p-3 mb-4 border rounded-lg"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-500 text-white py-3 rounded-lg"
        >
          {isLogin ? "Login" : "Register"}
        </button>

        <p
          className="text-center mt-4 text-sm cursor-pointer"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Register"
            : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}
