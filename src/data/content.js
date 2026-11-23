/*
  All copy and media for the page live here.
  Replace the brand, the texts and the image URLs with your own;
  local files work too: put them in /public and use "/my-photo.jpg".
*/

const HF = 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';
const us = (id, w = 2400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const brand = {
  name: 'Actionify',
  sub: 'Rise Above^ ',
};

export const hero = {
  eyebrow: 'A creative technology company',
  title: 'RISE ABOVE', // the brand's line; short words sit best behind the cut-out
  cta: 'Watch the reel',
  photo: HF + '934f4b51-d05b-4498-9c4a-8262f044da66.jpg',
  cutout: HF + '5d850aba-1a5b-44eb-bd6c-cd9f87845be7.webp',
  photoAlt: 'An elephant walking through golden savanna grass, shot on a long lens',
  // capture details of the opening frame
  shot: {
    title: 'On assignment, Tana river',
    mode: 'Telephoto',
    format: 'Landscape · SDR',
    specs: ['400 mm', 'f/5.6', '1/1250 s', 'ISO 400', 'Continuous AF'],
  },
};

/*
  The full-screen frames that wipe in over the hero while scrolling.
  orientation: 'landscape' fills the screen; 'portrait' is shown whole, centred on a blurred copy of itself.
  The capture details are sample captions: swap in the real EXIF of your own photographs.
*/
export const shots = [
  {
    src: us('1507915977619-6ccfe8003ae6'),
    alt: 'A wedding ceremony under autumn trees',
    orientation: 'landscape',
    title: 'The ceremony',
    mode: 'Wide angle',
    format: 'Landscape · HDR',
    specs: ['24 mm', 'f/8', '1/250 s', 'ISO 100', 'Zone focus'],
  },
  {
    src: us('1600685890506-593fdf55949b', 1500),
    alt: 'A bride in traditional red attire and gold jewellery',
    orientation: 'portrait',
    title: 'The bride',
    mode: 'Portrait',
    format: 'Portrait · SDR',
    specs: ['85 mm', 'f/1.4', '1/400 s', 'ISO 200', 'Eye AF'],
  },
  {
    src: us('1470229722913-7c0e2dbbafd3'),
    alt: 'Stage lights sweeping over a concert audience',
    orientation: 'landscape',
    title: 'The headline set',
    mode: 'Low light',
    format: 'Landscape · HDR',
    specs: ['35 mm', 'f/1.8', '1/160 s', 'ISO 6400', 'Tracking AF'],
  },
  {
    src: us('1505373877841-8d25f7d46678'),
    alt: 'A speaker presenting to a conference audience in a dim room',
    orientation: 'landscape',
    title: 'The keynote',
    mode: 'Silent shutter',
    format: 'Landscape · SDR',
    specs: ['70 mm', 'f/2.8', '1/125 s', 'ISO 3200', 'Single-point AF'],
  },
  {
    src: us('1590333748338-d629e4564ad9'),
    alt: 'Runners on the road during a city marathon',
    orientation: 'landscape',
    title: 'The finish straight',
    mode: 'Burst · 20 fps',
    format: 'Landscape · SDR',
    specs: ['200 mm', 'f/4', '1/2000 s', 'ISO 800', 'Continuous AF'],
  },
  {
    src: us('1469371670807-013ccf25f16a'),
    alt: 'White and pink flowers along a wedding aisle in soft focus',
    orientation: 'landscape',
    title: 'The details',
    mode: 'Macro',
    format: 'Landscape · HDR',
    specs: ['100 mm', 'f/2.8', '1/320 s', 'ISO 250', 'Manual focus'],
  },
  {
    src: us('1546148217-293f105f5e6a'),
    alt: 'Fireworks bursting in the night sky',
    orientation: 'landscape',
    title: 'The send-off',
    mode: 'Long exposure',
    format: 'Landscape · HDR',
    specs: ['16 mm', 'f/11', '4 s', 'ISO 100', 'Infinity focus'],
  },
];

export const statement = {
  label: 'Our mission',
  aria: 'Rise above the noise.',
  // one array per line; "pill" places a round photo inline
  lines: [
    ['RISE', { pill: 0 }, 'ABOVE'],
    ['THE', { pill: 1 }, 'NOISE.'],
  ],
  pills: [us('1501386761578-eac5c94b800a', 500), us('1606490208247-b65be3d94cd1', 500)],
  // the mission, lighting up word by word as it is read (taste-skill's word-highlight moment):
  // [before, the words in the accent, after]
  body: [
    'We help Nepal’s businesses, creators and ideas rise above the noise, by turning story, sound, media and technology into ',
    'attention that becomes customers',
    '.',
  ],
};

// the studio at a glance: the footer's chips read Delivery and Crew, the menu reads Delivery,
// and Our Details lists every row
export const facts = {
  label: 'The studio',
  title: ['ONE', 'TEAM', 'ONE', 'STANDARD'],
  badge: 'Watch the reel',
  badgeAria: 'Watch the reel',
  copy:
    'Clients buy Actionify. Films and Production are how we deliver picture and sound: one team, ' +
    'one quality standard. Every film gets Production sound, and every audio project can get a Films visual.',
  rows: [
    ['What we do', 'Brand, growth, media, sound, technology'],
    ['Crew', 'Four people, one standard'],
    ['Delivery', '4K master and a vertical set with every film'],
    ['Built in', 'Nepal'],
  ],
  portrait: us('1492175742197-ed20dc5a6bed', 1200),
  portraitAlt: 'A bride in a white gown holding her bouquet',
};

// the reel: the showreel opens between the two halves of the word
export const booking = {
  word: ['RE', 'EL'], // the pill opens between the two halves
  // the first letter becomes the drop cap
  blurb:
    'Every client film is a sample for the next client, and every Originals episode shows the standard. ' +
    'Shot in 4K log with proper sound, in one grade family, so the work is recognizable as Actionify.',
  cta: 'Book a shoot',
  video: HF + '175fbbcd-e50a-480c-bab2-ca16d4678322.mp4',
  poster: HF + '726b168c-da47-4682-a255-cc3e02f89bae.jpg',
  videoAlt: 'Actionify showreel',
};

/* =====================================================
   Site-wide: pages, contact details, slogans, quotes
   ===================================================== */

// the three pillars of the work, each on its own page; the header's "Our Work" opens them as a menu.
// `sub` sits under the wordmark in the pillar's lockup; `crafts` is what the pillar makes; `packages`
// ([package, includes, best for]), `note`, `steps` ([step, who, result]) and `phases` are shown where given.
export const pillars = [
  {
    key: 'films',
    to: '/our-work/films',
    name: 'Films',
    sub: 'Films',
    eyebrow: 'Media pillar',
    text: 'Commercials, brand films, music videos, documentaries, photography, drone, VFX.',
    // the frames behind the glass: the hero (with its alt), what it makes, its packages; stand-ins until our own stills replace them
    photos: { hero: ['1601506521937-0121a7fc2a6b', 'A cinema camera on a rig filming a dancer on a blue-lit stage'], crafts: '1626379953822-baec19c3accd', plan: '1574717024653-61fd2cf4d44d' },
    crafts: ['Commercials', 'Brand films', 'Music videos', 'Documentaries', 'Photography', 'Drone', 'VFX'],
    packagesTitle: 'Packages to sell first',
    packages: [
      ['Brand Film', 'One 60 to 120 second hero film, 3 vertical cuts, photo set', 'Hotels, clinics, founders'],
      ['Content Engine (video)', 'Monthly reels and social content with a fixed number of shoots and edits', 'Retainer clients'],
      ['Documentary Case Study', 'A 4 to 8 minute story of a client’s journey', 'Proof and referrals'],
      ['Music Video', 'Concept, shoot, edit and grade for an artist', 'Artists and labels'],
    ],
    note: {
      title: 'Why Films is the attention engine',
      text: 'Every client film is a sample for the next client, and every Originals episode shows the standard.',
      points: [
        'Shoot every project in 4K log with proper sound, even for small clients.',
        'Keep one grade family so work is recognizable as Actionify.',
        'Deliver one vertical set with every film.',
        'Ask each client for permission to show the film and a short testimonial.',
      ],
    },
  },
  {
    key: 'production',
    to: '/our-work/production',
    name: 'Production',
    sub: 'Production',
    eyebrow: 'Sound pillar',
    text: 'Music, recording, mixing, mastering, sound design, voice, podcasts, audio branding.',
    photos: { hero: ['1598488035139-bdbb2231ce04', 'A recording studio: a mixing console, monitors and guitars on the wall'], crafts: '1478737270239-2f02b77fc618', plan: '1589903308904-1010c2294adc' },
    crafts: ['Music', 'Recording', 'Mixing', 'Mastering', 'Sound design', 'Voice', 'Podcasts', 'Audio branding'],
    packagesTitle: 'Packages to sell first',
    packages: [
      ['Sonic Identity', 'Sound logo, music palette, voice style guide', 'Brands that want to be remembered'],
      ['Commercial Audio', 'Voiceover, music and mix for radio, ads and social', 'Ad campaigns'],
      ['Podcast Production', 'Recording, edit, mix, show notes, clips', 'Founders, clinics, creators'],
      ['Music for Film', 'Original score and sound design', 'Our Films work and outside filmmakers'],
      ['Artist Production', 'Recording, vocal production, mix and master for singles', 'Artists'],
    ],
  },
  {
    key: 'originals',
    to: '/our-work/originals',
    name: 'Originals',
    sub: 'Originals',
    eyebrow: 'Our own channel',
    text: 'YouTube-first series and documentaries. Our distribution and our best portfolio.',
    photos: { hero: ['1492691527719-9d1e07e534b4', 'A photographer on a rocky peak above a sea of clouds'], crafts: '1559523161-0fc0d8b38a7a', plan: '1502982720700-bfff97f2ecac' },
    crafts: ['YouTube-first series', 'Documentaries', 'Our distribution', 'Our best portfolio'],
    stepsTitle: 'Production pipeline per episode',
    steps: [
      ['Idea and research', 'Ashan', 'Topic, hook, 3 title options, shot list'],
      ['Shoot (4K log, good audio)', 'Prem, directed by Aman', 'Footage plus clean sound'],
      ['Edit', 'Prem', 'Rough cut, fine cut, vertical versions'],
      ['Grade, music and mix', 'Aman', '4K master, score and final sound mix'],
      ['Publish and clip', 'Mama', 'Upload, captions, shorts, schedule'],
      ['Review', 'All four', 'Views, watch time, inquiries; pick next topic'],
    ],
    phasesTitle: 'First 90 days',
    phases: [
      ['Days 1 to 30', 'Lock channel name and promise, prepare the mini series, shoot episodes 1 and 2, build thumbnail and title style.'],
      ['Days 31 to 60', 'Publish the trailer and episodes 1 to 3, add Nepali and English subtitles, cut shorts.'],
      ['Days 61 to 90', 'Review what worked, finish the season, pitch 2 featured businesses as clients.'],
    ],
  },
].map((p) => ({
  ...p,
  photo: { src: us(p.photos.hero[0], 2000), alt: p.photos.hero[1] },
  card: us(p.photos.hero[0], 1100),
  craftsPhoto: us(p.photos.crafts, 1800),
  planPhoto: us(p.photos.plan, 1800),
}));

// the home page's Five pillars section: the Actionify ecosystem, from the master plan's pillar chart.
// Each pillar has one promise, one line, what it covers and one focus; `to` is the page of the part of
// Actionify that delivers it, where there is one (Media: Actionify Films, Sound: Actionify Production).
export const fivePillars = {
  label: 'Five pillars',
  title: 'The Actionify ecosystem',
  intro: 'Each pillar has one promise and one focus.',
  items: [
    {
      name: 'Brand',
      promise: 'Build identity.',
      line: 'Build your identity.',
      covers: ['Strategy', 'Naming', 'Identity', 'Graphic design', 'Creatives', 'Brand systems', 'Packaging'],
      focus: 'Brand strategy + identity + design',
    },
    {
      name: 'Growth',
      promise: 'Create demand.',
      line: 'Create demand. Drive growth.',
      covers: ['Marketing strategy', 'Digital marketing', 'Social media', 'Advertising', 'Campaigns', 'Offline marketing', 'PR', 'Growth'],
      focus: 'Marketing + advertising + growth',
    },
    {
      name: 'Media',
      promise: 'Create attention.',
      line: 'Stories beyond frames.',
      covers: ['Commercials', 'Films', 'Music videos', 'Documentaries', 'Photography', 'Drone', 'Motion', 'VFX', 'Social content'],
      focus: 'Film + photography + visual production',
      to: '/our-work/films',
      by: 'Actionify Films',
    },
    {
      name: 'Sound',
      promise: 'Create emotion.',
      line: 'Sound beyond limits.',
      covers: ['Music production', 'Recording', 'Mixing', 'Mastering', 'Sound design', 'Voice production', 'Podcast / audio content'],
      focus: 'Music + audio production',
      to: '/our-work/production',
      by: 'Actionify Production',
    },
    {
      name: 'Technology',
      promise: 'Build possibility.',
      line: 'Technology with function.',
      covers: ['Web design', 'Web development', 'UI/UX', 'Digital products', 'AI solutions', 'Automation', 'Future technology'],
      focus: 'Digital + web + creative technology',
    },
  ],
};

// the menu sidebar and the footer list these, in this order
// `hint` and `thumb` appear only in the phone and tablet menu; `menu` lists the pages under a page
export const pages = [
  { to: '/', label: 'Home', hint: 'Mission, pillars and the work', thumb: us('1532712938310-34cb3982ef74', 200) },
  { to: '/services', label: 'Services', hint: 'How a project runs, brief to delivery', thumb: us('1520390138845-fd2d229dd553', 200) },
  { to: '/our-work', label: 'Our Work', hint: 'Films, production and originals', thumb: us('1459749411175-04bf5292ceea', 200), menu: pillars },
  // { to: '/hire-us', label: 'Hire Us', hint: 'Coverage, steps and the form', thumb: us('1519741497674-611481863552', 200) },
  { to: '/our-details', label: 'Our Details', hint: 'Mission, values, team and standard', thumb: us('1493863641943-9b68992a8d07', 200) },
  { to: '/contact-us', label: 'Contact Us', hint: 'Tell us what you want to change', thumb: us('1465495976277-4387d4b0b4c6', 200) },
];

// the booking card at the foot of the menu
export const menuCard = {
  photo: us('1527529482837-4698179dc6ce', 900),
};

// the three small prints fanned on the header's "Access your gallery" button
export const bookPrints = [
  '1583939003579-730e3918a45a', // weddings
  '1516450360452-9312f5e86fc7', // concerts
  '1527529482837-4698179dc6ce', // celebrations
].map((id) => us(id, 80));

/*
  PLACEHOLDERS: replace with your real details before going live.
  The booking and contact forms send to `email`. Leave `phone` or `location` empty to hide them.
*/
export const studio = {
  email: 'hello@actionify.example',
  phone: '',
  location: '',
  social: [
    ['Instagram', 'https://www.instagram.com/'],
    ['Facebook', 'https://www.facebook.com/'],
  ],
};

export const slogans = {
  menu: 'Rise above.',
  cta: 'Have a story to tell?',
};

// the footer of every page: the short version, for the wall and the bio
export const footer = {
  title: 'Rise above.',
  credit: 'Photographs: Actionify',
  // a dusk meadow behind the footer, warmed to the site's palette in footer.css
  video: HF + '4d01c727-d9c5-47c8-a778-35a451ffd39f.mp4',
};

// one of the studio's values on each page, set large (the Quote component)
export const quotes = {
  work: {
    text: 'Every project starts with the human change, not the product.',
    by: 'Story first · an Actionify value',
  },
  hire: {
    text: 'Results in leads, bookings and sales, shown with numbers.',
    by: 'Proof over promises · an Actionify value',
  },
  details: {
    text: 'Never settle for average work, even when the client would accept it.',
    by: 'Rise above · an Actionify value',
  },
};

/* =====================================================
   Landing page: the extra sections
   ===================================================== */

// each row links to the Our Work page, filtered by `tag`
export const services = {
  label: 'Actionify Films',
  title: 'Stories beyond frames',
  intro: 'Story-led visual work, shot in 4K log with proper sound and one grade family. Choose one to see the frames.',
  items: [
    {
      name: 'Event films',
      tag: 'weddings',
      line: 'Weddings, ceremonies and the days that only happen once, in cinema quality.',
      photo: '1583939003579-730e3918a45a',
    },
    {
      name: 'Music videos',
      tag: 'concerts',
      line: 'Concept, shoot, edit and grade for an artist.',
      photo: '1516450360452-9312f5e86fc7',
    },
    {
      name: 'Brand films',
      tag: 'corporate',
      line: 'One 60 to 120 second hero film, 3 vertical cuts and a photo set, for hotels, clinics and founders.',
      photo: '1587825140708-dfaf72ae4b04',
    },
    {
      name: 'Documentaries',
      tag: 'sport',
      line: 'A 4 to 8 minute story of a client’s journey, for proof and referrals.',
      photo: '1517649763962-0c623066013b',
    },
    {
      name: 'Content Engine',
      tag: 'celebrations',
      line: 'Monthly reels and social content with a fixed number of shoots and edits.',
      photo: '1527529482837-4698179dc6ce',
    },
  ].map((s) => ({ ...s, thumb: us(s.photo, 240), photo: us(s.photo, 1100) })),
};

// five frames: the first is shown large
export const workPreview = {
  label: 'Our work',
  title: 'Frames from the work',
  cta: 'See all the work',
  // [photo, description, width, filter on Our Work, kind, title]
  items: [
    ['1532712938310-34cb3982ef74', 'A couple walking hand in hand across a hillside at dusk', 1600, 'weddings', 'Weddings and events', 'The walk at dusk'],
    ['1459749411175-04bf5292ceea', 'A concert stage flooded with yellow light above the crowd', 900, 'concerts', 'Music', 'Main stage'],
    ['1461896836934-ffe607ba8211', 'A sprinter set in the starting blocks on a red track', 900, 'sport', 'Sport and documentary', 'On your marks'],
    ['1519225421980-715cb0215aed', 'A long reception table laid with flowers and glassware', 900, 'weddings', 'Weddings and events', 'Reception details'],
    ['1591115765373-5207764f72e7', 'A speaker presenting to a full room in a brick-walled venue', 900, 'corporate', 'Brand and corporate', 'The workshop'],
  ].map(([id, alt, w, tag, kind, title]) => ({ src: us(id, w), alt, tag, kind, title })),
};

/* =====================================================
   Pages
   ===================================================== */

/*
  Our Work. `o` is the tile shape: 'l' landscape, 'p' portrait.
  These are sample photographs: replace them with your own work.
*/
export const work = {
  title: ['Our work'],
  slogan: 'Stories beyond frames.',
  intro:
    'Frames from our Films work: weddings and events, music, brand and corporate days, sport and documentary. ' +
    'Every client film is a sample for the next client. Choose a kind of work to see it.',
  filters: [
    ['all', 'All'],
    ['weddings', 'Weddings and events'],
    ['concerts', 'Music'],
    ['corporate', 'Brand and corporate'],
    ['sport', 'Sport and documentary'],
    ['celebrations', 'Social content'],
  ],
  items: [
    ['1583939003579-730e3918a45a', 'weddings', 'p', 'Newlyweds kissing in front of their guests'],
    ['1459749411175-04bf5292ceea', 'concerts', 'l', 'A concert stage flooded with yellow light above the crowd'],
    ['1587825140708-dfaf72ae4b04', 'corporate', 'l', 'A speaker on a round stage in a full auditorium'],
    ['1532712938310-34cb3982ef74', 'weddings', 'l', 'A couple walking hand in hand across a hillside at dusk'],
    ['1461896836934-ffe607ba8211', 'sport', 'l', 'A sprinter set in the starting blocks on a red track'],
    ['1527529482837-4698179dc6ce', 'celebrations', 'l', 'Friends raising glasses at a table under string lights'],
    ['1429962714451-bb934ecdc4ec', 'concerts', 'l', 'Hands shaped into a heart in front of stage lights'],
    ['1517649763962-0c623066013b', 'sport', 'l', 'A cycling peloton in the middle of a race'],
    ['1540575467063-178a50c2df87', 'corporate', 'l', 'A conference audience seated in a darkened hall'],
    ['1523438885200-e635ba2c371e', 'weddings', 'p', 'A flower-covered gazebo at the end of a wedding aisle'],
    ['1492684223066-81342ee5ff30', 'celebrations', 'l', 'Confetti falling over a crowd'],
    ['1465495976277-4387d4b0b4c6', 'weddings', 'l', 'Two hands with wedding rings resting on a bouquet'],
    ['1533174072545-7a4b6ad7a6c3', 'concerts', 'l', 'A festival stage at night under a burst of confetti'],
    ['1591115765373-5207764f72e7', 'corporate', 'l', 'A speaker presenting to a full room in a brick-walled venue'],
    ['1519741497674-611481863552', 'weddings', 'l', 'A bride holding her bouquet in warm backlight'],
    ['1452626038306-9aae5e071dd3', 'sport', 'l', 'Marathon runners filling a city street, seen from above'],
    ['1519671482749-fd09be7ccebf', 'celebrations', 'l', 'Wine glasses meeting in a toast'],
    ['1524368535928-5b5e00ddc76b', 'concerts', 'l', 'A concert crowd in silhouette against orange light'],
    ['1606216794074-735e91aa2c92', 'weddings', 'p', 'A bride and groom walking arm in arm beneath a palm tree'],
    ['1560439514-4e9645039924', 'corporate', 'l', 'A busy conference hall seen from above'],
    ['1530103862676-de8c9debad1d', 'celebrations', 'l', 'A cluster of colourful balloons'],
  ].map(([id, tag, o, alt]) => ({
    src: us(id, 900),
    full: us(id, 2000),
    tag,
    o,
    alt,
  })),
};

export const hire = {
  title: ['Book a', 'shoot'],
  slogan: 'Tell us the story. We bring the standard.',
  intro:
    'Share the date, the place and what the shoot is for. Prem shoots, Aman directs and grades, ' +
    'and every film comes with Production sound.',
  stepsLabel: 'How it goes',
  steps: [
    ['Send the brief', 'The date, the place and what it is for. Ashan turns it into a one-page brief, a shot list and release forms.'],
    ['We shoot', 'Prem shoots in 4K log with clean sound, directed by Aman, and the footage is backed up the same day.'],
    ['We deliver', 'Rough cut, fine cut and vertical versions, then the Actionify grade, the mix and final approval of picture and sound.'],
  ],
  // the three lengths of a shoot, shown as cards above the form (the same choices as the form's Coverage)
  coverageLabel: 'Coverage',
  coverageTitle: 'Choose the length of the shoot',
  plans: [
    {
      name: 'About 2 hours',
      short: '2 hrs',
      suits: ['A founder interview or a portrait set', 'A keynote or an award evening', 'A product or brand photo set'],
      photo: us('1519741497674-611481863552', 900),
    },
    {
      name: 'Half a day',
      short: '4 hrs',
      suits: ['A hotel or clinic brand film', 'A month of reels for the Content Engine', 'A conference morning or afternoon'],
      photo: us('1540575467063-178a50c2df87', 900),
    },
    {
      name: 'A full day',
      short: '8 hrs',
      suits: ['A wedding, start to finish', 'A music video shoot', 'A documentary case study day'],
      photo: us('1533174072545-7a4b6ad7a6c3', 900),
    },
  ],
  // what every shoot includes, beside the steps
  includedLabel: 'Every shoot includes',
  included: [
    ['camera', '4K log or RAW, 6K or more where possible'],
    ['list', 'A one-page brief and shot list agreed in advance'],
    ['people', 'One to four on the crew, as the shoot needs'],
    ['gallery', 'A graded master and a vertical set with every film'],
  ],
  faqLabel: 'Questions',
  faqTitle: 'Before you book',
  faq: [
    ['What do we receive?', 'A graded 4K master, a vertical set for Reels and Shorts with every film, and the photo set where your package includes one.'],
    ['Is sound included?', 'Yes. Every film gets Production sound: recorded clean on the shoot, then mixed and given final approval by Aman.'],
    ['How many people come to the shoot?', 'One to four, as the shoot needs. Prem shoots, directed by Aman. Tell us the size of the day in the form and we suggest the crew.'],
    ['Do we plan the shoot together?', 'Yes. Before the day, Ashan writes a one-page brief, the story angle, a shot list and release forms with you.'],
    ['Is our footage safe?', 'It is backed up the same day: three copies, on two kinds of storage, one of them off-site, before any footage is deleted.'],
  ],
  formLabel: 'Booking request',
  formTitle: 'Book a shoot',
  formNote: 'Tell us about the shoot. Anything marked optional can be left empty.',
  // the choices offered by the booking form
  eventTypes: [
    'Wedding',
    'Concert or festival',
    'Conference or corporate event',
    'Sport',
    'Private celebration',
    'Something else',
  ],
  coverage: [
    'About 2 hours',
    'Half a day (about 4 hours)',
    'A full day (about 8 hours)',
    'More than one day',
    'Not sure yet',
  ],
};

export const details = {
  title: ['Our', 'details'],
  slogan: 'Rise above',
  intro:
    'Actionify is a creative technology company, built in Nepal. We make brands, stories, sound ' +
    'and tools that lift Nepal’s ideas higher.',
  aboutLabel: 'Our mission',
  aboutLead:
    'To help Nepal’s businesses, creators and ideas rise above the noise, by turning story, sound, ' +
    'media and technology into attention that becomes customers.',
  about: [
    'Our vision: to become South Asia’s most trusted creative technology company, proven first in ' +
      'Nepal and then taken to the world.',
    'Clients buy Actionify. Films and Production are how we deliver picture and sound: they share ' +
      'one team and one quality standard, so every film gets Production sound and every audio ' +
      'project can get a Films visual. Originals is our own channel, our distribution and our best portfolio.',
  ],
  photo: us('1542038784456-1ea8e935640e', 1200),
  photoAlt: 'A photographer aiming a camera at the viewer in an autumn forest',
  // the values that guide every decision, set large
  principlesLabel: 'How we work',
  principles: [
    ['Rise above', 'Never settle for average work, even when the client would accept it.'],
    ['Story first', 'Every project starts with the human change, not the product.'],
    ['Control over novelty', 'We choose tools that give predictable, high-quality results in our style.'],
    ['Proof over promises', 'Results in leads, bookings and sales, shown with numbers.'],
    ['Human taste, AI speed', 'AI does the heavy lifting. People handle strategy, grade, sound and final polish.'],
    ['Built in Nepal', 'Nepali language, culture and landscapes are strengths we build on.'],
  ],
  banner: us('1511795409834-ef04bbd61622', 2000),
  bannerAlt: 'A reception table laid with flowers, glassware and white napkins',
  stats: [
    ['5', 'pillars, one company'],
    ['4', 'people, one standard'],
    ['4K', 'minimum on every shoot'],
    ['3', 'copies of every file'],
  ],
  // the team: who does what, what each delivers every week and the number each one tracks;
  // then how a film project and an audio project run from brief to delivery (`people` lights the
  // members a step involves when one of them is pointed at)
  teamLabel: 'Our team',
  teamTitle: 'Four people, one studio',
  teamIntro: 'Each of us has one set of jobs, one weekly output and one number we track.',
  team: [
    {
      name: 'Ashan',
      role: 'Brand and growth',
      jobs: 'Branding, creative direction, campaigns, marketing, social calendar, client briefs and story angles',
      output: 'Content plan, one campaign step, brief for every shoot and session, outreach',
      track: 'Inquiries, campaign reach, calls booked',
    },
    {
      name: 'Aman',
      role: 'Media and audio',
      jobs: 'Media direction on set, color grade, and all Production audio work: recording, mixing, mastering, sound design, voiceover',
      output: 'Graded films, finished mixes and masters, final approval of picture and sound',
      track: 'On-time delivery, rework rounds, quality score',
    },
    {
      name: 'Prem',
      role: 'Shoot and edit',
      jobs: 'Shooting footage, lighting, offloading, rough and final edits, vertical versions',
      output: 'Shot footage, edited cuts, vertical versions for every film',
      track: 'Cuts delivered on time, footage backed up the same day',
    },
    {
      name: 'Mama',
      role: 'Technology and media tech',
      jobs: 'Website, AI tools, automation, editing pipeline, storage and backups, publishing, analytics',
      output: 'One tool or automation shipped, backup check, dashboard update',
      track: 'Hours saved, uptime, tools in daily use',
    },
  ],
  flows: [
    {
      title: 'How a film project flows',
      steps: [
        { step: 'Brief and story angle', who: 'Ashan', people: ['Ashan'], result: 'One-page brief, shot list, release forms' },
        { step: 'Shoot', who: 'Prem, directed by Aman', people: ['Prem', 'Aman'], result: '4K footage plus clean sound, backed up' },
        { step: 'Edit', who: 'Prem', people: ['Prem'], result: 'Rough cut, fine cut, vertical versions' },
        { step: 'Grade and sound', who: 'Aman', people: ['Aman'], result: 'Actionify grade, mix, final approval' },
        { step: 'Publish and track', who: 'Mama, with Ashan', people: ['Mama', 'Ashan'], result: 'Upload, subtitles, clips, analytics report' },
      ],
    },
    {
      title: 'How an audio project flows',
      steps: [
        { step: 'Brief and references', who: 'Ashan', people: ['Ashan'], result: 'Mood, references, usage (ad, film, podcast, artist release)' },
        { step: 'Record or compose', who: 'Aman', people: ['Aman'], result: 'Takes, demos or first draft' },
        { step: 'Edit, mix, master', who: 'Aman', people: ['Aman'], result: 'Final mix, master and stems' },
        { step: 'Deliver and store', who: 'Mama', people: ['Mama'], result: 'Files, backups, upload where needed' },
      ],
    },
  ],
  // the high-resolution standard, stage by stage, picture and sound
  dayLabel: 'Our standard',
  dayTitle: 'Six values, one standard',
  day: [
    ['Capture', '4K minimum, 6K or more where possible, log or RAW, 10-bit, 24 fps. Sound at 48 kHz, 24-bit, in a treated room or controlled space.'],
    ['Edit', 'Proxies for editing, the grade on full-resolution files in one Actionify LUT family. Every take kept until final approval.'],
    ['Master', 'A 4K master in ProRes 422 HQ or higher as the archive file. The final mix and master as 24-bit WAV, plus stems.'],
    ['Delivery', '4K for YouTube and the web, vertical 2160 x 3840 for Reels and Shorts, loudness near -14 LUFS online.'],
  ],
  factsLabel: 'At a glance',
  factsPhoto: us('1511285560929-80b456fea0bc', 1100),
  factsPhotoAlt: 'A bride and groom at an outdoor reception hung with balloons',
};

/*
  The exploded camera (public/assets/exploded-dslr-cut.webp: the paper and the floor shadow keyed out, so the parts sit on the page;
  the source is design-src/exploded_dslr.png).
  Our Details lays it out part by part on scroll; Our Work shows it in a band. Each callout points at a part:
  x and y are its spot on the picture (in %), `to` where its label sits (y in %; above 100 is under the picture),
  `end` sets the label to the left of its line; `endNarrow` does so only on narrower screens.
*/
export const kit = {
  image: 'assets/exploded-dslr-cut.webp', // under public/, prefixed with the base path where used
  width: 1672,
  height: 702,
  alt: 'An exploded view of a camera: lens hood, glass elements, lens barrel, mount, mirror box, sensor, circuit boards, rear screen and battery',
  label: 'Our standard',
  title: 'What every shoot runs on',
  intro: 'One standard for every client, even the small ones, so the work is recognizable as Actionify.',
  callouts: [
    { name: 'One grade family', text: 'Every film graded in one Actionify LUT family.', x: 7, y: 51, to: 6 },
    { name: '4K minimum', text: '6K or more where possible, for every client.', x: 58, y: 10, to: -3, endNarrow: true },
    { name: '24 fps cinematic', text: 'The cinematic frame rate on every film.', x: 57, y: 70, to: 106, end: true },
    { name: 'Log or RAW, 10-bit', text: 'Proxies for the edit; the grade runs on full-resolution files.', x: 74, y: 58, to: 6 },
    { name: 'Three copies', text: 'Two storage types, one off-site, before any footage is deleted.', x: 89, y: 80, to: 106, end: true },
  ],
  bandLabel: 'Behind every frame',
  bandTitle: 'The standard we keep',
  bandText: '4K log, clean sound and every file in three copies. See the standard behind every film.',
  bandCta: 'See the standard',
  // the rest of the kit, as cards under the camera on Our Work. SAMPLE LIST: match it to the studio's
  // real equipment. `wide` cards span two columns.
  gearLabel: 'And the rest of the bag',
  gear: [
    { kind: 'Light', name: 'Strobes and softboxes', text: 'Light for interviews, product films and photo sets.', photo: us('1471341971476-ae15ff5dd4ea', 1100), alt: 'A photo studio set with strobes, softboxes and light stands', wide: true },
    { kind: 'Cameras', name: 'Full-frame DSLRs', text: 'Stills for every photo set: weather-sealed, two card slots.', photo: us('1564466809058-bf4114d55352', 700), alt: 'A Nikon full-frame DSLR with a prime lens' },
    { kind: 'Cameras', name: 'Mirrorless bodies', text: 'Light and silent, for documentary and on-the-move shooting.', photo: us('1581591524425-c7e0978865fc', 700), alt: 'A Sony mirrorless camera beside a lens under purple light' },
    { kind: 'Lenses', name: 'Portrait primes', text: '85 mm and 35 mm, wide open, for faces and low light.', photo: us('1512790182412-b19e6d62bc39', 700), alt: 'Close-up of an 85 mm portrait lens' },
    { kind: 'Lenses', name: 'Standard zooms', text: '24–70 f/2.8: the lens on the camera most of the day.', photo: us('1580707221190-bd94d9087b7f', 700), alt: 'A hand holding a camera with a 24–70 mm zoom lens' },
    { kind: 'Aerial', name: 'Camera drones', text: 'Aerial and drone cinematography, where it is allowed and the weather holds.', photo: us('1473968512647-3e447244af8f', 1100), alt: 'A white camera drone flying over a pine forest', wide: true },
    { kind: 'Extras', name: 'Instant cameras', text: 'Prints for guests at events and launches.', photo: us('1526170375885-4d8ecf77b99f', 700), alt: 'A white Polaroid instant camera' },
    { kind: 'Film', name: 'Medium-format film', text: 'A roll or two when a project asks for film.', photo: us('1495121553079-4c61bcce1894', 700), alt: 'A Rolleiflex twin-lens film camera on a grey background' },
    { kind: 'Cameras', name: 'Compact cameras', text: 'A small second camera for behind-the-scenes and candid moments.', photo: us('1510127034890-ba27508e9f1c', 700), alt: 'A silver Fujifilm compact camera on a desk' },
    { kind: 'The edit', name: 'Editing station', text: 'Calibrated screens; every film graded on full-resolution files.', photo: us('1621600411688-4be93cd68504', 700), alt: 'A laptop showing a photo editing catalogue beside a camera and a coffee' },
  ],
};

/*
  The Services page: how a booking runs, from the request on this site to every guest holding the photos.
  The gallery platform and its QR code are shown as illustrations; the event names and numbers in them
  are samples.
*/
export const servicesPage = {
  title: ['Our', 'services'],
  slogan: 'Story first. Proof over promises.',
  intro:
    'Brand, growth, media, sound and technology, from one team with one quality standard. ' +
    'This is how a project runs, from the first brief to the files in your hands, shared from ' +
    'our own private platform with one link or one QR code.',

  // the journey, step by step
  stepsLabel: 'How it works',
  stepsTitle: 'From brief to delivery',
  steps: [
    {
      icon: 'book',
      name: 'Send the brief',
      text: 'Tell us the date, the place and what it is for. Ashan turns it into a one-page brief, a story angle and a shot list.',
      form: true,
    },
    {
      icon: 'camera',
      name: 'We shoot and record',
      text: 'Prem shoots in 4K log, directed by Aman, with clean sound on set. The footage is backed up the same day.',
      photo: us('1520390138845-fd2d229dd553', 900),
      alt: 'A photographer holding a camera with a fast lens',
    },
    {
      icon: 'edit',
      name: 'We edit, grade and mix',
      text: 'Rough cut, fine cut and vertical versions, then the Actionify grade, the mix and final approval of picture and sound.',
      photo: us('1621600411688-4be93cd68504', 900),
      alt: 'A laptop showing a photo editing catalogue beside a camera',
    },
    {
      icon: 'lock',
      name: 'We deliver to our private platform',
      text: 'Every file goes up to our own secured platform in full quality: the master, the vertical set and the photos. No public pages, no search engines.',
      ui: true,
    },
    {
      icon: 'qr',
      name: 'You share one link or QR code',
      text: 'We send you a private link and a dynamic QR code. Share either one, and your team, partners or guests can preview and download what they need.',
      qr: true,
    },
  ],

  // the private gallery
  galleryLabel: 'Your private gallery',
  galleryTitle: 'Every file, in one safe place',
  galleryText:
    'The gallery lives on our own platform, not on a social network. It opens in any browser on a ' +
    'phone or a computer, with nothing to install and no account to make.',
  galleryFeatures: [
    ['lock', 'Only the people you choose', 'The gallery opens only from your private link or QR code. It is never public and never listed in search engines.'],
    ['eye', 'Preview everything', 'Browse every file in full screen, in order, on any phone, tablet or computer.'],
    ['download', 'Download in full quality', 'One file, a few favourites or everything at once, at the resolution we delivered it.'],
    ['shield', 'Kept secure', 'Files are stored on our secured platform and sent only over encrypted connections.'],
  ],
  // the sample gallery shown in the illustration
  mock: {
    event: 'Anna & Leo · The wedding',
    meta: 'Private gallery · shared with guests',
    photos: [
      '1583939003579-730e3918a45a',
      '1519741497674-611481863552',
      '1465495976277-4387d4b0b4c6',
      '1523438885200-e635ba2c371e',
      '1606216794074-735e91aa2c92',
      '1532712938310-34cb3982ef74',
    ].map((id) => us(id, 400)),
  },

  // the dynamic QR code
  qrLabel: 'One code for everyone',
  qrTitle: 'Scan, see, download',
  qrText:
    'Print the QR code on a card, show it on the screen at a launch or add it to a message. ' +
    'Anyone with it scans it with their phone camera and the gallery opens.',
  qrPoints: [
    ['It stays the same', 'The code is dynamic: it points to your gallery through our platform, so it keeps working as photos are added.'],
    ['You stay in control', 'We can pause or close access at any time, without reprinting a single card.'],
    ['No app needed', 'Any phone camera reads it. The gallery opens in the browser.'],
  ],
  qrCard: { event: 'Anna & Leo', line: 'Scan to see the photos', note: 'Sample code' },

  // the old way against this one
  compareLabel: 'Why it is easier',
  compareTitle: 'No more sending files one by one',
  compare: {
    old: {
      name: 'The usual way',
      points: [
        'Files forwarded one chat at a time',
        'Social apps shrink and compress every file',
        'Someone is always left out of the thread',
        'The project ends up scattered across a dozen threads',
      ],
    },
    new: {
      name: 'With Actionify',
      points: [
        'One link or one QR code for everyone',
        'Full-quality files, exactly as we delivered them',
        'Everyone sees the same complete set',
        'The whole project kept together, in one place',
      ],
    },
  },
};

export const contact = {
  title: ['Contact us'],
  slogan: 'Every project starts with a conversation.',
  intro:
    'Brand, growth, film, sound or technology: tell us what you want to change, and we reply. ' +
    'To book a shoot, use the booking form: it asks for everything we need.',
  formLabel: 'Write to us',
  directLabel: 'Direct',
};

// the sign-in page (/login): clients and their guests opening their private galleries
export const auth = {
  tabs: [
    ['signin', 'Sign in'],
    ['signup', 'Create account'],
  ],
  signin: {
    heading: 'Welcome back',
    note: 'Use the email your gallery was sent to.',
    submit: 'Sign in',
  },
  signup: {
    heading: 'Create your account',
    note: 'Use the email we sent your gallery link to, and every gallery shared with you appears in one place.',
    submit: 'Create account',
    done: 'Your account is created',
    doneNote: 'Wait for the verification from the admin side. We will email you as soon as your account is approved.',
  },
  code: {
    heading: 'Have a gallery code?',
    note: 'No account needed. Type the code, or scan the QR code from your card or invitation.',
    label: 'Gallery code',
    hint: 'Printed under the QR code on your card and in your gallery email: 14 letters and numbers in groups of 4, 4, 4 and 2. Or scan the QR code with the camera button.',
  },
  forgot: {
    title: 'Reset your password',
    note: 'Enter the email you signed up with and we will send a link to choose a new password.',
    submit: 'Send reset link',
    sentTitle: 'Check your inbox',
    sentNote: 'If an account uses that address, a reset link is on its way. It works for one hour.',
  },
  // shown when the studio's sign-in service can't be reached (backend/ not running, or no network)
  offline:
    "We can't reach the sign-in service right now. Please try again in a moment, or use the gallery link from your studio email.",
  // /verify-email?token=… (the link in the sign-up email)
  verify: {
    checking: 'Confirming your email',
    done: 'Your email is confirmed',
    doneNote: 'Your account is ready. Sign in to see your galleries.',
    // confirmed, but the studio hasn't approved the account yet
    pendingNote: 'Now wait for the verification from the admin side. We will email you as soon as your account is approved.',
    failTitle: "This link didn't work",
    resendNote: 'Enter your email and we will send a new confirmation link.',
  },
  // /reset-password?token=… (the link from "Forgot password?")
  reset: {
    title: 'Choose a new password',
    note: 'Use at least 8 characters. Every device signed in to your account will be signed out.',
    submit: 'Save the new password',
    done: 'Your password is changed',
    doneNote: 'Sign in with your new password.',
    failTitle: "This link didn't work",
  },
  // the full-screen film behind the sign-in card (no overlay, framed from the bottom)
  film: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260820_010308_b1636845-4c15-4ab6-b0c9-9a29bfb0c6e3.mp4',
};

// the terms of service (/terms), linked from the sign-up form and the footer.
// A plain-language starting point written for this site: have it checked by a lawyer before launch.
export const terms = {
  title: ['Terms of', 'service'],
  slogan: 'What we promise, and what we ask of you.',
  intro:
    'These terms cover booking a shoot or a project with Actionify and using your private ' +
    'gallery. They are written to be read: if anything is unclear, write to us before you book.',
  updated: '17 November 2026',
  sections: [
    {
      id: 'who-we-are',
      title: 'Who we are',
      body: [
        'Actionify ("Actionify", "we", "us") is a creative technology company, built in Nepal. We make brands, stories, sound and tools: brand and growth work, films and photography (Actionify Films), music and audio (Actionify Production) and technology, and we deliver the files through our own private gallery platform.',
        'By booking with us, creating an account or opening a gallery, you agree to these terms. "You" means the person who books with us, or anyone who signs in or opens a gallery shared with them.',
      ],
    },
    {
      id: 'bookings',
      title: 'Bookings and payment',
      body: [
        'A booking request sent through this site is not yet a booking. Your date is confirmed once we have agreed the coverage with you in writing and received the deposit set out in your quote.',
        'Your quote lists the coverage, the number of photographers, the price and when the balance is due. The balance is due before the event unless your quote says otherwise.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes and cancellations',
      body: [
        'If you need to move your date, tell us as soon as you can. We will move the booking to a new date where we are free, and the deposit moves with it.',
        'If you cancel, the deposit is kept, as it holds the date for you and turns other work away. Any further charges for a late cancellation are set out in your quote.',
        'If we ever cannot cover your event, because of illness or something beyond our control, we will send another Actionify photographer. If no one can attend, we refund everything you have paid.',
      ],
    },
    {
      id: 'on-the-day',
      title: 'On the day',
      body: [
        'We agree a shot list with you before the event and follow it as closely as the day allows. Some moments depend on light, timing, the venue\'s rules and the people in them, and we cannot promise every planned shot.',
        'Please make sure we can work safely and have access to the places agreed in the shot list. If the event runs over the booked coverage, we will stay when we can and charge for the extra time at the rate in your quote.',
      ],
    },
    {
      id: 'delivery',
      title: 'Your photographs',
      body: [
        'We choose and edit the best frames from the day and deliver them in a private gallery, usually within 7 days of the event. We do not deliver unedited files.',
        'Galleries stay online for 12 months from delivery. Download the photographs you want to keep within that time: after it, a gallery may be removed.',
      ],
    },
    {
      id: 'gallery',
      title: 'The private gallery and your account',
      body: [
        'Each gallery is opened with its own link, QR code or gallery code, or by signing in to an account it was shared with. Anyone who has the link, the QR code or the code can open the gallery, so share them only with your guests.',
        'Keep your password to yourself and tell us straight away if you think someone else has used your account or your gallery code. We can pause a gallery or issue a new code at any time.',
        'Do not try to open galleries that were not shared with you, copy the platform, or use it in a way that harms it or other people.',
      ],
    },
    {
      id: 'copyright',
      title: 'Copyright and how you may use the photographs',
      body: [
        'We own the copyright in the photographs we take. We give you, and the guests you share your gallery with, a licence to download, print and share them for personal use: in albums, on walls and on your own social media.',
        'Using the photographs to advertise or sell something, or selling them, needs our written permission first. Please do not remove our watermark where one is shown, or edit the photographs in a way that misrepresents our work.',
        'We may show a small number of photographs from your event in our portfolio and on social media. If you would rather we did not, tell us when you book and we will keep your event private.',
      ],
    },
    {
      id: 'privacy',
      title: 'Your personal information',
      body: [
        'We use the details you give us (your name, email, phone number and event details) to arrange and deliver your booking, run your account and answer your messages. We do not sell them.',
        'Photographs of guests are kept in the private gallery for as long as it is online. A guest can ask us to remove a photograph of themselves at any time by writing to us.',
        'You can ask to see the personal information we hold about you, have it corrected, or have your account deleted, by writing to us.',
      ],
    },
    {
      id: 'liability',
      title: 'If something goes wrong',
      body: [
        'We look after every booking with care, carry backup equipment and write every photograph to two cards. If, despite that, we fail to deliver what we agreed, our liability is limited to the amount you paid for the booking.',
        'We are not responsible for losses we could not reasonably have foreseen. Nothing in these terms limits your rights under consumer law.',
      ],
    },
    {
      id: 'these-terms',
      title: 'Changes to these terms',
      body: [
        'We may update these terms from time to time. The date at the top shows when they last changed. The terms that apply to your booking are the ones in place when you booked.',
      ],
    },
  ],
  contactTitle: 'Questions about these terms?',
  contactText: 'Write to us before you book and we will explain anything that is unclear.',
};
