# Nikl: what works today

> A plain-English tour of every feature that exists right now: what it does, where to find it and who can use it.
> Checked against the code at the end of **week 6 (28 Nov 2026)**. For developers: [DEVELOPING.md](DEVELOPING.md).
> This guide is updated with every chunk of work, before it is committed (see DEVELOPING.md, "Team routine").

## What Nikl is

Nikl is "Instagram for events, activities and clubs" in Bhubaneswar. It is for people aged 18 to 30 who want to find what's on in the city: runs, gigs, workshops, treks, markets, open mics and more. You can see events on a map, follow clubs and people, watch 24-hour stories, post photos from your plans, like and save posts, and book a spot: a one-tap RSVP for free events, or a paid ticket paid with UPI (test payments only, for now). Clubs and organizers get a free page and a dashboard to add events, post updates and share stories. There is a phone app (Android first) and a website. The website is for links people share on WhatsApp, for people without the app, and for organizers who prefer a laptop.

## Who can do what

| Word used below | Meaning |
|---|---|
| **Anyone** | No account needed. |
| **Logged in** | Signed in with a phone number. |
| **Club team** | The owner or an admin of a club page. A third role, check-in staff, can look but not change anything yet. |
| **Nikl admin** | Nikl staff. Added by hand in the database, never through the app. |

How far each feature has been tried:

- **Tried in the browser**: the website feature has been used end to end on a computer.
- **Built, not yet tested on a phone**: the app feature passes all the automatic checks, but nobody has used it on a real phone yet. Phone testing is the founder's next step ([NEXT_STEPS.md](../NEXT_STEPS.md) 1.2 and 1.7).

## Where things are

### The phone app

Four tabs along the bottom:

| Tab | What's there |
|---|---|
| **Home** | Stories (with **Your plans** first), the feed of club posts and posts from people you follow, "Clubs you might like". A **+** button at the top makes a post or shares your plans. |
| **Explore** | Everything on in the next 60 days, on a map or as a list, with filters and search. |
| **Tickets** | Your bookings: **In progress** (unpaid, with a countdown), **Upcoming** with entry codes, refunds, and **Past**. |
| **You** | Log in, your profile with your counts, your posts, your Saved events, log out. |

Other screens open on top of the tabs: **Log in**, **Set up your profile**, an **event** screen, **Book** (pick tickets), a **club** profile, a **person's** profile, a single **post**, the full-screen **story viewer**, and the two composers, **New post** and **Share your plans**.

While the app is being built, there are two ways to run it on a phone:

- **Expo Go**, a free app from the Play Store that loads Nikl from a developer's computer. Everything works except the map: Explore shows the list instead.
- **Nikl's own test build** (called a "development build"), installed once from Expo's build service. Same app, plus the map. Week 5 added photo picking, which needs new parts inside the app, so a test build made before week 5 has to be built again.

### The website

| Address | What's there | Who |
|---|---|---|
| `/` | Home: "This weekend" picks (or "Coming up" when the weekend is empty) and the 12 categories. | Anyone |
| `/explore` | A map (the default) or grid of upcoming events, with filters and search. | Anyone |
| `/e/<event>` | An event page, for example `/e/tuesday-track-intervals`. | Anyone |
| `/e/<event>/book` | Pick a date and tickets, then RSVP or go on to pay. | Logged in, with a finished profile |
| `/pay/<link>` | The pay page, for bookings from the website and the app. | Anyone with the link |
| `/tickets` | Your bookings and entry codes. | Logged in |
| `/c/<club>` | A club page, for example `/c/patia.pacers`. | Anyone |
| `/login` | Phone login. | Anyone |
| `/account` | Your phone number, links to your tickets, your profile and the organizer dashboard, log out. | Logged in |
| `/account/setup` | Set up or edit your profile (needed to book). | Logged in |
| `/organizer` | Organizer dashboard: create a club page, manage events, stories and posts. | Logged in (tools need club team) |
| `/organizer/events/new` | New event form. | Club team |
| `/organizer/events/<id>` | Manage one event. | Club team |
| `/organizer/posts/new` | New club post. | Club team |
| `/organizer/stories/new` | New club story. | Club team |
| `/admin/clubs` | Review new club pages. | Nikl admin |
| `/admin/moderation` | The review switch, posts and stories to check, and reports. | Nikl admin |

