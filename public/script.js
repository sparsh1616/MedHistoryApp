document.addEventListener('DOMContentLoaded', function() {
    console.log("DEBUG: DOMContentLoaded event fired.");

    // --- DOM Elements ---
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-chat-message');
    const timerDisplay = document.getElementById('viva-timer-display'); // Keep timer element reference
    const continuePromptDiv = document.getElementById('viva-continue-prompt'); // Keep prompt reference
    const continueBtn = document.getElementById('viva-continue-btn'); // Keep button reference
    const forceEndBtn = document.getElementById('viva-force-end-btn'); // Keep button reference
    const menuToggle = document.getElementById('menu-toggle'); // Mobile menu button
    const sidebar = document.querySelector('.sidebar'); // Sidebar element
    const overlay = document.querySelector('.overlay'); // Overlay element

    // --- State Variables ---
    let activeHintPopup = null;
    let currentUserToken = null;
    let vivaInProgress = false; // Initialize viva state
    let vivaTimerInterval = null; // Variable to hold the timer interval ID
    let vivaTimeRemaining = 0; // Time remaining in seconds
    const VIVA_INITIAL_DURATION = 7 * 60; // 7 minutes
    const VIVA_EXTENSION_DURATION = 5 * 60; // 5 minutes
    let aiConversationHistory = []; // Store { role: 'user'/'assistant', content: 'message' }
    let medIdCounter = 0;
    let allergyIdCounter = 0;


    // --- Hint Content ---
    const hintContent = {
        cc_heading_hint: "Chief Complaint (CC): The main reason the patient sought medical help, stated briefly in their own words, including the duration.",
        cc_input_hint: "Example: 'Left knee pain and swelling for 2 weeks after twisting it.' Avoid medical jargon here.",
        hpi_heading_hint: "History of Present Illness (HPI): A detailed, chronological account of the patient's current problem, from onset to present. Use OLDCARTS + Ortho specifics.",
        hpi_moi_hint: "Mechanism of Injury (MOI) / Onset: Crucial for diagnosis. For Trauma: Describe forces, direction, position, environment. For Non-Trauma: Describe how symptoms began (insidious, post-activity?).",
        hpi_trauma_hint: "Associated Trauma Assessment: In trauma cases, systematically inquire about and document the presence or absence of injuries to other body systems (Head/LOC, Neck, Chest, Abdomen) to rule out life-threatening conditions (Secondary Survey concept).",
        hpi_character_hint: "Character of Symptom: Use descriptive words (sharp, dull, aching, burning, throbbing). Also include non-pain symptoms like numbness, tingling, weakness, instability, locking, clicking, giving way.",
        hpi_functional_limitations_hint: "Functional Limitations: How does the problem impact the patient's life? Consider Activities of Daily Living (walking, stairs, dressing), Work/Occupation requirements, and Hobbies/Sports.",
        hpi_pertinent_negatives_hint: "Pertinent Negatives (Local): Document the absence of expected or important symptoms related to the affected area. Helps narrow down diagnoses (e.g., 'No numbness or tingling', 'No mechanical symptoms like locking').",
        pmh_heading_hint: "Past Medical History (PMH): Include major illnesses, surgeries, hospitalizations. Emphasize conditions relevant to orthopedics: Diabetes (healing, neuropathy), Osteoporosis (fracture risk), RA/Gout (arthritis), DVT/PE (post-op risk), Cancer (metastases).",
        past_ortho_heading_hint: "Past Orthopedic History: Focus specifically on previous musculoskeletal issues: injuries, fractures, dislocations, surgeries (type, date, outcome), treatments (physio, injections), arthritis in any joint. Note absence if confirmed.",
        meds_heading_hint: "Medications: List all current Prescription, Over-the-Counter (OTC), and Supplements. Specifically note: Analgesics (opioids, NSAIDs), Steroids (oral/injected), Anticoagulants, Bisphosphonates, DMARDs.",
        allergies_heading_hint: "Allergies: Document medication, food, and environmental allergies, including the specific reaction (e.g., rash, anaphylaxis, nausea).",
        fh_heading_hint: "Family History (FH): Inquire about relevant conditions in first-degree relatives (parents, siblings, children): Osteoarthritis, Inflammatory Arthritis (RA, Psoriatic), Osteoporosis, Gout, Bleeding Disorders, Congenital Musculoskeletal conditions.",
        sh_heading_hint: "Social History (SH): Lifestyle factors impacting musculoskeletal health. Key points: Occupation (physical demands, repetitive tasks), Living Situation (stairs, support), Activity Level/Exercise, Handedness (for upper limb), Tobacco/Alcohol/Drug use.",
        ros_heading_hint: "Review of Systems (ROS): Screen for systemic illness or symptoms outside the primary complaint. Ask about General (fever, chills, weight loss), other joint pain/swelling, widespread neuro symptoms (weakness, bowel/bladder changes), vascular symptoms (claudication). Document relevant negatives.",
        exam_heading_hint: "Examination: A systematic physical assessment following 'Look, Feel, Move'. Always compare with the contralateral side.",
        exam_general_hint: "General Inspection: Overall impression. Patient's condition (comfortable, distressed), posture, gait (antalgic?), use of walking aids, obvious deformities visible from afar.",
        exam_look_hint: "Look (Inspection): Detailed visual assessment of the affected area. Note Attitude (position of limb), Skin (scars, sinuses, swelling, redness, bruising), Shape/Contour (deformity, muscle wasting). Compare sides.",
        exam_feel_hint: "Feel (Palpation): Assess Temperature (warmth). Systematically palpate for Tenderness (localize precisely over bony landmarks, joint lines, soft tissues), Swelling (consistency, effusion), Crepitus. Palpate specific relevant structures (tendons, ligaments).",
        exam_move_hint: "Move (Range of Motion - ROM): Assess Active ROM (patient moves, note degrees and pain) and Passive ROM (examiner moves, note degrees, pain, and end-feel - e.g., bony, capsular, empty). Compare sides.",
        exam_special_tests_hint: "Special Tests: Perform provocative tests specific to the joint/suspected pathology (e.g., Knee: Lachman's, McMurray's; Shoulder: Impingement tests; Spine: SLR). Document test name and result (Positive/Negative, description of finding).",
        exam_neuro_hint: "Neurological Examination (Distal): Assess nerve function distal to the injury/problem area. Test Motor power (key muscles, MRC grade 0-5), Sensory function (key dermatomes, light touch/pinprick), and relevant Reflexes.",
        exam_vascular_hint: "Vascular Examination (Distal): Assess blood supply distal to the injury/problem area. Check distal Pulses, Capillary Refill time, Skin Color, and Temperature. Compare sides.",
        summary_diagnosis_heading_hint: "Summary & Diagnosis: Synthesize all findings to formulate a clinical picture and diagnostic possibilities.",
        summary_clinical_hint: `Clinical Summary: A brief paragraph integrating the most important positive and negative findings. Start with demographics/CC, then key HPI/Exam points.\nExample: "25-year-old right-handed male presents with 1 week of right shoulder pain after a fall onto the outstretched hand during football. Pain is sharp, located anteriorly, worse with overhead activity (8/10), better with rest (3/10). No previous shoulder issues. Examination reveals tenderness over the AC joint, positive cross-body adduction test, and painful arc on abduction between 70-120 degrees. Full active/passive ROM otherwise. Neurovascularly intact distally. No other injuries reported."`,
        summary_ddx_history_hint: `Differential Diagnosis (History Alone): List possible diagnoses based *only* on the history. Consider the MOI, location, character of pain, age, etc.\nExample (for shoulder pain after fall):\n1. Rotator Cuff Tear/Tendinopathy\n2. AC Joint Sprain/Separation\n3. Shoulder Impingement Syndrome\n4. Proximal Humerus Fracture (less likely given age/MOI description)\n5. Labral Tear`,
        summary_ddx_exam_hint: `Differential Diagnosis (History & Exam): Refine the differential list after incorporating examination findings. Prioritize based on positive/negative tests.\nExample (continuing shoulder case):\n1. AC Joint Sprain/Separation (High suspicion due to localized tenderness & positive cross-body adduction)\n2. Shoulder Impingement / Rotator Cuff Tendinopathy (Possible given painful arc, but AC joint findings more specific)\n3. Rotator Cuff Tear (Less likely without significant weakness)\n4. Labral Tear (Less likely without instability symptoms/tests)`,
        summary_provisional_hint: "Provisional Diagnosis: State the single most likely diagnosis based on the complete assessment. Example: 'AC Joint Sprain (Grade I/II)'",
        summary_plan_hint: `Initial Plan: Outline immediate next steps. Investigations (e.g., X-ray [views], Blood tests [FBC, ESR/CRP]) and/or basic Management (e.g., RICE, analgesia, splinting, referral).\nExample: "1. X-ray Right Shoulder (AP, Axillary views). 2. Sling for comfort. 3. NSAIDs for pain. 4. Follow-up after imaging."`
    }; // <-- Corrected closing brace

    // --- Initialization ---
    initApp(); // Ensure initApp is called after DOMContentLoaded and definitions

    function initApp() {
        console.log("DEBUG: Initializing App..."); // Updated log message
        try {
            setupNavigation(); // Restore navigation
            setupButtons(); // Restore buttons (includes auth buttons now)
            setupHints(); // Call hint setup directly
            setupAuth(); // Setup authentication listeners and initial state
            setupMobileToggle(); // Setup mobile sidebar toggle
            loadSavedData(); // Restore loading saved data (will need modification later for server)
            ensureInitialEntries(); // Ensure at least one med/allergy entry exists visually
            updateVivaButtonState(); // Restore Viva button state check (might depend on login now)
            console.log("DEBUG: App Initialized Successfully."); // Updated log message
        } catch (error) {
            console.error("DEBUG: Error during initApp:", error); // Updated log message
        }
    }

    // --- Navigation Logic ---
    function setupNavigation() {
        const navItems = document.querySelectorAll('.history-nav li');
        const sections = document.querySelectorAll('.history-section');
        const prevButton = document.getElementById('prev-section');
        const nextButton = document.getElementById('next-section');

        if (!navItems.length || !sections.length || !prevButton || !nextButton) {
            console.error("DEBUG: Navigation elements not found!");
            return;
        }
        console.log("DEBUG: Setting up navigation...");

        // Initial state: show Patient Demographics, hide others
        sections.forEach(section => {
            section.style.display = section.id === 'patient-info' ? 'block' : 'none';
        });
        updateActiveNav(document.querySelector('[data-section="patient-info"]'));

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const sectionId = item.getAttribute('data-section');
                console.log(`DEBUG: Nav item clicked: ${sectionId}`);
                showSection(sectionId);
                updateActiveNav(item);
                // Close sidebar on mobile after selection
                if (window.innerWidth <= 768) {
                    toggleSidebar(false);
                }
            });
        });

        prevButton.addEventListener('click', navigateToPrevious);
        nextButton.addEventListener('click', navigateToNext);

        updateNavigationButtons(); // Set initial button states
        console.log("DEBUG: Navigation setup complete.");
    }

    function showSection(sectionId) {
        const sections = document.querySelectorAll('.history-section');
        sections.forEach(section => {
            section.style.display = section.id === sectionId ? 'block' : 'none';
        });
        // Scroll to top of section smoothly - Optional, keep if desired
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
             activeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        console.log(`DEBUG: Showing section: ${sectionId}`);
        updateNavigationButtons();
    }

    function updateActiveNav(activeItem) {
        const navItems = document.querySelectorAll('.history-nav li');
        navItems.forEach(item => item.classList.remove('active'));
        if (activeItem) {
            activeItem.classList.add('active');
            console.log(`DEBUG: Active nav set to: ${activeItem.getAttribute('data-section')}`);
        }
    }

    function navigateToPrevious() {
        const navItems = document.querySelectorAll('.history-nav li');
        const activeItem = document.querySelector('.history-nav li.active');
        if (!activeItem) return; // Exit if no active item
        let currentIndex = Array.from(navItems).indexOf(activeItem);

        if (currentIndex > 0) {
            const prevItem = navItems[currentIndex - 1];
            const prevSectionId = prevItem.getAttribute('data-section');
            console.log("DEBUG: Navigating to previous section:", prevSectionId);
            showSection(prevSectionId);
            updateActiveNav(prevItem);
        } else {
            console.log("DEBUG: Already at the first section.");
        }
    }

    function navigateToNext() {
        const navItems = document.querySelectorAll('.history-nav li');
        const activeItem = document.querySelector('.history-nav li.active');
        if (!activeItem) return; // Exit if no active item
        let currentIndex = Array.from(navItems).indexOf(activeItem);

        if (currentIndex < navItems.length - 1) {
            const nextItem = navItems[currentIndex + 1];
            const nextSectionId = nextItem.getAttribute('data-section');
            console.log("DEBUG: Navigating to next section:", nextSectionId);
            showSection(nextSectionId);
            updateActiveNav(nextItem);
        } else {
            console.log("DEBUG: Already at the last section.");
        }
    }

    function updateNavigationButtons() {
        const navItems = document.querySelectorAll('.history-nav li');
        const activeItem = document.querySelector('.history-nav li.active');
        const prevButton = document.getElementById('prev-section');
        const nextButton = document.getElementById('next-section');

        if (!activeItem || !prevButton || !nextButton) return; // Elements might not be ready

        let currentIndex = Array.from(navItems).indexOf(activeItem);

        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === navItems.length - 1;
        console.log(`DEBUG: Updated nav buttons. Prev disabled: ${prevButton.disabled}, Next disabled: ${nextButton.disabled}`);
    }

    // --- Mobile Sidebar Toggle Logic ---
    function setupMobileToggle() {
        if (!menuToggle || !sidebar || !overlay) {
            console.error("DEBUG: Mobile toggle elements (button, sidebar, overlay) not found!");
            return;
        }
        console.log("DEBUG: Setting up mobile toggle...");

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering overlay click
            toggleSidebar(); // Toggle without argument means switch state
        });

        overlay.addEventListener('click', () => {
            toggleSidebar(false); // Close sidebar when overlay is clicked
        });
        console.log("DEBUG: Mobile toggle setup complete.");
    }

    function toggleSidebar(forceState) {
        // forceState = true to open, false to close, undefined to toggle
        if (!sidebar || !overlay) return; // Ensure elements exist

        const currentState = sidebar.classList.contains('active');
        const newState = (forceState === undefined) ? !currentState : forceState;

        if (newState) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            console.log("DEBUG: Sidebar opened.");
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            console.log("DEBUG: Sidebar closed.");
        }
    }

     // --- Hint System Logic ---
    let hideHintPopupHandler; // Declare variable to hold the handler reference

    function setupHints() {
        console.log("DEBUG: Setting up hints...");
        
        // Create or get the popup element
        let popup = document.getElementById('hint-popup-element');
        if (!popup) {
            popup = document.createElement('div');
            popup.className = 'hint-popup';
            popup.id = 'hint-popup-element';
            document.body.appendChild(popup);
            
            // Close button for the popup
            popup.addEventListener('click', (event) => {
                if (event.target.classList.contains('hint-popup-close')) {
                    hideHintPopup();
                }
                event.stopPropagation();
            });
        }

        // Debug helper to log all found hint keys
        const hintKeys = Array.from(document.querySelectorAll('.hint-icon'))
            .map(icon => icon.getAttribute('data-hint-key'))
            .filter(Boolean);
        console.log("DEBUG: Found hint keys:", hintKeys); // Keep this for debugging

        // Use event delegation on the content area
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.addEventListener('click', (event) => {
                let hintIcon = null;
                // Check if the clicked element itself is the icon
                if (event.target.matches('.hint-icon')) {
                    hintIcon = event.target;
                // Check if the parent element contains a hint icon (covers clicks on text within label/legend/h2)
                } else if (event.target.parentElement?.querySelector('.hint-icon')) {
                    hintIcon = event.target.parentElement.querySelector('.hint-icon');
                }
                
                if (hintIcon) {
                    event.stopPropagation(); // Prevent document click listener from closing immediately
                    const hintKey = hintIcon.getAttribute('data-hint-key');
                    if (!hintKey) { 
                        console.error("DEBUG: Hint icon has no data-hint-key:", hintIcon);
                        return;
                    }
                    const content = hintContent[hintKey];
                    if (!content) {
                        console.error("DEBUG: No content found for hint key:", hintKey);
                        return;
                    }
                    showHintPopup(hintIcon, content);
                }
            });
        } else {
            console.error("DEBUG: .content-area element not found for hint delegation!");
        }


        // Single document click handler to close popup (remains the same)
        document.addEventListener('click', () => {
            if (activeHintPopup) {
                hideHintPopup();
            }
        });

        console.log("DEBUG: Hint setup complete -", document.querySelectorAll('.hint-icon').length, "hints initialized");
    }

    function showHintPopup(targetIcon, content) {
        // Get the single popup element (should exist from setupHints)
        const popup = document.getElementById('hint-popup-element');
        if (!popup) {
            console.error("DEBUG: Hint popup element not found!");
            return; // Should not happen if setupHints ran correctly
        }

        // Hide any currently active popup (if different from the one we are about to show)
        if (activeHintPopup && activeHintPopup !== popup) {
             hideHintPopup();
        }

        // Set content and add close button listener *within* this function scope
        popup.innerHTML = `
            <button class="hint-popup-close" aria-label="Close hint">&times;</button>
            <div class="hint-content">${content}</div>
        `;
        const closeButton = popup.querySelector('.hint-popup-close');
        if (closeButton) {
            // Define the handler here to ensure it's fresh each time
            const closeHandler = (event) => {
                event.stopPropagation(); // Prevent body listener
                hideHintPopup();
            };
            // Use { once: true } to auto-remove listener after first click
            closeButton.addEventListener('click', closeHandler, { once: true });
        } else {
            console.error("DEBUG: Close button not found in popup!");
        }

        // Positioning logic
        const iconRect = targetIcon.getBoundingClientRect();
        const popupWidth = Math.min(300, window.innerWidth - 20);
        const popupMaxHeight = 300; // Use max-height from CSS for calculation

        // Temporarily show off-screen to measure actual height
        popup.style.visibility = 'hidden';
        popup.style.width = `${popupWidth}px`;
        popup.style.maxHeight = `${popupMaxHeight}px`; // Ensure max-height is set for measurement
        popup.classList.add('visible'); // Make it display: block
        const actualPopupHeight = popup.offsetHeight;
        popup.classList.remove('visible');
        popup.style.visibility = 'visible';

        // Calculate position (prefer below, adjust if needed)
        let top = iconRect.bottom + window.scrollY + 5;
        let left = iconRect.left + window.scrollX + (iconRect.width / 2) - (popupWidth / 2);

        // Adjust horizontal position for viewport boundaries
        left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));

        // Adjust vertical position if it goes off-screen bottom
        if (top + actualPopupHeight > window.innerHeight + window.scrollY - 10) {
            top = Math.max(10, iconRect.top + window.scrollY - actualPopupHeight - 5);
        }

        // Apply final styles
        popup.style.cssText = `
            width: ${popupWidth}px;
            left: ${left}px;
            top: ${top}px;
            max-height: ${popupMaxHeight}px;
            overflow-y: auto;
            visibility: visible; /* Ensure it's visible */
        `;

        // Add 'visible' class to trigger transition (if any)
        popup.classList.add('visible');
        activeHintPopup = popup;
        console.log(`DEBUG: Showing hint for key: ${targetIcon.getAttribute('data-hint-key')} at top: ${top}px, left: ${left}px`); // Added log
    }

    function hideHintPopup() {
        if (activeHintPopup) {
            console.log("DEBUG: Hiding hint popup."); // Added log
            activeHintPopup.classList.remove('visible');
            // Optional: Clear content after transition? Consider if needed.
            // setTimeout(() => {
            //     if (activeHintPopup && !activeHintPopup.classList.contains('visible')) {
            //         activeHintPopup.innerHTML = ''; // Clear content
            //     }
            // }, 200); // Match CSS transition duration
            activeHintPopup = null; // Clear reference immediately
        }
    }

    // --- Button Setup ---
    function setupButtons() {
        console.log("DEBUG: Setting up buttons...");
        document.getElementById('save-history')?.addEventListener('click', saveHistory);
        document.getElementById('export-pdf')?.addEventListener('click', exportToPDF);
        document.getElementById('new-history')?.addEventListener('click', confirmNewHistory);
        document.getElementById('add-medication')?.addEventListener('click', addMedicationEntry);
        document.getElementById('add-allergy')?.addEventListener('click', addAllergyEntry);
        document.getElementById('start-ai-viva')?.addEventListener('click', startViva); // Re-add AI Viva listener
        document.getElementById('end-ai-viva')?.addEventListener('click', endViva); // Re-add AI Viva listener
        document.getElementById('send-chat-message')?.addEventListener('click', sendStudentMessage); // Re-add AI Viva listener
        // Add listener for Enter key in chat input
        document.getElementById('chat-input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
                e.preventDefault(); // Prevent default Enter behavior (newline)
                sendStudentMessage();
            }
        });
        // Add listeners for timer continue/end buttons
        document.getElementById('viva-continue-btn')?.addEventListener('click', extendVivaTimer);
        document.getElementById('viva-force-end-btn')?.addEventListener('click', endViva); // Re-use endViva

        console.log("DEBUG: Button setup complete.");
    }

    // --- Authentication Logic ---
    function setupAuth() {
        console.log("DEBUG: Setting up authentication...");
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showLoginLink = document.getElementById('show-login');
        const showRegisterLink = document.getElementById('show-register');
        const logoutButton = document.getElementById('logout-button');

        console.log("DEBUG: Auth elements:", { loginForm, registerForm, showLoginLink, showRegisterLink, logoutButton }); // DEBUG

        loginForm?.addEventListener('submit', handleLogin);
        registerForm?.addEventListener('submit', handleRegister);
        showLoginLink?.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(true); });
        showRegisterLink?.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(false); });
        logoutButton?.addEventListener('click', handleLogout);

        // Check initial login state on load
        currentUserToken = localStorage.getItem('authToken');
        updateAuthUI();
        console.log("DEBUG: Auth setup complete. Initial token found:", !!currentUserToken);
    }

    function toggleAuthForms(showLogin) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authMessage = document.getElementById('auth-message');

        // Clear forms and messages
        if (authMessage) {
            authMessage.textContent = '';
            authMessage.className = 'auth-message'; // Reset class
        }

        // Toggle forms with smooth transitions
        if (loginForm && registerForm) {
            if (showLogin) {
                registerForm.style.display = 'none';
                setTimeout(() => {
                    loginForm.style.display = 'block';
                    loginForm.querySelector('input')?.focus();
                }, 150);
            } else {
                loginForm.style.display = 'none';
                setTimeout(() => {
                    registerForm.style.display = 'block';
                    registerForm.querySelector('input')?.focus();
                }, 150);
            }
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        const loginForm = event.target;
        const username = document.getElementById('login-username')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        const authMessage = document.getElementById('auth-message');
        
        // Clear previous messages
        if (authMessage) {
            authMessage.textContent = '';
            authMessage.className = 'auth-message';
        }

        // Validate inputs
        if (!username || !password) {
            if (authMessage) {
                authMessage.textContent = 'Please enter both username and password.';
                authMessage.classList.add('error');
            }
            return;
        }

        try {
            // Disable form during submission
            loginForm.querySelector('button[type="submit"]').disabled = true;
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok) {
                currentUserToken = result.token;
                localStorage.setItem('authToken', currentUserToken);
                localStorage.setItem('loggedInUsername', username);
                updateAuthUI();
                showNotification('Login successful!', 'success');
            } else {
                if (authMessage) {
                    authMessage.textContent = result.message || 'Login failed. Please try again.';
                    authMessage.classList.add('error');
                }
                currentUserToken = null;
                localStorage.removeItem('authToken');
                localStorage.removeItem('loggedInUsername');
            }
        } catch (error) {
            if (authMessage) {
                authMessage.textContent = 'Network error. Please try again later.';
                authMessage.classList.add('error');
            }
            currentUserToken = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('loggedInUsername');
        } finally {
            loginForm.querySelector('button[type="submit"]').disabled = false;
        }
    }

    async function handleRegister(event) {
        event.preventDefault();
        const registerForm = event.target;
        const username = document.getElementById('register-username')?.value.trim();
        const password = document.getElementById('register-password')?.value;
        const authMessage = document.getElementById('auth-message');
        
        // Clear previous messages
        if (authMessage) {
            authMessage.textContent = '';
            authMessage.className = 'auth-message';
        }

        // Validate inputs
        if (!username || !password) {
            if (authMessage) {
                authMessage.textContent = 'Please enter both username and password.';
                authMessage.classList.add('error');
            }
            return;
        }
        if (password.length < 6) {
            if (authMessage) {
                authMessage.textContent = 'Password must be at least 6 characters long.';
                authMessage.classList.add('error');
            }
            return;
        }

        try {
            // Disable form during submission
            registerForm.querySelector('button[type="submit"]').disabled = true;
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok) {
                showNotification('Registration successful! Please log in.', 'success');
                toggleAuthForms(true); // Switch to login form
                document.getElementById('login-username').value = username; // Pre-fill username
            } else {
                if (authMessage) {
                    authMessage.textContent = result.message || 'Registration failed. Please try again.';
                    authMessage.classList.add('error');
                }
            }
        } catch (error) {
            if (authMessage) {
                authMessage.textContent = 'Network error. Please try again later.';
                authMessage.classList.add('error');
            }
        } finally {
            registerForm.querySelector('button[type="submit"]').disabled = false;
        }
    }

    function handleLogout() {
        console.log("DEBUG: Handling logout...");
        currentUserToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('loggedInUsername');
        updateAuthUI();
        showNotification('Logged out successfully.', 'info');
        // Optionally clear form data or prompt user
        // clearAllFields(); // Decide if logout should clear the current case
    }

    function updateAuthUI() {
        const authFormsDiv = document.getElementById('auth-forms');
        const userStatusDiv = document.getElementById('user-status');
        const loggedInUsernameSpan = document.getElementById('logged-in-username');
        const authMessage = document.getElementById('auth-message');

        if (currentUserToken) {
            // Logged in
            if (authFormsDiv) authFormsDiv.style.display = 'none';
            if (userStatusDiv) userStatusDiv.style.display = 'block';
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = localStorage.getItem('loggedInUsername') || 'User';
        } else {
            // Logged out
            if (authFormsDiv) authFormsDiv.style.display = 'block';
            if (userStatusDiv) userStatusDiv.style.display = 'none';
            toggleAuthForms(true); // Default to showing login form when logged out
        }
-         updateVivaButtonState(); // Viva button might depend on login status
         // Add logic here later to enable/disable save/load based on login status if needed
    }

     function getToken() {
         return currentUserToken || localStorage.getItem('authToken');
     }

    // --- Dynamic Entry Logic (Meds/Allergies - Keep this) ---
    // Moved counters to top state variables

    function addMedicationEntry() {
        medIdCounter++;
        const entryHTML = createMedicationEntryHTML(medIdCounter);
        document.querySelector('.medication-entries').insertAdjacentHTML('beforeend', entryHTML);
        console.log("DEBUG: Added medication entry:", medIdCounter);
    }

    function addAllergyEntry() {
        allergyIdCounter++;
        const entryHTML = createAllergyEntryHTML(allergyIdCounter);
        document.querySelector('.allergy-entries').insertAdjacentHTML('beforeend', entryHTML);
         console.log("DEBUG: Added allergy entry:", allergyIdCounter);
    }

    // Make removeEntry globally accessible or attach differently if needed
    window.removeEntry = function(event) { // Attach to window for inline onclick
        if (event.target.classList.contains('remove-entry')) {
            const entryDiv = event.target.closest('.dynamic-entry');
            if (entryDiv) {
                console.log("DEBUG: Removing entry:", entryDiv.id);
                entryDiv.remove();
            }
        }
    }

    function createMedicationEntryHTML(id, data = {}) {
        const medName = data.name || '';
        const medDosage = data.dosage || '';
        const medFrequency = data.frequency || '';
        return `
            <div class="dynamic-entry medication-entry" id="med-${id}">
                <input type="text" placeholder="Medication Name" value="${medName}" data-field="med-name">
                <input type="text" placeholder="Dosage" value="${medDosage}" data-field="med-dosage">
                <input type="text" placeholder="Frequency" value="${medFrequency}" data-field="med-frequency">
                <button class="remove-entry" onclick="removeEntry(event)" aria-label="Remove medication">&times;</button>
            </div>
        `;
    }

    function createAllergyEntryHTML(id, data = {}) {
         const allergyName = data.name || '';
         const allergyReaction = data.reaction || '';
        return `
            <div class="dynamic-entry allergy-entry" id="allergy-${id}">
                <input type="text" placeholder="Allergen" value="${allergyName}" data-field="allergy-name">
                <input type="text" placeholder="Reaction" value="${allergyReaction}" data-field="allergy-reaction">
                <button class="remove-entry" onclick="removeEntry(event)" aria-label="Remove allergy">&times;</button>
            </div>
        `;
    }

     function ensureInitialEntries() {
         if (!document.querySelector('.medication-entries .medication-entry')) {
             addMedicationEntry();
         }
         if (!document.querySelector('.allergy-entries .allergy-entry')) {
             addAllergyEntry();
         }
         console.log("DEBUG: Ensured initial med/allergy entries.");
     }


    // --- Data Handling (Save, Load, Collect, Populate, Clear - Keep this) ---
    function saveHistory() {
        console.log("DEBUG: Saving history...");
        const historyData = collectFormData();
        try {
            localStorage.setItem('orthoHistoryData', JSON.stringify(historyData));
            showNotification('Case saved successfully!', 'success');
            console.log("DEBUG: History saved to localStorage.");
            updateVivaButtonState(); // Restore AI button update
        } catch (error) {
            console.error("DEBUG: Error saving to localStorage:", error);
            showNotification('Error saving case. Storage might be full.', 'error');
        }
    }

    function loadSavedData() {
        console.log("DEBUG: Attempting to load saved data...");
        try {
            const savedData = localStorage.getItem('orthoHistoryData');
            if (savedData) {
                const historyData = JSON.parse(savedData);
                populateFormData(historyData);
                showNotification('Previously saved case loaded.', 'info');
                console.log("DEBUG: Saved data loaded and populated.");
            } else {
                 console.log("DEBUG: No saved data found.");
                 ensureInitialEntries(); // Make sure default entries are there if nothing loaded
            }
        } catch (error) {
            console.error("DEBUG: Error loading or parsing saved data:", error);
            showNotification('Error loading saved case.', 'error');
            ensureInitialEntries(); // Ensure default entries on error too
        }
         updateVivaButtonState(); // Restore AI button update
    }

    function collectFormData() {
        console.log("DEBUG: Collecting form data...");
        const data = {};
        const fields = document.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
        fields.forEach(field => {
            if (field.id) {
                data[field.id] = field.value;
            }
        });
        const radioGroups = ['head_injury', 'neck_injury', 'chest_injury', 'abd_injury'];
        radioGroups.forEach(groupName => {
            const checkedRadio = document.querySelector(`input[name="${groupName}"]:checked`);
            data[groupName] = checkedRadio ? checkedRadio.value : null;
            if (groupName === 'head_injury' && data[groupName] === 'yes') {
                 data['head_injury_details'] = document.getElementById('head_injury_details')?.value || '';
            }
        });
        data.medications = collectMedications();
        data.allergies = collectAllergies();
        console.log("DEBUG: Form data collected.");
        return data;
    }

    function collectMedications() {
        const medications = [];
        document.querySelectorAll('.medication-entry').forEach(entry => {
            const med = {
                name: entry.querySelector('[data-field="med-name"]')?.value || '',
                dosage: entry.querySelector('[data-field="med-dosage"]')?.value || '',
                frequency: entry.querySelector('[data-field="med-frequency"]')?.value || ''
            };
            if (med.name.trim()) {
                medications.push(med);
            }
        });
        console.log("DEBUG: Collected medications:", medications.length);
        return medications;
    }

    function collectAllergies() {
        const allergies = [];
        document.querySelectorAll('.allergy-entry').forEach(entry => {
            const allergy = {
                name: entry.querySelector('[data-field="allergy-name"]')?.value || '',
                reaction: entry.querySelector('[data-field="allergy-reaction"]')?.value || ''
            };
            if (allergy.name.trim()) {
                allergies.push(allergy);
            }
        });
         console.log("DEBUG: Collected allergies:", allergies.length);
        return allergies;
    }

    function populateFormData(data) {
        console.log("DEBUG: Populating form data...");
        Object.keys(data).forEach(key => {
            const field = document.getElementById(key);
            if (field && typeof data[key] === 'string') {
                 if (field.tagName === 'INPUT' && field.type === 'radio') {
                     // Handled below
                 } else {
                    field.value = data[key];
                 }
            }
        });
        const radioGroups = ['head_injury', 'neck_injury', 'chest_injury', 'abd_injury'];
        radioGroups.forEach(groupName => {
            if (data[groupName]) {
                const radioToCheck = document.getElementById(`${groupName}_${data[groupName]}`);
                if (radioToCheck) radioToCheck.checked = true;
                 if (groupName === 'head_injury' && data[groupName] === 'yes' && data['head_injury_details']) {
                     const detailsField = document.getElementById('head_injury_details');
                     if (detailsField) detailsField.value = data['head_injury_details'];
                 }
            }
        });
        const medContainer = document.querySelector('.medication-entries');
        medContainer.innerHTML = '';
        medIdCounter = 0; // Reset counter before populating
        if (data.medications && data.medications.length > 0) {
            data.medications.forEach(medData => {
                medIdCounter++;
                medContainer.insertAdjacentHTML('beforeend', createMedicationEntryHTML(medIdCounter, medData));
            });
        } else {
             addMedicationEntry();
        }
        const allergyContainer = document.querySelector('.allergy-entries');
        allergyContainer.innerHTML = '';
        allergyIdCounter = 0; // Reset counter before populating
        if (data.allergies && data.allergies.length > 0) {
            data.allergies.forEach(allergyData => {
                allergyIdCounter++;
                allergyContainer.insertAdjacentHTML('beforeend', createAllergyEntryHTML(allergyIdCounter, allergyData));
            });
        } else {
             addAllergyEntry();
        }
        console.log("DEBUG: Form data population complete.");
    }

    function confirmNewHistory() {
        if (confirm("Are you sure you want to start a new case? Any unsaved changes will be lost.")) {
            console.log("DEBUG: Starting new history confirmed.");
            clearAllFields();
            localStorage.removeItem('orthoHistoryData');
            showNotification('New case started. All fields cleared.', 'info');
            updateVivaButtonState(); // Restore AI button update
             const firstNavItem = document.querySelector('.history-nav li');
             if (firstNavItem) {
                 const firstSectionId = firstNavItem.getAttribute('data-section');
                 showSection(firstSectionId);
                 updateActiveNav(firstNavItem);
             }
        } else {
             console.log("DEBUG: Starting new history cancelled.");
        }
    }

    function clearAllFields() {
        console.log("DEBUG: Clearing all fields...");
        const fields = document.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
        fields.forEach(field => { field.value = ''; });
        const radios = document.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => radio.checked = false);
        document.querySelector('.medication-entries').innerHTML = '';
        document.querySelector('.allergy-entries').innerHTML = '';
        medIdCounter = 0;
        allergyIdCounter = 0;
        ensureInitialEntries();
        console.log("DEBUG: Fields cleared.");
    }


    // --- PDF Export (Keep this) ---
    function exportToPDF() {
        console.log("DEBUG: Starting PDF export...");
        if (typeof jspdf === 'undefined') {
            showNotification('Error: jsPDF library not loaded.', 'error');
            console.error("DEBUG: jsPDF library not found!");
            return;
        }
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        const data = collectFormData();
        let yPos = 15;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 10;
        const lineHeight = 7;
        const sectionSpacing = 10;
        const indent = 5;

        function addText(text, x, y, options = {}) {
            if (y > pageHeight - margin) { doc.addPage(); y = margin; }
            doc.text(text, x, y, options);
            return y + lineHeight;
        }
        function addSectionTitle(title, y) {
             if (y > pageHeight - margin - sectionSpacing) { doc.addPage(); y = margin; }
             doc.setFont(undefined, 'bold');
             y = addText(title, margin, y);
             doc.setFont(undefined, 'normal');
             return y + (lineHeight / 2);
        }
        function addField(label, value, y, isIndented = false) {
            if (!value || value.trim() === '') return y;
            const x = isIndented ? margin + indent : margin;
            const labelText = `${label}: `;
            const availableWidth = doc.internal.pageSize.width - x - margin;
            const splitValue = doc.splitTextToSize(value, availableWidth - doc.getTextWidth(labelText));
            doc.setFont(undefined, 'bold');
            y = addText(labelText, x, y);
            doc.setFont(undefined, 'normal');
            const valueX = x + doc.getTextWidth(labelText);
            let currentY = y - lineHeight;
            splitValue.forEach(line => { currentY = addText(line, valueX, currentY); });
            return currentY;
        }

        console.log("DEBUG: Generating PDF content...");
        doc.setFontSize(16); yPos = addText('Orthopedic History Report', margin, yPos);
        doc.setFontSize(12); yPos += sectionSpacing;
        yPos = addSectionTitle('Patient Information', yPos);
        yPos = addField('Name', data['patient-name'], yPos); yPos = addField('Age', data['patient-age'], yPos);
        yPos = addField('Gender', data['patient-gender'], yPos); yPos = addField('Occupation', data['patient-occupation'], yPos);
        yPos = addField('Handedness', data['patient-handedness'], yPos); yPos = addField('Address', data['patient-address'], yPos);
        yPos += sectionSpacing;
        yPos = addSectionTitle('Chief Complaint (CC)', yPos); yPos = addField('Complaint', data['cc-notes'], yPos); yPos += sectionSpacing;
        yPos = addSectionTitle('History of Present Illness (HPI)', yPos);
        yPos = addField('Onset', data['hpi-onset'], yPos); yPos = addField('MOI/Onset Desc', data['hpi-moi'], yPos);
        if (data['head_injury'] || data['neck_injury'] || data['chest_injury'] || data['abd_injury'] || data['hpi-other-injuries']) {
             yPos = addField('Associated Trauma', '', yPos);
             yPos = addField('Head Injury/LOC', data['head_injury'] ? `${data['head_injury']} ${data['head_injury'] === 'yes' ? '(' + (data['head_injury_details'] || 'Details not provided') + ')' : ''}` : 'N/A', yPos, true);
             yPos = addField('Neck Pain/Injury', data['neck_injury'] || 'N/A', yPos, true); yPos = addField('Chest Pain/SOB', data['chest_injury'] || 'N/A', yPos, true);
             yPos = addField('Abdominal Pain', data['abd_injury'] || 'N/A', yPos, true); yPos = addField('Other Injuries', data['hpi-other-injuries'], yPos, true);
        }
        yPos = addField('Location/Radiation', data['hpi-location'], yPos); yPos = addField('Duration/Frequency', data['hpi-duration'], yPos);
        yPos = addField('Character', data['hpi-character'], yPos); yPos = addField('Aggravating Factors', data['hpi-aggravating'], yPos);
        yPos = addField('Alleviating Factors', data['hpi-alleviating'], yPos); yPos = addField('Related Symptoms', data['hpi-related-symptoms'], yPos);
        yPos = addField('Pertinent Negatives', data['hpi-pertinent-negatives'], yPos); yPos = addField('Timing', data['hpi-timing'], yPos);
        yPos = addField('Severity', data['hpi-severity'], yPos); yPos = addField('Functional Limitations', data['hpi-functional-limitations'], yPos);
        yPos += sectionSpacing;
        yPos = addSectionTitle('Past Medical History (PMH)', yPos); yPos = addField('Details', data['pmh-notes'], yPos); yPos += sectionSpacing;
        yPos = addSectionTitle('Past Orthopedic History', yPos); yPos = addField('Details', data['past-ortho-notes'], yPos); yPos += sectionSpacing;
        yPos = addSectionTitle('Medications', yPos);
        if (data.medications && data.medications.length > 0 && data.medications[0].name) {
            data.medications.forEach(med => { yPos = addField(med.name, `${med.dosage || 'N/A'} - ${med.frequency || 'N/A'}`, yPos, true); });
        } else { yPos = addText('None listed.', margin + indent, yPos); yPos += lineHeight; }
        yPos += sectionSpacing;
        yPos = addSectionTitle('Allergies', yPos);
         if (data.allergies && data.allergies.length > 0 && data.allergies[0].name) {
            data.allergies.forEach(allergy => { yPos = addField(allergy.name, allergy.reaction || 'Reaction not specified', yPos, true); });
        } else { yPos = addText('None listed.', margin + indent, yPos); yPos += lineHeight; }
        yPos += sectionSpacing;
        yPos = addSectionTitle('Family History (FH)', yPos); yPos = addField('Details', data['fh-notes'], yPos); yPos += sectionSpacing;
        yPos = addSectionTitle('Social History (SH)', yPos); yPos = addField('Details', data['sh-notes'], yPos); yPos += sectionSpacing;
        yPos = addSectionTitle('Review of Systems (ROS)', yPos); yPos = addField('Details', data['ros-notes'], yPos); yPos += sectionSpacing;
        yPos = addSectionTitle('Examination', yPos);
        yPos = addField('General Inspection', data['exam-general'], yPos); yPos = addField('Look (Inspection)', data['exam-look'], yPos, true);
        yPos = addField('Feel (Palpation)', data['exam-feel'], yPos, true); yPos = addField('Move (ROM)', data['exam-move'], yPos, true);
        yPos = addField('Measurements', data['exam-measurements'], yPos, true); yPos = addField('Special Tests', data['exam-special-tests'], yPos, true);
        yPos = addField('Neuro (Distal)', data['exam-neuro'], yPos, true); yPos = addField('Vascular (Distal)', data['exam-vascular'], yPos, true);
        yPos = addField('Related Areas Exam', data['exam-related'], yPos); yPos += sectionSpacing;
        yPos = addSectionTitle('Summary & Diagnosis', yPos);
        yPos = addField('Clinical Summary', data['summary-clinical'], yPos); yPos = addField('DDx (History)', data['summary-ddx-history'], yPos);
        yPos = addField('DDx (History & Exam)', data['summary-ddx-exam'], yPos); yPos = addField('Provisional Dx', data['summary-provisional'], yPos);
        yPos = addField('Initial Plan', data['summary-plan'], yPos);

        const filename = `OrthoHistory_${data['patient-name'] || 'Patient'}_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(filename);
        showNotification('PDF exported successfully!', 'success');
        console.log("DEBUG: PDF export complete.");
    }


    // --- AI Viva Simulation Logic (Updated for Modes) ---
    // let aiConversationHistory = []; // Already declared at top

    function updateVivaButtonState() {
        const startButton = document.getElementById('start-ai-viva');
        const vivaModeSelection = document.querySelector('.viva-mode-selection');
        const endButton = document.getElementById('end-ai-viva');
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-chat-message');
        const chatSection = document.getElementById('ai-viva-chat');

        // Enable Start button only if there's some data saved/entered
        const hasData = !!localStorage.getItem('orthoHistoryData') || document.getElementById('cc-notes')?.value.trim() !== '';
        if (startButton) startButton.disabled = vivaInProgress || !hasData;

        // Hide mode selection during viva
        if (vivaModeSelection) vivaModeSelection.style.display = vivaInProgress ? 'none' : 'block';

        // Control visibility/state of chat elements
        if (chatSection) chatSection.style.display = vivaInProgress ? 'block' : 'none';
        if (endButton) endButton.style.display = vivaInProgress ? 'inline-block' : 'none'; // Show end button only during viva
        if (chatInput) chatInput.disabled = !vivaInProgress;
        if (sendButton) sendButton.disabled = !vivaInProgress;

         console.log(`DEBUG: Viva button state updated. InProgress: ${vivaInProgress}, HasData: ${hasData}`);
    }

    function startViva() {
        if (vivaInProgress) return;

        // Determine selected mode
        const selectedMode = document.querySelector('input[name="viva-mode"]:checked')?.value || 'exam'; // Default to exam mode
        console.log(`DEBUG: Starting AI Session in ${selectedMode} mode...`);

        vivaInProgress = true;
        aiConversationHistory = []; // Reset history

        // Prepare initial context for AI
        const caseSummary = collectFormData(); // Get current data
        let initialPrompt = '';
        let welcomeMessage = '';

        if (selectedMode === 'exam') {
            welcomeMessage = 'Welcome to the AI Viva Exam! I will ask questions based on your case entry. Preparing first question...';
            // --- Exam Mode Prompt ---
            initialPrompt = `You are an AI examiner simulating a challenging but fair final MBBS Orthopedics viva for a medical student.
Your goal is to assess their understanding and clinical reasoning based on the case history provided below.

Instructions:
- Base your questions on the case data provided below.
- Cover the following key areas: History Taking, Physical Examination, Provisional & Differential Diagnosis, Investigations, Management (Conservative/Surgical), and Complications (Early/Late).
- Ask a variety of question types: recall, interpretation, application, analysis.
- If the case suggests specific conditions (fractures, nerve issues), ask about relevant classifications, special tests, and complications.
- If case data is missing for a question, ask the student how they would find that information.
- If answers are vague/incorrect, prompt for clarification or guide reasoning without giving the answer.
- Maintain a professional, challenging but fair examiner tone.
- Keep responses concise.
- Conclude by asking the student if they have any final questions.

--- Case Data ---
${JSON.stringify(caseSummary, null, 2)}
--- End Case Data ---

Begin the examination now with your first question.`;
            // --- End Exam Mode Prompt ---
        } else { // Learning Mode
             welcomeMessage = 'Welcome to the AI Learning Session! Ask me anything about orthopedic history taking, examination, investigations, or management based on your case or general principles (undergraduate level).';
             // --- Learning Mode Prompt ---
             initialPrompt = `You are an AI tutor assisting a final MBBS medical student learning Orthopedics.
Your goal is to provide clear, concise explanations and guidance at an undergraduate level.
Instructions:
- The student will ask you questions related to orthopedic history, examination, investigations, or management.
- Base your answers on established orthopedic principles and knowledge suitable for a final year medical student.
- You can use the provided case data below for context if the student's question relates to it, but primarily focus on answering their specific questions.
- Explain concepts clearly. If asked about a procedure or test, describe how it's done and its significance.
- If asked about management, outline the principles and common options (conservative/surgical).
- Keep answers focused and avoid overly complex details unless specifically asked.
- Maintain a helpful, encouraging tutor tone.
- Start by inviting the student to ask their first question.

--- Case Data (for context if needed) ---
${JSON.stringify(caseSummary, null, 2)}
--- End Case Data ---

Wait for the student's first question.`;
             // --- End Learning Mode Prompt ---
        }


        aiConversationHistory.push({ role: 'system', content: initialPrompt });

        // Clear chat window and show appropriate welcome message
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `<div class="message ai">${welcomeMessage}</div>`; // Use mode-specific welcome

        updateVivaButtonState();
        showNotification(`AI ${selectedMode === 'exam' ? 'Exam' : 'Learning'} Session started!`, 'info');
        // startVivaTimer(VIVA_INITIAL_DURATION); // Start the timer - Keep commented out for now

        // Get the first AI question
        getAIResponse(); // Call the new async function
    }

    function endViva() {
        if (!vivaInProgress) return;
        console.log("DEBUG: Ending AI Viva.");
        vivaInProgress = false;
        // stopVivaTimer(); // Stop the timer - Keep commented out for now
        addMessageToChat("Viva session ended.", "system");
        updateVivaButtonState();
        showNotification('AI Viva ended.', 'info');
        // Disable chat input after ending
        if (chatInput) chatInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
    }

    function sendStudentMessage() {
        if (!vivaInProgress) return;
        const chatInput = document.getElementById('chat-input');
        const messageText = chatInput.value.trim();

        if (messageText) {
            console.log("DEBUG: Sending student message:", messageText.substring(0, 50) + '...');
            addMessageToChat(messageText, "student");
            aiConversationHistory.push({ role: 'user', content: messageText });
            chatInput.value = ''; // Clear input field

            // Disable input while AI "thinks"
            chatInput.disabled = true;
            document.getElementById('send-chat-message').disabled = true;

            // Get actual AI response
            getAIResponse(); // Call the new async function
        }
    }

    function addMessageToChat(text, sender, isSystem = false) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        if (isSystem) {
            messageDiv.classList.add('system');
         }
         // If it's a system message and contains the indicator structure, allow HTML and add specific class
         if (isSystem && text.includes('typing-indicator')) {
              messageDiv.innerHTML = text; // Insert the indicator HTML directly
              messageDiv.classList.add('indicator-message'); // Add specific class for easy removal
         } else {
             // Otherwise, sanitize and set text content
             // Correctly escape HTML characters to prevent XSS
             const sanitizedText = text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>'); // Corrected sanitization
             messageDiv.innerHTML = sanitizedText.replace(/\n/g, '<br>'); // Render newlines
         }
         chatMessages.appendChild(messageDiv);
         chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
     }
 
     // --- Timer Logic (Placeholder - Keep commented out for now) ---
     function formatTime(seconds) { return 'Time: 00:00'; }
     function updateTimerDisplay() { /* Placeholder */ }
     function showContinuePrompt() { /* Placeholder */ }
     function startVivaTimer(duration) { /* Placeholder */ }
     function stopVivaTimer() { /* Placeholder */ }
     function extendVivaTimer() { /* Placeholder */ }
 
     // --- Real AI Interaction ---
     async function getAIResponse() { // Renamed from simulateAIResponse and made async
        console.log("DEBUG: Requesting AI response from backend...");
        const chatMessages = document.getElementById('chat-messages'); // Get chat container

        // Find and remove any existing "Thinking..." or error messages before adding a new one
        const systemMessages = chatMessages.querySelectorAll('.message.system, .message.ai.system');
        systemMessages.forEach(msg => msg.remove());

        // Add the typing indicator HTML
        const indicatorHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        addMessageToChat(indicatorHTML, "ai", true);

        try {
            const response = await fetch('/api/viva/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add Authorization header if your API requires authentication later
                    // 'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ conversationHistory: aiConversationHistory })
            });

            // Remove the indicator message using its specific class
            const indicatorDiv = chatMessages.querySelector('.indicator-message'); // Use the specific class
            if (indicatorDiv) {
                indicatorDiv.remove();
            }


            if (!response.ok) {
                // Try to get error message from backend response body
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {
                    // Ignore if response body is not JSON
                }
                console.error("DEBUG: Backend error:", errorMsg);
                addMessageToChat(`Error getting AI response: ${errorMsg}`, "system", true); // Show error in chat
                // No need to throw here, error is displayed, finally block will re-enable input
            } else {
                 const data = await response.json();
                 const aiMessage = data.response;

                 console.log("DEBUG: Received AI response:", aiMessage.substring(0, 100) + '...');
                 addMessageToChat(aiMessage, "ai");
                 aiConversationHistory.push({ role: 'assistant', content: aiMessage });
            }

        } catch (error) {
            console.error('DEBUG: Error fetching AI response:', error);
              // Ensure indicator is removed on network error too
              const finalIndicatorDiv = chatMessages.querySelector('.indicator-message');
              if (finalIndicatorDiv) { // Use the specific class
                  finalIndicatorDiv.remove();
              }
             // Display a generic error in chat if not already shown by the !response.ok block
            if (!document.querySelector('#chat-messages .message.system')) {
                 addMessageToChat(`Network error or failed to reach AI. Please check server logs.`, "system", true);
            }
        } finally {
            // Always re-enable input regardless of success or failure
            const chatInput = document.getElementById('chat-input');
            const sendButton = document.getElementById('send-chat-message');
            if (chatInput) chatInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            if (chatInput) chatInput.focus();
        }
    }


    // --- Notification System (Keep this) ---
    function showNotification(message, type = 'info') { // types: info, success, error
        console.log(`DEBUG: Showing notification (${type}):`, message);
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => { notification.classList.add('visible'); }, 10);
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => { notification.remove(); }, 500);
        }, 3000);
    }

    // --- Service Worker Registration ---
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registered successfully with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        } else {
            console.log('Service Worker is not supported by this browser.');
        }
    }

    // Call registration function after other initializations
    registerServiceWorker();

}); // End DOMContentLoaded
