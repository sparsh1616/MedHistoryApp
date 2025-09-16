# MedHistoryApp - Medical Learning Platform

A comprehensive web application for medical students to practice clinical history taking with AI-powered assistance.

## 🚀 Features

- **Clinical History Taking**: Structured templates for patient history collection
- **AI Tutor**: Interactive AI professor for viva practice
- **Case Management**: Save, load, and manage patient cases
- **User Authentication**: Secure login and registration system
- **Responsive Design**: Works on desktop and mobile devices
- **Educational Focus**: Designed specifically for medical education

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database (we recommend [Neon](https://neon.tech) for cloud hosting)
- Groq API key (for AI features)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medhistoryapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://username:password@hostname:5432/database_name?sslmode=require
   JWT_SECRET=your_super_secret_jwt_key_here
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3001
   ```

4. **Database Setup**
   The application will automatically create the required tables when you start the server.

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run prod
```

The application will be available at `http://localhost:3001`

## 🌐 Deployment Options

### Option 1: Railway (Recommended)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy**
   ```bash
   railway init
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set DATABASE_URL=your_database_url
   railway variables set JWT_SECRET=your_jwt_secret
   railway variables set GROQ_API_KEY=your_groq_key
   ```

### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   heroku create your-app-name
   ```

2. **Deploy**
   ```bash
   git push heroku main
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set DATABASE_URL=your_database_url
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set GROQ_API_KEY=your_groq_key
   ```

### Option 3: Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   Use Vercel dashboard or CLI to set environment variables.

### Option 4: DigitalOcean App Platform

1. **Connect Repository**
   - Go to DigitalOcean App Platform
   - Connect your GitHub repository
   - Configure environment variables
   - Deploy

### Option 5: AWS EC2

1. **Launch EC2 Instance**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm postgresql
   ```

2. **Deploy Application**
   ```bash
   git clone <your-repo>
   cd medhistoryapp
   npm install
   npm start
   ```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `GROQ_API_KEY` | API key for Groq AI service | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | Environment (development/production) | No |

## 🗄️ Database Setup

The application uses PostgreSQL with the following tables:
- `users`: User accounts and profiles
- `cases`: Saved patient cases

Tables are created automatically on first run.

## 🤖 AI Features

The application integrates with Groq's Llama model for:
- AI viva practice
- Clinical reasoning assistance
- Educational feedback

## 📱 Features Overview

### For Students
- Practice clinical history taking
- Save and review cases
- AI-powered viva preparation
- Mobile-responsive interface

### For Educators
- Monitor student progress
- Review saved cases
- AI-assisted teaching

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection protection
- XSS protection

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Case Management
- `GET /api/cases` - Get user's cases
- `POST /api/cases` - Save new case
- `GET /api/cases/:id` - Get specific case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### AI Features
- `POST /api/viva/chat` - AI conversation

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check `DATABASE_URL` in `.env`
   - Ensure PostgreSQL server is running
   - Verify SSL settings for cloud databases

2. **AI Features Not Working**
   - Check `GROQ_API_KEY` in `.env`
   - Verify API key is valid
   - Check rate limits

3. **Port Already in Use**
   - Change `PORT` in `.env`
   - Kill process using the port: `lsof -ti:3001 | xargs kill`

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support or questions:
- Create an issue on GitHub
- Contact the development team

---

**⚠️ Important Notice:** This application is for educational purposes only and should not be used for actual patient care or clinical decision-making.