The website has no social feed, no stories and no posts by people. Those live in the app (decision D9 in [DECISIONS.md](../DECISIONS.md)).

## Features

### 1. Phone login (one-time code)

- **What it does:** You type your Indian mobile number, get a 6-digit code by text message (an "OTP", one-time password), and type it in. No password, no email. Numbers can be typed any common way, like "98765 43210" or "+91-98765-43210".
- **Where:** Both. In the app: You tab, then "Log in with your phone" (it opens as a sheet). On the website: "Log in" in the top bar.
- **Who:** Anyone with an Indian mobile number. By continuing, you confirm you are 18 or older.
- **Good to know:** Your phone number is private. It never appears on your public profile, and organizers never see it. When Nikl asks you to log in (for example after tapping Follow), it brings you back to where you were. Otherwise the website takes you to your account page.
- **Today:** Real text messages are not switched on yet. Login works only with the test numbers on a developer's own computer (see "Try it yourself"). Website: tried in the browser. App: built, not yet tested on a phone.
- **Coming later:** Real text messages through MSG91, once Nikl's business and SMS sender registration are done ([NEXT_STEPS.md](../NEXT_STEPS.md) 2.3).

### 2. Profile set-up (18+)

- **What it does:** After your first login, the app asks for your name, a username, the area of Bhubaneswar you usually hang around, at least 3 interests and the year you were born. You must be 18 or older. Your birth year is private. Your interests and area help order your Home feed.
- **Rules:** Usernames use 3 to 24 letters, numbers, dots or underscores, and must be unique. Interests come from the 12 categories (pick 3 to 12).
- **Where:** Both. In the app it opens after your first login; if you leave it half done, the You tab shows "Finish setting up". On the website it's `/account/setup` (see 27). Posting, sharing your plans and booking need a finished profile.
- **Who:** Logged in.
- **Today:** App: built, not yet tested on a phone. Website: tried in the browser.
- **Coming later:** Adding a profile photo and a bio (there is no screen for them yet). City Passport badges (week 9).

### 3. Browsing without logging in

- **What it does:** You can look around without an account. The Home feed, club stories, Explore, event pages, club pages and people's profiles all work. When you tap Follow, Like, Save, **+** or **⋯**, Nikl asks you to log in first, then brings you back.
- **What's public:** Events, posts and stories of clubs that Nikl has approved, and people's public posts once Nikl has checked them (on their profiles). Drafts are never public. People's stories are only for their followers.
- **Where:** Both.
- **Who:** Anyone.

### 4. Explore: map, list, filters and search

- **What it does:** Shows every public event in the next 60 days, each at its next date. Map pins show the category's emoji. Tap a pin to see the event's card. When several events share a venue, their pins fan out so each one can be tapped. Events without a map pin still appear in the list, and Explore tells you how many.
- **Filters:** Any time, Happening now, Today, Tonight (from 5 PM), This weekend, Next 7 days, plus Free and the 12 categories. All times are India time.
- **Search:** By event name, club, venue or area (try "patia").
- **Where:**
  - Website (`/explore`): opens on the map, with a list beside it. Switch to Grid for a grid of cards. When nothing matches, "Clear filters" resets everything.
  - App: opens on the map in Nikl's own test build, with a Map/List switch. In Expo Go it shows the list only. Pull down to refresh the list; the map has a refresh button.
  - Links can pick a filter: `/explore?category=music` works on both. The app also understands `?when=weekend`.
