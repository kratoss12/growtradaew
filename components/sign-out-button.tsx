"use client";

import { createClient } from "../utils/supabase/client";

export default function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
    >
      Sign out
    </button>
  );
}