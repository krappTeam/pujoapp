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

module.exports = router;
