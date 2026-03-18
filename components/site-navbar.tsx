import Link from "next/link";
import { createClient } from "../utils/supabase/server";
import DiscordLoginButton from "./discord-login-button";
import SignOutButton from "./sign-out-button";

export default async function SiteNavbar() {
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
    "User";

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const isStaff = role === "admin" || role === "moderator";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 text-decoration-none"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-lg font-extrabold text-black shadow-lg shadow-emerald-500/20">
                GT
              </div>

              <div className="min-w-0">
                <div className="truncate text-lg font-extrabold text-white sm:text-xl">
                  GrowtopiaTrade
                </div>
                <div className="hidden text-xs text-zinc-400 sm:block">
                  Marketplace & economy tracker
                </div>
              </div>
            </Link>

            <div className="lg:hidden">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white">
                        {String(displayName).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <SignOutButton />
                </div>
              ) : (
                <DiscordLoginButton />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <nav className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-center">
              <Link
                href="/marketplace"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/10"
              >
                Marketplace
              </Link>

              <Link
                href="/post"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/10"
              >
                Post Listing
              </Link>

              {user ? (
                <Link
                  href="/my-listings"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/10"
                >
                  My Listings
                </Link>
              ) : null}

              {isStaff ? (
                <Link
                  href="/admin"
                  className="rounded-2xl border border-yellow-300/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-200 transition hover:bg-yellow-400/15"
                >
                  Admin
                </Link>
              ) : null}
            </nav>

            <div className="hidden lg:flex lg:items-center lg:gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white">
                        {String(displayName).charAt(0).toUpperCase()}
                      </div>
                    )}

                    <span className="max-w-[140px] truncate text-sm font-semibold text-white">
                      {displayName}
                    </span>
                  </div>

                  <SignOutButton />
                </>
              ) : (
                <DiscordLoginButton />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}