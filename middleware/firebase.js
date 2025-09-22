const https = require("https");
const admin = require("firebase-admin");

function fetchJsonFromUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function initFirebase() {
  if (admin.apps.length > 0) return admin;
  const url =
    "https://bitload4u.s3.eu-central-1.amazonaws.com/qblockdurgoutsav-firebase-adminsdk-fbsvc-6030aaf550.json";
  const serviceAccount = await fetchJsonFromUrl(url);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase initialized from S3");
  return admin;
}

module.exports = { admin, initFirebase };
