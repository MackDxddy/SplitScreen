# SplitScreen Fantasy League

> Mobile-first fantasy league platform for League of Legends esports

## 📋 Project Overview

SplitScreen is a comprehensive fantasy league platform for League of Legends esports (LCS, LEC, LCK, LPL) featuring:

- **Mobile-First Design**: Optimized for touch interactions with 48px minimum touch targets
- **Real-Time Draft System**: Snake draft with WebSocket-powered live updates
- **Dual Data Validation**: Leaguepedia API + Oracle's Elixir for accurate scoring
- **Trading System**: Time-windowed trading with queue management
- **Free & Pro Tiers**: Flexible membership options

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (mobile-first breakpoints)
- **State Management**: Zustand + React Query
- **Real-time**: Socket.io Client
- **Router**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **PWA**: Vite PWA Plugin

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Railway)
- **Real-time**: Socket.io
- **Authentication**: JWT + Bcrypt
- **Validation**: Express Validator
- **Logging**: Winston with daily rotation
- **Error Tracking**: Sentry
- **Task Scheduling**: Node-cron

## 📁 Project Structure

```
splitscreen-fantasy/
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── common/      # Reusable UI components
│   │   │   ├── draft/       # Draft-specific components
│   │   │   ├── league/      # League management components
│   │   │   ├── roster/      # Roster display components
│   │   │   ├── trade/       # Trading interface components
│   │   │   ├── auth/        # Authentication components
│   │   │   └── layout/      # Layout components (nav, footer)
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   ├── styles/          # Global styles
│   │   └── assets/          # Static assets
│   ├── public/              # Public assets
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Express middleware
│   │   ├── services/        # Business logic
│   │   │   ├── leaguepedia.service.js
│   │   │   ├── oracle-validator.service.js
│   │   │   ├── scoring.service.js
│   │   │   └── data-pipeline.service.js
│   │   ├── jobs/            # Cron jobs
│   │   │   ├── game-processor.job.js
│   │   │   └── daily-validation.job.js
│   │   ├── socket/          # Socket.io handlers
│   │   ├── config/          # Configuration files
│   │   ├── utils/           # Utility functions
│   │   └── db/              # Database files
│   │       ├── migrations/  # SQL migration files
│   │       └── seeds/       # Seed data
│   ├── logs/                # Application logs (auto-generated)
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm** or **yarn**: Latest version
- **PostgreSQL**: Via Railway (cloud) or local installation
- **Git**: For version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd splitscreen-fantasy
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Configure Environment Variables**

   **Frontend** (`frontend/.env`):
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   **Backend** (`backend/.env`):
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   **IMPORTANT**: Update these critical values in `backend/.env`:
   - `DATABASE_URL`: Your PostgreSQL connection string (Railway provides this)
   - `JWT_SECRET`: Generate a secure random string (minimum 32 characters)
   - `FRONTEND_URL`: Your frontend URL (http://localhost:3000 for development)

### Database Setup (Railway)

1. **Create a Railway account** at https://railway.app
2. **Create a new project**
3. **Add PostgreSQL service**:
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create the database
4. **Get connection string**:
   - Click on PostgreSQL service
   - Go to "Connect" tab
   - Copy the "Postgres Connection URL"
   - Paste into `backend/.env` as `DATABASE_URL`

5. **Run migrations** (once database is ready):
   ```bash
   cd backend
   npm run migrate
   ```

### Running the Application

**Development Mode** (recommended):

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on http://localhost:5000

2. **Start Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on http://localhost:3000

3. **Visit** http://localhost:3000 in your browser

**Production Build**:

```bash
# Frontend
cd frontend
npm run build
npm run preview

# Backend
cd backend
npm start
```

## 🔧 Development Workflow

### Phase 0: Foundation ✅ (COMPLETED)
- [x] Project structure setup
- [x] Frontend configuration (React + Vite + Tailwind)
- [x] Backend configuration (Express + PostgreSQL)
- [x] Environment templates
- [ ] Database schema (Next: Project 0.2)

### Phase 1: Data Pipeline
- [ ] Leaguepedia API integration
- [ ] Fantasy score calculator
- [ ] Data processing pipeline
- [ ] Oracle's Elixir validator

### Phase 2: Core User Features
- [ ] Authentication system
- [ ] League management
- [ ] Player/team display

### Phase 3: Draft System
- [ ] Draft backend with WebSocket
- [ ] Mobile-first draft UI

### Phase 4: Trading & Scoring
- [ ] Trade system
- [ ] Trade UI mobile wizard
- [ ] Live score display
- [ ] Standings

### Phase 5: Admin & Polish
- [ ] Admin dashboard
- [ ] Notification system
- [ ] Payment integration (Stripe)
- [ ] PWA setup

## 📖 Key Documentation

Refer to the specification documents for detailed requirements:

1. **Fantasy_League_Technical_Specification.docx** - Core features, database schema, scoring formulas
2. **Mobile_Responsive_Design_Requirements.docx** - Mobile-first design, breakpoints, touch targets
3. **Technical_Clarifications_and_Best_Practices.docx** - Implementation details, API patterns, deployment
4. **Development_Roadmap_and_AI_Prompts.docx** - Development phases with AI-ready prompts

## 🔑 Environment Variables

### Frontend Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:5000 |
| `VITE_WS_URL` | WebSocket URL | ws://localhost:5000 |
| `VITE_ENV` | Environment | development |

### Backend Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | Yes |
| `JWT_EXPIRY` | Token expiration | No (default: 7d) |
| `LEAGUEPEDIA_API_URL` | Leaguepedia API endpoint | Yes |
| `SENDGRID_API_KEY` | Email service API key | No |
| `STRIPE_SECRET_KEY` | Stripe payment API key | No |
| `SENTRY_DSN` | Error tracking DSN | No |

See `.env.example` files for complete list.

## 🧪 Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test
```

## 📦 Deployment

### Recommended Stack (MVP)
- **Frontend**: Vercel (free tier)
- **Backend**: Railway ($5-20/month)
- **Database**: Railway PostgreSQL (included)
- **Redis**: Upstash (serverless, free tier)

### Deployment Commands

**Frontend (Vercel)**:
```bash
cd frontend
vercel --prod
```

**Backend (Railway)**:
1. Connect GitHub repository to Railway
2. Railway auto-deploys on push to main
3. Configure environment variables in Railway dashboard

## 🛠️ Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm run process-games` - Manually run game processor
- `npm run validate-scores` - Manually run score validation
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

## 🐛 Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Railway PostgreSQL service is running
- Ensure your IP is not blocked (Railway allows all IPs by default)

### WebSocket Connection Failed
- Check `VITE_WS_URL` matches backend URL
- Verify CORS settings in `backend/src/server.js`
- Check firewall settings

### Build Errors
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `npm run clean` (if script exists)
- Check Node.js version: `node --version` (should be 18+)

## 📞 Support

For issues and questions:
1. Check the specification documents
2. Review error logs in `backend/logs/`
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

## 📝 License

This project is proprietary and confidential.

---

**Next Steps**: 
1. Complete database schema (Project 0.2)
2. Begin Phase 1: Data Pipeline
3. Follow Development_Roadmap_and_AI_Prompts.docx for structured development

**Built with ❤️ for the League of Legends esports community**
