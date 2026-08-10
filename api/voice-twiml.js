// api/voice-twiml.js
//
// Twilio POSTs here (configured as the TwiML App's Voice Request URL)
// whenever the browser dialer places a call. This is the BROWSER leg.
//
// Instead of <Dial><Number> (old approach), we now put the browser leg
// into a named <Conference>, and separately place an outbound REST call
// to the PSTN number that joins the SAME conference. This is what allows
// voice-say.js to play an announcement into the live call without
// disconnecting anyone (see voice-say.js for why the old approach broke).
//
// The conference name is derived from this leg's own CallSid, so the
// browser (which already has that CallSid via activeCall.parameters)
// can reconstruct the same conference name later without any extra
// round-trip.

const twilio = require("twilio");

// --- hardcoded for isolation testing (mirrors the other endpoints) ---
const TWILIO_ACCOUNT_SID = "AC5d88f5d0600e01ba5a19f26d6f994c11";
const TWILIO_API_KEY_SID = "SK63add0bb67b7accccf02f8e0f96e13a9";
const TWILIO_API_KEY_SECRET = "MYPbsg1ERwQRngon3nQRrUh5NCwQt0kT";
const TWILIO_NUMBER = "+12367616855"; // caller ID shown to whoever you call
// ------------------------------------------------------------------

const client = twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

function isValidE164(number) {
  return /^\+[1-9]\d{6,14}$/.test(number);
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = async function handler(req, res) {
  const to = (req.body && req.body.To) || "";
  const browserCallSid = (req.body && req.body.CallSid) || "";

  res.setHeader("Content-Type", "text/xml");

  if (!isValidE164(to)) {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Invalid number. Please use full international format.</Say>
</Response>`);
  }

  const confName = `conf-${browserCallSid || Date.now()}`;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const joinUrl = `https://${host}/api/voice-conference-join?conf=${encodeURIComponent(confName)}`;

  // Fire off the PSTN leg to join the same conference. Fire-and-forget:
  // we don't block returning TwiML on this, so the browser leg starts
  // ringing/joining immediately.
  try {
    await client.calls.create({
      to,
      from: TWILIO_NUMBER,
      url: joinUrl,
    });
  } catch (err) {
    console.error("Failed to dial PSTN leg:", err.code, err.message);
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, we couldn't place that call. Please try again.</Say>
</Response>`);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">${escapeXml(confName)}</Conference>
  </Dial>
</Response>`);
};
