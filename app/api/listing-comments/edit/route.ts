import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

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
    const commentId = Number(body.commentId);
    const commentText = String(body.commentText || "").trim();

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return NextResponse.json({ error: "Invalid comment ID." }, { status: 400 });
    }

    if (!commentText) {
      return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
    }

    if (commentText.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or less.` },
        { status: 400 }
      );
    }

    if (containsLink(commentText)) {
      return NextResponse.json(
        { error: "Links are not allowed in comments." },
        { status: 400 }
      );
    }

    if (containsBannedWord(commentText)) {
      return NextResponse.json(
        { error: "Comment contains inappropriate language." },
        { status: 400 }
      );
    }

    const { data: comment, error: commentError } = await supabase
      .from("listing_comments")
      .select("id, user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError || !comment) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from("listing_comments")
      .update({
        comment_text: commentText,
      })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Comment updated successfully." });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}