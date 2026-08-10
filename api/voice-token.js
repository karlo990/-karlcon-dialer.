// api/voice-token.js
//
// TEMPORARY DEBUG BUILD — adds a ?debug=1 branch that reports masked
// environment variable values so we can confirm exactly what Vercel's
// production function has loaded, without ever exposing the real secret.
// Remove the debug branch once the issue is resolved.

const twilio = require("twilio");
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

function mask(val) {
  if (!val) return "(missing)";
  const len = val.length;
  if (len <= 8) return `[len:${len}] ${val[0]}...${val[len - 1]}`;
  return `[len:${len}] ${val.slice(0, 4)}...${val.slice(-4)}`;
}

module.exports = async function handler(req, res) {
  // Debug branch: GET /api/voice-token?debug=1
  if (req.method === "GET" && req.query && req.query.debug === "1") {
    return res.status(200).json({
      TWILIO_ACCOUNT_SID: mask(process.env.TWILIO_ACCOUNT_SID),
      TWILIO_API_KEY_SID: mask(process.env.TWILIO_API_KEY_SID),
      TWILIO_API_KEY_SECRET: mask(process.env.TWILIO_API_KEY_SECRET),
      TWILIO_TWIML_APP_SID: mask(process.env.TWILIO_TWIML_APP_SID),
      DIALER_PASSCODE: mask(process.env.DIALER_PASSCODE),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { passcode, identity } = req.body || {};
  if (!passcode || passcode !== process.env.DIALER_PASSCODE) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: false,
  });

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity: identity || "karlcon-dialer", ttl: 3600 }
  );
  token.addGrant(voiceGrant);

  return res.status(200).json({ token: token.toJwt() });
};
