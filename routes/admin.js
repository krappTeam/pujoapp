// routes/coupon.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserCoupon = require("../models/Coupon");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const sendPushNotification = require("../utils/sendNotification");



router.post('/notify/:userId', async (req, res) => {
  const { userId } = req.params;
  const { title, body, data } = req.body;
  const user = await User.findById(userId);
  if (!user || !user.fcmToken) return res.status(404).send('User/token not found');

  try {
    const safeData = typeof data === 'object' && data !== null ? data : {};
    await sendPushNotification(user.fcmToken, title, body, safeData);
    res.send('Notification sent');
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).send('Notification failed: ' + err.message);
  }
});



//--------------------SUBSCRIPTION ROUTES--------------------

// GET ALL PENDING SUBSCRIPTIONS (for Admin review) //p

router.get("/pending", async (req, res) => {
  try {
    const pendingSubs = await Subscription.find({
      userSubscriptionStatus: "PEN",
    }).populate("userID", "name  phoneNumber cooperativeSociety flatNumber");

    res.status(200).json(pendingSubs);
  } catch (error) {
    console.error("Error fetching pending subscriptions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// APPROVE SUBSCRIPTION (Admin)

// router.put("/approve/:userid", async (req, res) => {
//   try {
//     const { userid } = req.params;

//     const updated = await Subscription.findByIdAndUpdate(
//       userid,
//       {
//         userSubscriptionStatus: "APR",
//         userSubscriptionLastUpdatedDate: new Date(),
//         userSubscriptionLastUpdatedBy: "Admin",
//       },
//       { new: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ message: "Subscription not found" });
//     }

//     res
//       .status(200)
//       .json({ message: "Subscription approved successfully", subscription: updated });
//   } catch (error) {
//     console.error("Error approving subscription:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });



// === Update User Approval Status ===






// Modify your route to accept rejectionReason for "REJ"
router.put("/updateUserFamilySubscription", async (req, res) => {
  const { phoneNumber, newStatus, updatedBy, paymentMode, paymentMethod, rejectionReason } = req.body;

  if (!phoneNumber || !newStatus) {
    return res.status(400).json({
      message: "Both phoneNumber and newStatus are required.",
    });
  }

  if (!["APR", "REJ"].includes(newStatus)) {
    return res.status(400).json({
      message: "newStatus must be either 'APR' or 'REJ'.",
    });
  }

  if (newStatus === "REJ" && !rejectionReason) {
    return res.status(400).json({
      message: "rejectionReason is required when subscription is rejected.",
    });
  }

  const session = await mongoose.startSession();

  try {
    let updatedSub, updatedPayment;

    await session.withTransaction(async () => {
      const updateMeta = {
        userLastUpdatedDate: new Date(),
        userLastUpdatedBy: updatedBy || "admin",
      };

      updatedSub = await Subscription.findOneAndUpdate(
        { phoneNumber, userSubscriptionStatus: "PEN" },
        {
          userSubscriptionStatus: newStatus,
          userSubscriptionLastUpdatedBy: updatedBy || "admin",
          userSubscriptionLastUpdatedDate: new Date(),
        },
        { new: true, session }
      );

      if (!updatedSub) {
        throw new Error("Pending subscription not found for the given phoneNumber.");
      }

      let paymentUpdate = { ...updateMeta };

      if (newStatus === "APR") {
        const modeEnums = Payment.schema.path("userPaymentMode").enumValues;
        const methodEnums = Payment.schema.path("userPaymentMethod").enumValues;
        const validMode = modeEnums.includes(paymentMode) ? paymentMode : modeEnums[0] || "CASH";
        const validMethod = methodEnums.includes(paymentMethod) ? paymentMethod : methodEnums[0] || "OFFLINE";

        paymentUpdate = {
          ...paymentUpdate,
          userPaymentStatus: "APR",
          userPaymentAmount: updatedSub.userSubscriptionAmount,
          userFamilyAmount: 1000,
          userPaymentDate: new Date(),
          userPaymentMode: validMode,
          userPaymentMethod: validMethod,
        };
      }

      if (newStatus === "REJ") {
        paymentUpdate = {
          ...paymentUpdate,
          userPaymentStatus: "REJ",
        };
      }

      updatedPayment = await Payment.findOneAndUpdate(
        {
          userID: updatedSub.userID,
          userPaymentStatus: "PEN",
        },
        paymentUpdate,
        { new: true, session }
      );

      if (!updatedPayment) {
        throw new Error("Pending payment record not found for the user.");
      }
    });

    // After successful transaction, send push notification to user
    const user = await User.findById(updatedSub.userID); // Your user model should have the FCM token stored
    const fcmToken = user?.fcmToken;

    let notificationTitle = "Payment Update";
    let notificationBody = "";

    if (newStatus === "APR") {
      notificationBody = "Your payment has been approved by admin.";
    } else if (newStatus === "REJ") {
      notificationBody = `Your payment has been rejected by admin. Reason: ${rejectionReason}`;
    }

    await sendPushNotification(fcmToken, notificationTitle, notificationBody);

    return res.status(200).json({
      message: `User family subscription updated to '${newStatus}' successfully.`,
      data: {
        subscription: updatedSub,
        payment: updatedPayment,
      },
    });
  } catch (err) {
    console.error("Family subscription update error:", err);

    if (err.message.includes("not found")) {
      return res.status(404).json({ message: err.message });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  } finally {
    await session.endSession();
  }
});


// REJECT SUBSCRIPTION (Admin)

// router.put("/reject/:id", async (req, res) => {
//   try {
//     const { userid } = req.params;

//     const updated = await Subscription.findByIdAndUpdate(
//       userid,
//       {
//         userSubscriptionStatus: "REJ",
//         userSubscriptionLastUpdatedDate: new Date(),
//         userSubscriptionLastUpdatedBy: "Admin",
//       },
//       { new: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ message: "Subscription not found" });
//     }

//     res
//       .status(200)
//       .json({ message: "Subscription rejected successfully", subscription: updated });
//   } catch (error) {
//     console.error("Error rejecting subscription:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// GET ALL APPROVED SUBSCRIPTIONS  //p

router.get("/approved", async (req, res) => {
  try {
    const approvedSubs = await Subscription.find({
      userSubscriptionStatus: "APR",
      // userPaymentStatus: "APR",
    }).populate("userID", "name phoneNumber cooperativeSociety flatNumber");
    res.status(200).json(approvedSubs);
  } catch (error) {
    console.error("Error fetching approved subscriptions:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/rejected", async (req, res) => {
  try {
    const approvedSubs = await Subscription.find({
      userSubscriptionStatus: "REJ",
      // userPaymentStatus: "REJ",
    }).populate("userID", "name phoneNumber cooperativeSociety flatNumber");
    res.status(200).json(approvedSubs);
  } catch (error) {
    console.error("Error fetching approved subscriptions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET USER'S SUBSCRIPTIONS   //p

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const subscriptions = await Subscription.find({ userID: userId });

    if (!subscriptions || subscriptions.length === 0) {
      return res
        .status(404)
        .json({ message: "No subscriptions found for this user" });
    }

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/check/:id", async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Not found" });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//--------------------COUPON ROUTES--------------------

//Admin — Get all pending coupons

router.get("/pending-users", async (req, res) => {
  try {
    const pendingUsers = await User.find({ couponStatus: "PENDING" });
    res.status(200).json(pendingUsers);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//Admin — Approve a coupon

// router.put("/approve-user/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     await User.findByIdAndUpdate(id, { couponStatus: "APPROVED" });
//     res.status(200).json({ message: "User approved successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// Admin — Approve a coupon and return full user info//

router.put("/approve-user/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Update and return the updated user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { couponStatus: "APPROVED" },
      { new: true, fields: "name email paymentAmount couponDays couponStatus" } // only return required fields
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User approved successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin — Reject a coupon

router.put("/reject-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(id, { couponStatus: "REJECTED" });
    res.status(200).json({ message: "User rejected successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//User — Get coupon status & days

// router.get("/my-coupons/:userId", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.userId, "couponDays couponStatus");
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     res.status(200).json(user);
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// User — Get coupon status & days
router.put("/approveCoupon-user/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Update and return the updated user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { couponStatus: "APPROVED" },
      { new: true, fields: "name email paymentAmount couponDays couponStatus" } // only return required fields
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User approved successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});



router.post("/users/search", async (req, res) => {
  try {
    const searchString = (req.body.q || "").trim();

    if (!searchString) {
      // If no search query, return all users
      const users = await User.find({});
      return res.json(users);
    }

    // Regex that matches fields starting with the full search string (prefix match)
    const regex = new RegExp("^" + searchString, "i");

    const users = await User.find({
      $or: [
        { name: regex },
        { phoneNumber: regex },
        { cooperativeSociety: regex },
      ],
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;
