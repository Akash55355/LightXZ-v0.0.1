const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateOtp(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const positive = Math.abs(num);
  return String(positive % 1000000).padStart(6, "0");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { ok: false, error: "A valid email is required." });
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "noreply@lightxz.app";
    const senderName = Deno.env.get("SENDER_NAME") ?? "LightXZ";

    if (!brevoApiKey) {
      return json(500, { ok: false, error: "Email service not configured. Please contact admin." });
    }

    const otpCode = (typeof code === "string" && /^\d{6}$/.test(code)) ? code : generateOtp();

    const url = "https://api.brevo.com/v3/smtp/email";
    const payload = {
      sender: { email: senderEmail, name: senderName },
      to: [{ email: email.toLowerCase().trim() }],
      subject: "Your LightXZ verification code",
      textContent: `Your LightXZ verification code is: ${otpCode}\n\nThis code expires in 10 minutes. If you did not request this, you can safely ignore this email.`,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1d60f5;">LightXZ Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f4f6f9;border-radius:12px;margin:16px 0;">${otpCode}</div>
        <p style="color:#666;font-size:14px;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
      </div>`,
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          return json(200, { ok: true, message: "Email sent", code: otpCode });
        }
        if (resp.status >= 400 && resp.status < 500) {
          const body = await resp.text();
          throw new Error(`Brevo client error ${resp.status}: ${body}`);
        }
        lastError = new Error(`Brevo server error ${resp.status}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (err instanceof Error && err.message.includes("client error")) {
          throw err;
        }
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }
    throw lastError ?? new Error("Brevo email failed after 3 attempts");
  } catch (err) {
    console.error("send-otp-email error:", err instanceof Error ? err.message : String(err));
    const msg = err instanceof Error && err.message.includes("not configured")
      ? "Email service not configured. Please contact admin."
      : "Could not send email. Please try again.";
    return json(502, { ok: false, error: msg });
  }
});
