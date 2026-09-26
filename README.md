# Household App byStonies

## Development
- Install: `npm ci`
- Dev: `npm run dev`
- Build: `npm run build`

## Agents, CI and Automation

This project includes a CI workflow and helper scripts to run automated builds and optional deploys.

- CI: `.github/workflows/ci.yml` — runs on push and pull_request and executes `npm ci`, `npm run build`, and `npm run lint`.
- Scheduled: `.github/workflows/schedule.yml` — nightly and weekly scheduled builds that upload artifacts.
- Local agent: `scripts/agent-runner.js` — runs install, lint, build and optionally deploys with Vercel when `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` are present.
- API trigger: `app/api/agent/route.ts` — a protected endpoint to trigger a GitHub Actions dispatch of the CI workflow. It expects the `x-agent-token` header to match the `AGENT_TRIGGER_TOKEN` environment variable.

Required secrets (for full functionality):
- `GITHUB_TOKEN` — (optional) used by the API route to dispatch GitHub Actions workflow. Set this as a secret in your Vercel/GitHub environment.
- `AGENT_TRIGGER_TOKEN` — a secret token used to authorize requests to `/api/agent`.
- `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` — (optional) used by the local agent to deploy to Vercel.

Quick local usage:

```powershell
npm ci
npm run agent:run
```

To trigger the remote agent (if you set `AGENT_TRIGGER_TOKEN` and `GITHUB_TOKEN` in your environment):

```bash
curl -X POST https://your-deployment-url/api/agent -H "x-agent-token: $AGENT_TRIGGER_TOKEN"
```

# 🏠 Our Home Base

A collaborative household management app designed for couples living together to manage their household tasks, finances, and shared plans.

## 🚀 Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Prerequisites

- [Node.js](https://nodejs.org/) 18.17 or later
- npm (comes with Node.js)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lazyboxDude/Household_App_byStonies.git
cd Household_App_byStonies
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Available Scripts

- `npm run dev` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm start` - Runs the built app in production mode
- `npm run lint` - Runs ESLint to check code quality

## 🛠 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) with App Router
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Linting:** ESLint
- **Icons:** [Lucide React](https://lucide.dev/)
- **Scraping:** [Cheerio](https://cheerio.js.org/) (for fetching store deals)
- **Backend:** [Supabase](https://supabase.com/) (Postgres + Auth, with Row Level Security scoping every table to a household)

## 🔐 Backend & Authentication Setup

Every household's data lives in Postgres, isolated by Row Level Security: a user
can only read/write rows belonging to a household they're a member of (see
`public.is_household_member()` and the per-table policies in the Supabase
project). Auth supports Google OAuth and anonymous ("just a name") sign-in.

### 1. Supabase Configuration
1. Create a project at [supabase.com](https://supabase.com/) (or use an existing one).
2. Apply the schema migrations — see the SQL in this repo's Supabase project
   (`households`, `household_members`, `profiles`, and one table per feature,
   all with RLS policies keyed off household membership).
3. Under **Authentication → Sign In / Providers**:
   - Enable **Google** and add your OAuth Client ID/Secret from the
     [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   - Enable **Anonymous Sign-Ins** (needed for the "just your name" quick login).
4. Under **Authentication → URL Configuration**, add your dev and production
   URLs as redirect URLs (e.g. `http://localhost:3000`, `https://your-app.vercel.app`).

### 2. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in your project's values
(**Settings → API** in the Supabase dashboard):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key_here
```

### 3. Vercel Deployment
When deploying to Vercel, add the same two environment variables in
**Settings → Environment Variables**, then redeploy.

## ✨ Features

### 🛒 Smart Shopping List
- **Interactive List**: Add, check off, and delete items easily.
- **Store Categorization**: Tag items with specific stores (Migros, Coop, etc.).
- **Price Tracking**: Optional price input for budgeting.
- **Nearby Stores**: "Find Nearby" simulation to discover local shops.

### 🏷️ Deals & Sales
- **Live Sales Browser**: View current offers from major Swiss supermarkets directly in the app.
- **Category Filtering**: Filter deals by Fruits, Dairy, Meat, Bakery, etc.
- **Smart Fallbacks**: Automatically displays category icons if product images fail to load.
- **One-Click Add**: Instantly add sale items to your shopping list.
- **Store Support**: Currently optimized for Migros, with links for Coop, Denner, Aldi, and Lidl.

## 📁 Project Structure

```
Household_App_byStonies/
├── app/                    # Next.js App Router directory
│   ├── api/               # API Routes
│   │   └── sales/        # Backend logic for fetching store deals
│   ├── shopping/          # Shopping List Feature
│   │   ├── components/   # Reusable UI components (ShoppingList, DealsTab)
│   │   ├── page.tsx      # Main Shopping page
│   │   ├── types.ts      # TypeScript interfaces
│   │   └── constants.ts  # App constants (Stores, Categories)
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── public/                # Static assets
├── .gitignore            # Git ignore rules
├── eslint.config.mjs     # ESLint configuration
├── next.config.ts        # Next.js configuration
├── package.json          # Project dependencies
├── postcss.config.mjs    # PostCSS configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## 🎯 Planned Features

### 1. 🧹 Task Tracking
- Shared todo list with real-time sync
- Recurring tasks (daily, weekly, monthly)
- Assignee system
- Optional gamification

### 2. 💰 Finance Manager
- Expense splitting and tracking
- Settlement calculator
- Monthly budget management
- Receipt storage

### 3. 📅 Planning & Calendar
- Shared calendar
- Meal planner
- Shopping list generator

## 📚 Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - learn about Tailwind CSS
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - learn about TypeScript

## 🚢 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 📝 License

This project is private and not licensed for public use.
