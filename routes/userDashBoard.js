const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Subscription = require("../models/Subscription");
const ManualAdmin = require("../models/ManualAdmin");
const ManualPayment = require("../models/ManualPaymentSchema");
const Coupon = require("../models/Coupon");
const Payment = require("../models/Payment");

const PRICE_PER_COUPON = 500;

// GET User Dashboard by phone number (works for both System User and Manual User)
router.get("/user-dashboard/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // 1) SYSTEM USER (registered in User + Subscription)
    const user = await User.findOne({ phoneNumber }).lean();
    if (user) {
      const subscription = await Subscription.findOne({ userID: user._id }).lean();

      // coupon details from Subscription
      const saptami = subscription?.SaptamiCoupons || 0;
      const nabami  = subscription?.NabamiCoupons  || 0;
      const dashami = subscription?.DashamiCoupons || 0;

      const couponDetails = {
        Saptami: { count: saptami, amount: saptami * PRICE_PER_COUPON },
        Nabami:  { count: nabami,  amount: nabami  * PRICE_PER_COUPON },
        Dashami: { count: dashami, amount: dashami * PRICE_PER_COUPON },
        grandTotalAmount: (saptami + nabami + dashami) * PRICE_PER_COUPON
      };

      return res.status(200).json({
        userType: "SYSTEM_USER",
        subscriptionDetails: subscription || null,
        subscriptionStatus: subscription?.userSubscriptionStatus || user.userSubscriptionStatus || "PEN",
        couponDetails
      });
    }

    // 2) MANUAL USER (stored in ManualUser + payments in ManualPayment)
    const manualUser = await ManualAdmin.findOne({ mobileNumber: phoneNumber }).lean();
    if (manualUser) {
      // you may have multiple payments; sum them
      const payments = await ManualPayment.find({ userId: manualUser._id }).lean();

      if (!payments.length) {
        return res.status(200).json({
          userType: "MANUAL_USER",
          subscriptionDetails: {
            cooperativeSociety: manualUser.cooperativeSociety,
            flat: manualUser.flat,
            name: manualUser.name,
            totalPaid: 0,
            familyAmountPaid: 0
          },
          subscriptionStatus: "PEN",
          couponDetails: {
            Saptami: { count: 0, amount: 0 },
            Nabami:  { count: 0, amount: 0 },
            Dashami: { count: 0, amount: 0 },
            grandTotalAmount: 0
          },
          message: "No manual payments found for this user"
        });
      }

      // sum all manual payments
      const totals = payments.reduce(
        (acc, p) => {
          acc.familyAmountPaid += p.familyAmount || 0;
          acc.totalPaid += p.amount || 0;
          acc.saptami += p.saptamiCoupons || 0;
          acc.nabami  += p.navamiCoupons  || 0;
          acc.dashami += p.dashamiCoupons || 0;
          return acc;
        },
        { familyAmountPaid: 0, totalPaid: 0, saptami: 0, nabami: 0, dashami: 0 }
      );

      const couponDetails = {
        Saptami: { count: totals.saptami, amount: totals.saptami * PRICE_PER_COUPON },
        Nabami:  { count: totals.nabami,  amount: totals.nabami  * PRICE_PER_COUPON },
        Dashami: { count: totals.dashami, amount: totals.dashami * PRICE_PER_COUPON },
        grandTotalAmount: (totals.saptami + totals.nabami + totals.dashami) * PRICE_PER_COUPON
      };

      return res.status(200).json({
        userType: "MANUAL_USER",
        subscriptionDetails: {
          cooperativeSociety: manualUser.cooperativeSociety,
          flat: manualUser.flat,
          name: manualUser.name,
          totalPaid: totals.totalPaid,
          familyAmountPaid: totals.familyAmountPaid
        },
        // consider a manual subscription "approved" if any payment exists
        subscriptionStatus: "APR",
        couponDetails
      });
    }

    // 3) Not found anywhere
    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Error fetching user dashboard:", err);
    res.status(500).json({ message: "Server error" });
  }
});


//-----------GET USER DASHBOARD TICKET-----------------//
// router.get("/userDashboardTicket/:userID", async (req, res) => {
//   try {
//     const { userID } = req.params;

//     // 1. User info
//     const user = await User.findById(userID);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // 2. Subscriptions (status wise)
//     const subscriptions = await Subscription.find({ userID });

//     // Group by status
//     const subscriptionStats = {
//       pending: subscriptions.filter((s) => s.status === "pending"),
//       approved: subscriptions.filter((s) => s.status === "approved"),
//       rejected: subscriptions.filter((s) => s.status === "rejected"),
//     };

//     const subscriptionSummary = {
//       total: subscriptions.length,
//       pendingCount: subscriptionStats.pending.length,
//       approvedCount: subscriptionStats.approved.length,
//       rejectedCount: subscriptionStats.rejected.length,
//       totalApprovedAmount: subscriptionStats.approved.reduce(
//         (sum, s) => sum + s.subscriptionAmount,
//         0
//       ),
//     };

//     // 3. Coupons (by day)
//     const coupons = await Coupon.find({ userID });
//     const totalCoupons = coupons.reduce((sum, c) => sum + c.couponCount, 0);
//     const totalCouponAmount = coupons.reduce(
//       (sum, c) => sum + c.couponAmount * c.couponCount,
//       0
//     );

