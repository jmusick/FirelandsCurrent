<?xml version="1.0" encoding="UTF-8"?>
<!-- Makes the RSS feed readable when opened in a browser; feed readers ignore it. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat" />
<xsl:template match="/rss/channel">
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><xsl:value-of select="title" /> · RSS feed</title>
  <style>
    body { margin: 0; background: #f7f5ef; color: #1f3437; font: 16px/1.55 "DM Sans", system-ui, sans-serif; }
    main { max-width: 760px; margin: auto; padding: 2rem 1.25rem 4rem; }
    h1 { font-family: "Libre Baskerville", Georgia, serif; margin: 0 0 .4rem; }
    .note { background: #ecf0ec; border: 1px solid #c9d1cd; border-radius: 6px; padding: 1rem 1.2rem; margin: 1.2rem 0 2rem; }
    .note code { background: #fff; padding: .1rem .4rem; border-radius: 3px; word-break: break-all; }
    a { color: #bc633e; }
    article { display: flex; gap: 1rem; padding: 1.2rem 0; border-top: 1px solid #c9d1cd; }
    article img { width: 120px; height: 80px; object-fit: cover; border-radius: 4px; flex: none; background: #ecf0ec; }
    article h2 { font-size: 1.15rem; line-height: 1.3; margin: 0 0 .25rem; }
    .meta { color: #53696b; font-size: .85rem; margin: 0 0 .4rem; }
    article p { margin: 0; }
    @media (max-width: 520px) { article { flex-direction: column; } article img { width: 100%; height: auto; aspect-ratio: 3 / 2; } }
  </style>
</head>
<body>
<main>
  <h1><xsl:value-of select="title" /></h1>
  <p><xsl:value-of select="description" /></p>
  <div class="note">
    <strong>This is an RSS feed.</strong> Copy this page's address into a feed reader such as Feedly or Inoreader to get new stories as we publish them:
    <p><code><xsl:value-of select="*[local-name()='link' and @rel='self']/@href" /></code></p>
    <a href="/news">Or read the stories on the site →</a>
  </div>
  <xsl:for-each select="item">
    <article>
      <xsl:if test="media:content/@url"><img src="{media:content/@url}" alt="" loading="lazy" /></xsl:if>
      <div>
        <h2><a href="{link}"><xsl:value-of select="title" /></a></h2>
        <p class="meta"><xsl:value-of select="category" /> · <xsl:value-of select="dc:creator" /> · <xsl:value-of select="substring(pubDate, 6, 11)" /></p>
        <p><xsl:value-of select="description" /></p>
      </div>
    </article>
  </xsl:for-each>
</main>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
