require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const { initFirebase } = require("./middleware/firebase");

const usersRouter = require("./routes/users");
const subscriptionsRouter = require("./routes/subscriptions");
const societies = require("./routes/societies");
const userPayment = require("./routes/payments");
const userCoupon = require("./routes/coupon");
const adminRouter = require("./routes/admin");
const manualAdmin = require("./routes/manualAdmin");
const adminStatsRoutes = require("./routes/adminDashboard");
const userDashboard = require("./routes/userDashBoard");
const paymentImages = require("./routes/paymentimages");
const notificationRoutes = require("./routes/notification");

// Models import for index syncing
const User = require("./models/User");
const UserCoupon = require("./models/Coupon");

const app = express();
const port = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

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

async function startServer() {
  // Initialize Firebase before mounting routes
  try {
    await initFirebase();
    console.log("Firebase Admin SDK initialized");
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK:", err);
    process.exit(1);
  }

  // Middleware
  app.use(bodyParser.json());
  app.use(cors());

  // Expose routes - only after Firebase initialized
  app.use("/user", usersRouter);
  app.use("/userSubscription", subscriptionsRouter);
  app.use("/societies", societies);
  app.use("/userPayment", userPayment);
  app.use("/userCoupon", userCoupon);
  app.use("/admin", adminRouter);
  app.use("/manualAdmin", manualAdmin);
  app.use("/adminDashboard", adminStatsRoutes);
  app.use("/userDashboard", userDashboard);
  app.use("/paymentImages", paymentImages);
  app.use("/notifications", notificationRoutes);

  // Static folder for uploads
  app.use("/uploads", express.static("uploads"));

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

// Start everything
startServer();
