// The hosted database from this machine's terminal, through Cloudflare's own tool (wrangler) and the
// owner's login to it. The website does not use this: it reads through its binding (db/d1.ts).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** The hosted database's name on Cloudflare, as wrangler.jsonc has it. */
export const DATABASE_NAME = "student-housing";

/** The hosted database itself, or the copy `npm run preview` reads on this machine. */
export const HOSTED = "--remote";
export const PREVIEW = "--local";
export type Where = typeof HOSTED | typeof PREVIEW;

// Wrangler is started directly, with no shell in between, so a statement reaches it exactly as written.
const WRANGLER = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));

const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Wrangler's answer as text; an error it reports becomes an error here, with its wording. */
function wrangler(args: string[]): string {
  const { stdout, stderr, status } = spawnSync(process.execPath, [WRANGLER, "d1", "execute", DATABASE_NAME, "--json", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (status !== 0) {
    const reported = parsed(stdout) as { error?: { text?: string } } | undefined;
    throw new Error(reported?.error?.text ?? (`${stdout}\n${stderr}`.trim() || "Cloudflare's tool failed without a word."));
  }
  return stdout;
}

/** Runs one statement and returns its rows. */
export function onD1(where: Where, statement: string): Record<string, unknown>[] {
  const stdout = wrangler([where, "--command", statement]);
  const answer = parsed(stdout) as { results?: Record<string, unknown>[] }[] | undefined;
  if (!Array.isArray(answer)) throw new Error(`Cloudflare's tool did not answer as expected:\n${stdout}`);
  return answer[0]?.results ?? [];
}

/** Runs every statement of a file, such as db/schema.sql. */
export function fileOnD1(where: Where, file: string): void {
  wrangler([where, "--yes", "--file", file]);
}
