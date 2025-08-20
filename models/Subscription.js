const mongoose = require("mongoose");

const userSubscription = new mongoose.Schema({
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
  phoneNumber: {
    type: String,
    required: true,
  },
  userSubscriptionDate: {
    type: Date,
  },
  userSubscriptionType: {
    type: String,
  },
  userSubscriptionStatus: {
    type: String,
    enum: ["PEN", "APR", "REJ"],
  },
  userSessionYear: {
    type: Number,
    default: new Date().getFullYear(),
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  userLastUpdatedDate: {
    type: Date,
    default: Date.now,
  },
  // userFmlyMemberCnt: {
  //   type: Number,
  // },
  userSubscriptionAmount: {
    type: Number,
    required: true,
  },
  SaptamiCoupons: {
    type: Number,
    default: 0,
  },
  NabamiCoupons: {
    type: Number,
    default: 0,
  },
  DashamiCoupons: {
    type: Number,
    default: 0,
  },
  userSubscriptionCreatedBy: {
    type: String,
    default: "Admin",
  },
  userSubscriptionCreatedDate: {
    type: Date,
    default: Date.now,
  },
  userSubscriptionLastUpdatedBy: {
    type: String,
    default: "Admin",
  },
  userSubscriptionLastUpdatedDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Subscription", userSubscription);
