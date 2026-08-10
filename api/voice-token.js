// api/voice-token.js
//
// TEMPORARY DEBUG BUILD — credentials hardcoded to rule out any
// env-var/whitespace/deployment issue. REVERT to env vars once
// the underlying bug is found. Do not leave this committed if the
// repo is public.

const twilio = require("twilio");
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

// --- hardcoded for isolation testing ---
const TWILIO_ACCOUNT_SID = "AC5d88f5d0600e01ba5a19f26d6f994c11";
const TWILIO_API_KEY_SID = "SK63add0bb67b7accccf02f8e0f96e13a9";
const TWILIO_API_KEY_SECRET = "MYPbsg1ERwQRngon3nQRrUh5NCwQt0kT";
const TWILIO_TWIML_APP_SID = "AP0bc090a0f6d27e2b33130a200bb62c57";
const DIALER_PASSCODE = "karlcon2026";
// ----------------------------------------

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { passcode, identity } = req.body || {};
  if (!passcode || passcode !== DIALER_PASSCODE) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWILIO_TWIML_APP_SID,
    incomingAllow: false,
  });

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET,
    { identity: identity || "karlcon-dialer", ttl: 3600 }
  );
  token.addGrant(voiceGrant);

  return res.status(200).json({ token: token.toJwt() });
};
