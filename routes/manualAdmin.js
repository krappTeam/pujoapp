const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require("mongoose");
const manualAdmin = require("../models/ManualAdmin"); // Importing the ManualAdmin schema
const ManualPayment = require("../models/ManualPaymentSchema"); // Importing the ManualPayment schema
const Subscription = require("../models/Subscription");
const ManualPaymentSchema = require("../models/ManualPaymentSchema");

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

router.get("/all-users", async (req, res) => {
  try {
    const users = await manualAdmin.find().populate("name");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/total-family-manual-subscription", async (req, res) => {
  try {
    const normalFamilies = await Subscription.countDocuments();
    const manualFamilies = await manualAdmin.countDocuments();

    const totalFamilies = normalFamilies + manualFamilies;
    const totalAmount = totalFamilies * 1000;

    res.json({
      normalFamilies,
      manualFamilies,
      totalFamilies,
      totalAmount,
      perFamilySubscription: 1000,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}); 

// Route to check family amount paid or not for Manual User//

router.get("/isFamilyAmountPaid/:userID", async (req, res) => {
  try {
    const { userID } = req.params;
    // Ensure userID is ObjectId
    const payment = await ManualPaymentSchema.findOne({
      userId: userID,
      familyAmount: 1000,
    });
    if (payment) {
      return res.status(200).json({ isPaid: true, message: "Family amount (1000) has been paid and approved." });
    }
    return res.status(200).json({ isPaid: false, message: "Family amount (1000) has not been paid yet." });
  } catch (error) {
    console.error("Error checking family amount payment status:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
