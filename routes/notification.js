const express = require("express");
const sendNotification = require("../utils/sendNotification");
const router = express.Router();

router.post("/send", async (req, res) => {
  const { fcmToken, title, body, data } = req.body;

  if (!fcmToken || !title || !body) {
    return res.status(400).json({ error: "fcmToken, title, and body are required" });
  }

  try {
    await sendNotification(fcmToken, title, body, data);
    res.json({ success: true, message: "Notification sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send notification" });
  }
});

module.exports = router;
