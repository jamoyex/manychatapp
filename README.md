# BBCore AI Chatbot SaaS Platform

A modern, full-stack AI Chatbot SaaS platform with user authentication, comprehensive agent management, and ManyChat integration. Built with Next.js 15, Express.js, PostgreSQL, and Shadcn UI.

## 🚀 Features

- 🔐 **Complete Authentication**: Register, login, logout with session management
- 🤖 **AI Agent Management**: Create, edit, view, and manage chatbot agents with detailed configurations
- 📱 **Responsive Design**: Mobile-first design with modern UI components
- ⚡ **Hybrid Architecture**: Next.js frontend with Express.js API backend
- 🎨 **Modern UI**: Beautiful interface with Shadcn UI and Radix components
- 🔒 **Secure**: Password hashing, session management, and form validation
- 📊 **Dashboard**: Comprehensive dashboard with agent management and statistics
- 🔗 **ManyChat Ready**: Database schema designed for ManyChat integration

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI + Radix UI
- **Language**: TypeScript
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: bcryptjs + express-session
- **Security**: CORS, password hashing, SSL support

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/jamoyex/manychatapp.git
cd manychatapp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Database Configuration
DB_HOST=your_postgres_host
DB_PORT=5432
DB_USER=your_postgres_username
DB_PASS=your_postgres_password
DB_NAME=your_database_name

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# ManyChat Integration
MANYCHAT_INSTALL_LINK=https://your-manychat-installation-link.com

# Application Configuration
NODE_ENV=development
PORT=3000
```

### 4. Database Setup
Run the SQL schema in your PostgreSQL database:
```bash
psql -h your_host -U your_username -d your_database -f schema_pg.sql
```

### 5. Start Development
```bash
# Start the application (both frontend and backend)
npm run dev

# Or build for production
npm run build
npm start
```

## 📁 Project Structure

```
bbcore-saas/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages
│   │   ├── agent/        # Agent management
│   │   │   └── [agentId]/ # Dynamic agent pages
│   │   └── page.tsx      # Main dashboard
│   ├── register/         # Registration page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Login page
├── components/           # React components
│   ├── auth/            # Authentication components
│   │   ├── authForm.tsx
│   │   └── authLayout.tsx
│   ├── dashboard/       # Dashboard components
│   │   ├── AgentFormModal.tsx
│   │   ├── CreateAgentModal.tsx
│   │   ├── EditAgentModal.tsx
│   │   └── ViewAgentModal.tsx
│   └── ui/              # Shadcn UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
├── lib/                 # Utility functions
│   ├── auth.ts
│   └── utils.ts
├── routes/              # Express API routes
│   ├── agents.js        # Agent management API
│   └── auth.js          # Authentication API
├── app.js               # Express server + Next.js integration
├── schema_pg.sql        # Database schema
├── components.json      # Shadcn UI configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Agents
- `GET /api/agents` - Get user's AI agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `GET /api/agents/:id` - Get specific agent

## 🗄️ Database Schema

The project includes a comprehensive PostgreSQL schema for:

### Users Table
- User authentication and profile management
- Email, name, password (hashed), timestamps

### Agents Table
- Comprehensive AI agent configurations
- Company details, social media links, business information
- Bot personality, goals, and tone settings
- ManyChat integration fields

### App Installs Table
- ManyChat page connections
- App tokens and version management
- User-agent relationships

### Messages Table
- Chat message history
- Support for user, agent, and AI message types
- ManyChat user tracking

## 🎯 User Flow

1. **Registration**: Users create accounts at `/register`
2. **Login**: Users sign in at the home page (`/`)
3. **Dashboard**: Authenticated users access `/dashboard`
4. **Agent Management**: 
   - Create new agents with detailed configurations
   - Edit existing agent settings
   - View agent details and performance
   - Manage ManyChat integrations
5. **Agent Details**: Access specific agent pages at `/dashboard/agent/[agentId]`

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **Session Management**: Express sessions with secure cookies
- **SQL Injection Protection**: Parameterized queries
- **Input Validation**: Server-side validation for all forms
- **SSL Support**: Production-ready SSL configuration

## 🚀 Development

### Architecture
This is a **hybrid application** that combines:
- **Next.js 15** for the frontend and routing
- **Express.js** for API endpoints and server-side logic
- **PostgreSQL** for data persistence
- **Session-based authentication** with bcryptjs

### Key Features
- **Single Server**: Both frontend and API run on the same port
- **Hot Reload**: Development mode with automatic reloading
- **TypeScript**: Full type safety throughout
- **Component Library**: Shadcn UI with Radix primitives

## 📈 Roadmap

- [ ] ManyChat API integration
- [ ] Real-time chat functionality
- [ ] Analytics dashboard
- [ ] User settings and profiles
- [ ] Multi-tenant support
- [ ] Advanced agent configurations
- [ ] Message history viewing
- [ ] Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, create an issue in this repository or contact the development team.

---

Built with ❤️ by BBCore Team using Next.js, Express, and PostgreSQL 