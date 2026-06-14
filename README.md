# Grab — YouTube search & save (Vercel + Apple Shortcuts)

A tiny Next.js app with two API routes:

- `GET /api/search?q=<text>&type=video|channel` — search YouTube videos, or
  pull the latest uploads from a channel by name.
- `GET /api/download?id=<video id>` — streams back an MP4 file you can save.

The web page at `/` is a thin client over those same two endpoints, so
whatever works in the browser will also work from an Apple Shortcut hitting
the URLs directly.

## 1. Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, search for something, hit the circular save
button on a result.

## 2. Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel
```

Or push this folder to a GitHub repo and import it in the Vercel dashboard.
No environment variables or API keys are needed — `youtubei.js` talks to
YouTube's internal client API directly.

Your endpoints will be:

```
https://<your-app>.vercel.app/api/search?q=...&type=video
https://<your-app>.vercel.app/api/download?id=...
```

## 3. Wiring up the Apple Shortcut

This is the flow for a fully standalone Shortcut (you can trigger it from
the Share Sheet, Siri, or the home screen):

1. **Ask for Input** — text, prompt "Search YouTube for…"
2. **Get Contents of URL**
   - URL: `https://<your-app>.vercel.app/api/search?q=[Provided Input]&type=video`
   - Method: GET
3. **Get Dictionary from Input** (on the result of step 2)
4. **Get Value for "results"** in that dictionary → gives you a list of
   video dictionaries
5. **Repeat with Each** item in that list:
   - **Get Value for "title"** → add to a new list, "Titles"
6. **Choose from List** → "Titles" — this shows you the search results to
   pick from
7. To map the chosen title back to a video id: instead of step 5/6, you can
   alternatively use **Choose from Menu** and manually add one menu item per
   result with a "Get Value for id" action inside each branch — but the
   simplest approach is:
   - **Repeat with Each** result → inside the loop, **Text** action building
     a line like `Title — videoId`, append to a list
   - **Choose from List** on that combined list
   - **Text** action + **Match Text**/**Split Text** on " — " to pull the
     `videoId` back out of the chosen string
8. **Get Contents of URL**
   - URL: `https://<your-app>.vercel.app/api/download?id=[videoId]`
   - Method: GET
   - This returns the actual video file
9. **Save to Camera Roll** (a.k.a. "Save to Photos") — feed it the file from
   step 8

For channel search, same shape but call
`/api/search?q=<channel name>&type=channel`, which returns the channel's
recent uploads in the same `results` format.

### Quick test without building the whole Shortcut

You can sanity-check both endpoints from a browser or `curl` first:

```bash
curl "https://<your-app>.vercel.app/api/search?q=lofi+beats&type=video"
curl -L "https://<your-app>.vercel.app/api/download?id=VIDEO_ID" -o test.mp4
```

## 4. Things worth knowing

- **Quality is capped.** The download route asks for a format that already
  has audio and video muxed together (no `ffmpeg` step), which tops out
  around 360p–720p depending on the video. Going higher quality requires
  merging separate audio/video streams with `ffmpeg`, which is a much
  heavier dependency for a serverless function.
- **Long videos may hit timeouts.** `maxDuration` in
  `app/api/download/route.js` is set to 60s. Vercel's actual ceiling depends
  on your plan — check the current limits in your dashboard and adjust if
  downloads of longer videos fail partway through.
- **YouTube occasionally blocks cloud IPs.** `youtubei.js` mimics YouTube's
  internal clients, but YouTube does sometimes rate-limit or challenge
  requests from datacenter IP ranges (including Vercel's). If searches or
  downloads start failing with auth-type errors, this is the most likely
  cause — there's no fully reliable fix, but keeping `youtubei.js` updated
  (`npm update youtubei.js`) helps, since the maintainers track YouTube's
  changes closely.
- **This relies on an unofficial library.** `youtubei.js` reverse-engineers
  YouTube's internal API, so it can break when YouTube changes things.
  Expect occasional maintenance (bumping the dependency version) to keep it
  working.
- **Personal use.** This is meant for grabbing your own uploads, Creative
  Commons content, or things you otherwise have rights to download —
  YouTube's terms don't generally permit downloading arbitrary videos.
