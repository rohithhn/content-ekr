# ContentEngine

AI-powered content studio that generates publish-ready, brand-consistent content across LinkedIn, Twitter/X, Blog, Thought Leadership Articles, and Landing Pages — with automatic image generation, animated landing page export, and full local persistence.

## Features

### Multi-Channel Content Generation
- **LinkedIn**: Hook-first professional posts with hashtags and engagement optimization (1200-2500 chars)
- **Twitter/X**: Punchy single tweets and threaded narratives (280 chars / 25-tweet threads)
- **Blog Post**: SEO-optimized long-form with markdown formatting (800-2500 words)
- **Article**: Thought leadership for C-suite readers (1500-4000 words)
- **Landing Page**: Conversion-optimized pages with animated HTML export

### AI-Powered Image Generation
- DALL-E 3 integration for professional, brand-consistent visuals
- Automatic image generation for long-form content (blog, article, landing)
- Manual generation for social channels (LinkedIn, Twitter)
- Content-aware prompts — images are generated based on the actual text output, not just the topic
- Anti-cartoon style enforcement for corporate-grade aesthetics

### Brand Management
- Full brand profile editor: colors, typography, gradients, tone, audience, logos
- Brand guidelines automatically injected into all text and image prompts
- Logo description and sample background support for visual consistency
- Multiple brands with quick-switch in the top bar
- Persistent storage via IndexedDB

### 10 Content Templates
| Template | Category | Channels |
|----------|----------|----------|
| Hot Take on Industry News | Thought Leadership | LinkedIn, Twitter |
| Product Launch Announcement | Product & Company | LinkedIn, Twitter, Blog |
| Lessons Learned Narrative | Personal Brand | LinkedIn, Blog |
| Step-by-Step Guide | Educational | Blog, LinkedIn |
| Research Commentary | Thought Leadership | Article, LinkedIn |
| Case Study Summary | Product & Company | Blog, LinkedIn, Twitter |
| Contrarian Perspective | Thought Leadership | LinkedIn |
| Product Landing Page | Landing Pages | Landing |
| Event Takeaways | Personal Brand | LinkedIn, Twitter, Blog |
| Myth vs. Reality | Educational | LinkedIn, Blog |

### Animated Landing Page Export
- AI generates semantic HTML sections with animation data attributes
- Scroll-triggered entrance animations (fade-up, slide-left, stagger-up, zoom-in)
- Animated number counters for stats/metrics
- Live preview in the right panel with iframe rendering
- Export as self-contained HTML file or open full-screen in browser
- Responsive design with brand-themed CSS custom properties

### Workspace UI
- Three-panel layout: project/template sidebar, chat center, live preview right
- Draggable panel dividers for resizable columns
- Image lightbox for enlarged preview on click
- Real-time generation phase indicators (Parsing URL / Generating text / Generating images)
- Copy, regenerate, and export actions per channel
- Markdown rendering in preview with brand typography

### Persistence & State Management
- Projects and chat history saved to IndexedDB (survives page reload)
- Brand profiles persisted via Dexie
- API keys stored in localStorage
- Active brand and project selection restored on reload
- Debounced auto-save (2-second delay) for all project data

### Client-Supplied API Keys
- API keys can be set via the UI settings modal (per-user, per-browser)
- Keys are sent in request headers to server-side API routes
- Server-side fallback to `.env.local` environment variables
- Provider status indicator shows which AI services are available

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, inline styles
- **AI Models**: Claude (Anthropic) for text, DALL-E 3 (OpenAI) for images, Kling 2.0 for video
- **Persistence**: Dexie.js (IndexedDB wrapper), localStorage
- **State**: Zustand (available), React useState + useEffect (active)
- **Deployment**: Vercel, Docker, AWS ECS

## Quick Start

