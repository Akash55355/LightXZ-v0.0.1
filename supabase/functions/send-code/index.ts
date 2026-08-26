import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const CODE_EXPIRY_MINUTES = 10;
const COOLDOWN_SECONDS = 60;
const MAX_CODES_PER_HOUR = 5;

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

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

async function sendBrevoEmail(toEmail: string, code: string): Promise<void> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "noreply@lightxz.app";
  const senderName = Deno.env.get("SENDER_NAME") ?? "LightXZ";

  if (!brevoApiKey) {
    throw new Error("BREVO_API_KEY not configured");
  }

  const url = "https://api.brevo.com/v3/smtp/email";
  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject: "Your LightXZ verification code",
    textContent: `Your LightXZ verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can safely ignore this email.`,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#1d60f5;">LightXZ Verification</h2>
      <p>Your verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f4f6f9;border-radius:12px;margin:16px 0;">${code}</div>
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
      if (resp.ok) return;
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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { ok: false, error: "A valid email is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    // Rate limit: max 5 codes per hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const { count } = await supabase
      .from("magic_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", oneHourAgo.toISOString());

    if (count !== null && count >= MAX_CODES_PER_HOUR) {
      return json(429, { ok: false, error: "Too many codes requested. Please try again later." });
    }

    // Cooldown: 60s between sends
    const cooldownAgo = new Date(now.getTime() - COOLDOWN_SECONDS * 1000);
    const { data: recentCode } = await supabase
      .from("magic_codes")
      .select("created_at")
      .eq("email", normalizedEmail)
      .gte("created_at", cooldownAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCode) {
      return json(429, { ok: false, error: "Please wait a minute before requesting another code." });
    }

    // Generate and store OTP
    const code = generateOtp();
    const codeHash = hashCode(code);
    const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MINUTES * 60 * 1000);

    const { error: insertError } = await supabase.from("magic_codes").insert({
      email: normalizedEmail,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      max_attempts: 5,
      used: false,
    });

    if (insertError) {
      console.error("DB insert error:", insertError.message);
      return json(500, { ok: false, error: "Could not generate code. Please try again." });
    }

    // Send email via Brevo
    try {
      await sendBrevoEmail(normalizedEmail, code);
    } catch (emailErr) {
      console.error("Brevo send failed:", emailErr instanceof Error ? emailErr.message : String(emailErr));
      return json(502, { ok: false, error: "Could not send email. Please try again." });
    }

    return json(200, { ok: true, message: "Code sent" });
  } catch (err) {
    console.error("send-code error:", err instanceof Error ? err.message : String(err));
    return json(500, { ok: false, error: "Something went wrong. Please try again." });
  }
});
