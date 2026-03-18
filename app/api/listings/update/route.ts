import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const HIGH_VALUE_THRESHOLD_WL = 500000;
const VEND_LIMIT_WL = 20000;
const NORMAL_LISTING_DURATION_HOURS = 8;
const MAX_WORLD_DESCRIPTION_LENGTH = 500;

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

function convertToWL(amount: number, currency: string) {
  if (currency === "WL") return amount;
  if (currency === "DL") return amount * 100;
  if (currency === "BGL") return amount * 10000;
  return amount;
}

function containsLink(text: string) {
  const lower = text.toLowerCase();
  return (
    lower.includes("http://") ||
    lower.includes("https://") ||
    lower.includes("www.") ||
    lower.includes(".com") ||
    lower.includes(".net") ||
    lower.includes(".gg") ||
    lower.includes(".org")
  );
}

function containsBannedWord(text: string) {
  const lower = text.toLowerCase();
  return bannedWords.some((word) => lower.includes(word));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const listingId = Number(body.listing_id);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
    }

    const { data: existingListing, error: existingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError || !existingListing) {
      return NextResponse.json(
        { error: "Listing not found or does not belong to you." },
        { status: 404 }
      );
    }

    const isPromotionActive =
      existingListing.is_promoted &&
      existingListing.promotion_expires_at &&
      new Date(existingListing.promotion_expires_at) > new Date();

    if (
      isPromotionActive ||
      existingListing.promotion_payment_status === "awaiting_donation" ||
      existingListing.promotion_payment_status === "pending_verification"
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot edit a listing while it has an active or pending promotion.",
        },
        { status: 400 }
      );
    }

    const listing_category = String(
      body.listing_category || existingListing.listing_category || "item"
    ).toLowerCase();

    const rawItemId = body.item_id;
    const item_id: number | null =
      rawItemId === null || rawItemId === undefined || rawItemId === ""
        ? null
        : Number(rawItemId);

    const listing_type = String(body.listing_type || "").toLowerCase();
    const pricing_mode = String(body.pricing_mode || "");
    const price_amount = Number(body.price_amount);
    const price_currency = String(body.price_currency || "WL");

    const rawQuantity = body.quantity;
    const quantity =
      rawQuantity === null || rawQuantity === undefined || rawQuantity === ""
        ? null
        : Number(rawQuantity);

    const rawStock = body.stock;
    const stock =
      rawStock === null || rawStock === undefined || rawStock === ""
        ? null
        : Number(rawStock);

    const rawWorldName = String(body.world_name || "").trim().toUpperCase();
    const ingame_name = String(body.ingame_name || "").trim().toUpperCase();

    const world_sale_name = String(body.world_sale_name || "").trim().toUpperCase();
    const world_sale_description = String(body.world_sale_description || "").trim();

    if (listing_category !== "item" && listing_category !== "world") {
      return NextResponse.json({ error: "Invalid listing category." }, { status: 400 });
    }

    if (listing_category === "item") {
      if (item_id === null || !Number.isInteger(item_id) || item_id <= 0) {
        return NextResponse.json({ error: "Invalid item selected." }, { status: 400 });
      }

      if (listing_type !== "buy" && listing_type !== "sell") {
        return NextResponse.json(
          { error: "Listing type must be buy or sell." },
          { status: 400 }
        );
      }

      if (pricing_mode !== "per_item" && pricing_mode !== "per_wl") {
        return NextResponse.json(
          { error: "Invalid pricing mode." },
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
    }

    if (listing_category === "world") {
      if (!world_sale_name) {
        return NextResponse.json({ error: "World name is required." }, { status: 400 });
      }

      if (world_sale_name.length < 1 || world_sale_name.length > 24) {
        return NextResponse.json(
          { error: "World name must be between 1 and 24 characters." },
          { status: 400 }
        );
      }

      if (!/^[A-Z0-9]+$/.test(world_sale_name)) {
        return NextResponse.json(
          { error: "World name can only contain letters and numbers (no spaces)." },
          { status: 400 }
        );
      }

      if (containsBannedWord(world_sale_name)) {
        return NextResponse.json(
          { error: "World name contains inappropriate language." },
          { status: 400 }
        );
      }

      if (!world_sale_description) {
        return NextResponse.json(
          { error: "World description is required." },
          { status: 400 }
        );
      }

      if (world_sale_description.length > MAX_WORLD_DESCRIPTION_LENGTH) {
        return NextResponse.json(
          { error: `Description must be ${MAX_WORLD_DESCRIPTION_LENGTH} characters or less.` },
          { status: 400 }
        );
      }

      if (containsLink(world_sale_description)) {
        return NextResponse.json(
          { error: "Links are not allowed in the description." },
          { status: 400 }
        );
      }

      if (containsBannedWord(world_sale_description)) {
        return NextResponse.json(
          { error: "Description contains inappropriate language." },
          { status: 400 }
        );
      }

      if (listing_type !== "sell") {
        return NextResponse.json(
          { error: "World listings can only be sell listings." },
          { status: 400 }
        );
      }

      if (pricing_mode !== "per_item") {
        return NextResponse.json(
          { error: "World listings must use direct price mode." },
          { status: 400 }
        );
      }
    }

    if (!Number.isFinite(price_amount) || price_amount <= 0) {
      return NextResponse.json({ error: "Invalid price amount." }, { status: 400 });
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

    if (containsBannedWord(ingame_name)) {
      return NextResponse.json(
        { error: "In-game name contains inappropriate language." },
        { status: 400 }
      );
    }

    if (listing_category === "item" && listing_type === "buy") {
      if (
        quantity === null ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 999999
      ) {
        return NextResponse.json(
          { error: "Wanted quantity is required for buy listings." },
          { status: 400 }
        );
      }
    }

    if (
      stock !== null &&
      (!Number.isInteger(stock) || stock < 1 || stock > 999999999)
    ) {
      return NextResponse.json({ error: "Invalid stock value." }, { status: 400 });
    }

    let effective_price_wl = convertToWL(price_amount, price_currency);

    if (listing_category === "item" && pricing_mode === "per_wl") {
      effective_price_wl = 1 / price_amount;
    }

    const requiresWorld =
      listing_category === "item" &&
      listing_type === "sell" &&
      effective_price_wl > 0 &&
      effective_price_wl <= VEND_LIMIT_WL;

    const isHighValueListing =
      listing_type === "sell" &&
      pricing_mode === "per_item" &&
      effective_price_wl >= HIGH_VALUE_THRESHOLD_WL;

    let world_name: string | null = null;

    if (requiresWorld) {
      if (!rawWorldName) {
        return NextResponse.json({ error: "World name is required." }, { status: 400 });
      }

      if (rawWorldName.length < 1 || rawWorldName.length > 24) {
        return NextResponse.json(
          { error: "World name must be between 1 and 24 characters." },
          { status: 400 }
        );
      }

      if (!/^[A-Z0-9]+$/.test(rawWorldName)) {
        return NextResponse.json(
          { error: "World name can only contain letters and numbers (no spaces)." },
          { status: 400 }
        );
      }

      if (containsBannedWord(rawWorldName)) {
        return NextResponse.json(
          { error: "World name contains inappropriate language." },
          { status: 400 }
        );
      }

      world_name = rawWorldName;
    }

    if (existingListing.assigned_world) {
      await supabase
        .from("donation_worlds")
        .update({
          is_occupied: false,
          current_listing_id: null,
        })
        .eq("world_name", existingListing.assigned_world);
    }

    let status = "approved";
    let expires_at: string | null = null;
    let assigned_world: string | null = null;
    let payment_required_bgl: number | null = null;
    let payment_status = "none";

    if (isHighValueListing) {
      status = "pending";
      payment_required_bgl = 1;
      payment_status = "awaiting_donation";

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
          current_listing_id: listingId,
        })
        .eq("id", world.id);
    } else {
      expires_at = new Date(
        Date.now() + NORMAL_LISTING_DURATION_HOURS * 60 * 60 * 1000
      ).toISOString();
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        listing_category,
        item_id: listing_category === "item" ? item_id : null,
        listing_type,
        quantity: listing_category === "item" && listing_type === "buy" ? quantity : null,
        pricing_mode,
        price_amount,
        price_currency: pricing_mode === "per_item" ? price_currency : "WL",
        price_wl: effective_price_wl,
        stock: listing_category === "item" && listing_type === "sell" ? stock : null,
        world_name,
        world_sale_name: listing_category === "world" ? world_sale_name : null,
        world_sale_description:
          listing_category === "world" ? world_sale_description : null,
        ingame_name,
        status,
        expires_at,
        assigned_world,
        payment_required_bgl,
        payment_status,
      })
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (isHighValueListing) {
      return NextResponse.json({
        message:
          `Listing updated. Donate 1 BGL in world ${assigned_world}. ` +
          `After donating, confirm your payment in My Listings within 20 minutes. ` +
          `Then an admin will review and approve your listing.`,
      });
    }

    return NextResponse.json({
      message: "Listing updated successfully.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}