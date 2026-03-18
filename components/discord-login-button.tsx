"use client";

export default function DiscordLoginButton() {
  function handleLogin() {
    window.location.href = "/auth/discord";
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-400 sm:px-5 sm:py-3"
    >
      <span className="hidden sm:inline">Sign in with Discord</span>
      <span className="sm:hidden">Discord</span>
    </button>
  );
}