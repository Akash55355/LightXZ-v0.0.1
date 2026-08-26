import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * After verifying the OTP code, mint a real Supabase Auth session.
 * Uses the Admin API's generateLink to get a hashed_token, then calls
 * the verify endpoint to exchange it for access + refresh tokens.
 * This creates a proper auth.users entry and session that works with RLS.
 */
async function mintSession(email: string): Promise<{ access_token: string; refresh_token: string }> {
  // Generate a magic link token (does NOT send an email — generateLink only returns properties)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { shouldCreateUser: true },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkError?.message ?? "no token"}`);
  }

  const hashedToken = linkData.properties.hashed_token;

  // Exchange the hashed token for a real session via the verify endpoint
  const verifyResp = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseAnonKey,
    },
    body: JSON.stringify({
      token: hashedToken,
      type: "magiclink",
    }),
  });

  if (!verifyResp.ok) {
    const body = await verifyResp.text();
    throw new Error(`verify endpoint failed (${verifyResp.status}): ${body}`);
  }

  const session = await verifyResp.json();
  if (!session.access_token || !session.refresh_token) {
    throw new Error("verify endpoint did not return session tokens");
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || typeof email !== "string") {
      return json(400, { ok: false, error: "Email is required." });
    }
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return json(400, { ok: false, error: "A 6-digit code is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const codeHash = hashCode(code);
    const now = new Date().toISOString();

    // Find the latest unused, non-expired code for this email
    const { data: record, error: queryError } = await supabase
      .from("magic_codes")
      .select("id, code_hash, expires_at, attempts, max_attempts, used")
      .eq("email", normalizedEmail)
      .eq("used", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error("DB query error:", queryError.message);
      return json(500, { ok: false, error: "Verification failed. Please try again." });
    }

    if (!record) {
      return json(400, { ok: false, error: "No valid code found. Please request a new code." });
    }

    // Check attempts
    if (record.attempts >= record.max_attempts) {
      await supabase
        .from("magic_codes")
        .update({ used: true })
        .eq("id", record.id);
      return json(400, { ok: false, error: "Too many attempts. Please request a new code." });
    }

    // Compare hash
    if (record.code_hash !== codeHash) {
      const newAttempts = record.attempts + 1;
      const shouldInvalidate = newAttempts >= record.max_attempts;
      await supabase
        .from("magic_codes")
        .update({
          attempts: newAttempts,
          used: shouldInvalidate,
        })
        .eq("id", record.id);

      const remaining = record.max_attempts - newAttempts;
      if (remaining > 0) {
        return json(400, { ok: false, error: `Invalid code. ${remaining} attempt(s) remaining.` });
      }
      return json(400, { ok: false, error: "Too many failed attempts. Please request a new code." });
    }

    // Code is correct — mark as used
    const { error: updateError } = await supabase
      .from("magic_codes")
      .update({ used: true })
      .eq("id", record.id);

    if (updateError) {
      console.error("DB update error:", updateError.message);
      return json(500, { ok: false, error: "Verification failed. Please try again." });
    }

    // Mint a real Supabase Auth session
    try {
      const { access_token, refresh_token } = await mintSession(normalizedEmail);
      return json(200, { ok: true, access_token, refresh_token, email: normalizedEmail });
    } catch (sessionErr) {
      console.error("Session minting failed:", sessionErr instanceof Error ? sessionErr.message : String(sessionErr));
      return json(500, { ok: false, error: "Could not create session. Please try again." });
    }
  } catch (err) {
    console.error("verify-code error:", err instanceof Error ? err.message : String(err));
    return json(500, { ok: false, error: "Something went wrong. Please try again." });
  }
});
