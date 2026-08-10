// api/voice-announce.js
//
// Twilio fetches this URL when we set AnnounceUrl on a live conference
// (see voice-say.js). Whatever TwiML this returns gets played into the
// conference for ALL participants to hear, WITHOUT removing anyone —
// this is what replaces the old "redirect the call" approach that used
// to hang up as soon as you clicked Say.

const MALE_VOICE = "Polly.Matthew-Neural";

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = async function handler(req, res) {
  const text = (req.query && req.query.text) || "";

  res.setHeader("Content-Type", "text/xml");

  if (!text.trim()) {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${MALE_VOICE}">${escapeXml(text)}</Say>
</Response>`);
};
