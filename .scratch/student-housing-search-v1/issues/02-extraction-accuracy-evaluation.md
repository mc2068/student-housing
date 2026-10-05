# 02: Extraction accuracy evaluation

**What to build:** The site owner can measure how well extraction works. About 50 real posts from the pipeline proof are kept as an evaluation set, each with the facts a person would expect (offer or not and why, kind, price, neighbourhood, size, furnished, gender restriction). One command runs extraction over the set and reports accuracy per field and how many demands were correctly rejected. It is a manual evaluation to re-run whenever the prompt or model changes, not an automated test, since a model's answers vary.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The evaluation set holds about 50 real posts covering offers, demands and unrelated posts, in French, Arabic and Tunisian Arabic in Latin letters
- [ ] Posts in the set have phone numbers masked and carry no author identity
- [ ] The expected facts are drafted for the owner and confirmed or corrected by the owner
- [ ] One command reports accuracy per field and the demand-rejection rate
- [ ] The command names each post where extraction and expectation differ, so the prompt can be improved
- [ ] The first scores are recorded in this ticket's comments
- [ ] The evaluation is kept out of the automated test run
