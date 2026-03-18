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
      style={{
        padding: "8px 12px",
        border: "1px solid #3f3f46",
        borderRadius: "10px",
        background: "transparent",
        color: "#d4d4d8",
        fontSize: "14px",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}