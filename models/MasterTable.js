

const mongoose = require("mongoose");

// Master Table Schema
const masterTableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const MasterTable = mongoose.model("MasterTable", masterTableSchema);
module.exports =mongoose.model("MasterTable", masterTableSchema);
