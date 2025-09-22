const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Import your User Mongoose model
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY; // Ensure you have a secret key in your .env file
const Subscription = require("../models/Subscription"); // Import your Subscription Mongoose model

const secretKey = process.env.SECRET_KEY;

// Routes

//get all users
router.get("/getAllUsers", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/register", async (req, res) => {
  try {
    const {
      cooperativeSociety,
      flatNumber,
      name,
      phoneNumber,
      password,
      userRole,
      userSecretCode, // Fixed typo: was userSceretCode
      userCpnActiveStatus,
    } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if the user already exists (check multiple unique fields)
    const existingUser = await User.findOne({
      $or: [{ name: name }, { phoneNumber: phoneNumber }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create a new user
    const newUser = new User({
      cooperativeSociety: cooperativeSociety,
      flatNumber: flatNumber,
      name: name, // Fixed: was this.name
      phoneNumber: phoneNumber,
      password: hashedPassword, // Use hashedPassword when bcrypt is working
      userRole: userRole,
      userSecretCode: userSecretCode, // Fixed typo
      userCpnActiveStatus: userCpnActiveStatus,
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        cooperativeSociety: newUser.cooperativeSociety,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// User login route
router.post("/login", async (req, res) => {
  const { phoneNumber, password } = req.body;

  try {
    // Find the user by phone number
    const user = await User.findOne({ phoneNumber: phoneNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // If the password matches, proceed with login
    console.log("User logged in successfully:", user);

    // Generate a JWT token
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        cooperativeSociety: user.cooperativeSociety,
        flatNumber: user.flatNumber,
        phoneNumber: user.phoneNumber,
        userCpnActiveStatus: user.userCpnActiveStatus,
        userRole: user.userRole,
      },
    });
  } catch (error) {
    console.error("Error during user login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get all families (unpaid and paid)
router.get("/getAllFamilies", async (req, res) => {
  try {
    const families = await User.find()
      .select(
        "_id cooperativeSociety flatNumber name phoneNumber userCpnActiveStatus userActive userRole userCreationDate updated_at"
      )
      .sort({ flatNumber: 1 });

    const subscriptions = await Subscription.find().select(
      "userID userSubscriptionStatus"
    );

    const formattedFamilies = families.map((family) => ({
      id: family._id,
      flat: family.flatNumber,
      name: family.name,
      cooperativeSociety: family.cooperativeSociety,
      phoneNumber: family.phoneNumber,
      CouponStatus: family.userCpnActiveStatus,
      paid: subscriptions.some(
        (sub) =>
          sub.userID.toString() === family._id.toString() &&
          sub.userSubscriptionStatus === "APR"
      ),
      active: family.userActive,
      role: family.userRole,
      createdAt: family.userCreationDate,
      updatedAt: family.updated_at,
    }));

    res.status(200).json({
      message: "Families fetched successfully",
      families: formattedFamilies,
      totalFamilies: formattedFamilies.length,
      paidFamilies: formattedFamilies.filter((f) => f.paid).length,
      unpaidFamilies: formattedFamilies.filter((f) => !f.paid).length,
    });
  } catch (error) {
    console.error("Error fetching families:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Get unpaid families only
router.get("/getUnpaidFamilies", async (req, res) => {
  try {
    const unpaidFamilies = await User.find({ userCpnActiveStatus: false })
      .select(
        "cooperativeSociety flatNumber name phoneNumber userActive userRole userCreationDate"
      )
      .sort({ flatNumber: 1 });

    const formattedFamilies = unpaidFamilies.map((family) => ({
      id: family._id,
      flat: family.flatNumber,
      name: family.name,
      cooperativeSociety: family.cooperativeSociety,
      phoneNumber: family.phoneNumber,
      paid: false,
      active: family.userActive,
      role: family.userRole,
      createdAt: family.userCreationDate,
    }));

    res.status(200).json({
      message: "Unpaid families fetched successfully",
      families: formattedFamilies,
      count: formattedFamilies.length,
    });
  } catch (error) {
    console.error("Error fetching unpaid families:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Get family by flat number
router.get("/getFamilyByFlat/:flatNumber", async (req, res) => {
  try {
    const { flatNumber } = req.params;

    const family = await User.findOne({ flatNumber: flatNumber }).select(
      "cooperativeSociety flatNumber name phoneNumber userCpnActiveStatus userActive userRole userCreationDate updated_at"
    );

    if (!family) {
      return res.status(404).json({ message: "Family not found" });
    }

    const formattedFamily = {
      id: family._id,
      flat: family.flatNumber,
      name: family.name,
      cooperativeSociety: family.cooperativeSociety,
      phoneNumber: family.phoneNumber,
      paid: family.userCpnActiveStatus,
      active: family.userActive,
      role: family.userRole,
      createdAt: family.userCreationDate,
      updatedAt: family.updated_at,
    };

    res.status(200).json({
      message: "Family details fetched successfully",
      family: formattedFamily,
    });
  } catch (error) {
    console.error("Error fetching family by flat:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// // Manual payment processing
// router.post("/processManualPayment", async (req, res) => {
//   try {
//     const { flatNumber, paymentAmount, paymentMethod, transactionId, notes } =
//       req.body;

//     // Validation
//     if (!flatNumber || !paymentAmount) {
//       return res.status(400).json({
//         message: "Flat number and payment amount are required",
//       });
//     }

//     // Find the family
//     const family = await User.findOne({ flatNumber: flatNumber });
//     if (!family) {
//       return res.status(404).json({ message: "Family not found" });
//     }

//     // Check if already paid
//     if (family.userCpnActiveStatus) {
//       return res.status(400).json({
//         message: "Payment already completed for this family",
//       });
//     }

//     // Update payment status
//     const updatedFamily = await User.findOneAndUpdate(
//       { flatNumber: flatNumber },
//       {
//         userCpnActiveStatus: true,
//         userLastUpdatedDate: new Date(),
//         userLastUpdatedBy: "Payment System",
//         // You might want to add these payment fields to your User schema:
//         // paymentAmount: paymentAmount,
//         // paymentMethod: paymentMethod,
//         // transactionId: transactionId,
//         // paymentDate: new Date(),
//         // paymentNotes: notes
//       },
//       { new: true }
//     ).select(
//       "cooperativeSociety flatNumber name phoneNumber userCpnActiveStatus userLastUpdatedDate"
//     );

//     res.status(200).json({
//       message: "Payment processed successfully",
//       family: {
//         id: updatedFamily._id,
//         flat: updatedFamily.flatNumber,
//         name: updatedFamily.name,
//         cooperativeSociety: updatedFamily.cooperativeSociety,
//         phoneNumber: updatedFamily.phoneNumber,
//         paid: updatedFamily.userCpnActiveStatus,
//         lastUpdated: updatedFamily.userLastUpdatedDate,
//       },
//       paymentDetails: {
//         amount: paymentAmount,
//         method: paymentMethod,
//         transactionId: transactionId,
//         processedAt: new Date(),
//         notes: notes,
//       },
//     });
//   } catch (error) {
//     console.error("Error processing manual payment:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

// // Bulk payment processing
// router.post("/processBulkPayments", async (req, res) => {
//   try {
//     const { flatNumbers, paymentAmount, paymentMethod, notes } = req.body;

//     if (
//       !flatNumbers ||
//       !Array.isArray(flatNumbers) ||
//       flatNumbers.length === 0
//     ) {
//       return res.status(400).json({
//         message: "Flat numbers array is required",
//       });
//     }

//     const results = {
//       successful: [],
//       failed: [],
//       alreadyPaid: [],
//     };

//     for (const flatNumber of flatNumbers) {
//       try {
//         const family = await User.findOne({ flatNumber: flatNumber });

//         if (!family) {
//           results.failed.push({
//             flatNumber: flatNumber,
//             reason: "Family not found",
//           });
//           continue;
//         }

//         if (family.userCpnActiveStatus) {
//           results.alreadyPaid.push({
//             flatNumber: flatNumber,
//             name: family.name,
//           });
//           continue;
//         }

//         await User.findOneAndUpdate(
//           { flatNumber: flatNumber },
//           {
//             userCpnActiveStatus: true,
//             userLastUpdatedDate: new Date(),
//             userLastUpdatedBy: "Bulk Payment System",
//           }
//         );

//         results.successful.push({
//           flatNumber: flatNumber,
//           name: family.name,
//         });
//       } catch (error) {
//         results.failed.push({
//           flatNumber: flatNumber,
//           reason: error.message,
//         });
//       }
//     }

//     res.status(200).json({
//       message: "Bulk payment processing completed",
//       results: results,
//       summary: {
//         total: flatNumbers.length,
//         successful: results.successful.length,
//         failed: results.failed.length,
//         alreadyPaid: results.alreadyPaid.length,
//       },
//     });
//   } catch (error) {
//     console.error("Error processing bulk payments:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

// // Revert payment (mark as unpaid)
// router.post("/revertPayment", async (req, res) => {
//   try {
//     const { flatNumber, reason } = req.body;

//     if (!flatNumber) {
//       return res.status(400).json({
//         message: "Flat number is required",
//       });
//     }

//     const family = await User.findOne({ flatNumber: flatNumber });
//     if (!family) {
//       return res.status(404).json({ message: "Family not found" });
//     }

//     if (!family.userCpnActiveStatus) {
//       return res.status(400).json({
//         message: "Family is already marked as unpaid",
//       });
//     }

//     const updatedFamily = await User.findOneAndUpdate(
//       { flatNumber: flatNumber },
//       {
//         userCpnActiveStatus: false,
//         userLastUpdatedDate: new Date(),
//         userLastUpdatedBy: "Payment Revert System",
//       },
//       { new: true }
//     ).select(
//       "cooperativeSociety flatNumber name phoneNumber userCpnActiveStatus userLastUpdatedDate"
//     );

//     res.status(200).json({
//       message: "Payment reverted successfully",
//       family: {
//         id: updatedFamily._id,
//         flat: updatedFamily.flatNumber,
//         name: updatedFamily.name,
//         cooperativeSociety: updatedFamily.cooperativeSociety,
//         phoneNumber: updatedFamily.phoneNumber,
//         paid: updatedFamily.userCpnActiveStatus,
//         lastUpdated: updatedFamily.userLastUpdatedDate,
//       },
//       revertReason: reason,
//     });
//   } catch (error) {
//     console.error("Error reverting payment:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

// // Get payment statistics
// router.get("/getPaymentStats", async (req, res) => {
//   try {
//     const totalFamilies = await User.countDocuments();
//     const paidFamilies = await User.countDocuments({
//       userCpnActiveStatus: true,
//     });
//     const unpaidFamilies = await User.countDocuments({
//       userCpnActiveStatus: false,
//     });

//     const paymentPercentage =
//       totalFamilies > 0 ? Math.round((paidFamilies / totalFamilies) * 100) : 0;

//     // Get recent payments (families updated in last 7 days)
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//     const recentPayments = await User.countDocuments({
//       userCpnActiveStatus: true,
//       userLastUpdatedDate: { $gte: sevenDaysAgo },
//     });

//     res.status(200).json({
//       message: "Payment statistics fetched successfully",
//       stats: {
//         totalFamilies: totalFamilies,
//         paidFamilies: paidFamilies,
//         unpaidFamilies: unpaidFamilies,
//         paymentPercentage: paymentPercentage,
//         recentPayments: recentPayments,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching payment stats:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

// Forgot Password - send reset instructions (basic version)
router.post("/forgotPassword", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this phone number not found" });
    }

    return res.status(200).json({
      message:
        "If this phone number is registered, reset instructions will be sent.",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

//verify Secret Code

router.post("/verifySecretCode", async (req, res) => {
  const { phoneNumber, userSecretCode } = req.body;

  if (!phoneNumber || !userSecretCode) {
    return res.status(400).json({
      message: "Both phoneNumber and userSecretCode are required.",
    });
  }
  try {
    const user = await User.findOne({
      phoneNumber: phoneNumber,
      userSecretCode: userSecretCode,
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found or invalid secret code.",
      });
    }
    // If user is found, return success response
    return res.status(200).json({
      message: "Secret code verified successfully",
      user: {
        id: user._id,
        name: user.name,
        cooperativeSociety: user.cooperativeSociety,
        flatNumber: user.flatNumber,
        phoneNumber: user.phoneNumber,
        userCpnActiveStatus: user.userCpnActiveStatus,
        userRole: user.userRole,
      },
    });
  } catch (error) {
    console.error("Error verifying secret code:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Save FCM token from mobile app
router.post("/save-fcm-token", async (req, res) => {
  try {
    const { userID, fcmToken } = req.body;
    await User.findByIdAndUpdate(userID, { fcmToken });
    res.json({ success: true, message: "FCM token saved" });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

// userid auto genaration by phone number in manual payment
router.post("/getUserIdByPhone", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res
      .status(400)
      .json({ message: "Phone number is required in request body" });
  }

  try {
    const user = await User.findOne({ phoneNumber: phoneNumber }).select(
      "_id phoneNumber"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      userId: user._id,
      phoneNumber: user.phoneNumber,
    });
  } catch (error) {
    console.error("Error fetching user by phone number:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get FCM token by phone number

router.post("/getFcmToken", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "phoneNumber is required." });
  }

  try {
    const user = await User.findOne({ phoneNumber }).select("deviceToken");

    if (!user || !user.deviceToken) {
      return res.status(404).json({ message: "FCM token not found for this phone number." });
    }

    return res.status(200).json({ fcmToken: user.deviceToken });
  } catch (error) {
    console.error("Error fetching FCM token:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});


module.exports = router;
