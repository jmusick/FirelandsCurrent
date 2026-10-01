# News sources and story workflow

How Firelands Current finds, checks and publishes local news. Read this before writing stories. Story fields and the media library are covered in [README.md](../README.md); code conventions are in [AGENTS.md](../AGENTS.md).

## Editorial rules

- **Write original reporting.** Take the facts from primary sources and write the story in our own voice. Never reword another outlet's article sentence by sentence, and don't rely on a "Source:" line to fix that.
- **Link the primary source** in the story body (city, school district, agency, or the document itself).
- **Byline** is `Firelands Current staff` until the editor says otherwise.
- **Verify dates.** Confirm each fact's date on the source page itself. Search-engine summaries have mixed up years (a September 2025 dispensary opening and a fall 2025 terror-plot case both showed up as "this month"). Skip anything older than the current news cycle unless it explains something current.
- **Say what we don't know.** If an announcement gives a claim without figures or terms, report the claim and note what's missing, as the job-growth and visitors-bureau stories do.
- **Local first.** Publish to the local database, let the editor review in local dev, and sync to production only when asked (see "Getting a story live").
- **Photos** need permission and a credit. Don't take images from Facebook pages or other sites without asking the owner; add them through the media library.

## Sources

### Reliable and open

| Source | Good for | Notes |
| --- | --- | --- |
| [City of Sandusky](https://www.cityofsandusky.com/) | Commission meeting recaps, staff and appointment news | News pages are `news_detail_T12_R###.php`; recaps are `blog_T41_R##.php`. The `/news.php` URL 404s, so start from the home page. |
| [Sandusky City Schools](https://www.scs-k12.net/) | Levy, calendar, new programs, closures | The Levy Hub and Back to School Hub pages carry the details. |
| Erie County ([eriecounty.oh.gov](https://www.eriecounty.oh.gov/)) and the [County Auditor](https://auditor.eriecounty.oh.gov/) | Commissioner actions, property tax, ballot levies | Auditor press releases are PDFs. Read them with `pdftotext -layout`. |
| [ODOT](https://www.transportation.ohio.gov/) and the [U.S. 6 project page](https://publicinput.com/usr6) | Road and roundabout projects | The ODOT project page itself may 404; PublicInput works. Completion dates differ between sources, so quote ODOT. |
| [ODNR](https://ohiodnr.gov/) | Hunting seasons, fishing, parks | The season chart is a PDF; use `pdftotext -layout`. Zone columns need careful reading. |
| [Bureau of Labor Statistics regional releases](https://www.bls.gov/regions/midwest/) | Wage and employment data | The Sandusky area means Erie and Ottawa counties. |
| [Greater Sandusky Partnership](https://greatersandusky.com/) | Business and economic announcements | `curl` gets a 403; the page reads fine through a web fetch. Announcements are short, so check them for missing figures. |
| [Ohio Lake Erie Commission](https://lakeerie.ohio.gov/) | Lake Erie restoration, grants | Some deep links move; search by title. |
| [Erie County Health Department](https://eriehealthohio.com/news-page/) | Public health grants, clinics, lead and housing programs, overdose response | Posts several dated items a week. Many put the details in an image of the press release, so open the image (or the page in a browser) before writing. Program pages and posts don't always agree on figures; report the difference. The old `eriecohealthohio.com` address redirects here. |
| [City of Huron](https://www.cityofhuron.org/) | Leaf pickup, hydrant flushing, city services and events | Same site platform as Sandusky; news pages are `news_detail_T3_R##.php`. |
| [Erie County Board of Elections](https://www.boe.ohio.gov/erie/) | Candidate and issue filings, voting dates | The filing PDFs block scripted downloads and sometimes return a maintenance page; try again later or ask the board for a copy. |
| [City of Sandusky on Facebook](https://www.facebook.com/cityofsandusky) and [Sandusky Police](https://www.facebook.com/sanduskypolice) | Commission meeting notices, events, groundbreakings, new officers | Official accounts, so usable as a source, but link the city website or document when one exists. Posts often carry details the city website never gets. |
| [Huron County](https://www.huroncounty-oh.gov/) and Erie MetroParks ([eriemetroparks.org](https://eriemetroparks.org/)) | County departments, parks | Thin on news; useful for facts and contact details. |

### Handle with care

| Source | Why |
| --- | --- |
| Sandusky Register, Norwalk Reflector | Paywalled or script-rendered. Headlines and subheads are public and fine as leads. Don't get around the paywall and don't reuse their reporting. |
| Norwalk Ohio News | Requires a login. |
| Facebook event search | Good for finding community events. Confirm the date, time and place on the organizer's own page before listing, since anyone can create an event. |
| Facebook groups (The Real Talk of Sandusky) | Mostly anonymous chatter and sales posts. Use only as leads, confirm with an official source, and never quote private individuals. |
| Reddit (r/Sandusky) | Shows what residents are asking about, not news. |
| Web search summaries | Often wrong on dates and details. Open the linked page before using a fact. |

## Finding stories

1. Check the primary sources above for anything dated in the last few weeks.
2. Compare against what we've published (`/news`, or `SELECT slug, headline FROM news_articles`) so we don't repeat a story.
3. Aim for at least three current stories per section so every homepage block fills in. Government, Business, Schools, Outdoors and Community have three or more; Local News is thin, so check public safety, transit, utilities and county services.
4. A tool like `/last30days` can surface Reddit and web chatter, but its results are leads, not sources.

## Getting a story live

Stories are rows in `news_articles`, and a published story also gets a discussion thread in `forum_threads` (the admin editor does this through `ensureArticleThread`).

1. Write the story as Markdown and check the headline, summary and body against the source.
2. Insert it into the local database (for example with `npx wrangler d1 execute DB --local --file stories.sql`), including a matching thread row with `author_id = 'newsroom'`. Only `/media/…` library images render in the body.
3. Review at `http://127.0.0.1:4321/news`.
4. When the editor says to sync, insert the same rows into production (`--remote`), then confirm counts per section on both sides. Migrations, if any, are applied first (see AGENTS.md).

Inserting stories changes only data, so it needs no version bump. Code changes (layout, new features) ship as releases as described in AGENTS.md.
