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
- **Authentication:** [Appwrite](https://appwrite.io/)

## 🔐 Authentication Setup

This project uses Appwrite for secure Google Login.

### 1. Appwrite Configuration
1. Create a project in the [Appwrite Console](https://cloud.appwrite.io/).
2. Go to **Authentication** > **Settings** and enable **Google** OAuth provider.
3. Go to **Overview** > **Platforms** and add two **Web** platforms:
   - **Localhost:** `localhost` (for development)
   - **Production:** `your-app-name.vercel.app` (for Vercel deployment)

### 2. Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
```

### 3. Vercel Deployment
When deploying to Vercel, you must add these Environment Variables in the Vercel Dashboard:
1. Go to **Settings** > **Environment Variables**.
2. Add `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID`.
3. **Redeploy** your application for the changes to take effect.

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
