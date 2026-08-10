// api/voice-say.js
//
// POST { callSid, text, passcode } to speak `text` into the currently
// connected call identified by `callSid`, using a male Twilio/Polly voice.
//
// IMPORTANT LIMITATION: this REDIRECTS the call — it ends whatever <Dial>
// is currently connecting the two legs and replaces it with <Say>. It is
// NOT a whisper/announcement that plays alongside an ongoing conversation.
// If you need to inject speech without dropping the connected call, that
// requires restructuring the call flow around a <Dial><Conference> and
// using the Conference Participant "Announce" REST endpoint instead —
// ask if you want that version built.
//
// TEMPORARY DEBUG BUILD — credentials hardcoded to match voice-token.js and
// send-sms.js. REVERT to env vars once you're done debugging (see security
// note below). Do not leave this committed if the repo is public.

const twilio = require("twilio");

// --- hardcoded for isolation testing (mirrors voice-token.js / send-sms.js) ---
const TWILIO_ACCOUNT_SID = "AC5d88f5d0600e01ba5a19f26d6f994c11";
const TWILIO_API_KEY_SID = "SK63add0bb67b7accccf02f8e0f96e13a9";
const TWILIO_API_KEY_SECRET = "MYPbsg1ERwQRngon3nQRrUh5NCwQt0kT";
const DIALER_PASSCODE = "karlcon2026";
// ------------------------------------------------------------------

const client = twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

// Male voice. "Polly.Matthew-Neural" sounds more natural than the
// classic "man" voice; falls back to "Polly.Matthew" (standard) if
// your Twilio region/account doesn't support neural voices yet.
const MALE_VOICE = "Polly.Matthew-Neural";

function escapeForTwiml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { callSid, text, passcode } = req.body || {};

  if (!passcode || passcode !== DIALER_PASSCODE) {
    return res.status(401).json({ error: "Invalid passcode" });
  }
  if (!callSid) {
    return res.status(400).json({ error: "Missing callSid" });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Missing text" });
  }

  const safeText = escapeForTwiml(text.trim());

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${MALE_VOICE}">${safeText}</Say>
</Response>`;

  try {
    await client.calls(callSid).update({ twiml });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("voice-say update failed:", err.code, err.message);
    return res.status(500).json({ error: err.message || "Update failed" });
  }
};
