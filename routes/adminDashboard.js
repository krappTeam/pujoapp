// routes/adminStats.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserCoupon = require("../models/Coupon");
const Subscription = require("../models/Subscription");

//Admin — Get total subscription, coupon, and overall amounts

router.get("/admin-stats", async (req, res) => {
  try {
    // 1. Get total subscription amount
    const subscriptionResult = await Subscription.aggregate([
      {
        $group: {
          _id: null,
          totalSubscription: { $sum: "$userSubscriptionAmount" },
        },
      },
    ]);

    const totalSubscription =
      subscriptionResult.length > 0
        ? subscriptionResult[0].totalSubscription
        : 0;

    // 2. Get total coupon amount (based on membersCount * 500)
    const couponResult = await UserCoupon.aggregate([
      { $unwind: "$couponDays" },
      {
        $group: {
          _id: null,
          totalCoupons: { $sum: "$couponDays.membersCount" },
        },
      },
    ]);

    const pricePerCoupon = 500;
    const totalCoupon =
      couponResult.length > 0
        ? couponResult[0].totalCoupons * pricePerCoupon
        : 0;

    // 3. Grand total
    const grandTotal = totalSubscription + totalCoupon;

    res.status(200).json({
      totalSubscription,
      totalCoupon,
      grandTotal,
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin - Get coupon counts by day

// router.get("/coupon-counts", async (req, res) => {
//   try {
//     const result = await UserCoupon.aggregate([
//       { $unwind: "$couponDays" }, // break array into individual docs
//       {
//         $group: {
//           _id: "$couponDays.day", // group by day
//           totalCoupons: { $sum: "$couponDays.membersCount" } // sum membersCount
//         }
//       }
//     ]);

//     // Format into object like { Saptami: X, Nabami: Y, Dashami: Z }
//     const counts = result.reduce((acc, curr) => {
//       acc[curr._id] = curr.totalCoupons;
//       return acc;
//     }, {});

//     res.json(counts);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// });
// GET route to calculate coupon counts & amounts

router.get("/coupon-amounts", async (req, res) => {
  try {
    const result = await UserCoupon.aggregate([
      { $unwind: "$couponDays" }, // break array into single entries
      {
        $group: {
          _id: "$couponDays.day", // group by day
          totalCoupons: { $sum: "$couponDays.membersCount" }, // sum all counts
        },
      },
    ]);

    // Convert aggregation result into object like { Saptami: {count, amount}, ... }
    const response = {};
    const pricePerCoupon = 500;

    result.forEach((entry) => {
      response[entry._id] = {
        count: entry.totalCoupons,
        amount: entry.totalCoupons * pricePerCoupon,
      };
    });

    res.json(response);
  } catch (error) {
    console.error("Error fetching coupon amounts:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin - Get total family subscription data
router.get("/total-family-subscription", async (req, res) => {
  try {
    // Get total families count (considering only approved subscriptions)
    const totalFamilies = await Subscription.countDocuments({
      userSubscriptionStatus: "APR",
    });

    // Hardcoded per family subscription amount
    const perFamilySubscription = 1000;

    // Calculate total amount as totalFamilies * perFamilySubscription
    const totalAmount = totalFamilies * perFamilySubscription;

    const response = {
      totalFamilies,
      totalAmount,
      perFamilySubscription,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching family subscription data:", err.message);
    res.status(500).json({
      message: "Server error",
      totalFamilies: 0,
      totalAmount: 0,
      perFamilySubscription: 1000,
    });
  }
});

module.exports = router;
