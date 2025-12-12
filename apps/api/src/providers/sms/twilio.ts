/**
 * Twilio SMS Provider
 *
 * Handles sending SMS messages via Twilio API
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string | null;
}

export interface SendSmsParams {
  to: string; // Lead phone number (E.164)
  from: string; // Selected sender number (E.164) - ignored if messagingServiceSid is set
  body: string;
}

export interface SendSmsResponse {
  message_id: string;
  status: "queued" | "sent" | "failed";
}

/**
 * Send SMS via Twilio
 * Uses Twilio REST API to send SMS
 */
export async function sendSms(
  config: TwilioConfig,
  params: SendSmsParams
): Promise<SendSmsResponse> {
  const { accountSid, authToken, messagingServiceSid } = config;
  const { to, from, body } = params;

  // Twilio API endpoint
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  // Prepare form data
  const formData = new URLSearchParams();
  formData.append("To", to);
  formData.append("Body", body);

  // Use messaging service if configured, otherwise use specific from number
  if (messagingServiceSid) {
    formData.append("MessagingServiceSid", messagingServiceSid);
  } else {
    formData.append("From", from);
  }

  // Make request to Twilio
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return {
    message_id: data.sid,
    status: data.status === "queued" ? "queued" : data.status === "sent" ? "sent" : "failed",
  };
}
