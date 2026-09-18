# Nekko — Setup Guide (Phase 1: Accounts)

This gets your site live with working sign up / log in / log out, using
GitHub Pages (hosting) + Firebase (accounts + database), both free.

---

## Part A — Create your Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it anything (e.g. "nekko-app"). Disable Google Analytics (not needed) → **Create project**.
3. In the left sidebar, click **Build > Authentication** → **Get started**.
4. Under "Sign-in method," click **Email/Password**, toggle it **Enabled**, click **Save**.
   (We use this behind the scenes even though users only type a username — see note below.)
5. In the left sidebar, click **Build > Firestore Database** → **Create database**.
   - Choose **Start in production mode**.
   - Pick any location close to you → **Enable**.
6. Once created, click the **Rules** tab at the top.
7. Delete everything there and paste in the entire contents of **firestore.rules**
   (included in this folder). Click **Publish**.
8. Now click the gear icon (top left, next to "Project Overview") → **Project settings**.
9. Scroll to "Your apps" → click the **</>** (web) icon.
10. Give it a nickname (e.g. "nekko-web") → **Register app**.
11. Firebase shows you a `firebaseConfig = { ... }` block. Copy those values.
12. Open **js/firebase-config.js** in this folder and paste your real values in,
    replacing the `PASTE_YOUR_...` placeholders.

That's it for Firebase — accounts and the database are ready.

---

## Part C — Enable Storage (needed for photo/video posts — Phase 2)

1. In the Firebase Console left sidebar, click **Build > Storage** → **Get started**.
2. Choose **Start in production mode** → pick the same location as your
   Firestore database → **Done**.
3. Click the **Rules** tab at the top.
4. Delete everything there and paste in the entire contents of
   **storage.rules** (included in this folder). Click **Publish**.

This lets people upload photos/videos to their posts, while blocking
anyone from uploading into someone else's folder or uploading huge files.

⚠️ **Note on Firebase's free tier:** Storage and Firestore both have
generous free quotas, but Storage's free tier requires your project to be
on the **Blaze (pay-as-you-go)** plan with a billing method attached —
Firebase still won't charge you unless you go far past the free limits
(5GB storage, 1GB/day downloads), but it does ask for a card on file.
If you'd rather avoid that for now, you can skip file uploads and use
text-only posts — everything else in Phase 2 (posting, comments, sharing)
still works without Storage enabled.

Also update your **firestore.rules** (Rules tab under Firestore Database,
not Storage) with the newer version in this folder — it now also covers
posts and comments.

---

## Part B — Put it on GitHub Pages

1. Go to https://github.com and log in (or create a free account).
2. Click the **+** icon top right → **New repository**.
3. Name it (e.g. `nekko`), keep it **Public**, click **Create repository**.
4. On the new repo page, click **uploading an existing file**.
5. Drag in **every file and folder** from this Nekko project
   (index.html, signup.html, dashboard.html, forgot-password.html,
   the css folder, the js folder, the images folder — everything).
6. Scroll down, click **Commit changes**.
7. Go to the repo's **Settings** tab → **Pages** (left sidebar).
8. Under "Branch," choose **main** and folder **/ (root)** → **Save**.
9. Wait about 1 minute, then refresh — GitHub shows your live link, like:
   `https://yourusername.github.io/nekko/`

Send that link to anyone — it works on phone or PC, no installs needed.

---

## Swapping in your own images

Right now the logo is a plain placeholder circle with "N" in it.
To use your own artwork (make sure it's art you own the rights to, or
licensed/royalty-free):

1. Put your logo image in the `images/` folder, named `logo-placeholder.png`
   (or update the filename in the HTML files if you name it something else).
2. Re-upload that one file to GitHub the same way as Part B, step 5.

---

## How the "no email" login actually works

Firebase's login system technically requires an email address behind the
scenes. So this code quietly creates one for you: if someone signs up as
`nekomen`, it stores an internal email of `nekomen@nekko.local` that the
user never sees or types. They only ever interact with their username.

## How "Forgot Password" works

Since there's no email to send a reset link to, the "Forgot Password" page
just saves a request (with their username) into your Firestore database.
To see these requests:

1. Firebase Console → Firestore Database → look for the
   **password_reset_requests** collection.
2. Find their username, then go to **Authentication** tab, search their
   fake email (`username@nekko.local`), click the **⋮** menu → **Reset password**
   (or just delete and let them re-sign-up, or manually set a temp password).

---

## What's next

All five phases are done! Nekko now has accounts, posts, chat, stories,
and games. If you want more later — likes on posts, replies in chat,
group chats, a real chess AI opponent, whatever — just ask and I can
build it on top of this same foundation.

---

## Phase 5 — what you got

- **Games hub** (🎮 Games in the top bar) linking to three mini-games:
- **Snake** — classic, with a personal best score saved per account
- **Barricade** (brick-breaker) — same, with 3 lives and a saved best score
- **Chess** — full rules including check, checkmate, and stalemate
  detection, local pass-and-play on one device (two people take turns
  on the same screen/phone). Note: no castling or en passant, and pawns
  promote straight to queen — everything else is standard chess.

High scores are saved to each player's own account and shown next to
"Best" every time they play.

---

## Phase 4 — what you got

- **Stories bar** at the top of the home feed — circles for anyone with
  an active story, plus a "+" to add your own.
- Tap a circle to view: auto-advances every 5 seconds, tap left/right side
  to go back/forward, tap ✕ to close.
- Stories **disappear from view after 24 hours** automatically (the app
  checks the expiry time every time it loads the list).

### Optional: auto-delete expired stories from the database

The 24h disappearing behavior already works for everyone viewing the
site. But without extra setup, expired story documents just sit unused
in your database forever (harmless, but adds clutter over time). To have
Firestore actually delete them automatically:

1. Firebase Console → Firestore Database → click the **TTL** tab
   (may be under "Indexes" or a "..." menu depending on the console layout).
2. Click **Create policy**.
3. Collection group: `stories`. Timestamp field: `expireAt`.
4. Save. Firestore will now delete expired story documents within
   ~24 hours of expiry, on its own, in the background.

This step is optional — skip it if you don't see the TTL tab or don't
want to bother; nothing breaks either way.

---

## Phase 3 — what you got

- **Direct messages:** click "💬 Chat" in the top bar, type a username to
  start a new conversation, and it opens a live thread.
- **Conversation list:** every chat you've had shows on the left (or as a
  full-screen list on phones), with a preview of the last message.
- **Real-time:** messages appear instantly on both sides, no refresh.

Note: your Firestore rules were updated again to cover conversations and
messages — make sure you re-paste **firestore.rules** into the Firebase
Console Rules tab after this update.

---

## Phase 2 — what you got

- **Posting:** text, photos, or videos (up to 25MB), shown live in the feed
  the moment they're posted — no refresh needed, for you or anyone else
  looking at the site at the same time.
- **Comments:** click "💬 Comments" on any post to open a live comment
  thread under it.
- **Share:** click "🔗 Share" to copy a direct link to that specific post
  to your clipboard.

Everything updates in real time using Firestore's live listeners, so if
your friend posts something while you're on the page, it just appears.
