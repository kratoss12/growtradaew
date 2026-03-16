import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import AdminListingActions from "../../components/admin-listing-actions";
import AdminItemImageForm from "../../components/admin-item-image-form";

type PendingListing = {
  id: number;
  item_id: number;
  listing_type: string;
  quantity: number;
  price_wl: number;
  world_name: string | null;
  ingame_name: string | null;
  assigned_world: string | null;
  payment_required_bgl: number | null;
  payment_status: string | null;
  promotion_assigned_world: string | null;
  promotion_payment_required_bgl: number | null;
  promotion_payment_status: string | null;
  promotion_days: number | null;
  is_promoted: boolean;
  promotion_expires_at: string | null;
  status: string;
  created_at: string;
  items:
    | {
        name: string;
        category: string;
        image_url: string | null;
      }
    | {
        name: string;
        category: string;
        image_url: string | null;
      }[]
    | null;
};

type AdminItem = {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    redirect("/");
  }

  const { data: adminListings, error } = await supabase
    .from("listings")
    .select(`
      id,
      item_id,
      listing_type,
      quantity,
      price_wl,
      world_name,
      ingame_name,
      assigned_world,
      payment_required_bgl,
      payment_status,
      promotion_assigned_world,
      promotion_payment_required_bgl,
      promotion_payment_status,
      promotion_days,
      is_promoted,
      promotion_expires_at,
      status,
      created_at,
      items (
        name,
        category,
        image_url
      )
    `)
    .or("status.eq.pending,promotion_payment_status.eq.waiting_donation,promotion_payment_status.eq.pending_verification")
    .order("created_at", { ascending: false });

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, category, image_url")
    .order("name", { ascending: true });

  return (
    <main style={{ padding: "40px" }}>
      <h1>Admin Dashboard</h1>
      <p>Pending listings and promotion requests waiting for review.</p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <p>
          <strong>Your role:</strong> {profile.role}
        </p>
      </div>

      {error && <p>Error loading admin listings: {error.message}</p>}

      {!adminListings || adminListings.length === 0 ? (
        <p>No pending listings or promotion requests found.</p>
      ) : (
        <div style={{ display: "grid", gap: "20px", marginBottom: "40px" }}>
          {(adminListings as PendingListing[]).map((listing) => {
            const item = Array.isArray(listing.items) ? listing.items[0] : listing.items;

            const hasPromotionPending =
              listing.promotion_payment_status === "waiting_donation" ||
              listing.promotion_payment_status === "pending_verification";

            return (
              <section
                key={listing.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "14px",
                  padding: "20px",
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  {item?.name || "Unknown Item"}
                </h2>

                <p>
                  <strong>Category:</strong> {item?.category || "Unknown"}
                </p>
                <p>
                  <strong>Listing Type:</strong> {listing.listing_type}
                </p>
                <p>
                  <strong>Quantity:</strong> {listing.quantity}
                </p>
                <p>
                  <strong>Price:</strong> {listing.price_wl} WL
                </p>
                <p>
                  <strong>World Name:</strong> {listing.world_name || "Not provided"}
                </p>
                <p>
                  <strong>In-Game Name:</strong> {listing.ingame_name || "Not provided"}
                </p>
                <p>
                  <strong>Assigned Donation World:</strong> {listing.assigned_world || "None"}
                </p>
                <p>
                  <strong>Required Payment:</strong> {listing.payment_required_bgl ?? 0} BGL
                </p>
                <p>
                  <strong>Payment Status:</strong> {listing.payment_status || "none"}
                </p>
                <p>
                  <strong>Status:</strong> {listing.status}
                </p>

                {hasPromotionPending && (
                  <div
                    style={{
                      marginTop: "14px",
                      marginBottom: "14px",
                      padding: "14px",
                      border: "1px solid #f59e0b",
                      borderRadius: "12px",
                      background: "#fffbeb",
                    }}
                  >
                    <p style={{ marginTop: 0 }}>
                      <strong>Promotion Request Pending</strong>
                    </p>
                    <p>
                      <strong>Promotion Days:</strong> {listing.promotion_days ?? 0}
                    </p>
                    <p>
                      <strong>Promotion Payment Required:</strong>{" "}
                      {listing.promotion_payment_required_bgl ?? 0} BGL
                    </p>
                    <p>
                      <strong>Promotion Payment Status:</strong>{" "}
                      {listing.promotion_payment_status || "none"}
                    </p>
                    <p>
                      <strong>Promotion Assigned World:</strong>{" "}
                      {listing.promotion_assigned_world || "None"}
                    </p>
                  </div>
                )}

                <AdminListingActions
                  listingId={listing.id}
                  promotionPaymentStatus={listing.promotion_payment_status}
                />
              </section>
            );
          })}
        </div>
      )}

      <section style={{ marginTop: "40px" }}>
        <h2>Manage Item Images</h2>
        <p>Only admins should edit item image filenames or URLs.</p>

        {itemsError && <p>Error loading items: {itemsError.message}</p>}

        {!items || items.length === 0 ? (
          <p>No items found.</p>
        ) : (
          <div style={{ display: "grid", gap: "20px", marginTop: "20px" }}>
            {(items as AdminItem[]).map((item) => (
              <section
                key={item.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "14px",
                  padding: "20px",
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: "8px" }}>{item.name}</h3>
                <p>
                  <strong>Category:</strong> {item.category}
                </p>
                <p>
                  <strong>Current image:</strong> {item.image_url || "None"}
                </p>

                <AdminItemImageForm
                  itemId={item.id}
                  currentImageUrl={item.image_url}
                />
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}