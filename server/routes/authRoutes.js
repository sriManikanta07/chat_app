const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { register, login } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/check-username/:username", async (req, res) => {
  try {
    const username = req.params.username;

    console.log("Checking username:", username);

    const user = await User.findOne({ username });

    if (user) {
      return res.json({ available: false });
    }

    return res.json({ available: true });
  } catch (err) {
    console.error("🔥 REAL ERROR:", err); // ✅ VERY IMPORTANT
    res.status(500).json({ message: err.message }); // send actual error
  }
});

module.exports = router;
