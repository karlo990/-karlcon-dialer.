// api/send-sms.js
//
// Sends an outbound SMS via Twilio's REST API. Uses the same passcode-gate
// pattern as voice-token.js so the dialer UI can call this endpoint directly.
//
// TEMPORARY DEBUG BUILD — credentials hardcoded to match voice-token.js for
// now. REVERT to env vars once the underlying bug in that file is resolved
// (see the note at the top of voice-token.js). Do not leave this committed
// if the repo is public.

const twilio = require("twilio");

// --- hardcoded for isolation testing (mirrors voice-token.js) ---
const TWILIO_ACCOUNT_SID = "AC5d88f5d0600e01ba5a19f26d6f994c11";
const TWILIO_API_KEY_SID = "SK63add0bb67b7accccf02f8e0f96e13a9";
const TWILIO_API_KEY_SECRET = "MYPbsg1ERwQRngon3nQRrUh5NCwQt0kT";
const TWILIO_FROM_NUMBER = "+12367616855"; // same number used as caller ID for calls
const DIALER_PASSCODE = "karlcon2026";
// ------------------------------------------------------------------

function isValidE164(number) {
  return /^\+[1-9]\d{6,14}$/.test(number);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { passcode, to, body } = req.body || {};

  if (!passcode || passcode !== DIALER_PASSCODE) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  if (!to || !isValidE164(to)) {
    return res.status(400).json({ error: "Invalid destination number. Use full international format, e.g. +263771234567" });
  }

  const text = (body || "").trim();
  if (!text) {
    return res.status(400).json({ error: "Message body is empty" });
  }
  if (text.length > 1600) {
    return res.status(400).json({ error: "Message too long (max 1600 characters)" });
  }

  try {
    // Twilio's REST API client authenticates with API Key SID/Secret when
    // an Account SID is also supplied as the third argument.
    const client = twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
      accountSid: TWILIO_ACCOUNT_SID,
    });

    const message = await client.messages.create({
      to,
      from: TWILIO_FROM_NUMBER,
      body: text,
    });

    return res.status(200).json({ sid: message.sid, status: message.status });
  } catch (err) {
    console.error("SMS send failed:", err.code, err.message, err);
    return res.status(500).json({ error: err.message || "Failed to send message" });
  }
};
