"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import { useEffect, useState } from "react";
import DiscordLoginButton from "./discord-login-button";
import SignOutButton from "./sign-out-button";

export default function SiteNavbar() {
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("user");

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role) {
          setRole(profile.role);
        }
      }
    }

    loadUser();
  }, []);

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

  function getNavStyle(path: string, isAdmin = false) {
    const isActive = pathname === path;

    if (isAdmin) {
      return {
        padding: "8px 14px",
        borderRadius: "12px",
        fontSize: "14px",
        fontWeight: 700,
        textDecoration: "none",
        border: "1px solid rgba(250,204,21,0.45)",
        background: isActive
          ? "rgba(250,204,21,0.25)"
          : "rgba(250,204,21,0.12)",
        color: "#fde047",
        boxShadow: isActive
          ? "0 0 10px rgba(250,204,21,0.4)"
          : "none",
      };
    }

    return {
      padding: "8px 14px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: 700,
      textDecoration: "none",
      border: isActive
        ? "1px solid rgba(34,197,94,0.6)"
        : "1px solid rgba(255,255,255,0.10)",
      background: isActive
        ? "rgba(34,197,94,0.15)"
        : "rgba(255,255,255,0.06)",
      color: isActive ? "#4ade80" : "#f4f4f5",
      boxShadow: isActive
        ? "0 0 10px rgba(34,197,94,0.3)"
        : "inset 0 1px 0 rgba(255,255,255,0.04)",
    };
  }

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(9,9,11,0.88)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "14px 20px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
        }}
      >
        {/* LEFT - LOGO */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background:
                "linear-gradient(135deg, #4ade80 0%, #22c55e 45%, #22d3ee 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#03130a",
            }}
          >
            GT
          </div>

          <span
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "white",
            }}
          >
            GrowtopiaTrade
          </span>
        </Link>

        {/* CENTER NAV */}
        <nav
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
          }}
        >
          <Link href="/marketplace" style={getNavStyle("/marketplace")}>
            Marketplace
          </Link>

          <Link href="/post" style={getNavStyle("/post")}>
            Post Listing
          </Link>

          {user ? (
            <Link href="/my-listings" style={getNavStyle("/my-listings")}>
              My Listings
            </Link>
          ) : null}

          {isStaff ? (
            <Link href="/admin" style={getNavStyle("/admin", true)}>
              Admin
            </Link>
          ) : null}
        </nav>

        {/* RIGHT SIDE */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          {user ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "6px 10px",
                  borderRadius: "999px",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#27272a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    {displayName.charAt(0)}
                  </div>
                )}

                <span style={{ fontSize: "14px", color: "#e4e4e7" }}>
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
    </header>
  );
}