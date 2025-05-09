const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Use pg Pool
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Use Google Generative AI
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001; // Changed default port to 3001
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_fallback';
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY; // Load Gemini key

if (!GEMINI_API_KEY) {
  console.warn('WARNING: GOOGLE_GEMINI_API_KEY not found in environment variables. AI Viva will not work.');
}

// --- Google Generative AI Client Setup ---
let genAI;
let geminiModel;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // Try using gemini-1.5-pro-latest
  geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
  console.log("Google Generative AI client initialized with model: gemini-1.5-pro-latest");
} else {
   console.log("Google Generative AI client not initialized due to missing API key.");
}

// --- Database Setup (PostgreSQL with Neon) ---
// Read connection string from environment variable for security
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1); // Exit if the database URL isn't configured
}

const pool = new Pool({
  connectionString: connectionString,
  // Neon requires SSL, usually handled by the connection string or default pg behavior with sslmode=require
  // Explicitly setting ssl might be needed depending on environment/pg version
  ssl: {
    rejectUnauthorized: false // Adjust if you have specific CA cert requirements
  }
});

// Function to initialize DB (create table if not exists)
async function initializeDatabase() {
  try {
    // PostgreSQL syntax for creating table if it doesn't exist
    // Using SERIAL PRIMARY KEY for auto-incrementing ID
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE, -- Added email (optional, but unique if provided)
        full_name TEXT, -- Added full name (optional)
        study_year TEXT, -- Added study year (optional, e.g., 'MBBS 3rd Year', 'Intern')
        institute TEXT, -- Added institute (optional)
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add new columns if they don't exist (idempotent)
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS study_year TEXT;');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS institute TEXT;');
    console.log('Users table schema updated (if necessary).');

    // Create cases table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        case_title TEXT, 
        case_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Cases table is ready.');

    // Optional: Add a trigger to automatically update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = now(); 
         RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    await pool.query(`
      DROP TRIGGER IF EXISTS update_cases_updated_at ON cases; -- Drop existing trigger if necessary
      CREATE TRIGGER update_cases_updated_at
      BEFORE UPDATE ON cases
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('Cases updated_at trigger set.');

    console.log('Connected to PostgreSQL database (Neon) and tables are ready.');
  } catch (err) {
    console.error('Error initializing database:', err.stack);
    // Exit if DB connection fails? Or retry? For now, log and exit.
    process.exit(1);
  }
}

// --- Middleware ---
// Explicitly set Content-Type for JS and CSS files
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  } else if (req.path.endsWith('.css')) {
    res.type('text/css');
  }
  next();
});
// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Parse JSON request bodies
app.use(express.json());

// --- API Routes ---

// Registration Route (Updated for additional fields)
app.post('/api/auth/register', async (req, res) => {
  // Extract all fields from request body
  const { username, password, email, full_name, study_year, institute } = req.body; 

  // Basic validation (only username and password are strictly required by DB schema)
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  // Optional: Add validation for email format if provided
  if (email && !/\S+@\S+\.\S+/.test(email)) {
     return res.status(400).json({ message: 'Invalid email format.' });
  }
  // Removed erroneous closing brace from previous attempt here

  try {
    // Check if username already exists using pg pool (case-insensitive)
    console.log(`DEBUG: Checking registration for username (case-insensitive): ${username}`); // Added logging
    const checkUser = await pool.query('SELECT username FROM users WHERE LOWER(username) = LOWER($1)', [username]);

    if (checkUser.rows.length > 0) {
      console.log(`DEBUG: Registration failed - Username already exists: ${username}`); // Added logging
      return res.status(409).json({ message: 'Username already exists.' }); // 409 Conflict
    }
    console.log(`DEBUG: Username available: ${username}`); // Added logging

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user with all provided fields (null for optional fields if not provided)
    const insertUser = await pool.query(
      `INSERT INTO users (username, password_hash, email, full_name, study_year, institute) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`, 
      [username, passwordHash, email || null, full_name || null, study_year || null, institute || null]
    );

    console.log(`User registered: ${username} (ID: ${insertUser.rows[0].id}) with additional details.`);
    res.status(201).json({ message: 'User registered successfully.' }); // 201 Created

  } catch (error) {
    console.error('Error during registration process:', error.stack); // Log stack trace
    // Handle potential unique constraint violation for email
    if (error.code === '23505' && error.constraint === 'users_email_key') {
         return res.status(409).json({ message: 'Email address already in use.' });
    }
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login Route (Using pg Pool and async/await)
app.post('/api/auth/login', async (req, res) => { // Make the route handler async
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Fetch user from database using pg pool (case-insensitive)
    console.log(`DEBUG: Attempting login for username (case-insensitive): ${username}`); // Added logging
    const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    const user = result.rows[0]; // Get the first row if found

    if (!user) {
      console.log(`DEBUG: Login failed - User not found (case-insensitive): ${username}`); // Added logging
      // Avoid saying "invalid username" or "invalid password" specifically for security
      return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
    }
    console.log(`DEBUG: User found (case-insensitive): ${username}`); // Added logging

    // Compare submitted password with stored hash
    console.log(`DEBUG: Comparing password for user: ${username}`); // Added logging
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      console.log(`DEBUG: Login failed - Password mismatch for user: ${username}`); // Added logging
      return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
    }
    console.log(`DEBUG: Password match for user: ${username}`); // Added logging

    // Passwords match - Generate JWT
    const payload = {
      userId: user.id,
      username: user.username
      // Add other relevant non-sensitive info if needed (e.g., roles)
    };

    // Sign the token
    // Note: In production, use a longer expiry and potentially refresh tokens
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

    console.log(`User logged in: ${username}`);
    // Send the token back to the client
    res.status(200).json({ message: 'Login successful.', token: token });

  } catch (error) {
    console.error('Error during login process:', error.stack); // Log stack trace
    res.status(500).json({ message: 'Server error during login.' });
  }
});


// --- JWT Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // if there isn't any token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.sendStatus(403); // Forbidden (invalid token)
    }
    req.user = user; // Add user payload (e.g., { userId: ..., username: ... }) to request object
    next(); // pass the execution off to whatever request the client intended
  });
};


// --- Case Management API Routes ---

// Save a new case
app.post('/api/cases', authenticateToken, async (req, res) => {
  const { case_title, case_data } = req.body;
  const userId = req.user.userId; // Get user ID from authenticated token

  if (!case_data) {
    return res.status(400).json({ message: 'Case data is required.' });
  }
  // Use patient name from case data as title if not provided, or default
  const title = case_title || case_data['patient-name'] || `Case saved on ${new Date().toLocaleDateString()}`;

  try {
    const result = await pool.query(
      'INSERT INTO cases (user_id, case_title, case_data) VALUES ($1, $2, $3) RETURNING id, case_title, updated_at',
      [userId, title, case_data]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving case:', error.stack);
    res.status(500).json({ message: 'Error saving case.' });
  }
});

// Get list of cases for the logged-in user
app.get('/api/cases', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    // Select only necessary fields for the list view
    const result = await pool.query(
      'SELECT id, case_title, updated_at FROM cases WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching cases:', error.stack);
    res.status(500).json({ message: 'Error fetching cases.' });
  }
});

// Get a specific case by ID
app.get('/api/cases/:id', authenticateToken, async (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  const userId = req.user.userId;

  if (isNaN(caseId)) {
      return res.status(400).json({ message: 'Invalid case ID.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, case_title, case_data, updated_at FROM cases WHERE id = $1 AND user_id = $2',
      [caseId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Case not found or access denied.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching case:', error.stack);
    res.status(500).json({ message: 'Error fetching case.' });
  }
});

// Update a specific case by ID
app.put('/api/cases/:id', authenticateToken, async (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  const userId = req.user.userId;
  const { case_title, case_data } = req.body;

   if (isNaN(caseId)) {
      return res.status(400).json({ message: 'Invalid case ID.' });
  }
  if (!case_data) {
    return res.status(400).json({ message: 'Case data is required.' });
  }
  // Use patient name from case data as title if not provided, or default
  const title = case_title || case_data['patient-name'] || `Case updated on ${new Date().toLocaleDateString()}`;


  try {
    const result = await pool.query(
      'UPDATE cases SET case_title = $1, case_data = $2 WHERE id = $3 AND user_id = $4 RETURNING id, case_title, updated_at',
      [title, case_data, caseId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Case not found or access denied.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating case:', error.stack);
    res.status(500).json({ message: 'Error updating case.' });
  }
});

// Delete a specific case by ID
app.delete('/api/cases/:id', authenticateToken, async (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  const userId = req.user.userId;

   if (isNaN(caseId)) {
      return res.status(400).json({ message: 'Invalid case ID.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM cases WHERE id = $1 AND user_id = $2 RETURNING id',
      [caseId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Case not found or access denied.' });
    }
    res.status(200).json({ message: `Case ${caseId} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting case:', error.stack);
    res.status(500).json({ message: 'Error deleting case.' });
  }
});


