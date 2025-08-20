require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT; //3000
const MONGO_URI = process.env.MONGO_URI;
const usersRouter = require("./routes/users");
const subscriptionsRouter = require("./routes/subscriptions");
const userSubscription = require("./models/Subscription"); // Importing the Subscription schema
var cors = require("cors");
const  User  = require("./models/User"); // Import both models
const UserCoupon = require("./models/Coupon"); // Importing the UserCoupon schema
const societies = require("./routes/societies"); // Importing the MasterTable route
const Payment = require("./models/Payment"); // Importing the Payment schema
const ManualPayment = require("./models/ManualPaymentSchema"); // Importing the ManualPayment schema
const userPayment = require("./routes/payments"); // Importing the Payment route
const userCoupon = require("./routes/coupon"); // Importing the UserCoupon route
const adminRouter = require("./routes/admin"); // Importing the Admin route
const ManualAdmin = require("./models/ManualAdmin");
const manualAdmin = require("./routes/manualAdmin"); // Importing the ManualAdmin route
const adminStatsRoutes = require("./routes/adminDashboard"); // Importing the Admin Dashboard route


// MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Establishing connection with Mongo DB via mongoose
const db = mongoose.connection;

//Connection error message
db.on("error", console.error.bind(console, "MongoDB connection error:"));

//Console print if monoDB connection established or not, plus syncing Indexes
db.once("open", async () => {
  console.log("Connected to MongoDB");
  try {
     await User.syncIndexes();
     await UserCoupon.syncIndexes(); 
    console.log("Indexes synced");
  } catch (error) {
    console.error("Error syncing indexes:", error);
  }
});

// Middleware
app.use(bodyParser.json());


//Cors
app.use(cors());

//Invoke routes

app.use("/user", usersRouter);

// app.use("/subscription", subscriptionsRouter);
app.use("/societies", societies); // Using the MasterTable route);
app.use("/userSubscription", subscriptionsRouter); // Using the Subscription route
app.use("/userPayment", userPayment); // Using the Payment route
app.use("/userCoupon", userCoupon); // Using the UserCoupon route
app.use("/admin",adminRouter); // Using the Admin route
app.use("/manualAdmin",manualAdmin); // Using the ManualAdmin route
app.use("/adminDashboard",adminStatsRoutes); // Using the Admin Dashboard route

app.use("/uploads", express.static("uploads"));

// Starting the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
