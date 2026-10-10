import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from project_library import editorial_directory
import json
import time
import uuid

ROOT = editorial_directory('2026-10-02')
now = int(time.time() * 1000)
voting = 'https://www.boe.ohio.gov/erie/'
state = 'https://www.ohiosos.gov/elections/voting-schedule-text-only'
coat = 'https://www.facebook.com/photo/?fbid=1498197372332557&set=a.238384831647157'
fair = 'https://www.facebook.com/events/26255324760819987/'
waste = 'https://www.eriecounty.oh.gov/SolidWasteDistrict.aspx'
registration = 'https://docs.google.com/forms/d/e/1FAIpQLScat3egVnH96gSz4WMqBM3e3xvVzvh03zjBNyo-z9z3tJYD-Q/viewform?usp=header'
art = 'https://www.scs-k12.net/protected/ArticleView.aspx?dasi=3GGI&iid=6IIGAU2'
cancer = 'https://www.firelands.com/classes-events/search-results-detail/?eventId=eda60549-187a-f111-86f5-df101ebce46c'
feeding = 'https://www.firelands.com/classes-events/search-results-detail/?eventId=6cfd0afb-5aaf-f011-b412-e77127827d66'
mylander = 'https://events.bgsu.edu/event/mylander-speaker-series-building-community-and-belonging'

articles = [
    dict(slug='erie-county-voter-registration-october-5-early-voting-2026',
         headline='Erie County voter registration closes Monday; early voting starts Tuesday',
         summary='Registration for the Nov. 3 election closes Oct. 5 at 9 p.m. Early voting begins Oct. 6 at the Erie County Board of Elections in Sandusky.',
         section='government', community='Erie County',
         body=f'''The deadline to register to vote in the Nov. 3 election is 9 p.m. Monday, Oct. 5, with early in-person voting beginning Tuesday, Oct. 6.

The [Erie County Board of Elections]({voting}) lists registration tools, sample ballots and absentee voting information. Voters can [register or update their registration online](https://olvr.ohiosos.gov/).

Early voting takes place at the board's office, 2900 Columbus Ave., Room 101, in Sandusky. Hours for the first week are 8 a.m. to 5 p.m. Oct. 6-9.

The [Ohio secretary of state's 2026 voting schedule]({state}) lists later evening and weekend hours. Early voting ends Nov. 1.

## Voting by mail

Absentee voting by mail also begins Oct. 6. Applications must be received by 8:30 p.m. Oct. 27. Domestic absentee ballots must reach the board by 7:30 p.m. Nov. 3; voters should allow time for mail delivery.

Election Day polls are open from 6:30 a.m. to 7:30 p.m. Nov. 3. For local voting questions, call the board at 419-627-7601.'''),
    dict(slug='sandusky-police-winter-coat-drive-december-17-2026',
         headline='Sandusky police accept winter clothing donations through Dec. 17',
         summary='New, unworn coats, hats, gloves and mittens can be dropped off day or night at the police lobby, 222 Meigs St., through Dec. 17.',
         section='community', community='Sandusky',
         body=f'''Sandusky police are accepting donations of new winter clothing through Dec. 17 at the department's lobby, 222 Meigs St.

Donors can drop off items day or night, according to the department's [announcement and coat drive flyer]({coat}). The drive seeks new, unworn coats, hats, gloves and mittens.

Requested coat sizes range from infant through adult 2X-Large. The flyer identifies the Southside Enrichment & Empowerment Program as the organizer.

The announcement does not give clothing distribution dates, recipient eligibility or a donation goal. For questions about dropping off donations, the police department's listed number is 419-627-5980.'''),
    dict(slug='erie-county-fall-extravaganza-october-3-2026',
         headline='Erie County Fairgrounds to host Fall Extravaganza Saturday',
         summary='The Oct. 3 event runs from 10 a.m. to 4 p.m. at 3110 Columbus Ave., with food trucks, crafts, a pedal pull and activities for children.',
         section='community', community='Sandusky',
         body=f'''The Erie County Fairgrounds will host a Fall Extravaganza from 10 a.m. to 4 p.m. Saturday, Oct. 3, at 3110 Columbus Ave. in Sandusky.

The Erie County Fair's [event announcement]({fair}) lists a pedal pull, food trucks, crafts, a bounce house and a kids sale among the planned activities.

The organizer's announcement does not list an admission price. Readers can check the event page for updates before heading to the fairgrounds.

For questions, the fair office lists 419-625-1000 and secretary@eriefair.com on its [Fall Extravaganza page](https://www.eriefair.com/fall-extravaganza/).'''),
]

