const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// get chat between 2 users
router.get("/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: user1, receiverId: user2 },
      { senderId: user2, receiverId: user1 },
    ],
  }).sort({ createdAt: 1 });

  console.log("MESSAGES:", messages); // debug
  res.json(messages);
});

module.exports = router;

// GET /api/messages/unseen/:userId  — grouped by sender
router.get("/unseen/:userId", async (req, res) => {
  try {
    const messages = await Message.find({
      receiverId: req.params.userId,
      status: { $ne: "seen" },
    }).populate("senderId", "username");

    const grouped = {};
    messages.forEach((msg) => {
      const sid = msg.senderId._id.toString();
      if (!grouped[sid]) {
        grouped[sid] = { sender: msg.senderId.username, messages: [] };
      }
      grouped[sid].messages.push(msg.message);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/messages/summarize/:userId
router.post("/summarize/:userId", async (req, res) => {
  try {
    // fetch unseen messages with sender name
    const messages = await Message.find({
      receiverId: req.params.userId,
      status: { $ne: "seen" },
    }).populate("senderId", "username");

    if (messages.length === 0) {
      return res.json({ count: 0, summary: null });
    }

    // group by sender
    const grouped = {};
    messages.forEach((msg) => {
      const sid = msg.senderId._id.toString();
      if (!grouped[sid]) {
        grouped[sid] = { sender: msg.senderId.username, messages: [] };
      }
      grouped[sid].messages.push(msg.message);
    });

    const groupedArray = Object.values(grouped);

    // build prompt
    const sections = groupedArray
      .map(
        (g) =>
          `[FROM: ${g.sender}]\n` +
          g.messages.map((m) => `- "${m}"`).join("\n"),
      )
      .join("\n\n");

    const prompt =
      `You are summarizing unread chat messages for a user.\n\n` +
      `Here are the unread messages grouped by sender:\n\n${sections}\n\n` +
      `For each sender write a brief 1-2 sentence summary of what they are saying or asking. ` +
      `Be concise and friendly.\n` +
      `Format exactly like this (one per line):\n` +
      `**Name**: summary`;

    // call Gemini from server (no CORS, key stays secret)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    const geminiData = await geminiRes.json();
    console.log("Gemini raw response:", JSON.stringify(geminiData)); // debug

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res
        .status(500)
        .json({ error: "Empty Gemini response", raw: geminiData });
    }

    res.json({ count: groupedArray.length, summary: text });
  } catch (err) {
    console.error("Summarize route error:", err);
    res.status(500).json({ error: err.message });
  }
});
