const mongoose = require("mongoose");

// =================== USER SCHEMA ===================
const userSchema = new mongoose.Schema(
  {
    cooperativeSociety: { type: String, required: true },
    flatNumber: { type: String, required: true },
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userRole: { type: String, enum: ["U01", "U02", "U03"] },
    userActive: { type: Boolean },
    userSecretCode: { type: Number, min: 1000, max: 9999, required: true },
    fcmToken: { type: String }, // 🔔 Store device token
    userCreationDate: { type: Date, default: Date.now, required: true },
    userCreationBy: { type: String, default: "Admin" },
    userSessionYear: {
      type: Number,
      enum: [new Date().getFullYear()],
      default: new Date().getFullYear(),
    },
    userSubscriptionStatus: {
      type: String,
      enum: ["PEN", "APR", "REJ"],
    },
    userCpnActiveStatus: { type: Boolean, required: true },
    userLastUpdatedDate: { type: Date, default: Date.now },
    userLastUpdatedBy: { type: String, default: "Admin" },
    //✅ Store payment image in Base64 format
    userPaymentImageBase64: { type: String },
  },
  
  
  { timestamps: { updatedAt: "updated_at" } }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
