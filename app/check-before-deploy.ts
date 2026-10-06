// Run by `npm run deploy` between building the site and sending it to Cloudflare (docs/deploy.md).
// The build copies every value of the project's .env files (.env, .env.local, .env.production…) into the
// site it sends. The report address is meant to travel that way; a key is not. This stops the deploy when
// the built site carries anything but the address, or no usable address. It prints names, never values.
import { pathToFileURL } from "node:url";
import { hostedDatabaseId } from "../db/wrangler-config";

const stop = (reason: string): never => {
  console.error(`Not deployed: ${reason}`);
  process.exit(1);
};

const built = pathToFileURL(".open-next/cloudflare/next-env.mjs").href;
const modes = (await import(built)) as Record<string, Record<string, string>>;

const names = new Set(Object.values(modes).flatMap((values) => Object.keys(values)));
names.delete("REPORT_EMAIL");
if (names.size > 0) {
  stop(
    `the built site would carry ${[...names].join(", ")}. ` +
      "Keep only REPORT_EMAIL in .env.local and move the collection keys to .env.collect (see .env.example).",
  );
}

const email = modes.production?.REPORT_EMAIL?.trim();
if (!email || email.endsWith("@example.com")) {
  stop("put the real address that receives reports in .env.local, as REPORT_EMAIL.");
}

try {
  hostedDatabaseId();
} catch (err) {
  stop(err instanceof Error ? err.message : String(err));
}

console.log("Checked: the built site carries the report address and no key.");