def event(slug, title, summary, date, start, end, venue, address, community, organizer, category, link, description, **extra):
    return dict(slug=slug, title=title, summary=summary, description=description,
                category=category, starts_on=date, start_time=start, ends_on=None,
                end_time=end, hours_note='', venue=venue, address=address,
                community=community, organizer=organizer, cost='', link=link, **extra)

events = [
    event('erie-county-fall-extravaganza-2026', 'Erie County Fall Extravaganza',
          'Food trucks, crafts, a pedal pull, a bounce house and a kids sale are planned at the fairgrounds. Admission price is not listed.',
          '2026-10-03', '10:00', '16:00', 'Erie County Fairgrounds', '3110 Columbus Ave.', 'Sandusky', 'Erie County Fair', 'family', fair,
          f'''The Fall Extravaganza runs from 10 a.m. to 4 p.m. Saturday, Oct. 3. The [fair's announcement]({fair}) lists food trucks, crafts, a pedal pull, a bounce house and a kids sale.

Admission price is not stated. Check the organizer's event page for updates. Fair office: 419-625-1000 or secretary@eriefair.com.'''),
    event('sandusky-winter-clothing-drive-2026', 'Sandusky winter clothing donation drive',
          'Drop off new, unworn coats, hats, gloves and mittens at the Sandusky police lobby through Dec. 17. Donations are accepted day or night.',
          '2026-10-02', None, None, 'Sandusky Police Department lobby', '222 Meigs St.', 'Sandusky', 'Southside Enrichment & Empowerment Program', 'community', coat,
          ''),
    event('firelands-breast-cancer-support-october-6-2026', 'Breast Cancer Support Group',
          'A Firelands support group for women recently diagnosed with breast cancer, receiving treatment or in follow-up care. Registration is offered online.',
          '2026-10-06', '14:00', '15:30', 'UH Seidman Cancer Center at Firelands Regional Medical Center', '701 Tyler St.', 'Sandusky', 'Firelands Health', 'community', cancer,
          f'''The group meets from 2 to 3:30 p.m. Tuesday, Oct. 6. Firelands describes a topical discussion followed by an open forum for women recently diagnosed with breast cancer, receiving treatment or in follow-up care.

[Event details and registration]({cancer}) are available through Firelands. Cost is not listed. Contact Danielle Buathier at 419-557-5240 with questions.'''),
    event('firelands-breastfeeding-mom-baby-october-8-2026', 'Free Breastfeeding Mom-Baby Group',
          'Certified lactation consultants answer questions and offer infant weight checks at this free group, which is open to the public.',
          '2026-10-08', '11:30', '12:30', 'Firelands main campus, Cardiac Education Room', '1111 Hayes Ave.', 'Sandusky', 'Firelands Health', 'community', feeding,
          f'''The free group meets from 11:30 a.m. to 12:30 p.m. Thursday, Oct. 8, and is open to the public. Certified lactation consultants answer questions and offer infant weight checks.

The Cardiac Education Room is to the left of the main entrance. Parking is available in front of the hospital or in the garage, according to the [Firelands event page]({feeding}). Contact 419-557-7596 or lactation@firelands.com with questions.'''),
    event('erie-county-household-hazardous-waste-october-10-2026', 'Erie County household hazardous-waste collection',
          'Registration is required for the Oct. 10 collection at the county landfill. District residents only; businesses and latex paint are excluded.',
          '2026-10-10', '13:00', '15:00', 'Erie County Landfill', '10102 Hoover Road', 'Milan', 'Erie County Solid Waste District', 'community', registration,
          f'''The collection runs from 1 to 3 p.m. Saturday, Oct. 10. The county's [registration form]({registration}) gives the location as 10102 Hoover Road in Milan and requires advance registration.

The [Solid Waste District]({waste}) limits the collection to district residents. Businesses cannot participate, and latex paint is not accepted.

Check the county's instructions for accepted materials, fees and quantity limits before registering or bringing items. Environmental Services: 419-433-7303.'''),
    event('phobia-student-art-show-october-12-2026', 'Phobia student art show',
          'The MZ Student Art Gallery presents a show about fear from 4:30 to 6 p.m. Public access and admission details are not stated in the district announcement.',
          '2026-10-12', '16:30', '18:00', 'MZ Student Art Gallery, Regional Center for Arts & Academic Studies', '125 E. Adams St.', 'Sandusky', 'Sandusky City Schools', 'arts', art,
          f'''The district announces “Phobia...the Fear of...” for 4:30 to 6 p.m. Monday, Oct. 12. Artwork for consideration is due to Mrs. Shepherd by Oct. 7, according to the [school announcement]({art}).

The announcement does not specify eligible artists, submission rules, public access or admission cost. Check with Sandusky City Schools at 419-626-6940 before attending or submitting work.'''),
    event('mylander-building-community-belonging-october-20-2026', 'Mylander Speaker Series: Building Community and Belonging',
          'BGSU Firelands and United Way of Erie County host a community discussion. Doors open at 5 p.m.; the program starts at 5:15 p.m. RSVP is required.',
          '2026-10-20', '17:00', '19:00', 'BGSU Firelands, Foundation Hall, Room 107', 'One University Drive', 'Huron', 'BGSU Firelands and United Way of Erie County', 'meetings', mylander,
          f'''The second program in the four-part Mylander Speaker Series focuses on community connections and belonging. Doors open and hors d'oeuvres are served at 5 p.m. Tuesday, Oct. 20; the program starts at 5:15 p.m.

The [host's event page]({mylander}) lists the general public as an audience and gives an end time of 7 p.m. Space is limited and an RSVP is required through the link on that page. Cost is not stated.'''),
]

