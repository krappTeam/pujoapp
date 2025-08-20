const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const masterTable  = require("../models/MasterTable");


router.post("/createFree", async (req, res) => {
     console.log("masterTable.js route called");
});


module.exports = router;
