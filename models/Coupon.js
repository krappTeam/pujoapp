const mongoose = require("mongoose");

// =================== COUPON DAY SUB-SCHEMA ===================
const couponDaySchema = new mongoose.Schema({
  day: { type: String, enum: ["Saptami", "Nabami", "Dashami"], required: true },
  membersCount: { type: Number, required: true },
});

// =================== USER COUPON SCHEMA ===================
const userCouponSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
    subscriptionPaid: { type: Boolean, default: false },
    couponDays: [couponDaySchema],
    couponAmount: { type: Number, default: 0 }, // Total amount of the coupon
    couponStatus: { type: String, enum: ["PENDING", "APPROVED"], default: "PENDING" },
  },
  { timestamps: true }
);
const UserCoupon = mongoose.model("UserCoupon", userCouponSchema);
module.exports = UserCoupon ;