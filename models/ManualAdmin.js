const mongoose = require("mongoose");

const manualSchema = new mongoose.Schema({
  cooperativeSociety: { type: String, required: true },
  flat: { type: String, required: true },
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },

  // Defaults
  password: { type: String, default: "123456" }, // default password
  familyPin: {
    type: String,
    default: () => Math.floor(1000 + Math.random() * 9000).toString(), // random 4-digit pin
  },

  createdBy: { type: String, default: "Admin" },
  createdAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: "Admin" },
  updatedDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ManualUser", manualSchema);
