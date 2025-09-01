// routes/coupon.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserCoupon = require("../models/Coupon");
const Subscription = require("../models/Subscription");

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

router.put("/updateUserApprovalStatus", async (req, res) => {
  const { phoneNumber, newStatus, updatedBy } = req.body;

  if (!phoneNumber || !newStatus) {
    return res
      .status(400)
      .json({ message: "Both unitNumber and newStatus are required." });
  }

  if (!["APR", "REJ"].includes(newStatus)) {
    return res
      .status(400)
      .json({ message: "newStatus must be either 'APR' or 'REJ'." });
  }

  try {
    const updated = await Subscription.findOneAndUpdate(
      { phoneNumber, userSubscriptionStatus: "PEN" },
      {
        userSubscriptionStatus: newStatus,
        userLastUpdatedDate: new Date(),
        userLastUpdatedBy: updatedBy || "admin",
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "User with status 'PEN' not found for the given phoneNumber.",
      });
    }

    return res.status(200).json({
      message: `User approval status updated to '${newStatus}' successfully.`,
      data: updated,
    });
  } catch (err) {
    console.error("Approval update error:", err);
    return res.status(500).json({ message: "Server error" });
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


// Approve/Reject Family Subscription & Update Payment
router.put("/updateUserFamilySubscription", async (req, res) => {
  const { phoneNumber, newStatus, updatedBy, paymentMode, paymentMethod } = req.body;
  
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

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    let updatedSub, updatedPayment;
    
    // Execute operations within a transaction
    await session.withTransaction(async () => {
      // Common update fields
      const updateMeta = {
        userLastUpdatedDate: new Date(),
        userLastUpdatedBy: updatedBy || "admin",
      };

      // ✅ Update subscription only if status is still 'PEN'
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

      // ✅ Handle payment update logic
      let paymentUpdate = { ...updateMeta };
      
      if (newStatus === "APR") {
        // Validate enums from schema
        const modeEnums = Payment.schema.path("userPaymentMode").enumValues;
        const methodEnums = Payment.schema.path("userPaymentMethod").enumValues;
        const validMode = modeEnums.includes(paymentMode) ? paymentMode : modeEnums[0] || "CASH";
        const validMethod = methodEnums.includes(paymentMethod) ? paymentMethod : methodEnums[0] || "OFFLINE";

        paymentUpdate = {
          ...paymentUpdate,
          userPaymentStatus: "APR", // Approve payment when subscription is approved
          userPaymentAmount: updatedSub.userSubscriptionAmount,
          userFamilyAmount: 1000, // fixed family subscription (₹1000)
          userPaymentDate: new Date(),
          userPaymentMode: validMode,
          userPaymentMethod: validMethod,
        };
      }

      if (newStatus === "REJ") {
        paymentUpdate = {
          ...paymentUpdate,
          userPaymentStatus: "REJ", // Reject payment when subscription is rejected
        };
      }

      // Update payment record
      updatedPayment = await Payment.findOneAndUpdate(
        { 
          userID: updatedSub.userID, // More reliable than phoneNumber for payment lookup
          userPaymentStatus: "PEN" 
        },
        paymentUpdate,
        { new: true, session }
      );

      if (!updatedPayment) {
        throw new Error("Pending payment record not found for the user.");
      }
    });

    return res.status(200).json({
      message: `User family subscription updated to '${newStatus}' successfully.`, // Fixed template literal
      data: {
        subscription: updatedSub,
        payment: updatedPayment
      },
    });

  } catch (err) {
    console.error("Family subscription update error:", err);
    
    if (err.message.includes("not found")) {
      return res.status(404).json({ message: err.message });
    }
    
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  } finally {
    // End the session
    await session.endSession();
  }
});
module.exports = router;
