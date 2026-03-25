# content-engine

## Vercel

### Your files stay in the repo

Setting **Root Directory** on Vercel only tells their servers **which folder to build**. It does **not** delete, move, or drop **`Content/`**, **`visual designer/`**, **`.cursor/`**, or anything else from GitHub or your machine. The full monorepo stays as-is; Vercel just runs `npm install` / `next build` **inside** `content-studio/`.

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
