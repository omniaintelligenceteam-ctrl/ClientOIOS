import { NextRequest, NextResponse } from "next/server";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const OIOS_SALES_NUMBER = "+16156220897";
const WES_CELL = "+12705597478";

// Initiates an outbound call through Twilio with recording
// Flow: Twilio calls Wes first, then connects to the prospect
export async function POST(req: NextRequest) {
  try {
    const { to_number, from_number } = await req.json();

    if (!to_number) {
      return NextResponse.json(
        { error: "to_number is required" },
        { status: 400 }
      );
    }

    // Normalize number
    let normalized = to_number.replace(/[\s\-\(\)]/g, "");
    if (!normalized.startsWith("+")) {
      normalized = "+1" + normalized;
    }

    const baseUrl = req.nextUrl.origin;
    const auth = Buffer.from(
      `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    // TwiML that will connect Wes to the prospect with recording
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call now.</Say>
  <Dial record="record-from-answer-dual"
        recordingStatusCallback="${baseUrl}/api/twilio/recording-callback"
        recordingStatusCallbackMethod="POST"
        recordingStatusCallbackEvent="completed"
        callerId="${from_number || OIOS_SALES_NUMBER}">
    <Number>${normalized}</Number>
  </Dial>
</Response>`;

    // Step 1: Call Wes's cell first
    const callResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: WES_CELL,
          From: from_number || OIOS_SALES_NUMBER,
          Twiml: twiml,
          Record: "true",
          StatusCallback: `${baseUrl}/api/twilio/recording-callback`,
          StatusCallbackMethod: "POST",
        }),
      }
    );

    const callData = await callResponse.json();

    if (callData.sid) {
      return NextResponse.json({
        status: "calling",
        call_sid: callData.sid,
        to: normalized,
        from: from_number || OIOS_SALES_NUMBER,
        message:
          "Calling your cell now. When you answer, you'll be connected to the prospect. The call will be recorded and transcribed automatically.",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to initiate call", details: callData },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Outbound call error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
