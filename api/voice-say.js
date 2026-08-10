// api/voice-say.js
//
// POST { callSid, text, passcode } to speak `text` into the currently
// connected call identified by `callSid` (the BROWSER leg's CallSid),
// using a male Twilio/Polly voice.
//
// HOW THIS WORKS NOW: the browser leg and the callee leg both live in a
// Twilio Conference named `conf-<browserCallSid>` (see voice-twiml.js /
// voice-conference-join.js). We look up that conference and set its
// AnnounceUrl, which makes Twilio fetch voice-announce.js and play the
// resulting <Say> to every participant in the room — WITHOUT dropping
// anyone. This replaces the old approach of calling
// client.calls(callSid).update({twiml}) directly, which redirected
// (and therefore ended) the call as soon as you clicked Say.
//
// TEMPORARY DEBUG BUILD — credentials hardcoded to match the other
// endpoints. REVERT to env vars once you're done debugging (see the
// security note previously flagged). Do not leave this committed if the
// repo is public.

const twilio = require("twilio");

// --- hardcoded for isolation testing (mirrors the other endpoints) ---
const TWILIO_ACCOUNT_SID = "AC5d88f5d0600e01ba5a19f26d6f994c11";
const TWILIO_API_KEY_SID = "SK63add0bb67b7accccf02f8e0f96e13a9";
const TWILIO_API_KEY_SECRET = "MYPbsg1ERwQRngon3nQRrUh5NCwQt0kT";
const DIALER_PASSCODE = "karlcon2026";
// ------------------------------------------------------------------

const client = twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

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

  const confName = `conf-${callSid}`;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const announceUrl = `https://${host}/api/voice-announce?text=${encodeURIComponent(text.trim())}`;

  try {
    const conferences = await client.conferences.list({
      friendlyName: confName,
      status: "in-progress",
      limit: 1,
    });

    if (!conferences.length) {
      return res.status(409).json({
        error: "Call isn't in an active conference yet — wait a moment after connecting and try again.",
      });
    }

    await client.conferences(conferences[0].sid).update({ announceUrl });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("voice-say announce failed:", err.code, err.message);
    return res.status(500).json({ error: err.message || "Announce failed" });
  }
};
