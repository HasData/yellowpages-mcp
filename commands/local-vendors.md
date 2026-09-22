---
description: A vetted shortlist of local businesses for a trade and a place
---

Find local businesses.

Ask me for the trade and the place if I have not given them, in the shape `plumber` and `Austin, TX`.

Then:

1. Call `hasdata_yellowpages_search_getSearchResults` with `keyword` and `location`. Add `sort` when I asked for nearest or best rated, and set `domain` to `www.yellowpages.ca` for a Canadian city.
2. Say how many rows this page holds, what `searchInformation.totalResults` says the search found, and how many rows carry a `rating` at all. Those are three different numbers and only the second one describes the market.
3. Page by incrementing `page` if this page is thin for what I asked, checking `totalPages` first, and say how many pages you pulled.
4. List the candidates with `title`, `phone`, the address parts, `categories`, `website` when present, `openState` and `workingHours`. Keep the hours from the search row, because the detail call does not carry them.
5. Split them into the rated and the unrated, and rank only inside the rated group. Say the unrated ones are unrated rather than ranking them last, and quote `reviewText` where a row has one.
6. Open the three I pick with `hasdata_yellowpages_place_getPlaceDetails`, and report what `details` says about services and neighborhoods, the score from `ratings`, and what reviewers praise or complain about.
7. Take the reviews in the order the feed gives them when I ask for recent ones. The `date` field is written year, day, month, so sorting it as an ISO date is wrong.

Phone numbers and hours come from YellowPages and go stale. Say when you pulled the listing and tell me to confirm before anyone drives anywhere.
