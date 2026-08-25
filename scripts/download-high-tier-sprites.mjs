/**
 * Fetch Growtopia sprites from Imgur albums into public/images/items/{id}.png
 * Usage: node scripts/download-high-tier-sprites.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/images/items");
const CLIENT = "546c25a59c58ad7";

/** album id → item id (must match src/data/highTierItems.ts) */
const ALBUMS = [
  ["NPwqnLv", "nightkings_cape_midnight_blue"],
  ["m4MkY4K", "curse_wand"],
  ["tqodIWJ", "phonecats_hat"],
  ["bjM97wf", "dark_cult_hood"],
  ["ScWuvno", "focused_eyes"],
  ["5aWaL3e", "radiant_doom_staff"],
  ["t7mbrt6", "hellfire_horns_ruby"],
  ["8E9NXE0", "morty_the_diamond_elephant"],
  ["Wi156yd", "golden_pickaxe"],
  ["5F75Fy6", "burning_pearl_spinner"],
  ["DAS1C01", "oceanaura"],
  ["csNCDQG", "oldsocks_old_mate_ricky"],
  ["sRzBDwx", "pearl_treasured_octopus"],
  ["cx1GIOo", "mystic_battle_lance"],
  ["YvOJXLN", "giant_eye_head"],
  ["0VXwUQw", "curse_of_the_pink_pearl"],
  ["fQ4uRBc", "neptunes_trident"],
  ["EElTEKa", "ghost_pirate_scimitar"],
  ["HJukViH", "phoenix_wings"],
  ["5ESrzqa", "neptunes_chariot"],
  ["2qGzktS", "legendary_wings"],
  ["vTqXBLN", "stethoscope"],
  ["W6SdOL1", "neptunes_crown"],
  ["jwQqamY", "possessing_scarf"],
  ["8qqywyK", "da_vinci_wings"],
  ["tNBPkQq", "growie_award"],
  ["DB5VT8a", "morty_the_pink_elephant"],
  ["YpYL4OT", "legendary_title"],
  ["YN2Lb9I", "snowglobe_staff"],
  ["cxBEu6f", "mothman_wings"],
  ["sPRxPa2", "emerald_lock"],
  ["JDF5dI9", "neptunes_armor"],
  ["TjTVdVX", "legendary_katana"],
  ["tg3l8l4", "whip_of_truth"],
  ["hxn1kPu", "legendbot_009"],
  ["SX8RHq4", "holiday_light_scarf"],
  ["6Vdzt5l", "ruby_lock"],
  ["XwpOChr", "mantle_of_deepest_winter"],
  ["AMcz50G", "golden_heart_crystal"],
  ["TTseUw6", "golden_angel_wings"],
  ["DxWIgSw", "golden_diamond_necklace"],
  ["ZsuBy2H", "golden_air_robinsons"],
  ["LWTQfld", "heavenly_scythe"],
  ["waddkku", "golden_diaper"],
  ["8q7VIMI", "datemasters_heart_locket"],
  ["oWzQaX5", "golden_heartbow"],
  ["qhgX6xW", "golden_heart_glasses"],
  ["SsEb6C9", "raymans_fist"],
  ["o2IDpoD", "golden_heart_aura"],
  ["RfcC1D6", "golden_silk_scarf"],
  ["kgK1Xcj", "phoenix_scarf"],
  ["Jnm13LO", "golden_talaria"],
  ["rZ1gttp", "teeny_golden_wings"],
  ["l2qd1yv", "golden_sparkling_mallet"],
  ["NMealxl", "golden_pegasus"],
  ["bwcBgzw", "golden_heartstaff"],
  ["EtdgU8g", "golden_sunset_cape"],
  ["qyfiv6D", "golden_heartbreak_wings"],
  ["YifP5ZH", "draconic_wings"],
  ["d3ZgFsh", "golden_love_bug"],
  ["D9pUfhF", "sun_blade"],
  ["kcMgMMI", "space_cat"],
  ["pFDbsC4", "royal_lock"],
  ["xtI0cNd", "growscan_9000"],
  ["RzdItJM", "dragon_of_legend"],
  ["6UAsuqs", "sonic_buster_sword"],
  ["Ekjc1jZ", "phoenix_crown"],
  ["gA095aS", "neptunes_weather_machine_atlantis"],
  ["25mzPdC", "phoenix_pacifier"],
  ["xfLgXny", "dancemasters_crown"],
  ["FxKTG6h", "phoenix_sword"],
  ["dcNcSVo", "draconic_soul_aura"],
  ["zngSHP8", "draconic_spirit_mount"],
  ["mscxn2W", "ultraviolet_aura"],
  ["eC8cbYD", "alaskan_king_crab_crown"],
  ["xO6f59e", "magplant_5000"],
  ["FC9U9Fu", "weather_machine_pagoda"],
  ["GyDeiAS", "ultraviolet_sword"],
  ["xatbMw1", "ultraviolet_wings"],
  ["bRrhd56", "phoenix_sickles"],
];

const UA = "Mozilla/5.0 (compatible; SeedBET-catalog/1.0)";

async function albumMedia(album) {
  const url = `https://api.imgur.com/post/v1/albums/${album}?client_id=${CLIENT}&include=media`;
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
  if (!res.ok) throw new Error(`album ${album} HTTP ${res.status}`);
  const json = await res.json();
  const media = json.media?.[0];
  if (!media?.url) throw new Error(`album ${album} has no media`);
  return media;
}

async function downloadOne([album, id]) {
  const media = await albumMedia(album);
  const img = await fetch(media.url, { headers: { "User-Agent": UA } });
  if (!img.ok) throw new Error(`${id} image HTTP ${img.status}`);
  const buf = Buffer.from(await img.arrayBuffer());
  const ext = (media.ext || "png").replace(/^\./, "").toLowerCase();
  const dest = join(OUT, `${id}.png`);
  if (ext !== "png") {
    console.warn(`WARN ${id}: album ${album} is ${media.mime_type} (${ext}), saving bytes as .png`);
  }
  await writeFile(dest, buf);
  return { id, album, bytes: buf.length, mime: media.mime_type, w: media.width, h: media.height };
}

await mkdir(OUT, { recursive: true });

const failed = [];
const ok = [];
const batchSize = 6;
for (let i = 0; i < ALBUMS.length; i += batchSize) {
  const batch = ALBUMS.slice(i, i + batchSize);
  const results = await Promise.allSettled(batch.map(downloadOne));
  for (let j = 0; j < results.length; j++) {
    const r = results[j];
    const [album, id] = batch[j];
    if (r.status === "fulfilled") {
      ok.push(r.value);
      console.log(`ok ${id} ${r.value.w}x${r.value.h} ${r.value.bytes}b`);
    } else {
      failed.push({ album, id, error: String(r.reason) });
      console.error(`FAIL ${id} (${album}): ${r.reason}`);
    }
  }
}

console.log(`\nDownloaded ${ok.length}/${ALBUMS.length}`);
if (failed.length) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
