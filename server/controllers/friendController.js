const User = require("../models/User");

// SEND REQUEST
exports.sendRequest = async (req, res) => {
  const { senderId, receiverId } = req.body;

  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return res.status(404).json({ message: "User not found" });
  }

  if (receiver.friends.includes(senderId)) {
    return res.json({ message: "Already friends" });
  }

  // prevent duplicate requests
  if (receiver.friendRequests.includes(senderId)) {
    return res.json({ message: "Request already sent" });
  }

  receiver.friendRequests.push(senderId);
  sender.sentRequests.push(receiverId);
  await receiver.save();
  await sender.save();

  res.json({ message: "Friend request sent" });
};

// ACCEPT REQUEST
exports.acceptRequest = async (req, res) => {
  const { userId, senderId } = req.body;

  try {
    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    // add both as friends

    user.friends.push(senderId);
    sender.friends.push(userId);

    // remove request
    user.friendRequests = user.friendRequests.filter(
      (id) => id.toString() !== senderId,
    );
    sender.sentRequests = sender.sentRequests.filter(
      (id) => id.toString() !== userId,
    );

    await user.save();
    await sender.save();

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};

// GET FRIENDS
exports.getFriends = async (req, res) => {
  const user = await User.findById(req.params.userId).populate(
    "friends",
    "username email",
  );

  res.json(user.friends);
};

// GET REQUESTS
exports.getRequests = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "friendRequests",
      "username email",
    );

    res.json(user.friendRequests);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};

// REJECT REQUEST
exports.rejectRequest = async (req, res) => {
  const { userId, senderId } = req.body;

  try {
    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // remove request
    user.friendRequests = user.friendRequests.filter(
      (id) => id.toString() !== senderId,
    );

    sender.sentRequests = sender.sentRequests.filter(
      (id) => id.toString() !== userId,
    );

    await user.save();

    res.json({ message: "Friend request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};
