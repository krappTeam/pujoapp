const express = require("express");
const multer = require("multer");
const User = require("../models/User");
const Payment = require("../models/Payment");
// const mongoose = require("mongoose");

const router = express.Router();
const upload = multer();

router.post("/upload-payment/:userId", upload.single("userPaymentImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const base64String = req.file.buffer.toString("base64");

    const user = await User.findById(
      req.params.userId,
      
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Payment.bulkSave([
      new Payment({
        userID: user._id,
        cooperativeSociety: user.cooperativeSociety,
        flatNumber: user.flatNumber,
        userPaymentDate: new Date(),
        userPaymentAmount: 0, // Default amount, can be updated later
        userPaymentMode: "UPI",
        userPaymentMethod: "OFFLINE",
        userPaymentRefID: "N/A",
        userPaymentImage: base64String, // Store the Base64 string
        userPaymentSubscriptionDesc: "Payment image uploaded",
        userLastUpdatedBy: "System",
      }),
    ]);
    Payment.userPaymentImage = base64String; // Store the Base64 string in payment model as well
    await user.save();

    res.json({ message: "User payment image uploaded successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/getUserImage/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('userPaymentImage');
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ userPaymentImage: user.userPaymentImage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
