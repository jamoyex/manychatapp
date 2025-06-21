# ManyChat App - AI Chatbot SaaS Platform

A modern, full-stack AI Chatbot SaaS platform with user authentication, agent management, and ManyChat integration built with Next.js 15, React 19, TypeScript, and Shadcn UI.

## 🚀 Features

- 🔐 **Complete Authentication**: Register, login, logout with session management
- 🤖 **AI Agent Management**: Create, edit, and manage chatbot agents
- 📱 **Responsive Design**: Mobile-first design that works on all devices
- ⚡ **Modern Stack**: Built with Next.js 15 and React 19 for optimal performance
- 🎨 **Beautiful UI**: Clean interface with Shadcn UI components
- 🔒 **Secure**: Password hashing, session management, and form validation
- 📊 **Dashboard**: User dashboard with agent management and statistics

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI + Radix UI
- **Language**: TypeScript
- **State Management**: Zustand
- **Data Fetching**: TanStack Query

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: bcryptjs + express-session
- **Security**: CORS, password hashing

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

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
# Run both frontend and backend
npm run dev:full

# Or run separately
npm run server  # Backend on port 3001
npm run dev     # Frontend on port 3000
```

## 📁 Project Structure

```
manychatapp/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages
│   │   ├── agent/        # Agent management
│   │   └── page.tsx      # Main dashboard
│   ├── register/         # Registration page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Login page
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard components
│   └── ui/              # Shadcn UI components
├── lib/                 # Utility functions
├── routes/              # Express API routes
├── schema_pg.sql        # Database schema
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

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **Session Management**: Express sessions with secure cookies
- **CORS Protection**: Configured for frontend domain
- **Input Validation**: Server-side validation for all forms
- **SQL Injection Protection**: Parameterized queries

## 🎯 User Flow

1. **Registration**: Users create accounts at `/register`
2. **Login**: Users sign in at the home page
3. **Dashboard**: Authenticated users access `/dashboard`
4. **Agent Management**: Create and manage AI chatbot agents
5. **ManyChat Integration**: Connect agents to ManyChat platform

## 🚀 Development

### Code Style
- **TypeScript**: Full type safety
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Tailwind**: Utility-first CSS

### Hot Reload
Both frontend and backend support hot reloading for fast development.

## 📈 Roadmap

- [ ] ManyChat API integration
- [ ] Real-time chat functionality
- [ ] Analytics dashboard
- [ ] User settings and profiles
- [ ] Multi-tenant support
- [ ] Advanced agent configurations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@manychatapp.com or create an issue in this repository.

---

Built with ❤️ using Next.js, React, and TypeScript 