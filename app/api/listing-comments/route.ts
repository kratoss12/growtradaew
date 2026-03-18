import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

const MAX_COMMENT_LENGTH = 120;

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

function validateComment(commentText: string) {
  if (!commentText) {
    return "Comment cannot be empty.";
  }

  if (commentText.length > MAX_COMMENT_LENGTH) {
    return `Comment must be ${MAX_COMMENT_LENGTH} characters or less.`;
  }

  if (containsLink(commentText)) {
    return "Links are not allowed in comments.";
  }

  if (containsBannedWord(commentText)) {
    return "Comment contains inappropriate language.";
  }

  return null;
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
    const listingId = Number(body.listingId);
    const commentText = String(body.commentText || "").trim();

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
    }

    const validationError = validateComment(commentText);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, listing_type, status, expires_at")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    if (listing.listing_type !== "buy") {
      return NextResponse.json(
        { error: "Comments are only allowed on buy listings." },
        { status: 400 }
      );
    }

    if (listing.status !== "approved") {
      return NextResponse.json(
        { error: "Comments are only allowed on approved listings." },
        { status: 400 }
      );
    }

    if (!listing.expires_at || new Date(listing.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "This listing has expired." },
        { status: 400 }
      );
    }

    const { data: existingComment } = await supabase
      .from("listing_comments")
      .select("id")
      .eq("listing_id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingComment) {
      return NextResponse.json(
        { error: "You already commented on this listing. Edit your comment instead." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("listing_comments").insert([
      {
        listing_id: listingId,
        user_id: user.id,
        comment_text: commentText,
      },
    ]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Comment posted successfully." });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}