```bash
# Clone and install
git clone https://github.com/enkryptai/enkryptai-content-engine.git
cd enkryptai-content-engine
npm install

# Configure API keys
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If **3000** is busy, run `npm run dev:3001`. If you see **Internal Server Error**, stop the server, run `rm -rf .next`, and start again; if the port is stuck, `lsof -ti:3000 | xargs kill -9`.

## API Keys

| Provider | Model | Used For | Required? |
|----------|-------|----------|-----------|
| Anthropic | Claude | Text generation | **Yes** (core) |
| OpenAI | DALL-E 3 | Image generation | Optional |
| Nano Banana | Latest | Image generation (alt) | Optional |
| Kuaishou | Kling 2.0 | Video generation | Optional |

At minimum, you need an Anthropic API key for text generation. Keys can be configured in `.env.local` or supplied per-session via the settings modal (gear icon).

## Project Structure

```
content-engine/
├── app/
│   ├── api/
│   │   ├── generate/
│   │   │   ├── text/route.js      # Claude text generation with streaming
│   │   │   ├── image/route.js     # DALL-E 3 / Nano Banana image generation
│   │   │   └── video/route.js     # Kling 2.0 video generation
│   │   ├── url-parse/route.js     # URL content extraction (Readability)
│   │   └── status/route.js        # AI provider availability check
│   ├── layout.js
│   ├── globals.css
│   └── page.js                    # Auth gate + Workspace mount
├── components/
│   ├── Workspace.js               # Main application shell (all panels, modals, state)
│   └── AuthScreen.js              # Login / signup screen
├── config/
│   └── constants.js               # Channels, templates, tones, AI models
├── lib/
│   ├── prompts/
│   │   └── system-prompts.js      # Channel, template, brand, and image prompts
│   ├── ai/
│   │   └── orchestrator.js        # Client-side AI request orchestration
│   ├── db/
│   │   └── index.js               # Dexie IndexedDB schema + CRUD
│   ├── templates/
│   │   └── landing-template.js    # Animated landing page HTML builder
│   └── store.js                   # Zustand global state (available for future use)
├── .github/
│   └── workflows/
│       ├── deploy-vercel.yml      # CI/CD: lint, build, deploy to Vercel
│       └── deploy-aws.yml         # CI/CD: build Docker, push ECR, deploy ECS
├── Dockerfile                     # Multi-stage production build
├── docker-compose.yml             # Local Docker deployment
└── .env.example                   # Environment variable template
```

## Deployment

### Vercel (Recommended)

Automated via GitHub Actions on push to `main`. Set these secrets in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

Then set your API keys as environment variables in the Vercel dashboard.

Pull requests automatically get preview deployments.

### Local (Docker)

```bash
# Build and run
docker-compose up --build

# With custom API keys
ANTHROPIC_API_KEY=sk-... OPENAI_API_KEY=sk-... docker-compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### AWS ECS

1. **Create an ECR repository** named `enkryptai-content-engine`.
2. **Create an ECS cluster** and service with a task definition referencing the ECR image.
3. **Set GitHub secrets**:

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub OIDC federation |

4. **Set environment variables** in the ECS task definition for your API keys.
5. **Trigger deployment** manually via the `Deploy to AWS ECS` workflow in GitHub Actions.

```bash
# Manual build and push (without GitHub Actions)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t enkryptai-content-engine .
docker tag enkryptai-content-engine:latest <account>.dkr.ecr.us-east-1.amazonaws.com/enkryptai-content-engine:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/enkryptai-content-engine:latest
```

## Architecture Decisions

1. **Client-side storage (IndexedDB)**: All projects, brands, messages, and history persist in the browser via Dexie.js. No server-side database needed for the MVP.

2. **Server-side API routes**: API keys live in `.env.local` and are accessed only via Next.js API routes. Client-supplied keys are accepted via request headers with server-side fallback.

3. **Parallel text generation**: Text for all active channels is generated simultaneously. Images are generated sequentially per channel to respect API rate limits.

4. **Streaming**: Text generation supports SSE streaming for real-time UI updates.

5. **Multi-variant architecture**: Each generation produces a content bundle with N text variants x M visual variants per channel, allowing users to mix and match.

6. **Standalone output**: Next.js is configured with `output: "standalone"` for minimal Docker images (~150MB vs ~1GB).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

Licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 Enkrypt AI, Inc.
