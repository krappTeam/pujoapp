const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");
const dotenv = require("dotenv");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Payment = require("../models/Payment");
const upload = require("../middleware/upload");

dotenv.config();

const router = express.Router();

// post/payment/createPayment
// Create Payment with image
router.post(
  "/createPayment",
  upload.single("userPaymentImage"),
  async (req, res) => {
    try {
      const {
        userID,
        cooperativeSociety,
        flatNumber,
        userPaymentDate,
        userPaymentAmount,
        userPaymentMode,
        userPaymentMethod,
        userPaymentRefID,
        userChequeNumber,
        userChequeBankName,
        userTransferBankName,
        userPaymentSubscriptionDesc,
        userLastUpdatedBy,
      } = req.body;

      const payment = new Payment({
        userID,
        cooperativeSociety,
        flatNumber,
        userPaymentDate: userPaymentDate ? new Date(userPaymentDate) : null,
        userPaymentAmount,
        userPaymentMode,
        userPaymentMethod: userPaymentMethod || "OFFLINE", // Default to OFFLINE if not provided
        userPaymentRefID,
        userChequeNumber,
        userChequeBankName,
        userTransferBankName,
        userPaymentImage: req.file ? req.file.filename : null, // save only filename
        userPaymentSubscriptionDesc,
        userLastUpdatedBy,
      });

      await payment.save();

      res.status(201).json({
        message: "Payment created successfully",
        payment,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error creating payment", error });
    }
  }
);

// make payment
// router.post("/makePayment", async (req, res) => {
//   try {
//     const { userID, paymentDetails } = req.body;

//     if (!userID || !paymentDetails) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const user = await User.findById(userID);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const newPayment = new Payment({
//       userID: user._id,
//       cooperativeSociety: user.cooperativeSociety,
//       flatNumber: user.flatNumber,
//       ...paymentDetails,
//     });

//     await newPayment.save();
//     res.status(201).json({ message: "Payment made successfully", payment: newPayment });
//   } catch (error) {
//     console.error("Error making payment:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// Get Payments by Payment Mode
router.get("/getPaymentsByMode/:mode", async (req, res) => {
  try {
    const mode = req.params.mode.toUpperCase(); // ensure mode is in uppercase

    // Validate the mode
    const validModes = ["CASH", "CHEQUE", "UPI", "BANK_TRANSFER"];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ message: "Invalid payment mode" });
    }

    const payments = await Payment.find({ userPaymentMode: mode });

    res.status(200).json({
      message: `Payments fetched for mode: ${mode}`,
      count: payments.length,
      payments,
    });
  } catch (err) {
    console.error("Fetch payments error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
