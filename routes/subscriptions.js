const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");
const dotenv = require("dotenv");
const Subscription = require("../models/Subscription");
const User = require("../models/User");

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

router.get("/getCouponsData", async (req, res) => {
  try {
    const subscriptions = await Subscription.find({}).select(
      "SaptamiCoupons NabamiCoupons DashamiCoupons"
    );

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        SaptamiCoupons: 0,
        NabamiCoupons: 0,
        DashamiCoupons: 0,
        message: "No subscriptions found",
      });
    }

    // Calculate totals by summing all subscriptions
    const totals = subscriptions.reduce(
      (acc, sub) => {
        acc.SaptamiCoupons += (sub.SaptamiCoupons || 0) * 500;
        acc.NabamiCoupons += (sub.NabamiCoupons || 0) * 500;
        acc.DashamiCoupons += (sub.DashamiCoupons || 0) * 500;
        return acc;
      },
      {
        SaptamiCoupons: 0,
        NabamiCoupons: 0,
        DashamiCoupons: 0,
      }
    );

    console.log("Calculated totals:", totals);

    res.status(200).json(totals);
  } catch (err) {
    console.error("Error fetching coupons data:", err.message);
    res.status(500).json({
      message: "Server error",
      SaptamiCoupons: 0,
      NabamiCoupons: 0,
      DashamiCoupons: 0,
    });
  }
});

module.exports = router;
