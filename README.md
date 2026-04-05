# BankEasy

BankEasy is a modern, full-featured banking application that empowers users to manage their finances with ease and intelligence. Built with Next.js and React, the application provides a secure, intuitive interface for viewing accounts, analyzing transactions, and receiving AI-powered financial insights.

## Key Features

### 1. Account Management
- Connect multiple bank accounts securely via Plaid integration
- View real-time account balances across all connected accounts
- Monitor available balance and credit limits
- Support for checking, savings, credit card, and other account types
- Detailed account information with masked credentials for security

### 2. Transaction Tracking & Analysis
- Comprehensive transaction history with date, merchant, and amount details
- Smart transaction categorization using AI-powered personal finance categories
- Confidence levels for automatic categorization (HIGH, MEDIUM, LOW)
- Filter and search transactions by category, date range, and amount
- Pending transaction indicators
- Interactive transaction details modal for deeper insights

### 3. Financial Identity Management
- Securely access and view identity information linked to accounts
- Display owner names, emails, phone numbers, and addresses
- Identify primary contact information
- Privacy-first approach with secure data handling

### 4. AI-Powered Financial Assistant
- Integrated Gemini AI chatbot for personalized financial advice
- Ask questions about spending patterns, budgeting tips, and financial goals
- Get intelligent insights based on your transaction history
- Natural language interaction for financial guidance

### 5. User Authentication & Security
- Secure sign-in with NextAuth and Supabase authentication
- User session management
- Protected dashboard with authentication checks
- Secure token exchange for Plaid integration

### 6. Responsive Dashboard
- Tab-based interface (Accounts, Transactions, Identity)
- Card-based account overview with visual hierarchy
- Sortable, filterable transaction table
- Real-time data refresh functionality
- Mobile-responsive design with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Authentication**: NextAuth, Supabase
- **Banking API**: Plaid (multi-account aggregation)
- **AI Integration**: Google Generative AI (Gemini)
- **Styling**: Tailwind CSS 4
- **Data Management**: Client-side state with React hooks

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm, pnpm, yarn, or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BankEasy/BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following in `.env.local`:
   - Supabase credentials (URL, API Key)
   - Plaid API keys (Client ID, Secret)
   - Google Generative AI API key
   - NextAuth secret and provider settings

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   # or
   bun dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

The application will automatically hot-reload as you make changes to the code.

## Build for Production

```bash
npm run build
npm start
```

## Available Scripts

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## How It Works

Users sign in securely, connect their bank accounts through Plaid, and immediately gain access to a unified dashboard showing all their accounts and transactions. The AI assistant provides on-demand financial insights and recommendations, while automatic categorization helps users understand their spending patterns at a glance.

This is a production-ready financial management platform combining bank aggregation, transaction analysis, and AI-driven insights into one cohesive user experience!

## Project Structure

```
BankEasy/BE/
├── src/
│   ├── app/
│   │   ├── api/                 # API endpoints
│   │   ├── components/          # Reusable components
│   │   ├── dashboard/           # Dashboard pages
│   │   ├── onboarding/          # Onboarding flow
│   │   ├── signin/              # Authentication pages
│   │   └── home/                # Home page
│   ├── lib/                     # Utility functions
│   └── types/                   # TypeScript type definitions
├── public/                      # Static assets
├── package.json
└── tsconfig.json
```

## Features in Detail

### Secure Bank Integration
Connect your bank accounts using Plaid's industry-leading security. All sensitive financial data is encrypted and handled securely with masked account numbers displayed throughout the application.

### Intelligent Transaction Categorization
Automatically categorize transactions using AI-powered personal finance categories. Each category includes a confidence level so you know how reliable the categorization is.

### Account Dashboard
View all your connected accounts in a clean, organized dashboard. See current balances, available funds, and credit limits at a glance. Click on any account for detailed information.

### Transaction Management
Browse your complete transaction history with advanced filtering capabilities. Search by category, date range, amount, and more. Click on any transaction to view detailed information in an interactive modal.

### AI Financial Assistant
Get personalized financial advice from an intelligent chatbot powered by Google Gemini. Ask about your spending patterns, get budgeting tips, and receive recommendations tailored to your financial situation.

## Security

- All data is transmitted over secure HTTPS connections
- Bank credentials are never stored directly; Plaid handles secure credential exchange
- User sessions are managed securely with NextAuth
- API calls are authenticated and validated
- Environment variables protect sensitive API keys

## Support

For issues, questions, or feature requests, please open an issue on the repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
