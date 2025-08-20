const mongoose = require("mongoose");

const manualPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ManualUser",
    required: true,
  },

  moneyGivenTo: { type: String, required: true }, // Important field
  paymentType: {
    type: String,
    enum: ["CASH", "UPI", "BANK PAYMENT"],
    required: true,
  },

  familyAmount: { type: Number, default: 0 },

  // Coupons per day
  saptamiCoupons: { type: Number, default: 0 },
  navamiCoupons: { type: Number, default: 0 },
  dashamiCoupons: { type: Number, default: 0 },

  amount: { type: Number, required: true }, // total paid amount

  adminNote: { type: String, default: "" },

  createdBy: { type: String, default: "Admin" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ManualPayment", manualPaymentSchema);
