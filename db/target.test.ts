import { describe, expect, it } from "vitest";
import { readD1Target } from "./target";

describe("which database a command's arguments name", () => {
  it("is neither the hosted database nor the preview copy unless one is named", () => {
    expect(readD1Target(["SELECT url FROM listings"])).toEqual({ target: undefined, rest: ["SELECT url FROM listings"] });
  });

  it("is the hosted database with --hosted, wherever it stands", () => {
    expect(readD1Target(["--posts", "2", "--hosted"])).toEqual({ target: "hosted", rest: ["--posts", "2"] });
  });

  // `npm run hosted:sql -- --preview "…"` reaches the command as `--hosted --preview "…"`.
  it("is the preview copy with --preview, even next to --hosted", () => {
    expect(readD1Target(["--hosted", "--preview", "SELECT 1"])).toEqual({ target: "preview", rest: ["SELECT 1"] });
    expect(readD1Target(["schema", "--preview"])).toEqual({ target: "preview", rest: ["schema"] });
  });
});
