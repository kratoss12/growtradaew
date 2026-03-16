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
      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
    >
      Sign in with Discord
    </button>
  );
}