import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import EditListingForm from "../../../components/edit-listing-form";

type Item = {
  id: number;
  name: string;
  category: string;
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      listing_category,
      item_id,
      listing_type,
      quantity,
      price_amount,
      price_currency,
      pricing_mode,
      stock,
      world_name,
      world_sale_name,
      world_sale_description,
      ingame_name,
      is_promoted,
      promotion_expires_at,
      promotion_payment_status
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (listingError || !listing) {
    redirect("/my-listings");
  }

  const isPromotionActive =
    listing.is_promoted &&
    listing.promotion_expires_at &&
    new Date(listing.promotion_expires_at) > new Date();

  if (
    isPromotionActive ||
    listing.promotion_payment_status === "awaiting_donation" ||
    listing.promotion_payment_status === "pending_verification"
  ) {
    redirect("/my-listings");
  }

  const { data: items } = await supabase
    .from("items")
    .select("id, name, category")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Edit Listing</h1>
          <p className="mt-2 text-zinc-400">
            Update your listing details without reposting.
          </p>
        </div>

        <EditListingForm
          listing={listing}
          items={(items || []) as Item[]}
        />
      </div>
    </main>
  );
}