- **Who:** Anyone.
- **Today:** Website: tried in the browser. App list: built, not yet tested on a phone. App map: built, waiting for the first test build to be installed on a phone.
- **Known limit:** Filters only look at each event's next date. A weekly event whose next date is today won't show under "This weekend", even if it also runs on Saturday. This is an open question in [DECISIONS.md](../DECISIONS.md#open-questions).
- **Coming later:** A "Surprise me" swipe mode (after launch).

### 5. Event pages

- **What you see:** The poster (or a soft coloured tile with the category's emoji), the category, the title and the club (tap to open it). Then the next date and time and how many more dates there are, the venue and address, and the price ("Free", "From ₹199" or "Free + paid"). An age limit or "Women only" shows when the club set one. Below: the description, the refund policy and tags. When an event has several dates, each date is listed with its ticket types and "N left" or "Full".
- **Venue:** The website shows a small map image when the event has a map pin, and a "Get directions" link that opens Google Maps. The app has an "Open in Maps" button when there is a pin.
- **Share:** The website has **Share** (the device's share menu where there is one, otherwise it copies the link) and **WhatsApp**. In the app, Share opens the phone's share sheet. Until Nikl's own web address is live, the app shares the event name only, without a link.
- **Share to your plans** (app): turns the event into a 24-hour "Your plans" story for your followers (see 8). Shown while the event has an upcoming date.
- **Previews:** When a website event link is shared on WhatsApp or found on Google, it shows the title, date, venue, club and poster.
- **Save:** Bookmarks the event (see Saved).
- **Booking:** **Book** (or **RSVP** when every ticket is free) opens the booking page (see 23). In the app, an event with no ticket types at all says "Free entry. No booking needed, just turn up."
- **Special cases:** A cancelled event says so. An event with no dates left says "No upcoming dates right now".
- **Where:** Both. Website: `/e/<event>`. App: tap any event, post, story button or map card.
- **Who:** Anyone. Save and Share to your plans need a login.
- **Today:** Website: tried in the browser. App: built, not yet tested on a phone.
- **Coming later:** QR codes on tickets (week 7). "Who's going" and "Add to calendar" are planned for launch.

### 6. Club pages and club profiles

- **Website (`/c/<club>`):** The club's emoji avatar, name, a verified tick if Nikl has verified it, its @handle, what kind of group it is ("Run club"), area and rating. Then a **Follow** button with the follower count, the bio, upcoming events, and a grid of the club's posts. Tapping a post about an event opens the event.
- **App:** The club's logo (or its initials on a soft colour), three numbers (upcoming events, followers, and rating or "New on Nikl"), **Follow**, and two tabs: **Posts** (a grid, three across) and **Upcoming events**.
- **Good to know:** "Verified" is different from "approved". Every public club was approved by Nikl. The verified tick will need a business check (KYC) when payments arrive. Ratings shown today come from the sample data; Nikl doesn't collect reviews yet. A club's stories show in the Home stories row, not on its profile.
- **Who:** Anyone. Follow needs a login.
- **Today:** Website: tried in the browser. App: built, not yet tested on a phone.
- **Coming later:** Reviews after launch.

### 7. The Home feed (app)

- **Stories row:** At the top (see 8).
- **The + button** (top right): opens a small menu with **New post** (see 9) and **Share your plans** (see 8).
- **Post cards**, like Instagram, from clubs and from people you follow:
  - A header with the avatar (with a story ring when they have a live story), the handle, a verified tick for clubs, a **Follow** link if you don't follow them yet, and **⋯** (report, block, or delete your own; see 14).
  - Club posts: the post's photo, or the event's poster, or a coloured tile with the event's name. People's posts: their photos, swipe for up to 5.
  - An **event strip** with the date, time, area and price, and a **Book** or **RSVP** button. It opens the event page, where you can book. It shows while the event still has an upcoming date.
  - **Like**, **comment**, **share** and **save** buttons. The comment button opens the event for now; comments come after launch.
  - The number of likes ("Be the first to like this" when there are none), the caption (long ones fold, with "more"), and how long ago it was posted.
  - Your own posts that Nikl hasn't checked yet say **Under review** and "Only you can see this for now".
- **"Clubs you might like":** After the second post. Clubs you don't follow yet, best matches for your interests and area first, each with a Follow button.
- **"You're all caught up":** At the end, with a button to Explore.
- **Refreshing:** Pull down. If it fails, you keep the last feed and a short note says so.
- **Whose posts:** Every approved club's posts. People's posts only from people you follow (friends-only posts only if you follow each other), plus your own.
- **How posts are ordered** (decisions T28 and T29): newer posts first, then a boost for your own posts, for clubs and people you follow, events in the next 3 days, your interests, your area, and a little for likes. At most 2 posts from one club or person. Posts older than 30 days are left out, and so are club posts about events that are already over (people's photo posts stay, without the event strip). Up to 40 posts. Once you follow at least one club, posts from other clubs are marked "Suggested for you".
- **Who:** Anyone. Logged out, you see club posts and club stories, without the personal boosts.
- **Today:** Built, not yet tested on a phone.
- **Coming later:** Comments (after launch).

### 8. Stories (app)

- **What they are:** Photos and event cards that disappear after 24 hours, shown as big circles at the top of Home.
- **The row:** When you're logged in, **Your plans** comes first: your own stories, or a **+** to share one. Then one circle per club or person with live stories: those with something you haven't seen first, then those you follow, newest first. A pink ring means something new; it turns grey once you've watched everything.
- **Three kinds:**
  - **Club stories:** a club's team adds a photo, an event card with a Book button, or both, from the website (see 18). They go out straight away.
  - **Automatic "New" stories:** the first time a club publishes an event, Nikl makes a story for it from the event's details (poster, date, area, price). Moving the event back to draft and publishing again, or restoring a cancelled event, doesn't make another one.
  - **"Your plans":** you share an upcoming event you're going to, with an optional photo and a short note (up to 100 characters). Pick from your saved upcoming events, or start from an event's "Share to your plans" button. Only your followers see it. An event card on its own goes out straight away; with a photo or a note, it waits for Nikl's check while the review switch is on (see 20), and until then only you see it, marked "Under review".
- **The viewer:** Full screen. Each story shows for 5 seconds. Tap the right side for the next one and the left side for the previous one. Hold to pause. Swipe left to skip to the next club or person, swipe right to go back, and swipe down to close. Tap the name to open their profile. Event stories show a sticker (date, area, price) and a **Book** or **RSVP** button that opens the event. **⋯** reports a story, or deletes your own. It pauses for screen readers, and photo stories wait until the photo has loaded.
- **Seen:** Logged in, Nikl remembers which stories you've watched. Logged out, the rings turn grey only until you close the app.
- **Who:** Anyone can watch club stories. People's stories are only for their followers. Sharing your plans needs a login and a finished profile.
- **Good to know:** Stories about an event disappear once the event has no upcoming dates. Up to 10 stories a day for each club and each person.
- **Today:** Built, not yet tested on a phone. Making club stories on the website: tried in the browser.
- **Coming later:** Replies to stories. "Today" and "Last few spots" automatic stories (with notifications, week 8).

### 9. People's posts (app)

- **What it does:** Post photos from the plans you go to: 1 to 5 photos from your gallery, a caption (up to 2,200 characters), and optionally an event you saved, so people can book it from your post. Choose who sees it: **Public** (your followers' Home, and your profile for anyone) or **Friends** (only people who follow you and whom you follow back).
- **Under review** (decision P20): while Nikl's review switch is on (the default), a new post shows only to you, marked "Under review", until a Nikl admin approves it. If it's removed, your profile shows "Removed" with Nikl's reason, and its photos are deleted.
- **Where:** Home, **+**, then **New post**. App only.
- **Who:** Logged in, with a finished profile.
- **Good to know:** Photos are made smaller (1,080 pixels wide) before uploading, to save data. Up to 10 posts a day. Only events you saved can be tagged (decision P21). A post stays after its event is over; the Book button then disappears. If posting fails, the uploaded photos are removed again. Closing the composer with something added asks before throwing the draft away.
- **Today:** Built, not yet tested on a phone.
- **Coming later:** Tagging events you booked (not scheduled yet; today only saved events). Tagging friends and a "Join me" button (not scheduled yet).

### 10. People's profiles and following people (app)

- **What you see:** Their photo (or initials on a soft colour), how many posts, followers and following, their name, @username and area, and bio. **Follow** (or Following), plus "Follows you" when they follow you. Their posts in a grid, three across (a small mark shows posts with several photos). Tap a post to open it on its own, with its photos, likes, caption, tagged event and "Friends only" when it is.
- **Friends:** two people who follow each other. Friends see each other's friends-only posts.
- **Your own profile** is the You tab: your counts, interests, phone number (only you see it), **Your posts** and your Saved events. On your own posts, tiles say "Under review" or "Removed", with Nikl's reason under the grid.
- **Where:** App. Tap a person's name on a post or story.
- **Who:** Anyone can look. Following needs a login.
- **Today:** Built, not yet tested on a phone.
- **Coming later:** Private accounts and follow requests (not scheduled yet).

### 11. Follow, like and save

- **What it does:** Each is one tap. The button changes straight away. If it doesn't work (for example, no internet), it quietly switches back and shows a short message.
  - **Follow** clubs: on website club pages, and in the app on posts, club profiles and suggestions.
  - **Follow** people: in the app, on their profile and on their posts.
  - **Like** posts by clubs and people: in the app.
  - **Save** events: on website event pages, and in the app on the event screen and on posts about an event.
- **Who:** Logged in. Taps while logged out open the login.
- **Today:** Website follow and save: tried in the browser. App: built, not yet tested on a phone.

### 12. Saved

- **What it does:** In the app, the You tab has a **Saved** list: the upcoming events you saved, soonest first. Events that are over drop off the list.
- **Where:** App. On the website you can save events, but there's no Saved list there yet.
- **Who:** Logged in.
- **Today:** Built, not yet tested on a phone.

### 13. Privacy: who sees what

- **Counts are public:** followers, following and likes.
- **Lists are private** (decision P19): nobody can browse who follows whom or who liked a post. You see your own follows and likes. The database lets a person see who follows them, and a club's team see the club's followers, but no screen shows those lists yet.
- **Saves are private.** So are your phone number and birth year.
- **People's stories** go to their followers only. **Friends-only posts** go to friends only.
- **Today:** P19 is a privacy-first choice that the founder still has to confirm.

### 14. Report, block and delete (app)

- **Where:** The **⋯** button on every post, story and person's profile.
- **Report:** Pick a reason (spam, nudity, violence, bullying or harassment, hate, scam or fraud, false information, something else) and add a note if you like. Reports are private: Nikl doesn't tell anyone who sent them. Reporting the same thing again updates your report instead of adding a second one. After reporting a person, or something they posted, you can block them straight away.
- **Three reports hide it:** when 3 different people report a post or story, it's hidden from everyone until a Nikl admin looks (see 20).
- **Block** (people only, decision P23): you both stop following each other, and you no longer see each other's posts, stories or profile. Nikl doesn't tell them. Their profile then shows "You blocked @name" with an **Unblock** button.
- **Delete** your own post (its photos too; this can't be undone) or story (it disappears straight away).
- **Who:** Logged in. Tapping ⋯ while logged out opens the login.
- **Good to know:** Clubs can't be blocked. Nikl can take reports about clubs and events, but the app has no button for that yet.
- **Today:** Built, not yet tested on a phone.

### 15. Creating a club page, and Nikl's approval

- **What it does:** Anyone logged in can create a club page from the website's organizer dashboard (`/organizer`). You enter the club's name, a handle (your page address and @name, filled in from the name), a category, an area, what kind of group it is and a short bio. Then press "Create page and send for review". Whoever creates the page becomes its owner.
- **Approval** (decision P15): A new page shows **Waiting for approval**. Until a Nikl admin approves it, the club, its events, posts and stories are visible only to its own team and Nikl admins. You can still set up and publish events while you wait. They go live the moment the page is approved.
- **Other statuses:** **Changes needed** shows the admin's note. **Suspended** means the page is switched off.
- **Limits:** Up to 3 pages waiting for approval per person. Handles must be unique.
- **Where:** Website.
- **Who:** Logged in.
- **Today:** Tried in the browser.
- **Not yet:** There is no screen to edit a club page (name, bio, logo) or to add team members.

### 16. Organizer dashboard: events

- **Dashboard (`/organizer`):** Your club's name, handle, follower count and status. A switcher if you run several clubs. Then panels for events, stories and posts. The events list shows each event's next date, "+N more dates", the venue, its status (Draft, Live, Goes live when approved, Cancelled, Ended) and how many people are going.
- **New event (`/organizer/events/new`):**
  - A poster (JPG, PNG or WebP, up to 5 MB), the event name, category and description.
  - Date, start and end time, in India time. An end time before the start means the event ends after midnight.
  - **Repeats every week:** 2 to 12 weeks. Each week becomes its own date with its own tickets.
  - Venue name (required), address and area, and an optional **map pin**: tap the map, then drag to adjust. Pins must be in India. Events without a pin still show in lists.
  - **Tickets:** Free RSVP, or up to 6 paid ticket types (for example Early bird and Regular), each with a price in rupees and an optional quantity. The form notes that attendees will pay a 4% booking fee on top.
  - Total spots (optional).
  - **Save as draft** or **Publish event**. Publishing an event for the first time also adds an automatic "New" story (see 8).
- **Manage an event (`/organizer/events/<id>`):**
  - Edit the name, category, description and poster.
  - Publish, move back to draft, cancel the event, or restore a cancelled one. Delete a draft.
  - Add, move or remove the map pin. Moving a pin never moves other events at the same venue.
  - See every date with how many are going and ticket sales. Cancel or restore a single future date.
  - **Promo codes** (see 26).
  - A link to the public page.
- **Good to know:** Changes show on the public website straight away.
- **Who:** Club team. Check-in staff can see events but not change them.
- **Today:** Tried in the browser.
- **Not yet:** Changing the time or prices of a date that already has bookings (for now, cancel the date and add a new event).
- **Coming later:** Attendee list, check-in and payouts (week 7). Venue search with Google (needs a Google key). Organizer tools inside the app.

### 17. Organizer dashboard: posts

- **New post (`/organizer/posts/new`):** One photo (optional; JPG, PNG or WebP, up to 5 MB), an event (optional; only your club's upcoming published events; people can book from the post) and a caption (up to 2,200 characters). A post needs at least one of the three. Without a photo, the post shows the event's poster.
- **Publishing** (decision P17): Posts by approved clubs go out straight away, without waiting for a check. While your page waits for approval, posts stay hidden. Up to 20 posts per club per day. Like anything on Nikl, a club post can still be hidden by 3 reports or removed by a Nikl admin (see 20).
- **Posts panel** on the dashboard: your last 10 posts with time, event and likes, and a **Delete** button. Deleting also removes the photo file, so old links to it stop working.
- **Where posts appear:** In followers' Home feed (app), and on the club's page (website and app).
- **Who:** Club team (owners and admins).
- **Today:** Posting and deleting: tried in the browser. How posts look in the app: built, not yet tested on a phone.
- **Not yet:** Posting from the app. More than one photo per post.

### 18. Organizer dashboard: stories

- **New story (`/organizer/stories/new`):** A photo (JPG, PNG or WebP, up to 5 MB; tall 9:16 photos fill the screen best), an event to add a **Book** button for (your club's upcoming published events), or both. It goes out straight away and lasts 24 hours. Up to 10 stories per club per day.
- **Stories panel** on the dashboard: your live stories ("Auto story", "Story: <event>" or "Photo story"), when each was added and how many hours are left, and **Delete** (which also deletes the photo).
- **While your page waits for approval:** stories stay hidden, and they still end 24 hours after they were made.
- **Who:** Club team (owners and admins).
- **Today:** Tried in the browser.

### 19. Nikl admin: club review

- **What it does:** `/admin/clubs` lists club pages **waiting for review**, with each club's name, handle, category, kind, area, bio, and when and by whom it was created. An admin can **Approve**, or **Ask for changes** with a note (the note is required). "Recently reviewed" shows recent decisions and their notes.
- **Finding it:** Links at the top of both admin pages switch between **Club pages** and **Moderation**. Admins also see two banners on the organizer dashboard: "N club pages waiting for review" and "N posts or stories to check".
- **Good to know:** Every decision is written to an internal audit log. Approving a club makes its page and events public straight away.
- **Who:** Nikl admins only. Anyone else sees "Only Nikl admins can see this page."
- **Today:** Tried in the browser.
- **Coming later:** Refunds and featured events (week 9). The database can already suspend a club, but there's no Suspend button yet.

### 20. Nikl admin: moderation

- **Why:** Until automatic image and text checks are set up, a person at Nikl checks people's photos and notes (decision P20).
- **The review switch** (`/admin/moderation`): **Checking first** (the default) means people's photos and notes wait for a Nikl admin before others see them. **Publishing straight away** lets them go out at once, for when automatic checks run or there are very few posts. Club posts and stories, and "Your plans" stories with only an event card, never wait.
- **Posts and stories to check:** new posts and stories from people, anything hidden by 3 reports, and live items that someone reported. Each shows who posted it, its status (Waiting, Hidden by reports, or Live, reported), when, the event, how many reports and why, the photos (click for full size) and the caption or note.
- **Approve** makes it live and closes its reports. **Remove** needs a reason (up to 300 characters). It hides the item, deletes its photos and closes its reports. The person (or, for a club's post or story, the club's owners and admins) gets a notification with the reason, and a removed post shows "Removed" and the reason on the person's own profile in the app.
- **Reports about people, clubs and events:** what was reported, the reason, who reported it, when, and their note. Mark each **Handled** or **Dismiss**.
- **Good to know:** Every decision and every flip of the switch is written to the audit log. Stories leave the queue when their 24 hours are up. Notifications are saved but can't be read anywhere until the Activity screen arrives (week 8), and the organizer dashboard doesn't mark removed posts yet.
- **Who:** Nikl admins only.
- **Today:** Tried in the browser.
- **Coming later:** Automatic checks (AWS for images, Claude for text) so only borderline posts need a person.

### 21. AI poster reading (built, on hold, hidden)

- **What it does:** An organizer uploads the event poster and presses "Fill in details from poster". Nikl's AI (Claude) reads the name, category, date, times, venue, area, price and a short description, and fills in the form. The organizer checks everything before publishing.
- **Today:** Built, but on hold (founder's decision, T23). The button is hidden. It has never run with the real AI; on a developer's computer it can return sample details instead. Each person can read up to 30 posters a day.
- **Who:** Club team, once switched on.
- **Coming later:** Switched on when the founder adds the AI key ([NEXT_STEPS.md](../NEXT_STEPS.md) 1.6).

### 22. Sample data

Local copies of Nikl come with fictional Bhubaneswar clubs (Patia Pacers, Clay & Chai Studio, Old Town Mic and others), venues with map pins, events with free and paid tickets, club posts and automatic club stories. There are no sample people or people's posts: log in to make your own. Every time the local database is rebuilt, the sample events move to the coming week so they are always upcoming, and the sample stories stay up for two weeks.

### 23. Booking and RSVP

- **What it does:** Pick a date, then how many of each ticket type (tap − and +), and add a promo code if you have one. The price updates as you go: tickets, discount, the 4% booking fee and the total. Then:
  - **Free** (the total is ₹0): **RSVP** confirms straight away and your ticket appears in Tickets.
  - **Paid:** your seats are held for **10 minutes** while you pay (see 24). Unpaid holds give their seats back automatically.
- **Rules** (decision P24): up to 10 tickets per booking and 10 of one ticket type. Picking again replaces your own unpaid hold for that date. Sold-out ticket types and ones not on sale yet (or any more) can't be picked. Pressing twice or retrying never makes two bookings.
- **Age:** booking needs a finished profile with your birth year, and you must be 18 or older. Events with an age limit (for example 21+) check it.
- **Women-only events** show a note ("The club may check at the entry"), but Nikl doesn't check it: Nikl doesn't ask for gender (an open question in [DECISIONS.md](../DECISIONS.md#open-questions)).
- **Where:** Both. Website: **Book** or **RSVP** on the event page opens `/e/<event>/book`; without a finished profile it sends you to `/account/setup` first. App: the same button on the event screen opens the Book screen. If you already have seats on hold for that event, it says so and offers to finish paying.
- **Who:** Logged in, 18+, with a finished profile.
- **Today:** Website: tried in the browser (free RSVP, and a paid booking with pretend payments). App: built, not yet tested on a phone.

### 24. Paying

- **One pay page for both** (decision P25): paid bookings are paid on the website at `/pay/<link>`. The app opens it in an in-app browser, and **Back to Nikl** returns you to Tickets. The link is random and long, like a payment link, so the page needs no login.
- **What you see:** the event, your tickets, any discount, the booking fee, the total, and how long your seats stay held. **Pay** opens Razorpay's payment window: UPI (GPay, PhonePe, Paytm), cards or netbanking. Nikl never sees your card or UPI PIN.
- **Time:** starting to pay gives you a fresh 10 minutes once, but a hold never lasts more than 20 minutes in total. If a payment fails, you can try again while the hold lasts. When time runs out the seats go back and you pick again.
- **Late payments** (decision P27): if money arrives after the hold ran out, you still get the seats if they're free. If the event filled up, the booking shows as paid and a full refund is queued (refunds are paid out from week 7).
- **Test mode:** on a developer's computer, payments are pretend: the page says "Test mode: no money moves" with **Pretend it worked** and **Pretend it failed** buttons. A server with no payment setting has payments switched off ("Payments aren't switched on yet").
- **Today:** Pretend payments: tried in the browser. Real Razorpay payments: built, never tried (waiting for the founder's Razorpay test keys, [NEXT_STEPS.md](../NEXT_STEPS.md) 2.4). From the app: built, not yet tested on a phone.

### 25. Tickets

- **What it does:** Lists your bookings in groups:
  - **In progress** (app) / **Waiting for payment** (website): unpaid holds, with **Finish paying**. The app shows a countdown and a **Cancel** button; the website shows when the hold ends.
  - **Upcoming:** confirmed bookings, each with its entry codes, like `NKL-7K2QX9`, one per ticket. A group ticket (for example "Squad of 4") has one code that admits several people. Show the code at the entry.
  - **Refunds and cancellations** (app), for example a late payment being refunded. The website shows a note on the booking instead.
  - **Past:** events that are over.
- **Where:** App: the Tickets tab (pull down to refresh). Website: `/tickets`, also linked from your account page. The pay page shows only how many tickets you got, never the codes, because anyone with the link can open it.
- **Who:** Logged in.
- **Today:** Website: tried in the browser. App: built, not yet tested on a phone.
- **Coming later:** QR codes that work offline, and check-in at the door (week 7).

### 26. Promo codes (organizers)

- **What it does** (decision P26): on an event's manage page (`/organizer/events/<id>`), the **Promo codes** panel lists the club's codes for that event or for all events (code, % or ₹ off, how often used, end date) with **Switch off** / **Switch on**. Below it, add a code: 3 to 20 letters or numbers (for example `EARLY10`), % off (1 to 100) or ₹ off, an optional use limit, an optional last day (India time), and "Works for all of the club's events".
- **How it works for people:** a code works once per person, only while it's switched on and not used up or past its last day. The 4% booking fee is worked out on the price after the discount. There's no screen to edit a code: switch it off and add a new one.
- **Who:** Club owners and admins. Check-in staff don't see the panel.
- **Today:** Making codes: tried in the browser. Booking with a code: built and covered by the automatic tests.

### 27. Website profile set-up

- **What it does:** The same profile as the app (name, username, area, 3 to 12 interests, birth year; 18+), on the website at `/account/setup`. The booking page sends you here when your profile isn't finished, then brings you back. Your account page has **Edit your profile**.
- **Who:** Logged in.
- **Today:** Tried in the browser.

## Try it yourself

The step-by-step tour is in [NEXT_STEPS.md](../NEXT_STEPS.md), section **"Try it yourself"**. You need Docker Desktop running and the website (or the app) started on your computer. On a local copy, log in with **98765 43210** or **99999 99999** and the code **123456**. No real text message is sent. To see people's posts and "Your plans" from both sides, log in with one test number on each of two phones (following people is app-only), follow each other, and approve the posts at `/admin/moderation`. To try booking, the pay page needs the `payments` server function running on your computer (see DEVELOPING.md, "Testing payments locally"); pay with **Pretend it worked**.

## What's not built yet

From the timeline in [DEV_PLAN.md](../DEV_PLAN.md) §7:

| When (planned) | What |
|---|---|
| Week 7 | QR codes on tickets that work offline, a check-in scanner for organizers, refunds, organizer payouts, a waitlist for full events, and an attendee list for organizers. |
| Week 8 | Notifications and an Activity screen (where approval and removal messages will show), reminders, links that open the app. "Today" and "Last few spots" automatic stories. |
| Week 9 | Refunds and featured events for Nikl admins. Analytics. Profile page and City Passport basics. |
| Weeks 10 to 12 | Testing on cheap Android phones, a closed beta, then the Play Store and website launch. |
| Weeks 13 to 15 | The iPhone app. |
| After launch | Squads (group chat, everyone pays their own share), comments, Moments (short videos), memberships, reviews. |

Not on the timeline yet, or waiting on the founder:

- Real text-message login (waits for business registration and MSG91).
- Real payments through Razorpay (test keys needed now, live keys after business registration and KYC).
- Checking women-only events at booking (open question), and tagging events you booked in your posts.
- Nikl's own web address (the domain isn't bought yet), so app shares have no link.
- Venue search with Google (needs a Google key).
- Automatic image and text checks, to replace the hand check (needs AWS and Anthropic keys).
- Replies to stories, tagging friends in posts, a "Join me" button, private accounts and follow requests.
- A profile photo and bio, and screens listing followers.
- Reporting a club or an event from the app.
- Editing a club page, adding a logo, and adding team members (no screen yet).
- A feed on the website for logged-in people (to be reconsidered after the beta, D9).
