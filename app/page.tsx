import DiscordLoginButton from "../components/discord-login-button";
import SignOutButton from "../components/sign-out-button";
import { createClient } from "../utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = "user";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role) {
      role = profile.role;
    }
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.preferred_username ||
    user?.email ||
    "Discord User";

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight text-green-400"
          >
            GrowtopiaTrade
          </a>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium text-zinc-300 md:flex">
            <a href="/marketplace" className="transition hover:text-white">
              Marketplace
            </a>
            <a href="/post" className="transition hover:text-white">
              Post Listing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Discord avatar"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold">
                      {String(displayName).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="leading-tight">
                    <p className="max-w-[120px] truncate text-sm font-semibold text-white">
                      {displayName}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-green-400">
                      {role}
                    </p>
                  </div>
                </div>

                <SignOutButton />
              </>
            ) : (
              <DiscordLoginButton />
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-28 text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-green-400">
          Growtopia Economy Tracker
        </p>

        <h1 className="mb-6 max-w-4xl text-5xl font-extrabold leading-tight sm:text-6xl">
          Trade Growtopia Items Smarter
        </h1>

        <p className="mb-10 max-w-2xl text-lg text-zinc-400">
          Track item prices, find the best deals, and trade safely using real
          player listings.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="/marketplace"
            className="rounded-xl bg-green-500 px-8 py-3 font-semibold text-black transition hover:bg-green-400"
          >
            Browse Marketplace
          </a>

          <a
            href="/post"
            className="rounded-xl border border-zinc-700 px-8 py-3 font-semibold text-white transition hover:bg-zinc-800"
          >
            Create Listing
          </a>
        </div>
      </section>
    </main>
  );
}