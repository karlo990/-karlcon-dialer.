// api/voice-twiml.js
//
// Twilio POSTs here (configured as the TwiML App's Voice Request URL)
// whenever the browser dialer places a call. Returns TwiML telling Twilio
// who to actually dial, with basic validation so the dialer can't be used
// to hit arbitrary internal/premium-rate numbers by accident or abuse.

const TWILIO_NUMBER = "+12367616855"; // caller ID shown to whoever you call

function isValidE164(number) {
  return /^\+[1-9]\d{6,14}$/.test(number);
}

export default async function handler(req, res) {
  const to = (req.body && req.body.To) || "";

  res.setHeader("Content-Type", "text/xml");

  if (!isValidE164(to)) {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Invalid number. Please use full international format.</Say>
</Response>`);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${TWILIO_NUMBER}">
    <Number>${to}</Number>
  </Dial>
</Response>`);
}
