// // utils/sendPushNotification.js
// const admin = require("firebase-admin"); // Uses globally initialized admin

// /**
//  * Send push notification to device via FCM.
//  * @param {string} token - Device FCM token.
//  * @param {string} title - Notification title.
//  * @param {string} body - Notification body.
//  * @param {object} additionalData - Custom data payload (optional).
//  */
// async function sendPushNotification(token, title, body, additionalData = {}) {
//   if (!token) return; // Token required

//   const message = {
//     token, // device token
//     notification: {
//       title,
//       body,
//     },
//     data: additionalData,
//   };

//   try {
//     const response = await admin.messaging().send(message);
//     console.log("✅ Successfully sent message:", response);
//     return response;
//   } catch (error) {
//     console.error("❌ Error sending message:", error);
//     throw error;
//   }
// }

// module.exports = sendPushNotification;

const { admin } = require("../middleware/firebase");

async function sendPushNotification(token, title, body, additionalData = {}) {
  if (!token) return;
  const message = {
    token,
    notification: { title, body },
    data: additionalData,
  };
  try {
    const response = await admin.messaging().send(message);
    console.log("✅ Successfully sent message:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending message:", error);
    throw error;
  }
}

module.exports = sendPushNotification;