events[1].update(ends_on='2026-12-17', hours_note='Donations accepted day or night',
    description=f'''Drop off new, unworn coats, hats, gloves and mittens day or night in the police lobby through Dec. 17. Requested coat sizes range from infant through adult 2X-Large.

The [police announcement and flyer]({coat}) identify the Southside Enrichment & Empowerment Program as the organizer. Distribution dates and recipient eligibility are not listed.

For donation drop-off questions, contact police at 419-627-5980.''')
events[3]['cost'] = 'Free'

def ident(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://firelandscurrent.com/' + key))

def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, int):
        return str(value)
    return "'" + value.replace("'", "''") + "'"

def insert(table, row):
    return f"INSERT INTO {table} ({', '.join(row)}) VALUES ({', '.join(literal(v) for v in row.values())});"

sql = []
for index, article in enumerate(articles):
    assert 8 <= len(article['headline']) <= 160
    assert 20 <= len(article['summary']) <= 400
    assert len(article['body'].split('\n\n')[0].split()) <= 35
    stamp = now - index * 60000
    article.update(id=ident('news/' + article['slug']), byline='Firelands Current staff',
                   status='published', published_at=stamp, created_at=now, updated_at=now)
    sql.append(insert('news_articles', article))
    sql.append(insert('forum_threads', dict(id=ident('discussion/news/' + article['slug']), author_id='newsroom', title=article['headline'], body=article['summary'], article_id=article['id'], created_at=stamp, updated_at=stamp, last_activity_at=stamp)))

for item in events:
    assert 3 <= len(item['title']) <= 140
    assert 10 <= len(item['summary']) <= 300
    assert len(item['venue']) <= 120
    item.update(id=ident('events/' + item['slug']), status='published', created_at=now, updated_at=now)
    sql.append(insert('events', item))
    sql.append(insert('forum_threads', dict(id=ident('discussion/events/' + item['slug']), author_id='newsroom', title=item['title'], body=item['summary'], event_id=item['id'], created_at=now, updated_at=now, last_activity_at=now)))

(ROOT / 'local-content.sql').write_text('\n'.join(sql) + '\n', encoding='utf-8')
(ROOT / 'content.json').write_text(json.dumps(dict(articles=articles, events=events), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Prepared 3 stories, 7 events and 10 discussion threads for local import.')
