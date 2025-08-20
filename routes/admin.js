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

module.exports = router;
