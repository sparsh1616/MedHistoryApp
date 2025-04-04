# OrthoHistory App - Feature Summary & Roadmap

## Current Implemented Features (as of 2025-04-04)

*   **Core History Taking Form:** Structured sections for Patient Demographics, Chief Complaint, HPI, PMH, Past Ortho History, Medications, Allergies, Family History, Social History, ROS, Examination, and Summary/Diagnosis.
*   **Dynamic Entries:** Ability to add/remove multiple Medication and Allergy entries.
*   **Hints System:** Pop-up hints providing guidance for most sections and fields, triggered by clicking the lightbulb icon. (Recent fixes addressed issues with triggering).
*   **Sidebar Navigation:**
    *   Grouped navigation links under headings (Patient Details, History, Examination, Summary & Plan).
    *   Mobile-responsive sidebar with toggle button.
*   **Basic Actions:**
    *   "New Case" button to clear the form (uses `localStorage` currently, data lost on refresh).
    *   "Export as PDF" button to generate a PDF report of the current case data.
*   **User Authentication:**
    *   Basic user registration (username/password).
    *   User login using JWT tokens stored in `localStorage`.
    *   Logout functionality.
*   **AI Professor:**
    *   Integrated chat interface using Google Gemini.
    *   **Exam Mode:** AI asks viva-style questions based on entered case data.
    *   **Learning Mode:** User can ask the AI questions about orthopedics.
    *   **Dummy Case Mode:** User can ask the AI to generate a dummy case (e.g., "fractured tibia") and the app attempts to parse the AI's response to populate the form fields.
*   **PWA Setup:** Basic Progressive Web App features enabled via `manifest.json` and `service-worker.js` (offline functionality might be limited, especially for dynamic data).
*   **Deployment:** Configured for deployment on Render via GitHub integration.

## Planned / Future Features (Not Yet Implemented)

1.  **Persistent Case Storage:**
    *   **Goal:** Allow logged-in users to save multiple cases to the database and retrieve them later, preventing data loss on refresh or across devices.
    *   **Status:** Backend API endpoints (`/api/cases`) and database table (`cases`) have been created in `server.js`. Frontend UI elements (Saved Cases section, Load/Delete buttons) added to `index.html`. **Frontend JavaScript logic to connect the UI to the backend API is the next step.**
2.  **Enhanced User Registration:**
    *   **Goal:** Collect additional user details during registration (Email, Full Name, Study Year, Institute).
    *   **Status:** Database `users` table updated in `server.js` to include these columns. **Backend registration route (`/api/auth/register`) and frontend registration form/JavaScript need to be updated.**
3.  **Static Image Integration (Alternative to MCP):**
    *   **Goal:** Allow the AI Tutor to display relevant static images stored within the project (e.g., `[SHOW_IMAGE: lachman_test.png]`).
    *   **Status:** Plan discussed, `public/images` folder created. Implementation paused in favor of UI fixes and persistent storage.
4.  **Wheeless Online Link:**
    *   **Goal:** Add a direct link to the Wheeless Textbook of Orthopaedics website in the sidebar.
    *   **Status:** Planned, but not yet implemented.

## Known Issues / Areas for Improvement

*   **Dummy Case Parsing:** The logic to parse the AI's generated dummy case data and populate the form (`tryToPopulateDummyCase` in `script.js`) is basic and might not work reliably depending on the AI's output format. Needs refinement or a more structured approach (e.g., instructing the AI to return JSON).
*   **PWA Offline Storage:** Currently relies heavily on `localStorage` which is not ideal for robust offline PWA storage. Integrating database storage will improve this, but full offline sync is complex.
*   **UI/UX Refinements:** Ongoing potential for improving layout, responsiveness, and user feedback.
