# Dated operations observations

These records preserve earlier checks and unresolved questions. They do not establish current service settings. Use the README for current setup and operating instructions, and the changelog and Git history for releases.

## September 29, 2026

The reader Facebook sign-in app was recorded as being in Development mode, with App Review for `email` and `public_profile`, app publication, and business-portfolio linking pending. Business verification was recorded as submitted September 28. Google, Apple, and Microsoft developer apps and credentials were recorded as unconfigured. Recheck those external settings before treating them as current. The Facebook publishing app is separate from the reader sign-in app.

## October 3, 2026

Search Console's events report, last updated October 1, showed 11 valid events and zero critical errors. Recommended-field warnings affected offers, images and performers on 11 items, end dates on three, and an organizer on one. Missing end-date examples were Parkrun, the Sandusky City Commission meeting, and Save Your Pumpkins 5K; the organizer example was Sandusky Farmers Market. A production spot check found blank offer, performer and image fields on four sampled events, plus no end time on Parkrun. These are historical crawl and page observations, not a current content inventory. Follow the README's event verification guidance when reviewing current warnings.

Production checks covered the calendar and four event pages (HTTP 200 and parseable Event JSON-LD), the signed-in editor's event fields, signed-out admin redirection, an `.ics` download, and the privacy notice. No event records were changed during those checks. Meta approval and current Facebook token access were not independently verified.

## Earlier completed service checks

The following dated observations were preserved from the October 4 backlog snapshot during the October 10 cleanup. They have not been reverified as current service settings.

- **Review Google Analytics and Search Console configuration — October 3, 2026.** Confirmed the live GA measurement ID `G-WCZR3LZNP7`, active collection, New York reporting time zone, 14-month event and user data retention, enabled enhanced measurement, and the correct GSC domain-property link (linked September 28). Google signals and user-provided data collection were off. GSC reported valid robots.txt files, no host problems, no manual actions or security issues, and 11 valid events with zero invalid events. Recorded remaining improvements in the backlog; no account settings or site code were changed during the audit.

- **Recheck Google News sitemap processing in Search Console — October 3, 2026.** The earlier "Couldn't fetch" status cleared. Both submitted sitemaps showed Success and were last read October 2: `/news-sitemap.xml` had 11 discovered pages and `/sitemap.xml` had 67. Sitemap discovery does not establish that every URL is indexed.

- **Add, deploy, and submit a dedicated Google News sitemap — October 2, 2026.** Released in v1.18.0; the live `/news-sitemap.xml` includes published stories from the last 48 hours with publication metadata, original dates, and headlines. `/robots.txt` advertises both sitemaps, and older stories remain in the ordinary sitemap. Submitted to Search Console; successful processing was confirmed October 3 as noted above.

- **Verify Firelands Current in Google Search Console — October 2, 2026.** Confirmed verified ownership of `firelandscurrent.com` and the existing `/sitemap.xml` submission (Success; 57 discovered pages; last read October 1). Live URL tests passed for the voter-registration, winter-clothing-drive, and recreation-center membership stories. Requested indexing for the first two, which were not yet indexed; the recreation-center story was already indexed. Google News considers eligible sites automatically; Publisher Center no longer provides an inclusion application.
