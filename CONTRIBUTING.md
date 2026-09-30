# Contributing to SplitEase

Thanks for helping out! SplitEase is open source under the [MIT License](LICENSE), and contributions of all sizes are welcome — bug fixes, features, docs, translations, tests.

## Ways to contribute

- **Pick an issue.** Look for [`good first issue`](https://github.com/Gautam5514/splitApp/labels/good%20first%20issue) or [`help wanted`](https://github.com/Gautam5514/splitApp/labels/help%20wanted). Comment on it so nobody duplicates your work.
- **Report a bug** or **suggest a feature** using the [issue templates](https://github.com/Gautam5514/splitApp/issues/new/choose).
- **Improve the docs** — typos, missing setup steps, and clearer explanations are all valuable.

## Setup

```bash
git clone https://github.com/<your-username>/splitApp.git
cd splitApp
npm install
cp .env.example .env                                        # fill in your own values
cp google-services.json.example google-services.json        # Android (your Firebase project)
cp GoogleService-Info.plist.example GoogleService-Info.plist # iOS (your Firebase project)
npx expo start
```

You need **your own Firebase project** and Google OAuth client IDs. Never use, request, or commit anyone else's credentials.

> **Backend:** the app talks to a REST + Socket.IO API set via `EXPO_PUBLIC_API_URL`. If you don't have one running, UI-only work (styling, components, layout, docs) is still fine — say so in your PR.

## Workflow

1. Fork the repo and create a branch: `git checkout -b fix/short-description`.
2. Make your change. Keep PRs focused — one concern per PR.
3. Run the checks:
   ```bash
   npm run lint
   npm test
   ```
4. Commit with a clear message (we like [Conventional Commits](https://www.conventionalcommits.org): `fix: …`, `feat: …`, `docs: …`).
5. Open a pull request against `main` and fill in the template. Add screenshots for UI changes.

## Code guidelines

- Follow the style of the surrounding code; the linter is the source of truth.
- Screens live in `app/` (Expo Router), reusable UI in `components/`, shared logic in `lib/` and `hooks/`.
- Use the theme context for colors instead of hard-coding them, so light/dark/premium themes keep working.
- Add or update tests when you change logic (Jest + React Native Testing Library).
- Don't add heavy dependencies without discussing it in an issue first.

## Security

Never commit secrets (`.env`, `google-services.json`, `GoogleService-Info.plist`, keystores). To report a vulnerability privately, see [SECURITY.md](SECURITY.md) — don't open a public issue.

## Code of Conduct

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
