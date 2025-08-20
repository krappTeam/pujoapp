const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require("mongoose");
const manualAdmin = require("../models/ManualAdmin"); // Importing the ManualAdmin schema
const ManualPayment = require("../models/ManualPaymentSchema"); // Importing the ManualPayment schema

// 1. Admin manual user registration
router.post("/register-user", async (req, res) => {
  try {
    const {
      cooperativeSociety,
      flat,
      name,
      mobileNumber,
      password,
      familyPin,
    } = req.body;

    // Create new user with defaults
    const user = new manualAdmin({
      cooperativeSociety,
      flat,
      name,
      mobileNumber,
      password,
      familyPin,
    });

    await user.save();

    res.status(201).json({
      message: "Registration successful",
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create Manual Payment (by Admin)
router.post("/manual-payment", async (req, res) => {
  try {
    const {
      userId,
      moneyGivenTo,
      paymentType,
      familyAmount,
      saptamiCoupons,
      navamiCoupons,
      dashamiCoupons,
      amount,
      adminNote,
    } = req.body;

    const payment = new ManualPayment({
      userId,
      moneyGivenTo,
      paymentType,
      familyAmount,
      saptamiCoupons,
      navamiCoupons,
      dashamiCoupons,
      amount,
      adminNote,
    });

    await payment.save();

    res.status(201).json({
      message: "Payment recorded successfully",
      paymentId: payment._id,
      payment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// // 3. Get all users (with coupon + payment details)
// router.get("/all-users", async (req, res) => {
//   try {
//     const users = await User.find();
//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

module.exports = router;
