# content-engine

## Local dev (Content Studio)

From the **repo root** (after `npm install` in `content-studio/`):

```bash
npm run dev
```

Or from **`content-studio/`**:

```bash
cd content-studio && npm install && npm run dev
```

Open **http://localhost:3000** — the dev server uses **port 3000** by default (standard Next.js).

If the tab stays blank, shows **Internal Server Error**, or spins forever:

1. Confirm nothing else is using **3000**, or run `cd content-studio && npm run dev:3001` to use port 3001 instead.
2. Clear a stuck Next process: `lsof -ti:3000 | xargs kill -9`, then run `npm run dev` again.
3. Clear a corrupted dev cache: `rm -rf content-studio/.next`, then `npm run dev` again.

---

## Vercel

### Your files stay in the repo

Setting **Root Directory** on Vercel only tells their servers **which folder to build**. The rest of the repo (e.g. **`.cursor/`**) stays in Git as-is; Vercel runs `npm install` / `next build` **inside** `content-studio/`.

### One-time project settings (avoids most Vercel errors)

1. [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings** → **Build & Deployment**.
2. **Root Directory** → **Edit** → **`content-studio`** → Save.  
   (No leading `/`, exact spelling, not `Content` with a capital C.)
3. **Framework Preset** → **Next.js** (or Auto after step 2).
4. Turn **off** overrides for **Build Command**, **Output Directory**, and **Install Command** unless you added them on purpose — let `content-studio/vercel.json` and defaults apply when Root Directory is `content-studio`.
5. **Deployments** → **Redeploy** the latest.

If Root Directory is wrong or empty, you may see **`404 NOT_FOUND`** or **“No Next.js version detected”**.

### Fallback (repo root)

If Root Directory is accidentally left as the repository root, the root **`vercel.json`** and **`package.json`** try to install/build from `./content-studio` anyway. Prefer fixing step 2 so Vercel’s Next.js integration matches the app layout.