//     const couponByDay = {};
//     ["Saptami", "Nabami", "Dashami"].forEach((day) => {
//       const dayCoupons = coupons.filter((c) => c.couponDay === day);
//       couponByDay[day] = {
//         totalCoupons: dayCoupons.reduce((sum, c) => sum + c.couponCount, 0),
//         totalAmount: dayCoupons.reduce(
//           (sum, c) => sum + c.couponAmount * c.couponCount,
//           0
//         ),
//         details: dayCoupons,
//       };
//     });

//     // 4. Response 
//     res.json({
//       message: "User Dashboard",
//       user: {
//         name: user.name,
//         flatNumber: user.flatNumber,
//         cooperativeSociety: user.cooperativeSociety,
//         phoneNumber: user.phoneNumber,
//       },
//       subscriptions: {
//         summary: subscriptionSummary,
//         details: subscriptions,
//       },
//       coupons: {
//         totalCoupons,
//         totalCouponAmount,
//         byDay: couponByDay,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching dashboard:", error);
//     res.status(500).json({ message: "Server error", error });
//   }
// });

//----------------------------------------------------------------------------------------------------------//
//-----------GET USER DASHBOARD TICKET (both normal and manual users)-----------------//
// ==========================
// User Dashboard Payments+Coupons
// ==========================
router.get("/userDashboardPayments/:userID", async (req, res) => {
  try {
    const { userID } = req.params;
    let user = await User.findById(userID);
    let userType = "normal";
    if (!user) {
      user = await ManualUser.findById(userID);
      userType = "manual";
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const couponPrice = 500;
    let payments = [];
    let subscriptions = [];
    let familyAmount = 0;
    let paid = false;
    let totalCoupons = 0;
    const couponByDay = {
      Saptami: { totalCoupons: 0, totalAmount: 0, details: [] },
      Nabami: { totalCoupons: 0, totalAmount: 0, details: [] },
      Dashami: { totalCoupons: 0, totalAmount: 0, details: [] },
    };
    let approvedFamilyPayments = [];

    if (userType === "normal") {
      payments = await Payment.find({ userID });
      // Only use APPROVED payments (NOT subscriptions) for reviewing family amount
      approvedFamilyPayments = payments.filter(
        (p) => p.userPaymentStatus === "APR"
      );

      // Sum up the approved family amounts from payments
      familyAmount = approvedFamilyPayments.reduce(
        (sum, p) => sum + Number(p.userFamilyAmount || 0),
        0
      );

      paid = approvedFamilyPayments.length > 0;

      // If you use Subscription for coupons, keep this logic
      subscriptions = await Subscription.find({ userID });
      subscriptions.forEach((sub) => {
        const couponCount = sub.SaptamiCoupons || 0;
        totalCoupons += couponCount;
        ["Saptami", "Nabami", "Dashami"].forEach((day) => {
          couponByDay[day].totalCoupons += couponCount;
          couponByDay[day].totalAmount =
            couponByDay[day].totalCoupons * couponPrice;
          if (couponCount > 0) {
            couponByDay[day].details.push({
              subscriptionId: sub._id,
              count: couponCount,
              amount: couponCount * couponPrice,
            });
          }
        });
      });
    }

    if (userType === "manual") {
      payments = await ManualPayment.find({ userId: userID });
      // Only use APPROVED ManualPayments for family amount
      const approvedManualPayments = payments.filter(
        (p) => p.paymentStatus === "APR"
      );

      familyAmount = approvedManualPayments.reduce(
        (sum, p) => sum + Number(p.familyAmount || 0),
        0
      );

      paid = approvedManualPayments.length > 0;

      payments.forEach((p) => {
        const couponCount = p.saptamiCoupons || 0;
        totalCoupons += couponCount;
        ["Saptami", "Nabami", "Dashami"].forEach((day) => {
          couponByDay[day].totalCoupons += couponCount;
          const amount = couponCount * couponPrice;
          couponByDay[day].totalAmount += amount;
          if (couponCount > 0) {
            couponByDay[day].details.push({
              paymentId: p._id,
              count: couponCount,
              amount,
            });
          }
        });
      });
    }

    const totalCouponAmount = totalCoupons * couponPrice;
    const grandTotal = familyAmount + totalCouponAmount;

    res.json({
      message: "User Dashboard Payments",
      userType,
      user: {
        name: user.name,
        flatNumber: user.flatNumber || user.flat,
        cooperativeSociety: user.cooperativeSociety,
        phoneNumber: user.phoneNumber || user.mobileNumber,
      },
      payments,
      family: {
        paid,
        familyAmount, // Correctly calculated!
        subscriptionStatus:
          userType === "normal"
            ? approvedFamilyPayments.map((p) => p.userPaymentStatus)
            : null,
      },
      coupons: {
        totalCoupons,
        byDay: couponByDay,
        totalCouponAmount,
      },
      totals: {
        familyAmount,
        couponAmount: totalCouponAmount,
        grandTotal,
      },
    });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({ message: "Server error", error });
  }
});
module.exports = router;


//Sir please come to the meet