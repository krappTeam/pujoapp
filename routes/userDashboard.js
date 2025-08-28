const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Subscription = require("../models/Subscription");
const ManualAdmin = require("../models/ManualAdmin");
const ManualPayment = require("../models/ManualPaymentSchema");

const PRICE_PER_COUPON = 500;

// GET User Dashboard by phone number (works for both System User and Manual User)
router.get("/user-dashboard/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // 1) SYSTEM USER (registered in User + Subscription)
    const user = await User.findOne({ phoneNumber }).lean();
    if (user) {
      const subscription = await Subscription.findOne({
        userID: user._id,
      }).lean();

      // coupon details from Subscription
      const saptami = subscription?.SaptamiCoupons || 0;
      const nabami = subscription?.NabamiCoupons || 0;
      const dashami = subscription?.DashamiCoupons || 0;

      const couponDetails = {
        Saptami: { count: saptami, amount: saptami * PRICE_PER_COUPON },
        Nabami: { count: nabami, amount: nabami * PRICE_PER_COUPON },
        Dashami: { count: dashami, amount: dashami * PRICE_PER_COUPON },
        grandTotalAmount: (saptami + nabami + dashami) * PRICE_PER_COUPON,
      };

      return res.status(200).json({
        userType: "SYSTEM_USER",
        subscriptionDetails: subscription || null,
        subscriptionStatus:
          subscription?.userSubscriptionStatus ||
          user.userSubscriptionStatus ||
          "PEN",
        couponDetails,
      });
    }

    // 2) MANUAL USER (stored in ManualUser + payments in ManualPayment)
    const manualUser = await ManualAdmin.findOne({
      mobileNumber: phoneNumber,
    }).lean();
    if (manualUser) {
      // you may have multiple payments; sum them
      const payments = await ManualPayment.find({
        userId: manualUser._id,
      }).lean();

      if (!payments.length) {
        return res.status(200).json({
          userType: "MANUAL_USER",
          subscriptionDetails: {
            cooperativeSociety: manualUser.cooperativeSociety,
            flat: manualUser.flat,
            name: manualUser.name,
            totalPaid: 0,
            familyAmountPaid: 0,
          },
          subscriptionStatus: "PEN",
          couponDetails: {
            Saptami: { count: 0, amount: 0 },
            Nabami: { count: 0, amount: 0 },
            Dashami: { count: 0, amount: 0 },
            grandTotalAmount: 0,
          },
          message: "No manual payments found for this user",
        });
      }

      // sum all manual payments
      const totals = payments.reduce(
        (acc, p) => {
          acc.familyAmountPaid += p.familyAmount || 0;
          acc.totalPaid += p.amount || 0;
          acc.saptami += p.saptamiCoupons || 0;
          acc.nabami += p.navamiCoupons || 0;
          acc.dashami += p.dashamiCoupons || 0;
          return acc;
        },
        { familyAmountPaid: 0, totalPaid: 0, saptami: 0, nabami: 0, dashami: 0 }
      );

      const couponDetails = {
        Saptami: {
          count: totals.saptami,
          amount: totals.saptami * PRICE_PER_COUPON,
        },
        Nabami: {
          count: totals.nabami,
          amount: totals.nabami * PRICE_PER_COUPON,
        },
        Dashami: {
          count: totals.dashami,
          amount: totals.dashami * PRICE_PER_COUPON,
        },
        grandTotalAmount:
          (totals.saptami + totals.nabami + totals.dashami) * PRICE_PER_COUPON,
      };

      return res.status(200).json({
        userType: "MANUAL_USER",
        subscriptionDetails: {
          cooperativeSociety: manualUser.cooperativeSociety,
          flat: manualUser.flat,
          name: manualUser.name,
          totalPaid: totals.totalPaid,
          familyAmountPaid: totals.familyAmountPaid,
        },
        // consider a manual subscription "approved" if any payment exists
        subscriptionStatus: "APR",
        couponDetails,
      });
    }

    // 3) Not found anywhere
    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Error fetching user dashboard:", err);
    res.status(500).json({ message: "Server error" });
  }
});

