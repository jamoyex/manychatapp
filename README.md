# BBCore AI Chatbot SaaS - Complete Authentication System

A modern, full-stack AI Chatbot SaaS platform with user authentication, registration, and dashboard built with Next.js 15, React 18, TypeScript, Shadcn UI, and Node.js backend.

## Features

- 🔐 **Complete Authentication**: Register, login, logout with session management
- 🎨 **Modern Design**: Clean, professional interface with gradient backgrounds
- 📱 **Responsive**: Mobile-first design that works on all devices
- ⚡ **Fast**: Built with Next.js 15 and React 18 for optimal performance
- 🎯 **Accessible**: Proper form labels and keyboard navigation
- 🔒 **Secure**: Password hashing, session management, and form validation
- 📊 **Dashboard**: User dashboard with agent management and statistics

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI + Radix UI
- **Language**: TypeScript

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: bcryptjs + express-session
- **Security**: CORS, password hashing

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory with your database credentials:
```env
DB_HOST=postgres_host
DB_PORT=5432
DB_USER=postgres_username
DB_PASS=postgres_password
DB_NAME=postgres_db_name
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
NODE_ENV=development
PORT=3000
```

### 3. Database Setup
Run the SQL schema in your PostgreSQL database:
```bash
psql -h 178.16.143.118 -U BBCore8.0 -d "Core 8.0" -f schema_pg.sql
```

### 4. Start the Application
Run both frontend and backend simultaneously:
```bash
npm run dev:full
```

Or run them separately:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## Project Structure

```
bbcorenew/
├── app/
│   ├── globals.css          # Global styles and Tailwind config
│   ├── layout.tsx           # Root layout component
│   ├── page.tsx             # Login page
│   ├── register/
│   │   └── page.tsx         # Registration page
│   └── dashboard/
│       └── page.tsx         # Dashboard page
├── components/
│   └── ui/                  # Shadcn UI components
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── card.tsx
├── lib/
│   └── utils.ts             # Utility functions
├── server.js                # Express backend server
├── schema_pg.sql            # Database schema
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Agents
- `GET /api/agents` - Get user's AI agents

## User Flow

1. **Registration**: Users can create new accounts at `/register`
2. **Login**: Existing users can sign in at `/` (home page)
3. **Dashboard**: After authentication, users are redirected to `/dashboard`
4. **Agent Management**: View and manage AI chatbot agents
5. **Logout**: Users can sign out from the dashboard

## Database Schema

The project includes a PostgreSQL schema for:
- **Users**: Authentication and user management
- **Agents**: AI chatbot configurations
- **App Installs**: ManyChat integrations
- **Messages**: Chat message history

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **Session Management**: Express sessions with secure cookies
- **CORS Protection**: Configured for frontend domain
- **Input Validation**: Server-side validation for all forms
- **SQL Injection Protection**: Parameterized queries

## Development

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code quality and consistency
- **Hot Reload**: Both frontend and backend support hot reloading
- **Error Handling**: Comprehensive error handling and user feedback

## Next Steps

1. **Agent Creation**: Build the agent creation form
2. **ManyChat Integration**: Implement ManyChat API integration
3. **Message History**: Add chat message viewing and management
4. **Analytics**: Add usage statistics and reporting
5. **User Settings**: Add user profile and settings management

## License

© 2024 BBCore. All rights reserved. 