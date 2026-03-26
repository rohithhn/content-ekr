# Contributing to ContentEngine

Thank you for your interest in contributing to ContentEngine! This guide explains how to get involved.

## Getting Started

1. **Fork the repository** and clone your fork locally.
2. **Install dependencies**: `npm install`
3. **Copy environment config**: `cp .env.example .env.local` and add your API keys.
4. **Start the dev server**: `npm run dev`
5. **Open** [http://localhost:3000](http://localhost:3000) to verify everything works.

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes with clear, focused commits.
3. Run the linter before pushing:
   ```bash
   npm run lint
   ```
4. Ensure the project builds cleanly:
   ```bash
   npm run build
   ```
5. Push your branch and open a Pull Request against `main`.

## Branch Naming

| Prefix     | Purpose                     |
|------------|-----------------------------|
| `feat/`    | New feature                 |
| `fix/`     | Bug fix                     |
| `docs/`    | Documentation only          |
| `refactor/`| Code refactoring            |
| `test/`    | Adding or updating tests    |
| `chore/`   | Build, CI, tooling changes  |

## Commit Messages

Write clear, descriptive commit messages. Use the imperative mood:

- **Good**: `Add debounced auto-save for project persistence`
- **Bad**: `Fixed stuff` or `wip`

## Pull Request Guidelines

- Keep PRs focused on a single concern.
- Include a summary of **what** changed and **why**.
- Link to related issues if applicable.
- Ensure CI passes (lint + build) before requesting review.
- Add screenshots or recordings for UI changes.

## Code Style

- **No unnecessary comments** — code should be self-documenting. Only add comments for non-obvious intent or trade-offs.
- **Functional React** — use hooks, not class components.
- **Inline styles** — the project uses inline style objects (not CSS modules or Tailwind utility classes in JSX).
- Keep files focused. Avoid monoliths over 500 lines where possible.

## Architecture Notes

- **Client-side persistence**: All user data (projects, brands, messages) is stored in IndexedDB via Dexie. There is no server-side database.
- **API routes**: Server-side API routes in `app/api/` proxy requests to AI providers. API keys are kept server-side via `.env.local` or passed from the client in request headers.
- **System prompts**: `lib/prompts/system-prompts.js` contains the prompt engineering for all channels and templates. Changes here significantly affect output quality.

## Reporting Issues

- Use GitHub Issues with a clear title and description.
- Include steps to reproduce for bugs.
- Include browser and Node.js version.
- Label issues appropriately (`bug`, `enhancement`, `documentation`).

## Security

- **Never commit `.env.local`** or any file containing API keys.
- If you discover a security vulnerability, please report it privately via GitHub Security Advisories rather than opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
