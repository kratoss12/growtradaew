import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

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

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return NextResponse.json({ error: "Invalid comment ID." }, { status: 400 });
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

    const { error: deleteError } = await supabase
      .from("listing_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Comment deleted successfully." });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}