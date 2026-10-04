# News sources and story workflow

How Firelands Current finds, checks and publishes local news. Read this before writing stories. Story fields and the media library are covered in [README.md](../README.md); code conventions are in [AGENTS.md](../AGENTS.md).

## Editorial rules

- **Write original reporting.** Take the facts from primary sources and write the story in our own voice. Never reword another outlet's article sentence by sentence, and don't rely on a "Source:" line to fix that.
- **Link the primary source** in the story body (city, school district, agency, or the document itself).
- **Byline** must link to the specified author's account. If no other author is specified, use JD's account (`jd@orboro.net`): look up its `user.id`, set the article's `author_id` to that id, and use the account's display name (`JD`) as the saved byline. Never use `Firelands Current staff`. If the JD account cannot be found, resolve the attribution before importing a story.
- **Verify dates.** Confirm each fact's date on the source page itself. Search-engine summaries have mixed up years (a September 2025 dispensary opening and a fall 2025 terror-plot case both showed up as "this month"). Skip anything older than the current news cycle unless it explains something current.
- **Say what we don't know.** If an announcement gives a claim without figures or terms, report the claim and note what's missing, as the job-growth and visitors-bureau stories do.
- **Local first.** Publish to the local database, let the editor review in local dev, and sync to production only when asked (see "Getting a story live").
- **Photos** need permission and a credit. Don't take images from Facebook pages or other sites without asking the owner; add them through the media library.

## Coverage area

Sandusky and the communities around Sandusky Bay, from Port Clinton and Fremont east to Vermilion and Oberlin, and south to Norwalk.

| Tier | Places | What we cover |
| --- | --- | --- |
| Core | Sandusky, Perkins Township, Huron, Vermilion, Milan, Castalia, Berlin Heights, Bay View, Kelleys Island, and the rest of Erie County | Everything: government, schools, business, public safety, events |
| Regular | **Ottawa County:** Port Clinton, Oak Harbor, Marblehead, Lakeside, Danbury. **Sandusky County:** Fremont, Clyde, Bellevue, Green Springs. **Huron County:** Norwalk, Monroeville, Collins, Wakeman. **Western Lorain County:** Amherst, South Amherst, Oberlin, Kipton, Henrietta, Brownhelm | Significant news, county government, and events that draw people from across the area |
| Edge | Lorain, Elyria, Sheffield, Sheffield Lake, Avon, and the rest of eastern Lorain County; Flat Rock and northern Seneca County | Only stories that affect the Sandusky area (regional employers, roads, Lake Erie, county-wide or state decisions) |

Places outside these areas, including Toledo and Cleveland, are covered only when the story lands here.

## Sources

### Reliable and open

