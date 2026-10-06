import { type Scores, shown } from "./score";
import type { EvaluationSet } from "./set";

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One page to read every post next to its expected facts, for the site owner to confirm or correct them. */
export function reviewPage(set: EvaluationSet, scores: Scores): string {
  const differing = new Map(scores.differing.map(({ post, differences }) => [post.n, differences]));
  const unread = new Set(scores.unread.map((post) => post.n));

  const rows = set.posts.map((post) => {
    const { result, ...facts } = post.expected;
    const expected = [`<strong>${result}</strong>`, ...Object.entries(facts).map(([fact, value]) => `${fact}: ${escapeHtml(shown(value))}`)];
    const extracted = unread.has(post.n)
      ? ["not read"]
      : (differing.get(post.n) ?? []).map((d) => `${d.field}: ${escapeHtml(d.extracted)}`);
    return `<tr${extracted.length > 0 ? ' class="differs"' : ""}>
<td>#${post.n}<br><small>${post.language}</small></td>
<td><p dir="auto">${escapeHtml(post.text)}</p><a href="${escapeHtml(post.url)}">post</a></td>
<td>${expected.join("<br>")}</td>
<td>${extracted.join("<br>")}</td>
<td>${escapeHtml(post.note ?? "")}</td>
</tr>`;
  });

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Evaluation set: expected facts</title>
<style>
body { font: 15px/1.4 system-ui, sans-serif; margin: 1.5rem; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #bbb; padding: .4rem .6rem; vertical-align: top; text-align: left; }
td p { margin: 0 0 .3rem; white-space: pre-wrap; max-width: 60ch; }
td:nth-child(3), td:nth-child(4) { white-space: nowrap; }
tr.differs td:nth-child(4) { background: #fde9c8; }
</style>
<h1>Evaluation set: expected facts</h1>
<p>${set.reviewed ? "Confirmed by the site owner." : "Drafted, not yet confirmed by the site owner."} ${escapeHtml(set.note)}</p>
<p>Read each post and check the column "Expected". The column "Extraction answered" shows only what the models
answered differently in the last run: a likely place for a wrong expectation, or for a real miss.</p>
<p>To correct a post, change its <code>expected</code> in <code>proof/evaluation-set.json</code> (posts are in the
same order, each with its number <code>n</code>). When every post is right, set <code>reviewed</code> to
<code>true</code> at the top of that file. Then run <code>npm run evaluate -- --keep-answers</code>: it scores the
saved answers again without calling a model and rewrites this page.</p>
<table>
<tr><th>Post</th><th>Text</th><th>Expected</th><th>Extraction answered</th><th>Note</th></tr>
${rows.join("\n")}
</table>
</html>
`;
}
