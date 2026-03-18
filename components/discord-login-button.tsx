"use client";

import { createClient } from "../utils/supabase/client";

export default function DiscordLoginButton() {
  async function signInWithDiscord() {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
  }

  return (
    <button
      onClick={signInWithDiscord}
      style={{
        padding: "10px 14px",
        borderRadius: "10px",
        background: "#5865F2",
        color: "white",
        fontSize: "14px",
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
      }}
    >
      Sign in with Discord
    </button>
  );
}