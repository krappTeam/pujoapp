const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const UserCoupon = require("../models/Coupon"); // Importing the UserCoupon schema
const router = express.Router();
dotenv.config();

//  Save coupon selection after payment

router.post("/coupon-selection/:userId", async (req, res) => {
  try {
    const { couponDays } = req.body; // expecting an array of { day, membersCount }
    const { userId } = req.params;

    if (!Array.isArray(couponDays) || couponDays.length === 0) {
      return res
        .status(400)
        .json({ message: "couponDays must be a non-empty array" });
    }

    // Ensure the user exists first
    const userExists = await User.findById(userId);
    if (!userExists) return res.status(404).json({ message: "User not found" });

    // Either update existing or create new coupon record
    let userCoupon = await UserCoupon.findOne({ userId });

    if (userCoupon) {
      userCoupon.couponDays = couponDays;
      userCoupon.couponStatus = "PENDING";
    } else {
      userCoupon = new UserCoupon({
        userId,
        name: userExists.name,
        subscriptionPaid: userExists.subscriptionPaid || false,
        couponDays,
        couponStatus: "PENDING",
      });
    }

    await userCoupon.save();

    res.status(201).json({ message: "Coupon selection saved", userCoupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/coupon-selection/:userId", async (req, res) => {
  try {
    const userCoupon = await UserCoupon.findOne(
      { userId: req.params.userId },
      "couponDays couponStatus"
    );
    if (!userCoupon) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      couponDays: userCoupon.couponDays,
      couponStatus: userCoupon.couponStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  Admin approval route

// router.put("/approve-coupon/:userId", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     user.couponStatus = "APPROVED";
//     await user.save();

//     res.status(200).json({ message: "Coupon approved", user });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });
router.put("/approve-coupon/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.userCpnActiveStatus = true; // ✅ activate coupon for user
    user.userLastUpdatedBy = "Admin"; // optional tracking
    user.userLastUpdatedDate = new Date();

    await user.save();

    res.status(200).json({ message: "Coupon approved", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;