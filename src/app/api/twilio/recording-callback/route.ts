import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DISCORD_WEBHOOK =
  "https://discord.com/api/webhooks/1486106951061344386/KP7rwhexB-MfIyikmAUNVSfAD73r_9rI2S_-QtHRWSg8HNTr_XcbdxrctNSATRqeWg-J";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function notifyDiscord(
  from: string,
  to: string,
  direction: string,
  duration: number
) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const arrow = direction === "inbound" ? "📞 Inbound" : "📱 Outbound";

  await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: `${arrow} Call Recorded`,
          color: direction === "inbound" ? 0x3498db : 0x2ecc71,
          fields: [
            { name: "From", value: from || "Unknown", inline: true },
            { name: "To", value: to || "Unknown", inline: true },
            { name: "Duration", value: durationStr, inline: true },
          ],
          footer: {
            text: "Cowork will process this call within 2 minutes",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  }).catch((err) => console.error("Discord notification error:", err));
}

// Receives recording completion callbacks from Twilio
// Stores the recording URL and triggers transcription
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const callSid = formData.get("CallSid") as string;
    const recordingSid = formData.get("RecordingSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;
    const recordingStatus = formData.get("RecordingStatus") as string;

    if (recordingStatus !== "completed") {
      return NextResponse.json({ status: "ignored" });
    }

    // Get call details from Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const callResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const callData = await callResponse.json();

    // Request transcription from Twilio
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}/Transcriptions.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          StatusCallback: `${req.nextUrl.origin}/api/twilio/recording-callback`,
          StatusCallbackMethod: "POST",
        }),
      }
    );

    // Store call record in Supabase
    const supabase = getSupabase();
    const { error } = await supabase.from("twilio_calls").insert({
      call_sid: callSid,
      recording_sid: recordingSid,
      recording_url: `${recordingUrl}.mp3`,
      recording_duration: parseInt(recordingDuration),
      from_number: callData.from,
      to_number: callData.to,
      direction: callData.direction,
      status: "recorded",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase insert error:", error);
    }

    // Notify Discord
    await notifyDiscord(
      callData.from,
      callData.to,
      callData.direction || "inbound",
      parseInt(recordingDuration)
    );

    return NextResponse.json({ status: "ok", callSid, recordingSid });
  } catch (error) {
    console.error("Recording callback error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
