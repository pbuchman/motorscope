# MotorScope Chrome Extension

> **📖 Main documentation:** See [root README.md](../README.md) for complete project documentation.
>
> This file covers extension-specific development details only.

## Extension-Specific Structure

```
extension/src/
├── api/                    # API client for backend communication
├── auth/                   # Authentication module (OAuth, JWT, storage)
├── components/             # React components
│   ├── ui/                 # Shared atomic components
│   ├── popup/              # Popup-specific components
│   └── dashboard/          # Dashboard components
├── config/                 # Configuration (marketplaces)
├── context/                # React context providers
├── hooks/                  # Custom React hooks
├── services/               # Business logic (gemini, refresh, settings)
├── content-scripts/        # Page injection scripts
│   └── shared/             # Testable pure functions
├── i18n/                   # Internationalization (EN/PL)
├── utils/                  # Helper functions
├── background.ts           # Service worker
└── App.tsx                 # Main React app
```

## Entry Points

| View | URL Parameter | Purpose |
|------|---------------|---------|
| Popup | `?view=popup` | Extension icon click — analyze/save listings |
| Dashboard | `?view=dashboard` | Full listing management |
| Settings | `?view=settings` | API key, refresh frequency |

## Development Commands

```bash
npm run dev           # Development with hot reload
npm run build         # Production build
npm run build:dev     # Dev environment build
npm run build:prod    # Prod environment build
npm test              # Run tests
npm run test:coverage # Coverage report
npm run lint          # Lint check
npm run typecheck     # TypeScript check
```

## Loading in Chrome

1. `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `extension/dist/`

## Architecture Details

See [`docs/architecture.md`](docs/architecture.md) for detailed architecture documentation.

## Key Technologies

- React 19, TypeScript 5.9
- Vite (build), Tailwind CSS (styling)
- Chrome Extension APIs (Manifest V3)
- Google Gemini AI (@google/genai)
- i18next (EN/PL)

