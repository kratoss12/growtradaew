import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type ItemRow = {
  id: number;
  name: string;
};

async function fetchFandomThumbnail(name: string) {
  const url =
    `https://growtopia.fandom.com/api.php?action=query&format=json&prop=pageimages` +
    `&piprop=thumbnail&pithumbsize=200&titles=${encodeURIComponent(name)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const pages = data?.query?.pages;

  if (!pages) return null;

  const firstPage = Object.values(pages)[0] as any;
  return firstPage?.thumbnail?.source || null;
}

async function run() {
  const { data, error } = await supabase
    .from("items")
    .select("id, name")
    .is("image_url", null)
    .limit(200);

  if (error) {
    console.error("Load items error:", error.message);
    process.exit(1);
  }

  const items = (data || []) as ItemRow[];

  for (const item of items) {
    try {
      const imageUrl = await fetchFandomThumbnail(item.name);

      if (!imageUrl) {
        console.log(`No image found for: ${item.name}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("items")
        .update({ image_url: imageUrl })
        .eq("id", item.id);

      if (updateError) {
        console.log(`Update failed for ${item.name}: ${updateError.message}`);
        continue;
      }

      console.log(`Updated image for: ${item.name}`);
    } catch {
      console.log(`Failed for ${item.name}`);
    }
  }

  console.log("Done fetching images.");
}

run();