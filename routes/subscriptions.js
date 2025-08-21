const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");
const dotenv = require("dotenv");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const ManualPaymentSchema = require("../models/ManualPaymentSchema");

dotenv.config();

const router = express.Router();

// Mongo URI
const mongoURI = process.env.MONGO_URI;

// GridFS Storage Engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) =>
    new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString("hex") + path.extname(file.originalname);
        resolve({ filename, bucketName: "uploads" });
      });
    }),
});

const upload = multer({ storage });

// CREATE SUBSCRIPTION

router.post("/createSubscription", async (req, res) => {
  try {
    const data = req.body;

    if (
      !data.userID ||
      !data.cooperativeSociety ||
      !data.flatNumber ||
      !data.userSubscriptionAmount ||
      !data.phoneNumber
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ flatNumber: data.flatNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newSubscription = new Subscription({
      userID: data.userID,
      cooperativeSociety: data.cooperativeSociety,
      flatNumber: data.flatNumber,
      phoneNumber: data.phoneNumber,
      userSubscriptionDate: data.userSubscriptionDate || new Date(),
      userSubscriptionType: data.userSubscriptionType || "Regular",
      userSubscriptionStatus: "PEN", // Default Pending
      userSessionYear: new Date().getFullYear(),
      // userFmlyMemberCnt: data.userFmlyMemberCnt,
      userSubscriptionAmount: data.userSubscriptionAmount,
      SaptamiCoupons: data.SaptamiCoupons || 0,
      NabamiCoupons: data.NabamiCoupons || 0,
      DashamiCoupons: data.DashamiCoupons || 0,
      userSubscriptionPaymentDate:
        data.userSubscriptionPaymentDate || new Date(),
      // userSubscriptionPaymentStatus: data.userSubscriptionPaymentStatus || "PEN",
      userSubscriptionPaymentMode: data.userSubscriptionPaymentMode,
      // userSubscriptionPaymentMethod: data.userSubscriptionPaymentMethod,
      userSubscriptionPaymentRef: data.userSubscriptionPaymentRef,
      // userSubscriptionPaymentRefDate: data.userSubscriptionPaymentRefDate,
      userSubscriptionCreatedBy: data.userSubscriptionCreatedBy || "Admin",
      userSubscriptionLastUpdatedBy:
        data.userSubscriptionLastUpdatedBy || "Admin",
    });

    const saved = await newSubscription.save();

    res.status(201).json({
      message: "Subscription created successfully",
      subscription: saved,
    });
  } catch (err) {
    console.error("Error creating subscription:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/total-coupon-amount", async (req, res) => {
  try {
    // 1. Fetch from Subscription
    const subscriptions = await Subscription.find({}).select(
      "SaptamiCoupons NabamiCoupons DashamiCoupons"
    );

    // 2. Fetch from ManualUserCoupon
    const manualCoupons = await ManualPaymentSchema.find({}).select(
      "saptamiCoupons navamiCoupons dashamiCoupons"
    );

    // Helper function to calculate total coupons for each type from subscriptions
    const calculateCouponsFromSubscriptions = (docs) => {
      return docs.reduce(
        (totals, doc) => ({
          saptami: totals.saptami + (doc.SaptamiCoupons || 0),
          navami: totals.navami + (doc.NabamiCoupons || 0),
          dashami: totals.dashami + (doc.DashamiCoupons || 0),
        }),
        { saptami: 0, navami: 0, dashami: 0 }
      );
    };

    // Helper function to calculate total coupons for each type from manual payments
    const calculateCouponsFromManual = (docs) => {
      return docs.reduce(
        (totals, doc) => ({
          saptami: totals.saptami + (doc.saptamiCoupons || 0),
          navami: totals.navami + (doc.navamiCoupons || 0),
          dashami: totals.dashami + (doc.dashamiCoupons || 0),
        }),
        { saptami: 0, navami: 0, dashami: 0 }
      );
    };

    const subscriptionCoupons =
      calculateCouponsFromSubscriptions(subscriptions);
    const manualCouponTotals = calculateCouponsFromManual(manualCoupons);

    // Calculate total coupons for each type
    const saptamiTotalCoupons =
      subscriptionCoupons.saptami + manualCouponTotals.saptami;
    const navamiTotalCoupons =
      subscriptionCoupons.navami + manualCouponTotals.navami;
    const dashamiTotalCoupons =
      subscriptionCoupons.dashami + manualCouponTotals.dashami;

    // Calculate amounts (each coupon = 500)
    const saptamiTotalAmount = saptamiTotalCoupons * 500;
    const navamiTotalAmount = navamiTotalCoupons * 500;
    const dashamiTotalAmount = dashamiTotalCoupons * 500;

    // Calculate user and manual amounts for backward compatibility
    const userCouponAmount =
      (subscriptionCoupons.saptami +
        subscriptionCoupons.navami +
        subscriptionCoupons.dashami) *
      500;
    const manualCouponAmount =
      (manualCouponTotals.saptami +
        manualCouponTotals.navami +
        manualCouponTotals.dashami) *
      500;
    const totalCouponAmount = userCouponAmount + manualCouponAmount;

    res.status(200).json({
      // Separate coupon counts
      saptamiTotalCoupons,
      navamiTotalCoupons,
      dashamiTotalCoupons,

      // Separate amounts
      saptamiTotalAmount,
      navamiTotalAmount,
      dashamiTotalAmount,

      // Original response structure (for backward compatibility)
      userCouponAmount,
      manualCouponAmount,
      totalCouponAmount,
    });
  } catch (err) {
    console.error("Error fetching total coupon amount:", err.message);
    res.status(500).json({
      message: "Server error",
      saptamiTotalCoupons: 0,
      navamiTotalCoupons: 0,
      dashamiTotalCoupons: 0,
      saptamiTotalAmount: 0,
      navamiTotalAmount: 0,
      dashamiTotalAmount: 0,
      userCouponAmount: 0,
      manualCouponAmount: 0,
      totalCouponAmount: 0,
    });
  }
});

module.exports = router;