//------------------------USER DASHBOARD TICKET-----------------//WITH MANUAL USER

router.get("/userDashboardTicket/:userID", async (req, res) => {
  try {
    const { userID } = req.params;

    // 1. Try to find user in NormalUser
    let user = await User.findById(userID);
    let userType = "normal";

    // 2. If not found, try ManualUser
    if (!user) {
      user = await ManualUser.findById(userID);
      userType = "manual";
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Subscriptions
    let subscriptions = await Subscription.find({ userID });

    if (userType === "manual") {
      subscriptions = subscriptions.map((s) => ({
        ...s.toObject(),
        userSubscriptionStatus: "APP", // force approved
      }));
    }

    // Normalize statuses
    const mapStatus = { PEN: "PEN", APP: "APR", REJ: "REJ" };

    const subscriptionStats = {
      pending: subscriptions.filter(
        (s) => mapStatus[s.userSubscriptionStatus] === "PEN"
      ),
      approved: subscriptions.filter(
        (s) => mapStatus[s.userSubscriptionStatus] === "APR"
      ),
      rejected: subscriptions.filter(
        (s) => mapStatus[s.userSubscriptionStatus] === "REJ"
      ),
    };

    const subscriptionSummary = {
      total: subscriptions.length,
      pendingCount: subscriptionStats.pending.length,
      approvedCount: subscriptionStats.approved.length,
      rejectedCount: subscriptionStats.rejected.length,
      totalApprovedAmount: subscriptionStats.approved.reduce(
        (sum, s) => sum + (s.userSubscriptionAmount || 0),
        0
      ),
    };

    // 4. Coupons - Calculate for each day separately
    const couponPrice = 500;

    const couponByDay = {
      Saptami: { totalCoupons: 0, totalAmount: 0, details: [] },
      Nabami: { totalCoupons: 0, totalAmount: 0, details: [] },
      Dashami: { totalCoupons: 0, totalAmount: 0, details: [] },
    };

    // Calculate coupons for each day
    subscriptions.forEach((sub) => {
      ["Saptami", "Nabami", "Dashami"].forEach((day) => {
        const count = sub[day + "Coupons"] || 0;
        const amount = count * couponPrice;

        couponByDay[day].totalCoupons += count;
        couponByDay[day].totalAmount += amount;

        if (count > 0) {
          couponByDay[day].details.push({
            subscriptionId: sub._id,
            count,
            amount,
          });
        }
      });
    });

    // 5. Use only ONE day for total calculation (change "Saptami" to your preferred day)
    const selectedDay = "Saptami"; // Change this to "Nabami" or "Dashami" as needed
    const totalCoupons = couponByDay[selectedDay].totalCoupons;
    const totalCouponAmount = totalCoupons * couponPrice;

    // ✅ Final Total Amount = Subscription (approved) + Coupon (one day only)
    const grandTotal =
      subscriptionSummary.totalApprovedAmount + totalCouponAmount;

    // 6. Response
    res.json({
      message: "User Dashboard",
      userType,
      user: {
        name: user.name,
        flatNumber: user.flatNumber || user.flat,
        cooperativeSociety: user.cooperativeSociety,
        phoneNumber: user.phoneNumber || user.mobileNumber,
      },
      subscriptions: {
        summary: subscriptionSummary,
        details: subscriptions,
      },
      coupons: {
        totalCoupons, // Only from selected day
        totalCouponAmount, // Only from selected day × 500
        selectedDay, // Shows which day was used for calculation
        byDay: couponByDay, // Still shows breakdown by all days
      },
      totals: {
        subscriptionAmount: subscriptionSummary.totalApprovedAmount,
        couponAmount: totalCouponAmount,
        grandTotal,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
