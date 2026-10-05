# A listing stores extracted facts and a link, never the author or the full post

Posts contain personal data: author names, profile links, phone numbers. We keep only the extracted facts (kind, price, neighbourhood, size, furnished, gender restriction), a short excerpt with phone numbers stripped, and the link to the original post. No photos are copied. Phone numbers are also stripped before text is sent to the extraction model.

This keeps the site an index of posts and not a copy of them, limits exposure under Tunisian law 2004-63 on personal data, and gives authors little to object to. The cost is convenience: a student must click through to the source to see photos and to contact the author.

## Consequences

- One exception to "never the full post": post texts with phone numbers masked, and no author, may be kept in local working files that are never committed or published (the saved posts used to replay a collection run and to evaluate extraction). Extraction cannot be judged without the text it was given.
- Duplicate detection cannot rely on phone numbers or author identity, which is one reason a listing is one post in v1.
- Showing photos or contact details later means revisiting this decision, not just adding a field.
