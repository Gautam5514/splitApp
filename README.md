<div align="center">

<img src="https://play-lh.googleusercontent.com/VWFYRdZLgY7TRuc_3HJ3u26J6K2LOG6ADA78lJE1WY9JxFHsXxaAH0wH21YsYooQlXI75c_83R5aIeXQ4X3p=w180-h180" width="120" alt="SplitEase logo" />

# SplitEase

### Travel more. Worry less. Split effortlessly.

**SplitEase** is a premium, AI-powered group expense manager for trips, roommates, and everyday hangouts — smart splitting, receipt scanning, real-time group chat, one-tap UPI settlement, and a rewards club, all in one app.

[![Get it on Google Play](https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png)](https://play.google.com/store/apps/details?id=com.kunal.splitapp)

[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-8A2BE2?style=flat-square)](#)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Push-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![License](https://img.shields.io/badge/license-Proprietary-red?style=flat-square)](#-license)

</div>

<br />

<div align="center">
  <img src="https://play-lh.googleusercontent.com/q9Lwm8QZMg5602cU4jIctmGsRTVRh8WzMbg1CgTCMtMD9_6tuhQAAoSt7IjQdXV5ea_u_Suc3GM7WHKuyxewYA=w1052-h592" width="19%" alt="SplitEase screenshot 1" />
  <img src="https://play-lh.googleusercontent.com/M0xOdquAwN6CdcE0HpoCfcof0SYV_Pg_eBUSDmyzhYL9A35pN6I8zjhJPUPkTzd4dpjuH4TCE6s9Sht6FBW_eqw=w1052-h592" width="19%" alt="SplitEase screenshot 2" />
  <img src="https://play-lh.googleusercontent.com/AfqcJnS0cTGFdY00XSYoktCLHhqYBU4TsxzGo_PMbZGRgzUcnJukPVNDJW0CeIV1sX1Cf-4u4uEF2QQQtZOT=w1052-h592" width="19%" alt="SplitEase screenshot 3" />
  <img src="https://play-lh.googleusercontent.com/7kfldhV3KUP5c8k5j46C62Xc22T72VnR1QdWN7Lg-AQUaeenkXNAS5qZ2HEuO73A6IWgeoNSLmP24Qqf8ajckw=w1052-h592" width="19%" alt="SplitEase screenshot 4" />
  <img src="https://play-lh.googleusercontent.com/T-JbdOaxZxSax6nAtEQ4ejib1TOFjnqGg60Qu6pFASXwF2AWkAscvKt7AU0Qf5_7jcG7kuAiU9Pu2WlY5AcNLw=w1052-h592" width="19%" alt="SplitEase screenshot 5" />
</div>

<p align="center"><sub>Live screenshots from the <a href="https://play.google.com/store/apps/details?id=com.kunal.splitapp">Google Play listing</a></sub></p>

---

## Table of Contents

- [Why SplitEase](#why-splitease)
- [Features](#features)
- [How it works](#how-it-works)
- [Elite Club rewards](#elite-club-rewards)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Building & releasing](#building--releasing)
- [Roadmap](#roadmap)
- [Support](#support)
- [License](#license)

---

## Why SplitEase

Splitting bills with friends usually means a messy spreadsheet, a dozen "who owes what" texts, and someone always forgetting to pay up. **SplitEase** replaces all of that with one clean flow: create a group, log the expense (or just scan the receipt), and let the app work out — and settle — the balances.

Trusted by 10,000+ travelers and live on Google Play as **Splitease**.

## Features

| | Feature | Description |
|---|---|---|
| 🧮 | **Smart Split Engine** | Split equally, by percentage, by shares, or by exact amount — the math is handled the moment an expense is added. |
| 📸 | **AI Receipt Scanner** | Snap a photo of any bill. OCR reads every line item, itemizes it, and drops it straight into the group. |
| 💬 | **Settle Chat** | Group chat and the expense ledger live in the same thread — every bill and payment is part of the conversation, in real time via Socket.IO. |
| ⚡ | **Minimum-Transfer Optimizer** | Nets every balance in the group and routes the fewest possible payments to settle everyone up. |
| 💳 | **One-Tap UPI Settle** | Clear debts instantly with UPI. Each settlement is logged and balances reset to zero automatically. |
| 🏆 | **Elite Club Rewards** | Earn coins by referring friends; unlock badges, custom themes, priority support, and early access to new features. |
| 🔔 | **Push Notifications** | Real-time alerts for new expenses, chat messages, settlements, and group invites via Firebase Cloud Messaging. |
| 📱 | **Home Screen Widget** | An Android widget shows live balances — what you owe and what's owed to you — without opening the app. |
| 🎨 | **Custom Themes** | Light, dark, and unlockable premium themes, switchable anywhere in the app. |
| 🔐 | **Secure Auth** | Email/password and Google Sign-In, backed by Firebase Auth and Expo Secure Store. |
| 🔗 | **Instant Invites** | Every group ships with a shareable link and invite code — friends join in one tap. |
| 🤖 | **AI Chat Assistant** | Ask questions about a group's spending and get instant, conversational answers. |
| 📊 | **Expense Breakdown & Charts** | Visual breakdowns of who spent what, and where the group's money actually went. |

## How it works

1. **Create your account** — email or Google sign-in, ready in under a minute.
2. **Start a group** — a trip, a flat, or a one-off dinner; unlimited groups, each with its own chat.
3. **Invite friends** — share a link or invite code; they auto-join after signing in.
4. **Log expenses** — type it in two taps, or let the AI receipt scanner do it for you.
5. **Split it your way** — equal, percentage, shares, or exact amounts; balances are netted automatically.
6. **Settle up** — one tap routes the fewest possible UPI payments and zeroes the ledger.

## Elite Club rewards

Referring friends earns coins that climb through reward tiers:

| Tier | Coins | Perks |
|---|---|---|
| Bronze | 100 | Bronze badge + 1 custom theme |
| Silver | 300 | Silver badge + all custom themes |
| Gold | 750 | Gold badge + priority support + early access |
| **Elite Club** | 1,500 | Elite badge + every future reward |

Sharing a referral link credits **50 coins** to the referrer and **25 coins** to the friend the moment they join — no waiting, no conditions.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) 54 · [React Native](https://reactnative.dev) 0.81 · [React](https://react.dev) 19 |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (typed routes, file-based) |
| Auth | Firebase Auth · Google Sign-In · Expo Secure Store |
| Realtime | Socket.IO client (live chat & balance updates) |
| Backend services | Firebase (Auth, Cloud Messaging, Firestore/Storage) |
| Data & networking | Axios |
| Animation & UI | React Native Reanimated 4 · Expo Linear Gradient · Expo Blur · Lucide icons |
| Charts | react-native-chart-kit / react-native-svg |
| Native extras | Android home-screen widget (`react-native-android-widget`), Play Install Referrer, Expo Notifications |
| Testing | Jest (`jest-expo`) · React Native Testing Library |
| Tooling | TypeScript · ESLint (`eslint-config-expo`) |

## Project structure

```
splitApp/
├── app/                  # Expo Router screens (file-based routing)
│   ├── (tabs)/           # Home, Trips, Chat, Profile tab screens
│   ├── auth/              # Login & registration
│   ├── chat/, group-chat/ # 1:1 and group chat threads
│   ├── groups/            # Group detail, balances, expenses
│   ├── info/               # Help, pricing, privacy, terms, contact, etc.
│   ├── join/[inviteCode]/  # Deep-link group invites
│   └── ai-chat.jsx, rewards.jsx, theme-store.jsx, settings.jsx ...
├── components/            # Reusable UI: modals, charts, headers, chat UI
├── context/                # Auth, Notification, and Theme providers
├── lib/                    # API client, Firebase, sockets, push notifications
├── widgets/                 # Android home-screen balance widget
├── hooks/                    # Shared React hooks
├── constants/                  # App-wide constants
├── android/ · ios/               # Native project files
└── assets/ · public/               # Icons, images, splash assets
```

## Getting started

### Prerequisites

- Node.js 20+ and npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- A Firebase project (Auth + Cloud Messaging) and Google OAuth client IDs
- Xcode (for iOS) and/or Android Studio (for Android) if you plan to run native builds

### Installation

```bash
git clone https://github.com/Gautam5514/splitApp.git
cd splitApp
npm install
```

### Environment variables

Create a `.env` file in the project root with your own Firebase and Google OAuth credentials:

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

You'll also need `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from your own Firebase project.

### Run it

```bash
npx expo start        # dev server — scan the QR with Expo Go or a dev client
npm run android         # run on an Android emulator/device
npm run ios              # run on an iOS simulator/device
npm run web                # run in the browser
```

## Available scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Build & run the Android dev client |
| `npm run ios` | Build & run the iOS dev client |
| `npm run web` | Run the web build |
| `npm run lint` | Lint the project with `expo lint` |
| `npm test` | Run the Jest test suite |
| `npm run build:apk` | Production APK build via EAS |
| `npm run build:production` | Production build for iOS & Android via EAS |
| `npm run submit:android` | Submit the latest Android build to Google Play |
| `npm run submit:ios` | Submit the latest iOS build to App Store Connect |

## Building & releasing

SplitEase ships via [EAS Build](https://docs.expo.dev/build/introduction/) and [EAS Submit](https://docs.expo.dev/submit/introduction/):

```bash
eas build --platform android --profile production-apk
eas build --platform all --profile production
eas submit --platform android --profile production --latest
```

The Android app is live today on **[Google Play](https://play.google.com/store/apps/details?id=com.kunal.splitapp)** under package `com.kunal.splitapp`. iOS builds run on the same Expo codebase and are distributed via TestFlight ahead of an App Store release.

## Roadmap

- [ ] iOS App Store release
- [ ] Multi-currency support for international trips
- [ ] Recurring/subscription expense splitting
- [ ] Export settlements as PDF statements

## Support

- 🐛 Found a bug or have a feature request? [Open an issue](https://github.com/Gautam5514/splitApp/issues).
- 📧 In-app support: reachable from **Settings → Contact us**, or email `support@splitease.app`.

## License

This project is proprietary software. All rights reserved — the source is shared for reference and collaboration; redistribution or commercial reuse requires prior written permission from the maintainer.

---

<div align="center">
<sub>Built with Expo & React Native · <a href="https://play.google.com/store/apps/details?id=com.kunal.splitapp">Download SplitEase on Google Play</a></sub>
</div>
