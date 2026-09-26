const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const members = require("./members.json");
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const CENTER_LAT = 31.809384;
const CENTER_LNG = 35.476829;
const RADIUS_KM = 3;


function distanceKm(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  return R * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

app.get("/api/me", (req, res) => {

  const token = req.query.token;

  const member =
    members.find(m => m.token === token);

  if (!member) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  res.json(member);
});

app.post("/api/update", async (req, res) => {

  const { token, lat, lng } = req.body;

  const member =
    members.find(m => m.token === token);

  if (!member) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  const distance =
    distanceKm(
      CENTER_LAT,
      CENTER_LNG,
      lat,
      lng
    );

  const available =
    distance <= RADIUS_KM;

  await db
    .collection("membersStatus")
    .doc(token)
    .set({
      token,
      name: member.name,
      available,
      updated: new Date().toISOString()
    });

  res.json({
    success: true,
    available
  });

});
``

app.get("/api/status", async (req, res) => {

  const snapshot =
    await db
      .collection("membersStatus")
      .get();

  const now = Date.now();

  const result = [];

  snapshot.forEach(doc => {

    const item = doc.data();

    const ageHours =
      (now -
        new Date(item.updated).getTime())
      / 1000 / 60 / 60;

    result.push({

      ...item,

      status:
        ageHours > 24
          ? "unknown"
          : item.available
            ? "available"
            : "unavailable"

    });

  });

  res.json(result);

});

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `SODACH running on ${PORT}`
  );
});
