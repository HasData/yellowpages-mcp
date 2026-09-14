# Yellow Pages MCP Server

<!-- mcp-name: com.hasdata/yellowpages -->

A hosted Model Context Protocol (MCP) server that gives Claude, Cursor, Windsurf and any other MCP client two read-only Yellow Pages tools. Search local businesses by keyword and location, then read one listing in full with its phone, hours, services and photos, both as structured JSON, with nothing to host.

It reads public Yellow Pages listings that a signed-out visitor can see, on `yellowpages.com` and `yellowpages.ca`.

**1,000 free credits every month, no card required**, which is 100 Yellow Pages calls at the 10-credit rate.

```
https://mcp.hasdata.com/api/mcp?apis=yellowpages
```

[![Glama score](https://glama.ai/mcp/servers/HasData/yellowpages-mcp/badges/score.svg)](https://glama.ai/mcp/servers/HasData/yellowpages-mcp)
[![tool contract](https://github.com/HasData/yellowpages-mcp/actions/workflows/contract.yml/badge.svg)](https://github.com/HasData/yellowpages-mcp/actions/workflows/contract.yml)
[![MCP](https://img.shields.io/badge/MCP-remote%20%7C%20streamable%20HTTP-6366f1?style=flat-square)](https://mcp.hasdata.com/api/mcp?apis=yellowpages)
[![Tools](https://img.shields.io/badge/tools-2-10b981?style=flat-square)](#tools)
[![npm](https://img.shields.io/npm/v/@hasdata/yellowpages-mcp?style=flat-square&logo=npm&label=npm&color=cb3837)](https://www.npmjs.com/package/@hasdata/yellowpages-mcp)
[![PyPI](https://img.shields.io/pypi/v/hasdata-yellowpages-mcp?style=flat-square&logo=pypi&logoColor=white&label=PyPI&color=3775a9)](https://pypi.org/project/hasdata-yellowpages-mcp/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

## Contents

- [What you need](#what-you-need)
- [Quick start](#quick-start)
- [Example prompts](#example-prompts)
- [Tools](#tools)
- [Errors and failure paths](#errors-and-failure-paths)
- [Pricing, free tier and limits](#pricing-free-tier-and-limits)
- [Tool selection](#tool-selection)
- [How it compares](#how-it-compares)
- [FAQ](#faq)
- [HasData links](#hasdata-links)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## What you need

An MCP client and a HasData API key from the [dashboard](https://app.hasdata.com/sign-up?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp), free to create with no card, and the free tier covers about 100 calls a month at the 10-credit rate. This is a remote server, so the simplest path is a URL and an `x-api-key` header, with no container to run. A client that only speaks stdio reaches it through a thin launcher, published as `@hasdata/yellowpages-mcp` on npm and `hasdata-yellowpages-mcp` on PyPI, shown below.

## Quick start

The server URL is the same for every client. We run it hands-on in Claude Code and Claude Desktop. The other blocks follow each client's own documented format for a remote server.

| Field | Value |
| :--- | :--- |
| URL | `https://mcp.hasdata.com/api/mcp?apis=yellowpages` |
| Transport | HTTP, streamable |
| Auth header | `x-api-key: HASDATA_API_KEY` |

Clients with OAuth support can add the same URL as a connector and sign in without putting a key in a config file.

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add --transport http yellowpages "https://mcp.hasdata.com/api/mcp?apis=yellowpages" \
  --header "x-api-key: HASDATA_API_KEY"
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Settings, then Connectors, then Add custom connector, then paste `https://mcp.hasdata.com/api/mcp?apis=yellowpages` and sign in.

For the config-file route, Claude Desktop loads only local (stdio) servers, so it reaches a remote server through a stdio launcher. The `@hasdata/yellowpages-mcp` package is that launcher, and it reads the key from the environment. Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "yellowpages": {
      "command": "npx",
      "args": ["-y", "@hasdata/yellowpages-mcp"],
      "env": { "HASDATA_API_KEY": "YOUR_KEY" }
    }
  }
}
```

For Python instead of Node, swap the launcher for the PyPI package, which `uvx` runs without a manual install:

```json
{
  "mcpServers": {
    "yellowpages": {
      "command": "uvx",
      "args": ["hasdata-yellowpages-mcp"],
      "env": { "HASDATA_API_KEY": "YOUR_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

`~/.cursor/mcp.json` for every project, or `.cursor/mcp.json` for one:

```json
{
  "mcpServers": {
    "yellowpages": {
      "url": "https://mcp.hasdata.com/api/mcp?apis=yellowpages",
      "headers": { "x-api-key": "HASDATA_API_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

`~/.codeium/windsurf/mcp_config.json`. Windsurf calls the field `serverUrl`, not `url`:

```json
{
  "mcpServers": {
    "yellowpages": {
      "serverUrl": "https://mcp.hasdata.com/api/mcp?apis=yellowpages",
      "headers": { "x-api-key": "HASDATA_API_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

`.vscode/mcp.json` in the workspace:

```json
{
  "servers": {
    "yellowpages": {
      "type": "http",
      "url": "https://mcp.hasdata.com/api/mcp?apis=yellowpages",
      "headers": { "x-api-key": "HASDATA_API_KEY" }
    }
  }
}
```

</details>

## Example prompts

Each of these lands on one tool, or on two in sequence when the second needs the URL the first returns.

- Find plumbers in Austin, TX and rank them by rating against review count.
- List every HVAC contractor in this zipcode with a phone number and hours.
- Which of these businesses have been trading for more than 20 years?
- Read this Yellow Pages listing and tell me which brands they service.
- Pull page 2 and 3 of roofers in Austin and merge them into one list.
- Sort dentists in this city by average rating rather than by relevance.

A prompt that names a niche and a city goes to the search tool. Reading services, brands and payment methods takes a second call per business, so a prospect list wants the search tool and an enrichment pass wants the place tool.

## Tools

| Tool | Credits | What it returns |
| :--- | :--- | :--- |
| `hasdata_yellowpages_place_getPlaceDetails` | 10 | Scrapes a single YellowPages business listing URL and returns business name, full address, phone, website, categories, years in business, hours of operation, ratings,… |
| `hasdata_yellowpages_search_getSearchResults` | 10 | Each business with name, listing URL, phone, address, categories, rating, review count, and years in business |

Two tools, 10 credits per successful call.

### Get Yellow Pages search results

[`hasdata_yellowpages_search_getSearchResults`](https://docs.hasdata.com/apis/yellowpages/search?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp)

A page of businesses for a keyword in a place, 30 to a page.

| Parameter | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `keyword` | string | yes | What to search for, such as `plumber` |
| `location` | string | yes | Where to search, such as `Austin, TX` |
| `sort` | string | | `default`, `distance`, `averageRating` or `name` |
| `domain` | string | | `www.yellowpages.com` or `www.yellowpages.ca` |
| `page` | number | | Result page, starting at 1 |

Returns `searchInformation` with the echoed query and `totalResults`, an `organicResults` array, and `pagination` with `currentPage`, `totalPages`, `perPage`, `nextPageUrl` and `otherPageUrls`.

Almost every field on a result is optional, because Yellow Pages shows what each business paid for or filled in. Across the 30 results in the sample, `title`, `phone`, `url`, `categories`, `country` and `position` arrived on all of them, `address` on 22, `rating` and `reviews` on 11, and `contactUs` on 5. Read defensively rather than assuming a shape.

```json
{
  "position": 2,
  "title": "Clarke Kent Plumbing",
  "url": "https://www.yellowpages.com/austin-tx/mip/clarke-kent-plumbing-10674347?lid=1002194068759",
  "phone": "(512) 766-0970",
  "address": "1408 W Ben White Blvd",
  "city": "Austin",
  "region": "TX",
  "zipcode": "78704",
  "country": "US",
  "website": "http://www.clarkekentplumbing.com",
  "directions": "https://www.yellowpages.com/listings/1002194068759/directions",
  "categories": ["Plumbers", "Plumbing-Drain & Sewer Cleaning"],
  "rating": 2.87,
  "reviews": 15,
  "workingHours": ["Mo-Fr 09:00-17:00"],
  "openState": "open now",
  "badges": ["40 Years in Business", "1 Year with Yellow Pages"]
}
```

### Get Yellow Pages place details

[`hasdata_yellowpages_place_getPlaceDetails`](https://docs.hasdata.com/apis/yellowpages/place?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp)

One listing in full, by its Yellow Pages URL.

| Parameter | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `url` | string | yes | The listing URL, as the search tool returns it |

Returns four blocks rather than one flat object.

`overview` repeats the name, location, phone, hours, badges and website, and adds `paymentAccepted` and a `breadcrumbs` array showing where the listing sits in the Yellow Pages taxonomy. `ratings` holds the star rating. `details` holds the long-form copy the business wrote. `images` is an array of photo URLs.

The `details` block is where the enrichment value sits, and it arrives as comma-joined text rather than as arrays. `generalInfo` is the business description, `servicesProducts` the service list, `brands` the brands they carry, `paymentMethod` the payment types and `categories` the full category list as one string.

```json
{
  "overview": {
    "title": "ARS Rescue Rooter",
    "phone": "(833) 947-9225",
    "city": "Austin",
    "region": "TX",
    "zipcode": "78754",
    "workingHours": ["Mo-Su"],
    "openState": "Open 24 hours",
    "paymentAccepted": "visa, amex, master card",
    "badges": ["1 Year with Yellow Pages"],
    "breadcrumbs": ["TX", "Austin", "Building Contractors", "Plumbers"]
  },
  "ratings": { "rating": 3.5 },
  "details": {
    "generalInfo": "ARS/Rescue Rooter has a proven track record of providing reliable, long-lasting repair services...",
    "servicesProducts": "Air Conditioner Repair and Replacement, Air Duct Repair and Replacement, Air Filter Installation...",
    "brands": "Goodman, Mitsubishi, Bosch, Diakin, Bradford White, April Aire Indoor Air Quality",
    "paymentMethod": "visa, amex, master card"
  },
  "images": ["https://i4.ypcdn.com/blob/ce73451958465ab47dd7be41922973a98bc847af_640.jpg"]
}
```

## Errors and failure paths

Plan for these rather than assuming a happy path.

**For a review count, read the search result rather than the place detail.** On the search tool, `rating` and `reviews` are what they look like, such as `2.87` and `15`. On the place tool, `ratings.reviews` comes back equal to `ratings.rating` on every listing we checked, so it carries no count. Take the number from the search result and enrich from there.

**`ratings` can be absent from a place response entirely.** One of the four listings we pulled had no block at all rather than an empty one.

**`details` fields are comma-joined strings, and `categories` changes type between the tools.** In a search result `categories` is an array. In `details` it is one string. Split on the comma if you need a list, and expect the odd category name to contain one.

**`website` sometimes points back at Yellow Pages.** Several listings carry a `yellowpages.com` tracking URL in the field where you would expect the business's own site. Check the host before you follow it or store it.

**Years in business is a badge, not a field.** `badges` mixes two different things: how long the business has traded, as `"40 Years in Business"`, and how long it has paid Yellow Pages, as `"11 Years with Yellow Pages"`. Read the wording rather than the first number.

**A street address is not guaranteed.** `address` held the street line on 22 of 30 results, and `city`, `region` and `zipcode` arrive as separate fields alongside it. Build the address from the parts you have.

**`openState` is the state at the moment of the call.** It says `closed` or `Open 24 hours` for the time the request ran, so it is a snapshot rather than a property of the business. `workingHours` is the durable field.

**Paging is by URL, and a query can run long.** `pagination.totalPages` reached 17 for one city and one keyword, at 30 results a page. Cost scales with pages, so narrow the keyword before you walk them all.

Results that carry data also carry a `requestMetadata.id` worth quoting in support.

## Pricing, free tier and limits

Each Yellow Pages tool costs **10 credits per successful call**. Response size does not change the price, so a 30-business page costs the same as one listing detail.

The free tier is **1,000 credits every month with no card**, which is 100 Yellow Pages calls at the base rate. It renews with the billing cycle, so a low-volume agent runs on the free tier indefinitely.

Paid plans start at **$49 a month** for 200,000 credits, which is 20,000 calls. The unit price falls with volume, from **$2.45 per 1,000 calls** on the entry plan to **$1.00** on Business, **$0.84** on Growth and **$0.74** on the largest [high-volume plans](https://hasdata.com/prices?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp).

Your plan also sets concurrency. The free tier allows 1 request at a time, Startup 15, Business 30, Growth 50, and the high-volume plans run from 200 to 1,500. Retry on the 429 with a backoff in anything unattended, because an agent that enriches a page of businesses will reach the ceiling before you do.

A request that comes back non-200 is not billed. A successful call that finds nothing is still a call.

## Tool selection

Start from what the prompt gives you. A niche and a city go to the search tool, and a Yellow Pages URL goes straight to the place tool.

Then weigh the enrichment. The search result already carries name, phone, address, categories, hours, badges and, where Yellow Pages shows them, the rating and review count. That covers a prospect list, a coverage count or a rating comparison in one call. The place tool adds the description, the service list, the brands and the photos, and it costs one call per business, so 30 businesses enriched cost 300 credits against the 10 the page cost.

Sort server-side when the question is about order. `sort: averageRating` is one parameter, where pulling several pages to sort locally is several calls.

## How it compares

Yellow Pages has no public API, so the realistic alternatives are the two big local-data APIs.

| | Google Places API | Yelp Fusion API | This server |
| :--- | :--- | :--- | :--- |
| Eligibility | A billed Google Cloud project | An approved developer app | An API key |
| Services and brands | Not returned | Not returned | The `details` block |
| Payment methods | Not returned | Partly, as attributes | As written |
| Years in business | Not returned | Not returned | In `badges` |
| Photos | Via a separate billed call | Included | An array of URLs |
| Canada | Covered | Covered | `yellowpages.ca` |
| Coverage | Broadest | Consumer-heavy | Trades and services |

The row that decides it is what a listing says about itself. Google and Yelp return a structured record, and Yellow Pages returns the copy a contractor wrote about their own services, brands and payment terms, which is the part a trades prospect list is built on. For coverage, hours accuracy and consumer categories, Google Places is the stronger source.

## FAQ

### Is there an official Yellow Pages MCP server?

Yellow Pages does not publish one, and it does not publish a public API either. This one is maintained by HasData and reads public Yellow Pages listings.

### What is a Yellow Pages MCP server?

An MCP server exposes tools an AI client can call. This one turns Yellow Pages searches and listings into JSON an agent can reason over, without a browser or a scraping library in your stack.

### Do I need a Yellow Pages account?

No. The only credential is your HasData key.

### Which countries are covered?

The US on `www.yellowpages.com` and Canada on `www.yellowpages.ca`. Pass `domain` to switch.

### Why is a field missing from some results?

Because Yellow Pages shows what each business filled in or paid for. A rating arrived on 11 of 30 results in our sample and a street address on 22. Treat everything except the name, phone, URL and categories as optional.

### How do I get a review count?

From the search result, where `reviews` is a count. The place tool's `ratings.reviews` mirrors the rating rather than counting reviews, so it is not the field for that.

### Can I use this together with other HasData APIs?

Yes. One key covers everything, and one endpoint serves them all through the `apis` parameter. Point a client at `?apis=yellowpages,google_maps` to get both tool sets in one connection, or at [`mcp.hasdata.com/api/mcp`](https://docs.hasdata.com/mcp-server?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp) for the full catalogue.

### Is HasData affiliated with Yellow Pages?

No. HasData is an independent service and is not affiliated with, endorsed by, or sponsored by Thryv or the Yellow Pages brand. Yellow Pages is a trademark of its respective owner. The tools work with publicly available data only, and you are responsible for using the results in line with the site's terms and the law that applies to you.

### Compliance and personal data

These listings are business records, and the obvious use is a lead list. That is where the care belongs, because calling and texting the phone numbers you collect is regulated separately from collecting them. In the US the TCPA governs calls and texts to those numbers, including to businesses in several respects, and the FTC's telemarketing rules apply on top. A sole trader's listing can also carry their own name and mobile number, which makes it personal data as well as a business record. Collecting the list is the easy part, so check what you are allowed to do with it before you build the outreach.

## HasData links

- [Yellow Pages Scraper API](https://hasdata.com/apis/yellow-pages-api?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp), the REST endpoints behind these tools
- [API documentation](https://docs.hasdata.com/apis/yellowpages/search?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp)
- [MCP server documentation](https://docs.hasdata.com/mcp-server?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp)
- [Pricing](https://hasdata.com/prices?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp)
- [Dashboard](https://app.hasdata.com/sign-up?utm_source=github&utm_medium=syndication&utm_campaign=yellowpages-mcp)

Other HasData MCP servers: [Google Maps](https://github.com/HasData/google-maps-mcp), [Yelp](https://github.com/HasData/yelp-mcp), [Google Search](https://github.com/HasData/google-search-mcp), [Google Trends](https://github.com/HasData/google-trends-mcp), [Google Flights](https://github.com/HasData/google-flights-mcp), [DuckDuckGo](https://github.com/HasData/duckduckgo-mcp), [YouTube](https://github.com/HasData/youtube-mcp), [TikTok](https://github.com/HasData/tiktok-mcp), [Instagram](https://github.com/HasData/instagram-mcp), [Amazon](https://github.com/HasData/amazon-mcp), [Walmart](https://github.com/HasData/walmart-mcp), [Shopify](https://github.com/HasData/shopify-mcp), [Zillow](https://github.com/HasData/zillow-mcp), [Redfin](https://github.com/HasData/redfin-mcp), [Airbnb](https://github.com/HasData/airbnb-mcp), [Booking.com](https://github.com/HasData/booking-mcp), [Indeed](https://github.com/HasData/indeed-mcp), [Glassdoor](https://github.com/HasData/glassdoor-mcp).

## Development

The launcher is a thin stdio bridge to the remote server, so there is nothing to build.

```bash
npm install
HASDATA_API_KEY=your_key_here npm test
```

The tests in `test/` assert the tool contract, the part that can break without a commit here. They check that `?apis=yellowpages` returns the expected tool count, that no name changed, that every tool still declares its required parameters and carries a description, that `sort` still offers the four orders, and that the key in use is actually accepted. That last check calls a tool for real and costs 10 credits, which is the price of a canary that can fail for the right reason.

One test asserts that a live search still carries a real review count on the results that have one. The README sends readers to the search tool for that number precisely because the place tool does not give it, and the advice only holds while the field does.

The contract suite also runs weekly on a schedule, because the upstream tool list can change without anyone touching this repository.

## Contributing

A tool table, a response sample or a documented behaviour that does not match reality is worth an issue. There is a template for exactly that. Pull requests are welcome for the same, and for anything in the launcher.

## License

MIT, see [LICENSE](LICENSE).
