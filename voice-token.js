// api/voice-token.js
//
// Issues a short-lived Twilio Access Token for the browser Voice SDK.
// Gated by a passcode — this is NOT public. Anyone with the token can
// place calls billed to your Twilio balance, so don't expose this without
// the passcode check passing first.
//
// Required Vercel Environment Variables:
//   TWILIO_ACCOUNT_SID   - starts with AC...
//   TWILIO_API_KEY_SID   - starts with SK... (create in Console > API keys & tokens > Create API key)
//   TWILIO_API_KEY_SECRET - shown once when you create the API key above, save it then
//   TWILIO_TWIML_APP_SID - starts with AP... (create a TwiML App, Voice Request URL = your
//                           deployed /api/voice-twiml endpoint, see that file)
//   DIALER_PASSCODE       - any string you choose, shared only with your team
//
// No npm packages needed — builds the JWT manually with Node's built-in crypto.

import crypto from "crypto";

function base64url(input) {
  return Buffer.from(JSON.stringify(input))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signAccessToken({ accountSid, apiKeySid, apiKeySecret, twimlAppSid, identity }) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = 3600; // 1 hour

  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${apiKeySid}-${now}`,
    grants: {
      identity,
      voice: {
        outgoing: { application_sid: twimlAppSid },
        incoming: { allow: false }, // this number doesn't need to ring the browser, only dial out
      },
    },
    iat: now,
    nbf: now,
    exp: now + ttl,
    iss: apiKeySid,
    sub: accountSid,
  };

  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);
  const signature = crypto
    .createHmac("sha256", apiKeySecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { passcode, identity } = req.body || {};
  if (!passcode || passcode !== process.env.DIALER_PASSCODE) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  const token = signAccessToken({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    apiKeySid: process.env.TWILIO_API_KEY_SID,
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET,
    twimlAppSid: process.env.TWILIO_TWIML_APP_SID,
    identity: identity || "karlcon-dialer",
  });

  return res.status(200).json({ token });
}
