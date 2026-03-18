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

const TARGET_LIMIT = 3000;

// Expanded category pool so you get many more DIFFERENT items
const CATEGORY_TITLES = [
  "Category:Perma-items",
  "Category:Item_Of_The_Month",
  "Category:Monthly_Subscriber's_Items",
  "Category:Role_Quest_Items",
  "Category:Untradeable_Items",
  "Category:Clothes",
  "Category:Back_Items",
  "Category:Hair_Items",
  "Category:Face_Items",
  "Category:Hand_Items",
  "Category:Shirt_Items",
  "Category:Pants_Items",
  "Category:Shoes_Items",
  "Category:Accessory_Items",
  "Category:Weather_Machines",
  "Category:Locks",
  "Category:Machines",
  "Category:Foreground_Block_Items",
  "Category:Background_Block_Items",
  "Category:Platform_Items",
  "Category:Seed",
  "Category:Consumables",
  "Category:Fishing_Items",
  "Category:Science_Items",
  "Category:Surgery_Items",
  "Category:Halloween_Items",
  "Category:Valentine_Items",
  "Category:SummerFest_Items",
  "Category:WinterFest_Items",
  "Category:Harvest_Festival_Items",
  "Category:Block_Items",
  "Category:Item",
];

// Items you do NOT want cluttering your marketplace
const EXCLUDED_EXACT = new Set([
  "World Lock",
  "Diamond Lock",
  "Blue Gem Lock",
  "Black Gem Lock",
  "World Lock (disambiguation)",
  "Crown (disambiguation)",
  "Seed",
  "Seeds",
]);

const EXCLUDED_CONTAINS = [
  "disambiguation",
  "subscription",
  "achievement",
  "token pack",
  "developer note",
];

function normalizeItemName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function cleanItemName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function shouldExclude(name: string) {
  if (EXCLUDED_EXACT.has(name)) return true;

  const lower = name.toLowerCase();
  return EXCLUDED_CONTAINS.some((word) => lower.includes(word));
}

async function fetchCategoryMembers(categoryTitle: string, limit = 500) {
  const allTitles: string[] = [];
  let cmcontinue: string | null = null;

  while (allTitles.length < limit) {
    const url = new URL("https://growtopia.fandom.com/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", categoryTitle);
    url.searchParams.set("cmlimit", "500");
    url.searchParams.set("cmtype", "page");

    if (cmcontinue) {
      url.searchParams.set("cmcontinue", cmcontinue);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "GrowtopiaTrade/1.0 dataset importer",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${categoryTitle}`);
    }

    const data = await res.json();
    const members = data?.query?.categorymembers || [];

    for (const member of members) {
      if (typeof member?.title === "string") {
        allTitles.push(member.title);
        if (allTitles.length >= limit) break;
      }
    }

    cmcontinue = data?.continue?.cmcontinue || null;
    if (!cmcontinue) break;

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return allTitles;
}

function guessCategoryFromName(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("wing")) return "Wings";
  if (lower.includes("weather machine")) return "Weather";
  if (lower.includes("lock")) return "Locks";
  if (lower.includes("seed")) return "Seeds";
  if (lower.includes("shirt")) return "Clothing";
  if (lower.includes("pants")) return "Clothing";
  if (lower.includes("shoe")) return "Clothing";
  if (lower.includes("hair")) return "Clothing";
  if (lower.includes("mask")) return "Accessory";
  if (lower.includes("sword")) return "Weapon";
  if (lower.includes("blade")) return "Weapon";
  if (lower.includes("fist")) return "Weapon";
  if (lower.includes("machine")) return "Machine";
  if (lower.includes("block")) return "Block";
  if (lower.includes("background")) return "Block";
  if (lower.includes("platform")) return "Block";
  if (lower.includes("tree")) return "Farming";
  if (lower.includes("fish")) return "Fishing";
  if (lower.includes("surg")) return "Surgery";
  if (lower.includes("science")) return "Science";

  return "General";
}

async function buildRealItemDataset() {
  const collected: string[] = [];

  for (const categoryTitle of CATEGORY_TITLES) {
    try {
      const items = await fetchCategoryMembers(categoryTitle, 500);
      collected.push(...items);
    } catch (error) {
      console.log(`Skipped ${categoryTitle}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const deduped = new Map<string, string>();

  for (const rawName of collected) {
    const name = cleanItemName(rawName);

    if (!name) continue;
    if (shouldExclude(name)) continue;

    const normalized = normalizeItemName(name);

    if (!deduped.has(normalized)) {
      deduped.set(normalized, name);
    }
  }

  return Array.from(deduped.entries())
    .slice(0, TARGET_LIMIT)
    .map(([normalized_name, name]) => ({
      name,
      normalized_name,
      category: guessCategoryFromName(name),
      image_url: null,
      is_official: true,
      needs_review: false,
    }));
}

async function run() {
  const rows = await buildRealItemDataset();

  if (!rows.length) {
    console.error("No items were collected.");
    process.exit(1);
  }

  const { error } = await supabase.from("items").upsert(rows, {
    onConflict: "normalized_name",
  });

  if (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }

  console.log(`Seeded or updated ${rows.length} item names successfully.`);
}

run();