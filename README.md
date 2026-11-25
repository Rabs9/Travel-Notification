# Sundrift — travel deal finder

Tell Sundrift what kind of trip you want (where, how much, how many people,
all-inclusive, beach, pool…). It checks travel sites for real prices and shows
you the best matches with a link to book.

Made for departures from **Ottawa and Toronto**.

---

## Install on Windows 11 (about 2 minutes)

1. **Download** `Sundrift.exe` from the latest release:
   **https://github.com/Rabs9/Travel-Notification/releases/latest**
   Click **Sundrift.exe** under "Assets". It's about 85 MB.

2. **If Edge says "Sundrift.exe isn't commonly downloaded":**
   click the **…** next to the message → **Keep** → **Show more** → **Keep anyway**.

3. **Move it somewhere easy to find.** Open your Downloads folder and drag
   `Sundrift.exe` onto your Desktop.

4. **Double-click `Sundrift.exe`.**
   If a blue box says **"Windows protected your PC"**: click **More info** →
   **Run anyway**. You only have to do this the first time.

5. A **black window** opens and your **web browser opens Sundrift** by itself.
   - Leave the black window open while you use Sundrift. You can minimise it.
   - When you're done, close the black window.

**To use it again:** double-click `Sundrift.exe` on your Desktop.

### First time in the app

- Under **Flying from**, click **🍁 Ottawa** or **🍁 Toronto**.
- Set your budget, dates and what you want, then press **Start scanning**.
- Every deal has a **Book** button that opens the real travel site.
- Optional, in ⚙️ **Settings**:
  - **Currency:** CAD is already set.
  - **Repeat scan:** checks again every 15 minutes to 12 hours while
    Sundrift is open.
  - **Alerts:** a text message or a notification when a great match shows up.

### If something goes wrong

- **The browser didn't open:** open your browser and go to
  **http://127.0.0.1:8765/**
- **"Sundrift is already running":** it's fine. Sundrift was already open, and
  your browser shows it again.
- **Windows Firewall asks about network access:** you can click **Cancel**.
  Sundrift only talks to your own computer and to the travel sites.
- **Your settings are kept in your browser.** Always use the same browser.

---

## What it searches

Real prices, no account or API key needed:

| Source | What | From Ottawa | From Toronto |
|---|---|---|---|
| Transat | vacation packages | ✅ | ✅ |
| Sunwing | vacation packages | ✅ | ✅ |
| Air Transat | flights | sometimes | ✅ |
| Flair | flights | — (doesn't fly from Ottawa) | ✅ |
| Carnival | cruises (fly or drive to port, USD prices) | ✅ | ✅ |

The **🔗 Search links** panel opens prefilled searches on the sites that don't
publish prices:
- **Flights:** Air Canada, WestJet, Porter and Expedia.ca.
- **Packages:** WestJet Vacations, Air Canada Vacations, redtag.ca and
  itravel2000.
- **Cruises:** Royal Caribbean, Celebrity, Norwegian, Princess, Virgin, St.
  Lawrence Cruise Lines and Victory.
- **Trains:** VIA Rail, Ontario Northland and Amtrak.

Sundrift only makes ordinary, occasional requests. Each page is read at most
about every 10–15 minutes, and it never tries to get around a site's
protections. Sites can change their pages at any time, and when that happens a
source can stop working until Sundrift is updated.

Other modes, in Settings → Data:
- **Demo:** sample prices. The links still open real searches.
- **Live:** uses a free Travelpayouts API token.

---

## For developers

- `index.html`: the whole app (vanilla JS, no build step).
- `server.js`: a tiny Node server with no dependencies. It serves the page and
  relays a short allowlist of public pages that browsers can't read directly
  (no CORS header). The relay:
  - caches each page for 14 minutes
  - answers only to localhost
  - follows https redirects only to allowed hosts
  - returns relayed data as text/JSON under a sandbox CSP

Run it:

    node server.js          # http://127.0.0.1:8765/
    PORT=9000 node server.js

### Build the Windows .exe (from Linux)

    ./build-windows.sh      # -> dist/Sundrift.exe

This uses Node's single-executable feature:
1. Downloads the matching Windows `node.exe` and checks its checksum.
2. Embeds `server.js` and `index.html`.
3. Removes the original signature with `tools/strip-signature.py`.
4. Injects the app with `postject`.

The .exe is unsigned, which is why Windows shows the "protected your PC"
prompt.

Upload `dist/Sundrift.exe` to a GitHub Release.
