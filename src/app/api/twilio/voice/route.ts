import { NextRequest, NextResponse } from "next/server";

// Serves TwiML to forward inbound calls to Wes's cell with recording enabled
export async function POST(req: NextRequest) {
  const baseUrl = req.nextUrl.origin;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="record-from-answer-dual"
        recordingStatusCallback="${baseUrl}/api/twilio/recording-callback"
        recordingStatusCallbackMethod="POST"
        recordingStatusCallbackEvent="completed">
    <Number>+12705597478</Number>
  </Dial>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Also handle GET for testing
export async function GET(req: NextRequest) {
  return POST(req);
}
