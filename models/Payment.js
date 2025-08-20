const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  cooperativeSociety: {
    type: String,
    required: true,
  },
  flatNumber: {
    type: String,
    required: true,
  },
  userPaymentDate: {
    type: Date,
  },
  userPaymentAmount: {
    type: Number,
    required: true,
  },
  userPaymentMode: {
    type: String,
    enum: ["CASH", "CHEQUE", "UPI","BANK TRANSFER"],
    required: true,
  },
  userPaymentMethod: {
    type: String,
    enum: ["ONLINE", "OFFLINE"],
    required: true,
  },
  userPaymentRefID: {
    type: String,
  },
  userPaymentStatus: {
    type: String,
    enum: ["PEN", "APR", "REJ"],
    default: "PEN",
  },
  userChequeNumber: {
    type: String,
  },
  userChequeBankName: {
    type: String,
  },
  userTransferBankName: {
    type: String,
  },
  userPaymentImage: {
    type: String,
  },
  userPaymentSubscriptionDesc: {
    type: String,
  },
  userLastUpdatedDate: {
    type: Date,
    default: Date.now,
  },
  userLastUpdatedBy: {
    type: String,
  },
});

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
