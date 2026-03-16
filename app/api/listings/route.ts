import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

const EXPENSIVE_ITEM_THRESHOLD_WL = 500000;
const DAILY_FREE_LISTING_LIMIT = 10;
const VENDING_MACHINE_LIMIT_WL = 20000;
const NORMAL_LISTING_DURATION_HOURS = 8;

const bannedWords = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "cunt",
  "nigger",
  "retard",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in with Discord to post listings." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    const body = await request.json();

    const item_id = Number(body.item_id);
    const listing_type = String(body.listing_type || "").toLowerCase();
    const quantity = Number(body.quantity);
    const price_wl = Number(body.price_wl);
    const world_name = String(body.world_name || "").trim().toUpperCase();
    const ingame_name = String(body.ingame_name || "").trim().toUpperCase();

    if (!Number.isInteger(item_id) || item_id <= 0) {
      return NextResponse.json({ error: "Invalid item selected." }, { status: 400 });
    }

    if (listing_type !== "buy" && listing_type !== "sell") {
      return NextResponse.json(
        { error: "Listing type must be buy or sell." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999999) {
      return NextResponse.json({ error: "Invalid quantity." }, { status: 400 });
    }

    if (!Number.isFinite(price_wl) || price_wl < 1 || price_wl > 1000000) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }

    if (!world_name) {
      return NextResponse.json({ error: "World name is required." }, { status: 400 });
    }

    if (world_name.length < 1 || world_name.length > 24) {
      return NextResponse.json(
        { error: "World name must be between 1 and 24 characters." },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9]+$/.test(world_name)) {
      return NextResponse.json(
        { error: "World name can only contain letters and numbers (no spaces)." },
        { status: 400 }
      );
    }

    const lowerWorld = world_name.toLowerCase();
    for (const word of bannedWords) {
      if (lowerWorld.includes(word)) {
        return NextResponse.json(
          { error: "World name contains inappropriate language." },
          { status: 400 }
        );
      }
    }

    if (!ingame_name) {
      return NextResponse.json({ error: "In-game name is required." }, { status: 400 });
    }

    if (ingame_name.length < 2 || ingame_name.length > 24) {
      return NextResponse.json(
        { error: "In-game name must be between 2 and 24 characters." },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9]+$/.test(ingame_name)) {
      return NextResponse.json(
        { error: "In-game name can only contain letters and numbers (no spaces)." },
        { status: 400 }
      );
    }

    const lowerIngame = ingame_name.toLowerCase();
    for (const word of bannedWords) {
      if (lowerIngame.includes(word)) {
        return NextResponse.json(
          { error: "In-game name contains inappropriate language." },
          { status: 400 }
        );
      }
    }

    if (price_wl > VENDING_MACHINE_LIMIT_WL) {
      return NextResponse.json(
        {
          error:
            "Trades above 20000 WL are not supported in the current listing form yet. They must use Discord instead of a vending machine.",
        },
        { status: 400 }
      );
    }

    const { data: itemExists } = await supabase
      .from("items")
      .select("id")
      .eq("id", item_id)
      .maybeSingle();

    if (!itemExists) {
      return NextResponse.json(
        { error: "Selected item does not exist." },
        { status: 400 }
      );
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfToday.toISOString());

    if (countError) {
      return NextResponse.json(
        { error: "Failed to check daily listing limit." },
        { status: 500 }
      );
    }

    if (!isAdmin && (count || 0) >= DAILY_FREE_LISTING_LIMIT) {
      return NextResponse.json(
        {
          error: `Daily limit reached. You can post up to ${DAILY_FREE_LISTING_LIMIT} listings per day.`,
        },
        { status: 400 }
      );
    }

    const isExpensiveItem = price_wl >= EXPENSIVE_ITEM_THRESHOLD_WL;

    let status = "approved";
    let expires_at: string | null = null;
    let assigned_world: string | null = null;
    let payment_required_bgl: number | null = null;
    let payment_status = "none";

    if (isExpensiveItem) {
      status = "pending";
      payment_required_bgl = 1;
      payment_status = "waiting_donation";

      const { data: world } = await supabase
        .from("donation_worlds")
        .select("*")
        .eq("is_occupied", false)
        .limit(1)
        .maybeSingle();

      if (!world) {
        return NextResponse.json(
          { error: "No donation worlds available. Please try again later." },
          { status: 500 }
        );
      }

      assigned_world = world.world_name;

      await supabase
        .from("donation_worlds")
        .update({
          is_occupied: true,
        })
        .eq("id", world.id);
    } else {
      expires_at = new Date(
        Date.now() + NORMAL_LISTING_DURATION_HOURS * 60 * 60 * 1000
      ).toISOString();
    }

    const { error } = await supabase.from("listings").insert([
      {
        user_id: user.id,
        item_id,
        listing_type,
        quantity,
        price_wl,
        world_name,
        ingame_name,
        status,
        expires_at,
        assigned_world,
        payment_required_bgl,
        payment_status,
      },
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (isExpensiveItem) {
      return NextResponse.json({
        message: `High-value item detected. Please donate 1 BGL in world ${assigned_world}. After donation our moderators will verify and approve your listing.`,
      });
    }

    if (isAdmin) {
      return NextResponse.json({
        message: `Listing submitted successfully and is live for ${NORMAL_LISTING_DURATION_HOURS} hours. Admin account: daily upload limit bypass is active.`,
      });
    }

    return NextResponse.json({
      message: `Listing submitted successfully and is live for ${NORMAL_LISTING_DURATION_HOURS} hours. You have ${Math.max(
        0,
        DAILY_FREE_LISTING_LIMIT - ((count || 0) + 1)
      )} listings remaining today.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}