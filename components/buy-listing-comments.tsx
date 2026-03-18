"use client";

import { useState } from "react";

type CommentItem = {
  id: number;
  comment_text: string;
  created_at: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
  is_owner?: boolean;
};

export default function BuyListingComments({
  listingId,
  comments,
  canUseWorldComment,
}: {
  listingId: number;
  comments: CommentItem[];
  canUseWorldComment: boolean;
}) {
  const [commentText, setCommentText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const myComment = comments.find((comment) => comment.is_owner);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/listing-comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId, commentText }),
    });

    const data = await res.json();
    setLoading(false);
    setMessage(data.message || data.error || "Done");

    if (res.ok) {
      setCommentText("");
      window.location.reload();
    }
  }

  async function handleEdit(commentId: number) {
    setMessage("");
    setActionLoading(commentId);

    const res = await fetch("/api/listing-comments/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commentId, commentText: editText }),
    });

    const data = await res.json();
    setActionLoading(null);
    setMessage(data.message || data.error || "Done");

    if (res.ok) {
      setEditingCommentId(null);
      setEditText("");
      window.location.reload();
    }
  }

  async function handleDelete(commentId: number) {
    setMessage("");
    setActionLoading(commentId);

    const res = await fetch("/api/listing-comments/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commentId }),
    });

    const data = await res.json();
    setActionLoading(null);
    setMessage(data.message || data.error || "Done");

    if (res.ok) {
      window.location.reload();
    }
  }

  return (
    <div
      style={{
        marginTop: "14px",
        border: "1px solid #27272a",
        background: "#0f172a",
        borderRadius: "12px",
        padding: "14px",
      }}
    >
      <p
        style={{
          margin: "0 0 10px 0",
          fontSize: "14px",
          fontWeight: 700,
          color: "white",
        }}
      >
        Seller replies
      </p>

      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: "13px",
          color: "#a1a1aa",
          lineHeight: 1.5,
        }}
      >
        {canUseWorldComment
          ? 'If you have the item ready in a vend, comment your world name. Example: "BUYITEMS123".'
          : "This item is too expensive for vending. Comment a short message and use Discord contact."}
      </p>

      {!myComment ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={120}
              placeholder={
                canUseWorldComment
                  ? "Comment your world name"
                  : "Comment a short message"
              }
              style={{
                flex: 1,
                minWidth: "220px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #3f3f46",
                background: "#18181b",
                color: "white",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #22c55e",
                background: "#22c55e",
                color: "#111827",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            marginBottom: "14px",
            border: "1px solid #27272a",
            background: "#18181b",
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "13px",
            color: "#a1a1aa",
          }}
        >
          You already commented on this buy listing. You can edit or delete your comment below.
        </div>
      )}

      {message ? (
        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "13px",
            color: "#d4d4d8",
          }}
        >
          {message}
        </p>
      ) : null}

      {comments.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#71717a",
          }}
        >
          No replies yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                border: "1px solid #27272a",
                background: "#18181b",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "999px",
                    overflow: "hidden",
                    background: "#27272a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {comment.user_avatar_url ? (
                    <img
                      src={comment.user_avatar_url}
                      alt="avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e4e4e7",
                      }}
                    >
                      {String(comment.user_display_name || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "#e4e4e7",
                    fontWeight: 700,
                  }}
                >
                  {comment.user_display_name || "Trader"}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    color: "#71717a",
                  }}
                >
                  {new Date(comment.created_at).toISOString().slice(0, 16).replace("T", " ")}
                </p>

                {comment.is_owner ? (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#22c55e",
                      fontWeight: 700,
                    }}
                  >
                    Your comment
                  </span>
                ) : null}
              </div>

              {editingCommentId === comment.id ? (
                <div style={{ display: "grid", gap: "8px" }}>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={120}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #3f3f46",
                      background: "#0f172a",
                      color: "white",
                    }}
                  />

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleEdit(comment.id)}
                      disabled={actionLoading === comment.id}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #22c55e",
                        background: "#22c55e",
                        color: "#111827",
                        fontWeight: 700,
                        cursor: actionLoading === comment.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {actionLoading === comment.id ? "Saving..." : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditText("");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #3f3f46",
                        background: "#27272a",
                        color: "white",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "white",
                      lineHeight: 1.5,
                    }}
                  >
                    {comment.comment_text}
                  </p>

                  {comment.is_owner ? (
                    <div
                      style={{
                        marginTop: "10px",
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditText(comment.comment_text);
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #eab308",
                          background: "#facc15",
                          color: "#111827",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        disabled={actionLoading === comment.id}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #dc2626",
                          background: "#dc2626",
                          color: "white",
                          fontWeight: 700,
                          cursor: actionLoading === comment.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {actionLoading === comment.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}