// --- AI Viva Chat Route (Using Gemini with generateContent) ---
// Note: This route does NOT require authentication in this example, but you might add it
app.post('/api/viva/chat', async (req, res) => {
  const { conversationHistory } = req.body; // Expecting { role: 'user'/'assistant'/'system', content: '...' }

  if (!GEMINI_API_KEY || !genAI || !geminiModel) {
    return res.status(503).json({ message: 'AI service (Gemini) is not configured or initialized.' });
  }

  if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty conversation history provided.' });
  }

  // Format history for Gemini's generateContent:
  // - Map 'assistant' role to 'model'
  // - Map 'system' role to 'user' (as Gemini doesn't have a distinct system role in the same way for generateContent history)
  // - Structure content as parts: [{ text: content }]
  const formattedContents = conversationHistory.map(msg => {
    let role = 'user'; // Default to user
    if (msg.role === 'assistant') {
      role = 'model';
    } else if (msg.role === 'system') {
      role = 'user'; // Treat system prompts as user input for context
    }
    return {
      role: role,
      parts: [{ text: msg.content }]
    };
  });

  // Basic validation
  if (formattedContents.some(item => !item.role || !item.parts || !Array.isArray(item.parts) || item.parts.length === 0 || typeof item.parts[0].text !== 'string')) {
     return res.status(400).json({ message: 'Each message in history must have a valid role and text content.' });
  }

  console.log("DEBUG: Received chat request for Gemini (generateContent). History length:", formattedContents.length);

  try {
    const result = await geminiModel.generateContent({
        contents: formattedContents,
        // generationConfig: { // Optional
        //   maxOutputTokens: 200,
        //   temperature: 0.7,
        // }
    });

    const response = result.response; // Access the response object directly

    // Check for safety ratings or blocks if necessary (optional but recommended)
    // if (response.promptFeedback?.blockReason) {
    //   console.warn("DEBUG: Gemini response blocked:", response.promptFeedback.blockReason);
    //   return res.status(400).json({ message: `Request blocked due to ${response.promptFeedback.blockReason}` });
    // }

    const aiResponseText = response.text(); // Use the text() method to get the content

    if (!aiResponseText) {
      console.error('Gemini API response missing content:', response);
      // Log candidate details if available
      if (response.candidates && response.candidates.length > 0) {
          console.error('Gemini Candidate Finish Reason:', response.candidates[0].finishReason);
          console.error('Gemini Candidate Safety Ratings:', response.candidates[0].safetyRatings);
      }
      return res.status(500).json({ message: 'Failed to get valid text response from AI (Gemini).' });
    }

    console.log("DEBUG: Gemini Response received:", aiResponseText.substring(0, 100) + '...');
    res.status(200).json({ response: aiResponseText });

  } catch (error) {
    console.error('Error calling Google Generative AI API (generateContent):', error);
    res.status(500).json({ message: `Server error during AI chat (Gemini): ${error.message}` });
  }
});


// --- Frontend Route --- (Keep this last as a catch-all for the frontend app)
// Serve index.html for any route not handled by API or static files
// This allows client-side routing or direct access to app sections via URL
app.get('*', (req, res) => {
  // By default, express.static will serve index.html for the root path
  // This route is mostly for confirmation if needed, or could be removed.
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and then start the server
initializeDatabase().then(() => {
  const server = app.listen(PORT, () => { // Store server instance
    console.log(`Server listening on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
  });

  // Add error handling for the server itself (like EADDRINUSE)
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use. Try closing other applications or use a different port (e.g., set PORT environment variable).');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

}).catch(err => {
    console.error("Failed to initialize database or start server:", err);
    process.exit(1); // Exit if initialization fails
});
