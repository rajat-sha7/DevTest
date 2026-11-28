/**
 * Tells IndexNow engines (Bing, Yandex, Seznam, Naver...) about every URL in the
 * live sitemap, so new and changed pages get crawled without waiting.
 * The key is public by design: Bing checks it against public/<key>.txt on the site.
 * Run after a deploy: npm run indexnow            (add --dry-run to only list URLs)
 */
const KEY = "7f528f22a3bc6a376d094ba21899b769";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.devqna.online").replace(/\/+$/, "");
const dryRun = process.argv.includes("--dry-run");

const keyRes = await fetch(`${SITE}/${KEY}.txt`);
if (!keyRes.ok || (await keyRes.text()).trim() !== KEY) {
  console.error(`Key file ${SITE}/${KEY}.txt is not live yet. Deploy first, then rerun.`);
  if (!dryRun) process.exit(1);
}

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => u.startsWith(SITE));
if (!urls.length) {
  console.error("No URLs found in the sitemap.");
  process.exit(1);
}
console.log(`${urls.length} URLs from ${SITE}/sitemap.xml`);
if (dryRun) {
  console.log(urls.slice(0, 5).join("\n") + (urls.length > 5 ? "\n..." : ""));
  process.exit(0);
}

// IndexNow accepts up to 10,000 URLs per request
for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList: urls.slice(i, i + 10000),
    }),
  });
  // 200 = accepted, 202 = accepted, key check pending
  console.log(`IndexNow: ${res.status} ${res.statusText} ${await res.text()}`.trim());
  if (res.status >= 300) process.exit(1);
}
