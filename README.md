# Restaurant Financial Management System (SaaS)

![Project Status](https://img.shields.io/badge/status-active_development-brightgreen)
![CI](https://github.com/tu-usuario/restaurant-finance-app/actions/workflows/ci.yml/badge.svg)

## Project Overview

A comprehensive financial control and menu engineering platform tailored for the hospitality industry. This application helps restaurant managers and owners optimize their profitability through:

- **Financial Control**: P&L tracking, expense management, and dynamic forecasting.
- **Menu Engineering**: Recipe costing, margin analysis, and BCG matrix classification (Stars, Plowhorses, Puzzles, Dogs).
- **Staff Management**: intelligent scheduling, payroll estimation, and shift planning.
- **Inventory & Suppliers**: Stock control, supplier management, and purchasing intelligence.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](Contributing.md) (coming soon) and use the provided templates for Issues and Pull Requests.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'feat: Add amazing feature'`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

## Tech Stack

### Core

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

### UI & UX

- **Styling**: Tailwind CSS
- **Components**: Shadcn/UI (Radix UI + Tailwind)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

### State & Utilities

- **Math**: `decimal.js` (or native precision handling in `financial-math.ts`)
- **Dates**: `date-fns`
- **Forms**: `react-hook-form` + `zod`

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**

   ```bash
   npm run dev
   ```

## Project Structure

- **/src/app**: Next.js App Router pages and layouts.
  - **/actions**: Server Actions for data mutation and fetching.
- **/src/components**: Reusable UI components.
  - **/financial-control**: specific components for the Finance module.
  - **/menu-engineering**: specific components for the Menu Engineering module.
  - **/recipes**: Recipe editor and costing components.
  - **/ui**: Shadcn/UI primitive components.
- **/src/lib**: Utility functions and business logic (e.g., `financial-math.ts`).
- **/src/types**: TypeScript interfaces and Zod schemas (`schema.ts`).

## Testing

This project uses **Vitest** for unit testing.

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```
