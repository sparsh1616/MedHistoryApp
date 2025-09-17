# MedHistoryApp

A comprehensive medical learning platform for practicing clinical history taking with AI-powered viva sessions.

## Features

- **Clinical History Taking**: Structured templates for patient history collection
- **AI Tutor**: Interactive AI-powered viva sessions for medical students
- **Case Management**: Save, load, and manage patient cases
- **User Authentication**: Secure user registration and login
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: HTML, CSS, JavaScript
- **AI**: Groq API (Llama models)
- **Authentication**: JWT tokens with bcrypt password hashing

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see .env.example)
4. Start the development server:
   ```bash
   npm start
   ```
5. Open http://localhost:3001 in your browser

## Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
PORT=3001
```

## Deployment to Render

### Option 1: Using Render Blueprint (Recommended)

1. **Connect your GitHub repository to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository

2. **Deploy using the blueprint**
   - Render will automatically detect the `render.yaml` file
   - The blueprint will create:
     - Web service for the application
     - PostgreSQL database
     - Automatic environment variable setup

3. **Configure environment variables**
   - After deployment, go to your web service settings
   - Add the `GROQ_API_KEY` environment variable
   - Get your API key from [Groq Console](https://console.groq.com/)

### Option 2: Manual Deployment

1. **Create a PostgreSQL database**
   - Go to Render Dashboard → "New" → "PostgreSQL"
   - Note the connection string

2. **Create a Web Service**
   - Go to Render Dashboard → "New" → "Web Service"
   - Connect your repository
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `JWT_SECRET`: Generate a secure random string
     - `GROQ_API_KEY`: Your Groq API key
     - `NODE_ENV`: `production`

3. **Deploy**
   - Render will automatically build and deploy your application

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Cases
- `GET /api/cases` - Get user's cases
- `POST /api/cases` - Save a new case
- `GET /api/cases/:id` - Get specific case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### AI Chat
- `POST /api/viva/chat` - AI viva conversation

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT,
  study_year TEXT,
  institute TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cases Table
```sql
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_title TEXT,
  case_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support or questions, please open an issue on GitHub.