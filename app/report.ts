// Reporting a listing: an email to the site owner, who hides the listing by hand (docs/hide-a-listing.md).

/** The site owner's address. It is set in the environment (REPORT_EMAIL) and written nowhere else. */
function reportEmail(): string {
  const email = process.env.REPORT_EMAIL?.trim();
  if (!email) throw new Error("Missing REPORT_EMAIL");
  return email;
}

/** A link that opens an email to the site owner about a listing, with the listing's link filled in. */
export function reportLink(listingUrl: string): string {
  const subject = "Signalement d'une annonce";
  // Line breaks in a mailto link are CRLF.
  const body = [
    `Annonce signalée : ${listingUrl}`,
    "",
    "Motif (arnaque, annonce à retirer à la demande de son auteur, autre) :",
    "",
  ].join("\r\n");
  return `mailto:${reportEmail()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
