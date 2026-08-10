// api/voice-token.js
//
// Issues a short-lived Twilio Access Token for the browser Voice SDK,
// using Twilio's own official token-signing library (not hand-rolled JWT
// construction — that was the previous version and was the likely source
// of the ConnectionError 53000 you hit).
//
// Gated by a passcode — this is NOT public. Anyone with the token can
// place calls billed to your Twilio balance, so don't expose this without
// the passcode check passing first.
//
// Required Vercel Environment Variables (same as before):
//   TWILIO_ACCOUNT_SID
//   TWILIO_API_KEY_SID
//   TWILIO_API_KEY_SECRET
//   TWILIO_TWIML_APP_SID
//   DIALER_PASSCODE
//
// Requires the "twilio" npm package — see package.json in this repo.

const twilio = require("twilio");
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { passcode, identity } = req.body || {};
  if (!passcode || passcode !== process.env.DIALER_PASSCODE) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: false, // this number only needs to dial out, not ring the browser
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
