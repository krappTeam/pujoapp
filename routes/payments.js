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
const sendNotification = require("../utils/sendNotification");

dotenv.config();



// post/payment/createPayment
// Create Payment with image
const router = express.Router();

// router.post("/createPayment", async (req, res) => {
//   try {
//     const {
//       userID,
//       cooperativeSociety,
//       flatNumber,
//       userPaymentDate,
//       userPaymentAmount,
//       userFamilyAmount,
//       userPaymentMode,
//       userPaymentMethod,
//       userPaymentRefID,
//       userChequeNumber,
//       userChequeBankName,
//       userTransferBankName,
//       userPaymentSubscriptionDesc,
//       userLastUpdatedBy,
//       userPaymentImageBase64, // base64 string from client
//     } = req.body;

//     const payment = new Payment({
//       userID,
//       cooperativeSociety,
//       flatNumber,
//       userPaymentDate: userPaymentDate ? new Date(userPaymentDate) : null,
//       userPaymentAmount,
//       userFamilyAmount,
//       userPaymentMode,
//       userPaymentMethod: userPaymentMethod || "OFFLINE",
//       userPaymentRefID,
//       userChequeNumber,
//       userChequeBankName,
//       userTransferBankName,
//       userPaymentImage: userPaymentImageBase64 || null, // <-- store base64 string
//       userPaymentSubscriptionDesc,
//       userLastUpdatedBy,
//     });

//     await payment.save();

//     res.status(201).json({
//       message: "Payment created successfully",
//       payment,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error creating payment", error });
//   }
// });



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



// POST /payments/createPayment
// User submits a payment → save + notify admins room

// CREATE PAYMENT + SAVE/UPDATE FCM TOKEN
router.post("/createPayment", async (req, res) => {
  try {
    const {
      userID,
      fcmToken, // <-- Added here from frontend
      cooperativeSociety,
      flatNumber,
      userPaymentDate,
      userPaymentAmount,
      userFamilyAmount,
      userPaymentMode,
      userPaymentMethod,
      userPaymentRefID,
      userChequeNumber,
      userChequeBankName,
      userTransferBankName,
      userPaymentImage,
      userPaymentSubscriptionDesc,
      userPaymentImageBase64,
    } = req.body;

    // ✅ Step 1: Save/Update FCM Token
    if (fcmToken) {
      await User.findByIdAndUpdate(userID, { fcmToken });
    }

    // ✅ Step 2: Create Payment
    const payment = new Payment({
      userID,
      cooperativeSociety,
      flatNumber,
      userPaymentDate,
      userPaymentAmount,
      userFamilyAmount: userFamilyAmount || 0,
      userPaymentMode,
      userPaymentMethod,
      userPaymentRefID,
      userChequeNumber,
      userChequeBankName,
      userTransferBankName,
      userPaymentImage,
      userPaymentSubscriptionDesc,
      userPaymentImageBase64,
    });

    await payment.save();

    // ✅ Step 3: Notify Admin(s)
    const admins = await User.find({ role: "U02", fcmToken: { $ne: null } });
    admins.forEach((admin) => {
      sendNotification(
        admin.fcmToken,
        "New Payment Submitted",
        `User ${userID} submitted ₹${userPaymentAmount}. Approval required.`,
        { paymentId: payment._id.toString() }
      );
    });

    res.status(201).json({
      message: "Payment created successfully & FCM token saved",
      payment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


// PUT /payments/approvePayment/:paymentId
// Admin approves → update + notify that user
// // Approve Payment
// router.put("/approvePayment/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const payment = await Payment.findByIdAndUpdate(
//       userId,
//       { userPaymentStatus: "APR" },
//       { new: true }
//     );

//     if (!payment) {
//       return res.status(404).json({ message: "Payment not found" });
//     }

//     // 🔔 Notify User
//     const user = await User.findById(payment.userID);
//     if (user?.fcmToken) {
//       sendNotification(
//         user.fcmToken,
//         "Payment Approved",
//         `Your payment of ₹${payment.userPaymentAmount} has been approved.`,
//         { paymentId: payment._id.toString() }
//       );
//     }

//     res.json({ message: "Payment approved", payment });
//   } catch (error) {
//     console.error("Error approving payment:", error);
//     res.status(500).json({ message: "Server error", error });
//   }
// });


// // PUT /payments/rejectPayment/:paymentId
// // Admin rejects → update + notify that user
// router.put("/rejectPayment/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { adminName, reason } = req.body;

//     // Find payment
//     const payment = await Payment.findById(userId);
//     if (!payment) return res.status(404).json({ message: "Payment not found" });

//     // Update payment status
//     payment.userPaymentStatus = "REJ";
//     payment.userLastUpdatedBy = adminName || "Admin";
//     payment.userLastUpdatedDate = new Date();
//     await payment.save();

//     // Find user to get FCM token
//     const user = await User.findById(payment.userID);
//     if (user && user.fcmToken) {
//       await sendNotification(
//         user.fcmToken,
//         "Payment Rejected ❌",
//         `Your payment of ₹${payment.userPaymentAmount} was rejected.${
//           reason ? " Reason: " + reason : ""
//         }`,
//         { paymentId: payment._id.toString(), status: "REJ" }
//       );
//     }

//     res.json({ message: "Payment rejected successfully", payment });
//   } catch (error) {
//     console.error("Error rejecting payment:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// GET /payments/isFamilyAmountPaid/:userID
router.get("/isFamilyAmountPaid/:userID", async (req, res) => {
  try {
    const { userID } = req.params;
    const payment = await Payment.findOne({
      userID,
      userFamilyAmount: 1000,
      userPaymentStatus: "APR",
    });

    if (payment) {
      return res.status(200).json({
        isPaid: true,
        message: "Family amount (1000) has been paid and approved.",
      });
    }
    return res.status(200).json({
      isPaid: false,
      message: "Family amount (1000) has not been paid yet.",
    });
  } catch (error) {
    console.error("Error checking family amount payment status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// Route to get all payments with image URLs
router.get("/getAllPaymentsWithImages", async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("userID", "name phoneNumber email")
      .exec();

    // Add image URLs to each payment
    const paymentsWithImages = payments.map((payment) => {
      const paymentData = payment.toObject();
      if (paymentData.userPaymentImage) {
        paymentData.imageUrl = `${req.protocol}://${req.get(
          "host"
        )}/userPayment/getPaymentImage/${paymentData.userPaymentImage}`;
      }
      return paymentData;
    });

    res.status(200).json({
      message: "Payments fetched successfully",
      count: paymentsWithImages.length,
      payments: paymentsWithImages,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Error fetching payments" });
  }
});




module.exports = router;
