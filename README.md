# content-engine

## Vercel

The Next.js app that should be deployed is in **`content-studio`** (not the repository root).

1. Open your project on [Vercel](https://vercel.com/dashboard) → **Settings** → **Build & Deployment**.
2. Under **Root Directory**, click **Edit**, set it to **`content-studio`**, and save.
3. Under **Framework Preset**, choose **Next.js** (or leave auto-detect after the root change).
4. Clear any custom **Output Directory** override unless you know you need it; Next.js on Vercel should use the default.
5. Redeploy (**Deployments** → ⋮ on the latest → **Redeploy**).

If Root Directory stays empty, Vercel builds from the repo root, where there is no Next.js app, which often surfaces as **`404 NOT_FOUND`** on the deployment URL.
