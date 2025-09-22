// routes/adminStats.js
const express = require("express");
const router = express.Router();
// const User = require("../models/User");
// const UserCoupon = require("../models/Coupon");
const Subscription = require("../models/Subscription");
const ManualAdmin = require("../models/ManualAdmin");

//Admin — Get total subscription, coupon, and overall amounts

// router.get("/admin-stats", async (req, res) => {
//   try {
//     // 1. Get total subscription amount
//     const subscriptionResult = await Subscription.aggregate([
//       {
//         $group: {
//           _id: null,
//           totalSubscription: { $sum: "$userSubscriptionAmount" },
//         },
//       },
//     ]);

//     const totalSubscription =
//       subscriptionResult.length > 0
//         ? subscriptionResult[0].totalSubscription
//         : 0;

//     // 2. Get total coupon amount (based on membersCount * 500)
//     const couponResult = await UserCoupon.aggregate([
//       { $unwind: "$couponDays" },
//       {
//         $group: {
//           _id: null,
//           totalCoupons: { $sum: "$couponDays.membersCount" },
//         },
//       },
//     ]);

//     const pricePerCoupon = 500;
//     const totalCoupon =
//       couponResult.length > 0
//         ? couponResult[0].totalCoupons * pricePerCoupon
//         : 0;

//     // 3. Grand total
//     const grandTotal = totalSubscription + totalCoupon;

//     res.status(200).json({
//       totalSubscription,
//       totalCoupon,
//       grandTotal,
//     });
//   } catch (err) {
//     console.error("Error fetching admin stats:", err.message);
//     res.status(500).json({ message: "Server error" });
//   }
// });

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



// // GET route to calculate coupon counts & amounts

// router.get("/coupon-amounts", async (req, res) => {
//   try {
//     const result = await UserCoupon.aggregate([
//       { $unwind: "$couponDays" }, // break array into single entries
//       {
//         $group: {
//           _id: "$couponDays.day", // group by day
//           totalCoupons: { $sum: "$couponDays.membersCount" }, // sum all counts
//         },
//       },
//     ]);

//     // Convert aggregation result into object like { Saptami: {count, amount}, ... }
//     const response = {};
//     const pricePerCoupon = 500;

//     result.forEach((entry) => {
//       response[entry._id] = {
//         count: entry.totalCoupons,
//         amount: entry.totalCoupons * pricePerCoupon,
//       };
//     });

//     res.json(response);
//   } catch (error) {
//     console.error("Error fetching coupon amounts:", error);
//     res.status(500).json({ message: "Server Error" });
//   }
// });

// // Admin - Get total family subscription data
// router.get("/total-family-subscription", async (req, res) => {
//   try {
//     // Get total families count (considering only approved subscriptions)
//     const totalFamilies = await Subscription.countDocuments({
//       userSubscriptionStatus: "APR",
//       userPaymentStatus: "APR",
//     });

//     // Hardcoded per family subscription amount
//     const perFamilySubscription = 1000;

//     // Calculate total amount as totalFamilies * perFamilySubscription
//     const totalAmount = totalFamilies * perFamilySubscription;

//     const response = {
//       totalFamilies,
//       totalAmount,
//       perFamilySubscription,
//     };

//     res.status(200).json(response);
//   } catch (err) {
//     console.error("Error fetching family subscription data:", err.message);
//     res.status(500).json({
//       message: "Server error",
//       totalFamilies: 0,
//       totalAmount: 0,
//       perFamilySubscription: 1000,
//     });
//   }
// });


router.get("/adminDashboardList", async (req, res) => {
  try {
    // Fixed subscription amount per family
    const FAMILY_SUBSCRIPTION_AMOUNT = 1000;
    const COUPON_RATE = 500;
    const DAYS_PER_COUPON = 3;

    // 1. Fetch normal approved subscriptions
    const normalSubs = await Subscription.find({ userSubscriptionStatus: "APR" });

    // 2. Fetch manual users (assuming all are approved if no status field)
    const manualUsers = await ManualAdmin.find(); // or add a status filter if available

    const normalCount = normalSubs.length;
    const manualCount = manualUsers.length;
    const totalFamilies = normalCount + manualCount;

    // 3. Total family subscription amount
    // For normal users, sum their subscription amounts
    
    const totalNormalSubscription = normalCount * FAMILY_SUBSCRIPTION_AMOUNT;

    console.log("Total Normal Subscription:", totalNormalSubscription);

    // For manual users, fixed amount per family
    const totalManualSubscription = manualCount * FAMILY_SUBSCRIPTION_AMOUNT;

    const totalFamilySubscription = totalNormalSubscription + totalManualSubscription;

    // 4. Calculate number of coupons

    // For normal users, sum coupons from each day field
    let saptamiCoupons = 0,
      nabamiCoupons = 0,
      dashamiCoupons = 0;

    normalSubs.forEach((sub) => {
      saptamiCoupons += sub.SaptamiCoupons || 0;
      nabamiCoupons += sub.NabamiCoupons || 0;
      dashamiCoupons += sub.DashamiCoupons || 0;
    });

    // For manual users, assume membersCount field (if exists), or 1 member each
    // Here assuming 1 member each for example
    let manualMembers = manualCount; // Adjust if you have actual member count field

    // Calculate coupons for manual users based on membersCount and days per coupon
    const manualTotalCoupons = Math.floor(manualMembers / DAYS_PER_COUPON);

    // Combine coupons
    const totalCoupons = saptamiCoupons + manualTotalCoupons //+ nabamiCoupons + dashamiCoupons + manualTotalCoupons;

    // Total coupon amount
    const totalCouponAmount = totalCoupons * COUPON_RATE;

    // 5. Prepare event summary combining only normal user coupon counts
    // (manual coupons combined as total only, since no day-wise data)
    const eventSummary = {
      Saptami: { coupons: saptamiCoupons, amount: saptamiCoupons * COUPON_RATE },
      Navami: { coupons: nabamiCoupons, amount: nabamiCoupons * COUPON_RATE },
      Dashami: { coupons: dashamiCoupons, amount: dashamiCoupons * COUPON_RATE },
      Manual: { coupons: manualTotalCoupons, amount: manualTotalCoupons * COUPON_RATE },
    };

    // 6. Grand total = family subscription total + coupon amount
    const grandTotal = totalFamilySubscription + totalCouponAmount;

    res.json({
      grandTotal,
      familySubscription: {
        userFamilies: normalCount,
        manualFamilies: manualCount,
        totalFamilies,
        totalAmount: totalFamilySubscription,
      },
      eventCoupons: {
        summary: eventSummary,
        totalCoupons,
        totalAmount: totalCouponAmount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});


module.exports = router;
