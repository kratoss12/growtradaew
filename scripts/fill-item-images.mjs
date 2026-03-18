import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is missing from .env.local");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing from .env.local");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function normalizeTitle(name) {
  return name.replace(/ /g, "_");
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

async function getImageFromWiki(itemName) {
  const title = normalizeTitle(itemName);

  const apiUrl =
    `https://growtopia.fandom.com/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;

  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent": "GrowtopiaTrade/1.0 image importer",
    },
  });

  if (!res.ok) {
    throw new Error(`Wiki request failed for ${itemName}`);
  }

  const data = await res.json();
  const html = data?.parse?.text?.["*"];

  if (!html) {
    return null;
  }

  const match = html.match(
    /https:\/\/static\.wikia\.nocookie\.net\/growtopia\/images\/[^"' )]+/i
  );

  if (!match) {
    return null;
  }

  return decodeHtmlEntities(match[0]);
}

async function main() {
  const { data: items, error } = await supabase
    .from("items")
    .select("id, name")
    .is("image_url", null)
    .limit(200)
    .order("id");

  if (error) {
    throw error;
  }

  for (const item of items) {
    try {
      const imageUrl = await getImageFromWiki(item.name);

      if (!imageUrl) {
        console.log(`No image found for ${item.name}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("items")
        .update({ image_url: imageUrl })
        .eq("id", item.id);

      if (updateError) {
        console.log(`DB update failed for ${item.name}: ${updateError.message}`);
        continue;
      }

      console.log(`Saved image for ${item.name}`);
    } catch (err) {
      console.log(`Failed for ${item.name}: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});