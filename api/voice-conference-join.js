// api/voice-conference-join.js
//
// TwiML for the outbound PSTN leg created by voice-twiml.js. Puts that
// call into the same named conference as the browser leg, so both sides
// end up talking in the same room. Called with ?conf=<name> as a query
// param (set when the REST call was created).

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = async function handler(req, res) {
  const conf = (req.query && req.query.conf) || "";

  res.setHeader("Content-Type", "text/xml");

  if (!conf) {
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, something went wrong connecting this call.</Say>
</Response>`);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">${escapeXml(conf)}</Conference>
  </Dial>
</Response>`);
};
