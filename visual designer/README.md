
  # visual designer

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Deploy to Vercel

  1. Push this project to **GitHub** (or GitLab / Bitbucket).
  2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import the repo.
  3. Vercel will detect **Vite** automatically:
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
  4. Click **Deploy**. No env vars are required for the static UI; API keys are entered in the app by users.
  5. Optional: **Vercel CLI** from the project root:
     ```bash
     npm i -g vercel
     vercel
     ```
     Follow prompts; use defaults for a Vite app.

  `vercel.json` includes a SPA rewrite so client routes always serve `index.html` (static assets under `dist/assets/` are still served as files).
