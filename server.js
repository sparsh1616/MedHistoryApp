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
        password_hash TEXT NOT NULL
      );
    `);
    console.log('Connected to PostgreSQL database (Neon) and users table is ready.');
  } catch (err) {
    console.error('Error initializing database:', err.stack);
    // Exit if DB connection fails? Or retry? For now, log and exit.
    process.exit(1);
  }
}

// --- Middleware ---
// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Parse JSON request bodies
app.use(express.json());

// --- API Routes ---

// Registration Route (Using pg Pool and async/await)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Check if username already exists using pg pool
    // Use $1, $2 etc. for placeholders in pg
    const checkUser = await pool.query('SELECT username FROM users WHERE username = $1', [username]);

    if (checkUser.rows.length > 0) {
      return res.status(409).json({ message: 'Username already exists.' }); // 409 Conflict
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user using pg pool
    const insertUser = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', // RETURNING id gets the new user's ID
      [username, passwordHash]
    );

    console.log(`User registered: ${username} (ID: ${insertUser.rows[0].id})`);
    res.status(201).json({ message: 'User registered successfully.' }); // 201 Created

  } catch (error) {
    console.error('Error during registration process:', error.stack); // Log stack trace
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
    // Fetch user from database using pg pool
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0]; // Get the first row if found

    if (!user) {
      // Avoid saying "invalid username" or "invalid password" specifically for security
      return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
    }

    // Compare submitted password with stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
    }

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

// --- AI Viva Chat Route (Using Gemini with generateContent) ---
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
