/** The hosted database, or the copy of it `npm run preview` reads on this machine. Both are Cloudflare D1. */
export type D1Target = "hosted" | "preview";

/**
 * Which of the two a command's arguments name, if either, and the arguments that are left. A command given
 * neither acts on its usual database. `--preview` wins: `npm run hosted:sql -- --preview "…"` carries both.
 */
export function readD1Target(args: string[]): { target: D1Target | undefined; rest: string[] } {
  const target = args.includes("--preview") ? "preview" : args.includes("--hosted") ? "hosted" : undefined;
  return { target, rest: args.filter((arg) => arg !== "--preview" && arg !== "--hosted") };
}
