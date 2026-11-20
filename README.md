# Random Pins

Pulls **every pin from every board** (secret boards included) on your Pinterest account into one pool, removes duplicates by pin id, shuffles it uniformly (Fisher-Yates), and shows N random pins in a grid. No per-board balancing: a board with 500 pins is 5x as likely to show up as one with 100.

- N is a number you type (default 100, capped at the pool size)
- **Reshuffle** re-draws without refetching; **Reload pins** refetches from Pinterest
- Shows how many unique pins were loaded; every tile links to the original pin
- Loading, error, and empty states
- **Sample-data mode** when no credentials are configured, so it runs out of the box

Stack: Next.js (App Router), TypeScript, Tailwind, shadcn/ui. Runs on port **4821**.

## Run it

```bash
npm install
npm run dev        # http://localhost:4821
```

With no env vars set you get sample data. To use your real account, set up credentials below (copy `.env.example` to `.env.local`) and restart.

## Connect Pinterest

You can authenticate in either of two ways.

### Option A: OAuth ("Connect with Pinterest" button)

1. Sign in at <https://developers.pinterest.com/> (a normal Pinterest account works; a Business account is not required).
2. Go to **My apps** (<https://developers.pinterest.com/apps/>) and click **Connect app**. Fill in the app name, description, and what you'll use it for, then submit. New apps start with **Trial access**.
3. Open the app and copy the **App ID** and **App secret**.
4. In the app settings, under **Redirect URIs**, add exactly: `http://localhost:4821/api/auth/callback` (it must match `PINTEREST_REDIRECT_URI` character for character).
5. Put these in `.env.local`:
   ```
   PINTEREST_APP_ID=your-app-id
   PINTEREST_APP_SECRET=your-app-secret
   PINTEREST_REDIRECT_URI=http://localhost:4821/api/auth/callback
   ```
6. Restart `npm run dev`, open the app, click **Connect with Pinterest**, and approve. The app requests `boards:read`, `pins:read`, `boards:read_secret`, and `pins:read_secret`. The token is stored in an httpOnly cookie.

### Option B: paste an access token (simplest)

1. Complete steps 1-3 above (you don't need a redirect URI for this).
2. On the **My apps** page, open your app and click **Generate access token** (next to the app's credentials). Select the scopes `boards:read`, `pins:read`, `boards:read_secret`, `pins:read_secret`, then generate and copy the token.
3. Either paste it into the **Connect Pinterest** screen in the app, or set it in `.env.local`:
   ```
   PINTEREST_ACCESS_TOKEN=pina_...
   ```

If the token lacks the `*_secret` scopes, the app falls back to public boards only.

### Trial vs Standard access

Pinterest apps with Trial access are limited: the production API may reject requests until Pinterest approves **Standard access** (request it from the app page; they review it). Until then you can test against Pinterest's sandbox by generating a sandbox token and setting:

```
PINTEREST_API_BASE=https://api-sandbox.pinterest.com/v5
```

The sandbox only contains data you create through it, not your real boards. Pinterest changes this program from time to time, so check the current rules at <https://developers.pinterest.com/docs/getting-started/set-up-app/>.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` | OAuth app credentials |
| `PINTEREST_REDIRECT_URI` | OAuth callback (default `http://localhost:4821/api/auth/callback`) |
| `PINTEREST_ACCESS_TOKEN` | Use this token directly, no OAuth |
| `PINTEREST_API_BASE` | Override the API base (default `https://api.pinterest.com/v5`) |

A token pasted in the UI takes precedence over `PINTEREST_ACCESS_TOKEN`. Access tokens expire (about 30 days); reconnect when you see a rejected-token error.

## How it works

- `lib/pinterest.ts`: lists all boards (`GET /v5/boards?privacy=ALL`) and every board's pins (`GET /v5/boards/{id}/pins`), following `bookmark` pagination to the end (page size 250, retries on HTTP 429), 4 boards at a time.
- `lib/shuffle.ts`: dedupe by pin id and the Fisher-Yates shuffle.
- `lib/mock.ts`: sample data (6 boards with overlapping pins to exercise dedupe).
- `app/api/*`: `/api/pins`, `/api/auth/{login,callback,logout}`, `/api/token`.

## Scripts

`npm run dev` · `npm run build` · `npm start` (port 4821) · `npm run lint`