| Source | Good for | Notes |
| --- | --- | --- |
| [City of Sandusky](https://www.cityofsandusky.com/) | Commission meeting recaps, staff and appointment news | News pages are `news_detail_T12_R###.php`; recaps are `blog_T41_R##.php`. The `/news.php` URL 404s, so start from the home page. |
| [Sandusky City Schools](https://www.scs-k12.net/) | Levy, calendar, new programs, closures | The Levy Hub and Back to School Hub pages carry the details. |
| [Huron City Schools](https://huronk12.org/) | District operations, safety, newsletters and community conversations | Used Oct. 4, 2026. News posts link to PDF newsletters; check the newsletter date and read the relevant pages. Future events can remain current even when announced earlier. |
| [Port Clinton City Schools](https://www.pccsd.net/) | District news, school fundraisers and community events | Used for the Oct. 5, 2026 Kick for the Cure fundraiser involving Sandusky teams. News pages include a posting date; distinguish game admission from paid fundraiser activities. |
| Erie County ([eriecounty.oh.gov](https://www.eriecounty.oh.gov/)) and the [County Auditor](https://auditor.eriecounty.oh.gov/) | Commissioner actions, property tax, ballot levies | Auditor press releases are PDFs. Read them with `pdftotext -layout`. |
| [ODOT](https://www.transportation.ohio.gov/) and the [U.S. 6 project page](https://publicinput.com/usr6) | Road and roundabout projects | The ODOT project page itself may 404; PublicInput works. Completion dates differ between sources, so quote ODOT. |
| [ODNR](https://ohiodnr.gov/) | Hunting seasons, fishing, parks | The season chart is a PDF; use `pdftotext -layout`. Zone columns need careful reading. |
| [Bureau of Labor Statistics regional releases](https://www.bls.gov/regions/midwest/) | Wage and employment data | The Sandusky area means Erie and Ottawa counties. |
| [Greater Sandusky Partnership](https://greatersandusky.com/) | Business and economic announcements | `curl` gets a 403; the page reads fine through a web fetch. Announcements are short, so check them for missing figures. |
| [Ohio Lake Erie Commission](https://lakeerie.ohio.gov/) | Lake Erie restoration, grants | Some deep links move; search by title. |
| [Erie County Health Department](https://eriehealthohio.com/news-page/) | Public health grants, clinics, lead and housing programs, overdose response | Posts several dated items a week. Many put the details in an image of the press release, so open the image (or the page in a browser) before writing. Program pages and posts don't always agree on figures; report the difference. The old `eriecohealthohio.com` address redirects here. |
| [City of Huron](https://www.cityofhuron.org/) | Leaf pickup, hydrant flushing, city services and events | Same site platform as Sandusky; news pages are `news_detail_T3_R##.php`. |
| [Perkins Township](https://perkinstownship.com/) | Trustee actions, police and fire, township events | WordPress; RSS at `/feed/`. Used for the October 2026 Fire Station 3 open house and township events. Its [official Facebook Page](https://www.facebook.com/PerkinsTownship) also carries event flyers; verify their dates and use website announcements when available. Meeting minutes are PDFs under `/wp-content/uploads/`. |
| [Erie County Board of Elections](https://www.boe.ohio.gov/erie/) | Candidate and issue filings, voting dates | The filing PDFs block scripted downloads and sometimes return a maintenance page; try again later or ask the board for a copy. |
| [City of Sandusky on Facebook](https://www.facebook.com/cityofsandusky) and [Sandusky Police](https://www.facebook.com/sanduskypolice) | Commission meeting notices, events, groundbreakings, new officers | Official accounts, so usable as a source, but link the city website or document when one exists. Posts often carry details the city website never gets. |
| [Huron County](https://www.huroncounty-oh.gov/) and Erie MetroParks ([eriemetroparks.org](https://eriemetroparks.org/)) | County departments, parks | Thin on news; useful for facts and contact details. |
| [City of Oberlin](https://cityofoberlin.com/) | Council vacancies, boards, grants | Used for the Oct. 16, 2026 council application deadline. Notices can link to application PDFs. Keep appointment deadlines separate from the date the seat becomes vacant. |
| [OHgo](https://www.ohgoreach.org/) | Food assistance, fresh markets, school pantries and fundraisers | Added Oct. 4, 2026. Its [official Facebook Page](https://www.facebook.com/ohgoreach) carries current distributions; event schedules also link to Raise. The Empty Bowls homepage promotion still said tickets were live when the linked ticket page said sold out; use the event page for availability. |

### Promising, not yet used

Found in an October 2026 probe of the wider coverage area. None of these has produced a story yet, so check a source's dates and figures carefully the first time you use it, then move it to the table above.

**Posting regularly**

| Source | Good for | Notes |
| --- | --- | --- |
| [City of Port Clinton](https://www.portclinton.com/newslist.php) | Water and sewer projects, city staff, transit | Revize, like Sandusky; news pages are `news_detail_T28_R##.php`. A post every month or two. |
| [City of Oak Harbor](https://www.oakharbor.oh.us/newslist.php) | Street and school-zone safety projects, grants | Revize. A few posts a year. |
| [Village of Clyde](https://www.clydeohio.org/CivicAlerts.aspx) | Village notices and events | CivicPlus. Posts every few weeks. |
| [City of Amherst](https://amherstohio.org/) | Road projects, joint work with Lorain | WordPress; RSS at `/feed/`, irregular. |
| [Vermilion Local Schools](https://www.vermilionschools.org/) | District news and calendar | Some dates on the home page are upcoming events, not posts. |
| [BGSU Firelands](https://www.bgsu.edu/firelands/news.html) | Campus programs, enrollment, community events | About one post a month. |
| [Ohio Sea Grant and Stone Lab](https://ohioseagrant.osu.edu/news) | Lake Erie research, algal blooms, water quality | Several posts a week, statewide; use the ones about the western basin or Sandusky Bay. |
| [Huron County Public Health](https://www.huroncohealth.com/public-information) | Public health notices for Norwalk and Huron County | Dated items; check how current the latest one is. |
| [Huron County](https://www.huroncounty-oh.gov/) RSS | County departments | The home page lists several RSS feeds (Revize `rss?token=…` links), which may be easier to watch than the site. |

**Nonprofits and community funding**

Added Oct. 3, 2026. These sources have not yet produced a story; check announcement dates and distinguish application deadlines from award dates.

| Source | Good for | Notes |
| --- | --- | --- |
| [Sandusky County Communities Foundation](https://www.sanduskyccf.org/) | Local grants, scholarships and funded community projects | Wix. Start with [News and Events](https://www.sanduskyccf.org/news-and-events) and [Grant Guidance and Timeline](https://www.sanduskyccf.org/grant-guidance). The 2026 timeline lists a Celebration of Philanthropy for Oct. 14 at 5 p.m.; confirm venue, access and recipients before coverage. Older grant PDFs can appear in search results. |
| [United Way of Sandusky County](https://uwsandco.org/) | Community services, nonprofit funding, food assistance and volunteer opportunities | Use its program pages, assistance directories and [grant funding page](https://uwsandco.org/grant.php). The homepage still featured August events when checked in October 2026, so do not assume featured announcements are current. |
| [Care & Share of Erie County](https://careandshareerieco.org/hours/) | Food and clothing assistance in Sandusky | Added Oct. 4, 2026. Direct service-hours and eligibility page; verify requirements and exceptions before writing a service guide. |
| [Sandusky County Job and Family Services](https://sanduskycountydjfs.org/public/food-assistance/) | County food assistance, pantry and meal referrals | Added Oct. 4, 2026. Lists providers and service areas; confirm individual schedules with each provider. |

**Slow, stale, or hard to read**

| Source | Good for | Notes |
| --- | --- | --- |
| [City of Fremont](https://fremontohio.org/residents/news-updates/) | Council meeting notices, city services | WordPress; RSS at `/feed/`, but only a few posts a year. |
| [Ottawa County](https://www.co.ottawa.oh.us/) | Commissioners, county departments | CivicPlus. The News Flash page and RSS feed are nearly empty; use the site for agendas and contacts. |
| [Ottawa County Health Department](https://www.ottawahealth.org/) | Public health | CivicPlus. The news page didn't show current items. |
| [Sandusky County](https://sanduskycountyoh.gov/) | County government, public notices | No news section; check the Public Notices menu. `sandusky-county.org` redirects here. |
| [Sandusky County Public Health](https://www.scpublichealth.com/news) | Public health, disease reports | The news list loads by script; open it in a browser. |
| [City of Norwalk](https://www.norwalkoh.com/) | Council, road construction, city departments | Squarespace, with no news page and an empty RSS feed. Web searches for Norwalk city news return spam sites, so go straight to this domain. `cityofnorwalk.org` is a parked domain, not the city. |
| [City of Bellevue](https://www.bellevueohio.gov/news/index.php) | City news | Revize; the news list loads by script. |
| [Village of Milan](https://milanohio.gov/) | Village notices | No news page; undated announcements on the home page. |
| [City of Vermilion](https://www.cityofvermilionohio.gov/) | City news | Returns 403 to scripted requests; open it in a browser. `vermilion.net` redirects here. |
| Perkins Schools, Margaretta Schools, Fremont City Schools, [EHOVE Career Center](https://www.ehove.net/) | District news | Home pages load their news by script; check them in a browser. |
| [Ottawa County Sheriff](https://ottawacountysheriff.info/press-releases-2/) | Press releases | WordPress with RSS, but the newest release found was from September 2024. |
| Erie County and Huron County sheriffs | Contacts | Neither site has press releases. |
| [Sandusky Library](https://www.sanduskylib.org/) | Library programs and events | WordPress; RSS at `/feed/`. |
| [Lake Erie Shores & Islands](https://www.shoresandislands.com/) | Tourism events and visitor numbers | Returns 403 to scripted requests. It's the tourism bureau, so check its figures. |

**Facebook Pages**

Many villages, townships, police and fire departments, and schools here post on Facebook first, or only there. These official Pages turned up in a Facebook Pages search in October 2026; posting frequency wasn't checked. As with the City of Sandusky's Page, link the agency's website or document when one exists. Facebook search needs a signed-in browser.

| Area | Pages |
| --- | --- |
| Cities and villages | [Huron](https://www.facebook.com/cityofhuronohio), [Vermilion](https://www.facebook.com/cityofvermilion), [Milan](https://www.facebook.com/milanohio), [Norwalk](https://www.facebook.com/norwalkoh), [Port Clinton](https://www.facebook.com/PortClintonOH), [Oak Harbor](https://www.facebook.com/oakharborohio), [Fremont](https://www.facebook.com/fremontoh), [Clyde](https://www.facebook.com/clydeohio) |
| Townships | [Perkins Township](https://www.facebook.com/PerkinsTownship), [Margaretta Township](https://www.facebook.com/Margaretta.Township) |
| Police | [Perkins](https://www.facebook.com/perkinspd), [Bay View](https://www.facebook.com/bayviewpolice), [Milan](https://www.facebook.com/MilanPoliceDept), [Vermilion](https://www.facebook.com/VermilionPolice), [Norwalk](https://www.facebook.com/NorwalkPD), [Bellevue](https://www.facebook.com/BellevueOhioPoliceDepartment), [Fremont](https://www.facebook.com/FremontOhioPD), [Catawba Island](https://www.facebook.com/CatawbaIslandPD), [Put-in-Bay](https://www.facebook.com/pibpolice), [Oak Harbor](https://www.facebook.com/profile.php?id=100076260115088), [Kelleys Island](https://www.facebook.com/profile.php?id=100083855786981) |
| Sheriffs | [Huron County](https://www.facebook.com/profile.php?id=100064950511302) (32K followers). No main Page turned up for the Erie County or Ottawa County sheriffs; Ottawa County has only division Pages (K9, Reserve, Dog Warden). |
| Fire and EMS | [Sandusky Fire](https://www.facebook.com/SanduskyFire), [Perkins Fire](https://www.facebook.com/PerkinsFire), [Huron Fire](https://www.facebook.com/HuronFirefighters), [Bellevue Fire](https://www.facebook.com/profile.php?id=100064420282942), [Sandusky County EMS](https://www.facebook.com/SanduskyCoEMS), [Huron County EMA](https://www.facebook.com/huroncountyema) |
| County government | [Erie County Board of Elections](https://www.facebook.com/profile.php?id=61555788237831), [Erie County DOES](https://www.facebook.com/profile.php?id=100064497117321), [Ottawa County Common Pleas Court](https://www.facebook.com/ococpc), [Sandusky County Commissioners](https://www.facebook.com/profile.php?id=61593423602465), [Sandusky County Board of Elections](https://www.facebook.com/profile.php?id=100069026985826), [Sandusky County Park District](https://www.facebook.com/SanduskyCountyParkDistrict) |
| Health | [Erie County Health Department](https://www.facebook.com/eriecohealth), [Ottawa County Health Department](https://www.facebook.com/profile.php?id=100068590342843), [Sandusky County Public Health](https://www.facebook.com/sanduskycopublichealth) |
| Schools | [Perkins](https://www.facebook.com/PerkinsLSD) (a second Page, [Perkins Local Schools](https://www.facebook.com/PerkinsLocalSchools), also exists; confirm which the district uses), [Margaretta](https://www.facebook.com/margarettaschools), [Huron](https://www.facebook.com/HuronCitySchools), [Edison](https://www.facebook.com/EdisonLocalSchools), [Vermilion](https://www.facebook.com/VermilionSchools), [Norwalk](https://www.facebook.com/norwalkcitysd), [Port Clinton](https://www.facebook.com/portclintonschools), [Bellevue](https://www.facebook.com/BCSRedmen), [Oberlin](https://www.facebook.com/OberlinCitySchools) |
| Business and tourism | [Visit Huron Ohio](https://www.facebook.com/visithuronohio), [Vermilion Chamber](https://www.facebook.com/vermilionchamber), [Port Clinton Area Chamber](https://www.facebook.com/PCChamber), [Bellevue Chamber](https://www.facebook.com/bellevueohiochamber), [Fremont Economic Development](https://www.facebook.com/FremontOhioED) |
| Libraries | [Clyde](https://www.facebook.com/clydelibrary), [Monroeville](https://www.facebook.com/MonroevillePLOhio), [Green Springs](https://www.facebook.com/GreenSpringsLibrary) |

Not found: a Page for the City of Bellevue itself, ODOT District 3, or Fremont City Schools. Facebook's search ranks by distance and name, so try other wordings before deciding a Page doesn't exist.

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
2. Insert it into the local database (for example with `npx wrangler d1 execute DB --local --file stories.sql`), setting the article's `author_id` and byline as described above and including a matching discussion thread with `author_id = 'newsroom'`. The discussion's Newsroom author is separate from the article's account-linked byline. Only `/media/…` library images render in the body.
3. Review at `http://127.0.0.1:4321/news`.
4. When the editor says to sync, insert the same rows into production (`--remote`), then confirm counts per section on both sides. Migrations, if any, are applied first (see AGENTS.md).

Inserting stories changes only data, so it needs no version bump. Code changes (layout, new features) ship as releases as described in AGENTS.md.
