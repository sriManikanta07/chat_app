const express = require("express");
const router = express.Router();
const User = require("../models/User");

const {
  sendRequest,
  acceptRequest,
  getFriends,
  getRequests,
  rejectRequest,
} = require("../controllers/friendController");

router.post("/send", sendRequest);
router.post("/accept", acceptRequest);
router.get("/friends/:userId", getFriends);
router.get("/requests/:userId", getRequests);
router.post("/reject", rejectRequest);
router.get("/search/:username", async (req, res) => {
  try {
    const users = await User.find({
      username: { $regex: req.params.username, $options: "i" },
    }).select("_id username");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/sent/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // find current user
    const user = await User.findById(userId).populate(
      "sentRequests",
      "_id username",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // return sent requests
    res.json(user.sentRequests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
