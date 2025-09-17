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
    const menuToggle = document.getElementById('mobile-menu-toggle'); // Mobile menu button
    const sidebar = document.querySelector('.sidebar'); // Sidebar element
    const overlay = document.querySelector('.overlay'); // Overlay element
    const savedCasesSection = document.getElementById('saved-cases-section');
    const savedCasesListDiv = document.getElementById('saved-cases-list');
    const loadCaseButton = document.getElementById('load-selected-case');
    const deleteCaseButton = document.getElementById('delete-selected-case');
    const profileBtn = document.getElementById('global-profile-btn');
    const profileDropdown = document.getElementById('global-profile-dropdown');
    const profileSettings = document.getElementById('global-profile-settings');
    const profileLogout = document.getElementById('global-profile-logout');
    const profileName = document.getElementById('global-profile-name');


    // --- State Variables ---
    let activeHintPopup = null;
    let currentUserToken = null;
    let currentCaseId = null; // Track the ID of the currently loaded/edited case
    let vivaInProgress = false; // Initialize viva state
    let currentVivaMode = 'exam'; // Track current mode ('exam', 'learning', 'dummy')
    let isWaitingForDummyCaseType = false; // Flag for dummy case generation state
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

    // --- Progressive Disclosure Setup ---
    function setupProgressiveDisclosure() {
        const toggleBtn = document.getElementById('toggle-advanced-fields');
        const advancedFields = document.getElementById('advanced-fields');
        const toggleIcon = toggleBtn?.querySelector('i');
        const toggleText = toggleBtn?.querySelector('span');

        if (!toggleBtn || !advancedFields) {
            console.log("DEBUG: Progressive disclosure elements not found");
            return;
        }

        toggleBtn.addEventListener('click', () => {
            const isExpanded = advancedFields.style.display !== 'none';

            if (isExpanded) {
                // Hide advanced fields
                advancedFields.classList.add('collapsing');
                setTimeout(() => {
                    advancedFields.style.display = 'none';
                    advancedFields.classList.remove('collapsing');
                    toggleBtn.classList.remove('expanded');
                    toggleText.textContent = 'Show Advanced Fields';
                }, 300); // Match animation duration
            } else {
                // Show advanced fields
                advancedFields.style.display = 'block';
                toggleBtn.classList.add('expanded');
                toggleText.textContent = 'Hide Advanced Fields';
            }

            console.log(`DEBUG: Advanced fields ${isExpanded ? 'collapsed' : 'expanded'}`);
        });

        console.log("DEBUG: Progressive disclosure setup complete.");
    }

    // --- Initialization ---
    initApp(); // Ensure initApp is called after DOMContentLoaded and definitions

    function initApp() {
        console.log("DEBUG: Initializing App..."); // Updated log message
        try {
            setupNavigation(); // Setup both sidebar and dashboard navigation
            setupButtons(); // Restore buttons (includes auth buttons now)
            setupHints(); // Call hint setup directly
            setupAuth(); // Setup authentication listeners and initial state
            setupMobileToggle(); // Setup mobile sidebar toggle
            setupProgressiveDisclosure(); // Setup progressive disclosure for advanced fields
            setupAITutor(); // Setup AI Tutor functionality
            // loadSavedData(); // Remove initial load from localStorage
            ensureInitialEntries(); // Ensure at least one med/allergy entry exists visually
            updateVivaButtonState(); // Restore Viva button state check (might depend on login now)

            // Start with dashboard visible (home page)
            navigateToDashboardSection('dashboard');
            updateMobileNavActive('dashboard');

            console.log("DEBUG: App Initialized Successfully."); // Updated log message
        } catch (error) {
            console.error("DEBUG: Error during initApp:", error); // Updated log message
        }
    }

    // --- Navigation Logic ---
    function setupNavigation() {
        // Setup sidebar navigation (existing)
        const navItems = document.querySelectorAll('.history-nav li');
        const sections = document.querySelectorAll('.history-section');

        if (navItems.length && sections.length) {
            console.log("DEBUG: Setting up sidebar navigation...");

            // Initial state: show Patient Demographics, hide others
            sections.forEach(section => {
                section.style.display = section.id === 'patient-info' ? 'block' : 'none';
            });
            updateActiveNav(document.querySelector('[data-section="patient-info"]'));
            updateBreadcrumbNav('patient-info');

            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const sectionId = item.getAttribute('data-section');
                    console.log(`DEBUG: Nav item clicked: ${sectionId}`);
                    showSection(sectionId);
                    updateActiveNav(item);
                    updateBreadcrumbNav(sectionId);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth <= 768) {
                        toggleSidebar(false);
                    }
                });
            });

            // Section-specific navigation buttons are now used instead of footer buttons
        }

        // Setup breadcrumb navigation
        setupBreadcrumbNavigation();

        // Setup dashboard navigation (new)
        setupDashboardNavigation();

        console.log("DEBUG: Navigation setup complete.");
    }

    // --- Dashboard Navigation ---
    function setupDashboardNavigation() {
        const dashboardCards = document.querySelectorAll('.dashboard-card');
        const navButtons = document.querySelectorAll('.nav-button');
        const dashboardToggle = document.getElementById('dashboard-toggle');

        console.log("DEBUG: Setting up dashboard navigation...");
        console.log("DEBUG: Found dashboard cards:", dashboardCards.length);

        // Handle dashboard toggle button (removed as per user request)
        // Dashboard is now always accessible via home button

        // Handle dashboard home button dropdown
        const dashboardHomeBtn = document.getElementById('dashboard-home-btn');
        const dashboardNavDropdownMenu = document.getElementById('dashboard-nav-dropdown-menu');

        if (dashboardHomeBtn && dashboardNavDropdownMenu) {
            // Toggle dropdown on button click
            dashboardHomeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dashboardNavDropdownMenu.classList.toggle('active');
            });

            // Handle dropdown menu item clicks
            const dashboardDropdownItems = dashboardNavDropdownMenu.querySelectorAll('a');
            dashboardDropdownItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const sectionId = item.getAttribute('data-section');
                    navigateToDashboardSection(sectionId);
                    dashboardNavDropdownMenu.classList.remove('active'); // Close dropdown
                });
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dashboardHomeBtn.contains(e.target) && !dashboardNavDropdownMenu.contains(e.target)) {
                    dashboardNavDropdownMenu.classList.remove('active');
                }
            });
        }

        // Handle dashboard card clicks
        dashboardCards.forEach(card => {
            const sectionId = card.getAttribute('data-section');
            console.log(`DEBUG: Setting up card with section: ${sectionId}`);
            card.addEventListener('click', () => {
                console.log(`DEBUG: Dashboard card clicked: ${sectionId}`);

                // Update sidebar navigation active state
                navButtons.forEach(btn => btn.classList.remove('active'));
                const correspondingNavBtn = document.querySelector(`.nav-button[data-section="${sectionId}"]`);
                if (correspondingNavBtn) {
                    correspondingNavBtn.classList.add('active');
                }

                navigateToDashboardSection(sectionId);
            });
        });

        // Handle sidebar navigation button clicks
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.getAttribute('data-section');
                console.log(`DEBUG: Nav button clicked: ${sectionId}`);

                // Update active state for sidebar buttons
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                navigateToDashboardSection(sectionId);
            });
        });

        // Handle global header navigation buttons
        const globalNavButtons = document.querySelectorAll('.global-header .nav-btn');
        globalNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.getAttribute('data-section');
                console.log(`DEBUG: Global nav button clicked: ${sectionId}`);
                navigateToDashboardSection(sectionId);
            });
        });

        // Handle mobile footer navigation buttons
        const mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');
        mobileNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.getAttribute('data-section');
                console.log(`DEBUG: Mobile nav button clicked: ${sectionId}`);
                navigateToDashboardSection(sectionId);
                updateMobileNavActive(sectionId);
            });
        });

        // Handle section navigation buttons
        function setupSectionNavigation() {
            const prevButtons = document.querySelectorAll('.prev-btn');
            const nextButtons = document.querySelectorAll('.next-btn');
            const stepNavButtons = document.querySelectorAll('.step-nav-btn');

            prevButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetSection = button.getAttribute('data-section');
                    if (targetSection) {
                        showSection(targetSection);
                        updateActiveNav(document.querySelector(`[data-section="${targetSection}"]`));
                        updateBreadcrumbNav(targetSection);
                    }
                });
            });

            nextButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetSection = button.getAttribute('data-section');
                    if (targetSection) {
                        showSection(targetSection);
                        updateActiveNav(document.querySelector(`[data-section="${targetSection}"]`));
                        updateBreadcrumbNav(targetSection);
                    }
                });
            });

            // Handle step navigation buttons
            stepNavButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetSection = button.getAttribute('data-section');
                    if (targetSection && !button.disabled) {
                        showSection(targetSection);
                        updateActiveNav(document.querySelector(`[data-section="${targetSection}"]`));
                        updateBreadcrumbNav(targetSection);
                        // Close sidebar on mobile after selection
                        if (window.innerWidth <= 768) {
                            toggleSidebar(false);
                        }
                    }
                });
            });
        }

        // Call setupSectionNavigation after DOM is ready
        setupSectionNavigation();
    }

    function navigateToDashboardSection(sectionId) {
        // Update active state for all navigation buttons
        const allNavButtons = document.querySelectorAll('.nav-btn, .mobile-nav-btn, .nav-button');
        allNavButtons.forEach(btn => btn.classList.remove('active'));
        const activeNavBtn = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeNavBtn) {
            activeNavBtn.classList.add('active');
        }

        // Update mobile navigation active state
        updateMobileNavActive(sectionId);

        // Hide all sections first
        const allSections = document.querySelectorAll('.dashboard-section, .history-section');
        allSections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Hide sidebar by default
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }

        // Special handling for different sections
        if (sectionId === 'history-taking') {
            // Show sidebar and patient demographics section
            if (sidebar) {
                sidebar.style.display = 'block';
            }
            showSection('patient-info');
            updateActiveNav(document.querySelector('[data-section="patient-info"]'));
            showNotification('Clinical History Taking loaded.', 'info');

        } else if (sectionId === 'dashboard' || sectionId === 'home') {
            // Show dashboard (home page)
            const dashboardSection = document.getElementById('dashboard');
            if (dashboardSection) {
                dashboardSection.classList.add('active');
                dashboardSection.style.display = 'block';
            }
            showNotification('Welcome to MedHistoryApp!', 'info');

        } else if (sectionId === 'old-cases') {
            // Show saved cases section
            if (!getToken()) {
                showNotification('Please login to view saved cases.', 'warning');
                return;
            }
            const savedCasesSection = document.getElementById('saved-cases-section');
            if (savedCasesSection) {
                savedCasesSection.classList.add('active');
                savedCasesSection.style.display = 'block';
                // Fetch and display saved cases
                fetchSavedCases();
            }
            showNotification('Old Cases loaded.', 'info');

        } else if (sectionId === 'ai-tutor') {
            // Show AI tutor section and hide sidebar
            const sidebar = document.getElementById('main-sidebar');
            if (sidebar) {
                sidebar.style.display = 'none';
            }
            showSectionWithoutSidebar('ai-tutor');
            updateActiveNav(document.querySelector('[data-section="ai-tutor"]'));
            showNotification('AI Tutor loaded. Select a mode and start your session.', 'info');

        } else if (sectionId === 'x-rays') {
            // Show X-rays section
            const xraysSection = document.getElementById('x-rays-section');
            if (xraysSection) {
                xraysSection.classList.add('active');
                xraysSection.style.display = 'block';
            }
            showNotification('X-ray Tutor feature coming soon. This will include interactive X-ray interpretation practice.', 'info');
        } else if (sectionId === 'instruments') {
            // Show Instruments section
            const instrumentsSection = document.getElementById('instruments-section');
            if (instrumentsSection) {
                instrumentsSection.classList.add('active');
                instrumentsSection.style.display = 'block';
            }
            showNotification('Surgical Instruments feature coming soon. This will include instrument identification and usage practice.', 'info');
        } else if (sectionId === 'help') {
            // Show Help section
            const helpSection = document.getElementById('help-section');
            if (helpSection) {
                helpSection.classList.add('active');
                helpSection.style.display = 'block';
            }
            showNotification('Help & Support system coming soon. Get comprehensive assistance with using the app.', 'info');
        } else {
            // Default case for any unexpected section IDs
            console.log(`DEBUG: Unknown section ID: ${sectionId}`);
            showNotification(`Section "${sectionId}" is under development.`, 'info');
            // Default case for any unexpected section IDs
            console.log(`DEBUG: Unknown section ID: ${sectionId}`);
            showNotification(`Section "${sectionId}" is under development.`, 'info');
        }

        console.log(`DEBUG: Navigated to section: ${sectionId}`);

        // Show/hide mobile menu toggle based on section and screen size
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        if (mobileMenuToggle) {
            if (sectionId === 'history-taking' && window.innerWidth <= 768) {
                mobileMenuToggle.classList.add('show');
            } else {
                mobileMenuToggle.classList.remove('show');
            }
        }
    }

    // Function to hide dashboard
    function hideDashboard() {
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            dashboardSection.classList.remove('active');
            dashboardSection.style.display = 'none';
        }
    }

    function showSection(sectionId) {
        const sections = document.querySelectorAll('.history-section');
        sections.forEach(section => {
            section.style.display = section.id === sectionId ? 'block' : 'none';
        });

        // Show sidebar when in history mode
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) {
            sidebar.style.display = 'block';
        }

        // Scroll to top of section smoothly
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
              activeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        console.log(`DEBUG: Showing section: ${sectionId}`);
    }

    function showSectionWithoutSidebar(sectionId) {
        const sections = document.querySelectorAll('.history-section');
        sections.forEach(section => {
            section.style.display = section.id === sectionId ? 'block' : 'none';
        });

        // Keep sidebar hidden for standalone sections like AI Tutor
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }

        // Scroll to top of section smoothly
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
              activeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        console.log(`DEBUG: Showing section without sidebar: ${sectionId}`);
    }

    function updateActiveNav(activeItem) {
        const navItems = document.querySelectorAll('.history-nav li');
        navItems.forEach(item => item.classList.remove('active'));
        if (activeItem) {
            activeItem.classList.add('active');
            console.log(`DEBUG: Active nav set to: ${activeItem.getAttribute('data-section')}`);
        }
    }

    // --- Breadcrumb Navigation ---
    function setupBreadcrumbNavigation() {
        const breadcrumbItems = document.querySelectorAll('.breadcrumb-item');

        breadcrumbItems.forEach(item => {
            item.addEventListener('click', () => {
                const sectionId = item.getAttribute('data-section');
                console.log(`DEBUG: Breadcrumb item clicked: ${sectionId}`);
                showSection(sectionId);
                updateActiveNav(document.querySelector(`[data-section="${sectionId}"]`));
                updateBreadcrumbNav(sectionId);
                // Close sidebar on mobile after selection
                if (window.innerWidth <= 768) {
                    toggleSidebar(false);
                }
            });
        });

        console.log("DEBUG: Breadcrumb navigation setup complete.");
    }

    function updateBreadcrumbNav(activeSectionId) {
        const breadcrumbItems = document.querySelectorAll('.breadcrumb-item');
        const sectionOrder = [
            'patient-info', 'chief-complaint', 'present-illness', 'past-medical',
            'past-ortho', 'medications', 'allergies', 'family-history',
            'social-history', 'review-systems', 'examination', 'summary-diagnosis'
        ];

        const activeIndex = sectionOrder.indexOf(activeSectionId);

        breadcrumbItems.forEach((item, index) => {
            const sectionId = item.getAttribute('data-section');
            const sectionIndex = sectionOrder.indexOf(sectionId);

            // Remove all states first
            item.classList.remove('active', 'completed');

            if (sectionIndex === activeIndex) {
                item.classList.add('active');
            } else if (sectionIndex < activeIndex) {
                item.classList.add('completed');
            }
        });

        console.log(`DEBUG: Breadcrumb navigation updated for section: ${activeSectionId}`);
    }

    function updateMobileNavActive(activeSectionId) {
        const mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');

        mobileNavButtons.forEach(button => {
            const sectionId = button.getAttribute('data-section');
            button.classList.remove('active');

            // Handle special cases for section mapping
            if (activeSectionId === sectionId) {
                button.classList.add('active');
            } else if (activeSectionId === 'patient-info' && sectionId === 'history-taking') {
                // When in history taking mode, highlight the history button
                button.classList.add('active');
            } else if (activeSectionId === 'ai-tutor' && sectionId === 'ai-tutor') {
                // When in AI tutor section, highlight the AI tutor button
                button.classList.add('active');
            } else if (activeSectionId === 'saved-cases-section' && sectionId === 'old-cases') {
                // When in saved cases, highlight the cases button
                button.classList.add('active');
            }
        });

        console.log(`DEBUG: Mobile navigation updated for section: ${activeSectionId}`);
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
            updateBreadcrumbNav(prevSectionId);
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
            updateBreadcrumbNav(nextSectionId);
        } else {
            console.log("DEBUG: Already at the last section.");
        }
    }

    // Footer navigation buttons removed - using section-specific navigation instead

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

        // Close sidebar when clicking on content area on mobile
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleSidebar(false);
                }
            });
        }

        console.log("DEBUG: Mobile toggle setup complete.");
    }

    function toggleSidebar(forceState) {
        // forceState = true to open, false to close, undefined to toggle
        if (!sidebar || !overlay) return; // Ensure elements exist

        const currentState = sidebar.classList.contains('active');
        const newState = (forceState === undefined) ? !currentState : forceState;
        const contentArea = document.querySelector('.content-area');

        if (newState) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            if (window.innerWidth <= 768 && contentArea) {
                contentArea.style.marginLeft = '280px';
            }
            console.log("DEBUG: Sidebar opened.");
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            if (contentArea) {
                contentArea.style.marginLeft = '0px';
            }
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
                // Use closest() to find the nearest ancestor that is a hint icon,
                // including the element itself if it's the icon.
                const hintIcon = event.target.closest('.hint-icon'); 

                // Only proceed if the click target was actually the icon or inside it.
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
        document.getElementById('save-history')?.addEventListener('click', saveCase); // Renamed function call
        document.getElementById('export-pdf')?.addEventListener('click', exportToPDF);
        document.getElementById('new-history')?.addEventListener('click', confirmNewHistory);
        document.getElementById('add-medication')?.addEventListener('click', addMedicationEntry);
        document.getElementById('add-allergy')?.addEventListener('click', addAllergyEntry);
        // document.getElementById('load-dummy-case')?.addEventListener('click', loadDummyCase); // Removed listener
        document.getElementById('start-ai-viva')?.addEventListener('click', startAiProfessor); // Renamed function call
        document.getElementById('end-ai-viva')?.addEventListener('click', endViva); 
        document.getElementById('send-chat-message')?.addEventListener('click', sendStudentMessage);
        document.getElementById('load-selected-case')?.addEventListener('click', loadSelectedCase); // Add listener
        document.getElementById('delete-selected-case')?.addEventListener('click', deleteSelectedCase); // Add listener
        document.getElementById('view-case-summary')?.addEventListener('click', viewCaseSummary); // Add listener
        document.getElementById('start-ai-with-case')?.addEventListener('click', startAITutorWithCase); // Add listener
        document.getElementById('export-case-pdf')?.addEventListener('click', exportCaseSummaryPDF); // Add listener
        document.getElementById('close-summary-modal')?.addEventListener('click', closeSummaryModal); // Add listener
        document.getElementById('close-modal-btn')?.addEventListener('click', closeSummaryModal); // Add listener

        // Close modal when clicking outside
        const summaryModal = document.getElementById('case-summary-modal');
        if (summaryModal) {
            summaryModal.addEventListener('click', (e) => {
                if (e.target === summaryModal) {
                    closeSummaryModal();
                }
            });
        }

        // Profile menu functionality
        if (profileBtn) profileBtn.addEventListener('click', toggleProfileDropdown);
        if (profileSettings) profileSettings.addEventListener('click', handleProfileSettings);
        if (profileLogout) profileLogout.addEventListener('click', handleProfileLogout);
    
        // Auth buttons functionality
        document.getElementById('global-show-login')?.addEventListener('click', () => {
            toggleAuthForms(true);
            const authFormsDiv = document.getElementById('auth-forms');
            if (authFormsDiv) authFormsDiv.style.display = 'block';
        });
        document.getElementById('global-show-register')?.addEventListener('click', () => {
            toggleAuthForms(false);
            const authFormsDiv = document.getElementById('auth-forms');
            if (authFormsDiv) authFormsDiv.style.display = 'block';
        });

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

        // Add event listener to mode selection radio buttons to update button state
        document.querySelectorAll('.viva-mode-selection input[name="viva-mode"]').forEach(radio => {
            radio.addEventListener('change', updateVivaButtonState);
        });

        console.log("DEBUG: Button setup complete.");
    }

    // --- Dummy Case Loader --- (REMOVED - Handled by AI now)
    // function loadDummyCase() { ... }

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
        updateAuthUI(); // This will also fetch cases if logged in
        updateGlobalAuthUI(); // Update global header
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
                updateAuthUI(); // Will fetch cases now
                updateGlobalAuthUI(); // Update global header
                showNotification('Login successful!', 'success');
            } else {
                if (authMessage) {
                    authMessage.textContent = result.message || 'Login failed. Please try again.';
                    authMessage.classList.add('error');
                }
                currentUserToken = null;
                localStorage.removeItem('authToken');
                localStorage.removeItem('loggedInUsername');
                updateAuthUI(); // Update UI to logged-out state
            }
        } catch (error) {
            if (authMessage) {
                authMessage.textContent = 'Network error. Please try again later.';
                authMessage.classList.add('error');
            }
            currentUserToken = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('loggedInUsername');
            updateAuthUI(); // Update UI to logged-out state
        } finally {
            loginForm.querySelector('button[type="submit"]').disabled = false;
        }
    }

    async function handleRegister(event) {
        event.preventDefault();
        const registerForm = event.target;
        const username = document.getElementById('register-username')?.value.trim();
        const password = document.getElementById('register-password')?.value;
        const email = document.getElementById('register-email')?.value.trim(); // Get email
        const fullName = document.getElementById('register-full-name')?.value.trim(); // Get full name
        const studyYear = document.getElementById('register-study-year')?.value.trim(); // Get study year
        const institute = document.getElementById('register-institute')?.value.trim(); // Get institute
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
        // Add username length check
        if (username.length < 6) {
             if (authMessage) {
                 authMessage.textContent = 'Username must be at least 6 characters long.';
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
            
            // Construct payload with all fields
            const payload = { 
                username, 
                password, 
                email: email || null, // Send null if empty
                full_name: fullName || null, 
                study_year: studyYear || null, 
                institute: institute || null 
            };

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) 
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
        currentCaseId = null; // Clear current case ID on logout
        localStorage.removeItem('authToken');
        localStorage.removeItem('loggedInUsername');
        updateAuthUI(); // Will hide saved cases section
        showNotification('Logged out successfully.', 'info');
        // Optionally clear form data or prompt user
        // clearAllFields(); // Decide if logout should clear the current case
    }

    function updateAuthUI() {
        const authFormsDiv = document.getElementById('auth-forms');
        const userStatusDiv = document.getElementById('user-status');
        const loggedInUsernameSpan = document.getElementById('logged-in-username');
        const authMessage = document.getElementById('auth-message');
        const saveButton = document.getElementById('save-history');

        if (currentUserToken) {
            // Logged in
            if (authFormsDiv) authFormsDiv.style.display = 'none';
            if (userStatusDiv) userStatusDiv.style.display = 'block';
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = localStorage.getItem('loggedInUsername') || 'User';
            if (savedCasesSection) savedCasesSection.style.display = 'block'; // Show saved cases
            if (saveButton) saveButton.disabled = false; // Enable save button
            fetchSavedCases(); // Fetch user's cases
        } else {
            // Logged out
            if (authFormsDiv) authFormsDiv.style.display = 'none';
            if (userStatusDiv) userStatusDiv.style.display = 'none';
            if (savedCasesSection) savedCasesSection.style.display = 'none'; // Hide saved cases
            if (savedCasesListDiv) savedCasesListDiv.innerHTML = '<p class="no-cases-message">Login to view saved cases.</p>'; // Reset list
            if (loadCaseButton) loadCaseButton.disabled = true;
            if (deleteCaseButton) deleteCaseButton.disabled = true;
            if (document.getElementById('view-case-summary')) document.getElementById('view-case-summary').disabled = true;
            if (document.getElementById('start-ai-with-case')) document.getElementById('start-ai-with-case').disabled = true;
            if (saveButton) saveButton.disabled = true; // Disable save button
            // Auth forms will be shown when clicking login/signup buttons
        }
        updateVivaButtonState(); // Viva button might depend on login status
        updateProfileDisplay(); // Update profile name in header
        updateGlobalAuthUI(); // Update global header auth UI
          if (authMessage) authMessage.textContent = ''; // Clear message on UI update
    }

     function getToken() {
         // Ensure we always return the current token state
         return localStorage.getItem('authToken');
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


    // --- Data Handling (Save, Load, Collect, Populate, Clear - Updated for Backend) ---
    async function saveCase() { // Renamed from saveHistory, made async
        const token = getToken();
        if (!token) {
            showNotification('You must be logged in to save cases.', 'error');
            return;
        }
        console.log("DEBUG: Saving case to backend...");
        const caseData = collectFormData();
        const caseTitle = caseData['patient-name'] || `Case ${new Date().toLocaleString()}`; // Use patient name or timestamp for title

        const url = currentCaseId ? `/api/cases/${currentCaseId}` : '/api/cases';
        const method = currentCaseId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ case_title: caseTitle, case_data: caseData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const savedCase = await response.json();
            currentCaseId = savedCase.id; // Update current case ID after saving/updating
            showNotification(`Case '${savedCase.case_title}' saved successfully!`, 'success');
            console.log("DEBUG: Case saved/updated successfully. ID:", currentCaseId);
            fetchSavedCases(); // Refresh the list of saved cases
            updateVivaButtonState(); 
        } catch (error) {
            console.error("DEBUG: Error saving case:", error);
            showNotification(`Error saving case: ${error.message}`, 'error');
        }
    }

    async function fetchSavedCases() {
        const token = getToken();
        if (!token || !savedCasesListDiv) return;

        console.log("DEBUG: Fetching saved cases...");
        savedCasesListDiv.innerHTML = '<p>Loading saved cases...</p>'; // Show loading state

        try {
            const response = await fetch('/api/cases', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const cases = await response.json();
            displaySavedCases(cases);

        } catch (error) {
             console.error("DEBUG: Error fetching saved cases:", error);
             savedCasesListDiv.innerHTML = '<p class="error-message">Error loading cases.</p>';
             showNotification(`Error fetching cases: ${error.message}`, 'error');
        }
    }

    function displaySavedCases(cases) {
        if (!savedCasesListDiv) return;
        savedCasesListDiv.innerHTML = ''; // Clear previous list/message

        if (!cases || cases.length === 0) {
            savedCasesListDiv.innerHTML = '<p class="no-cases-message">No cases saved yet.</p>';
            loadCaseButton.disabled = true;
            deleteCaseButton.disabled = true;
            document.getElementById('view-case-summary').disabled = true;
            document.getElementById('start-ai-with-case').disabled = true;
            return;
        }

        const select = document.createElement('select');
        select.id = 'saved-case-select';
        select.size = Math.min(cases.length, 5); // Show a few items, make it scrollable via CSS if needed
        select.style.width = '100%'; // Make dropdown full width of container
        select.style.marginBottom = '10px';

        cases.forEach(caseItem => {
            const option = document.createElement('option');
            option.value = caseItem.id;
            // Format date nicely
            const updatedDate = new Date(caseItem.updated_at).toLocaleString();
            option.textContent = `${caseItem.case_title || `Case ${caseItem.id}`} (Saved: ${updatedDate})`;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            // Enable/disable buttons based on selection
            const hasSelection = !!select.value;
            loadCaseButton.disabled = !hasSelection;
            deleteCaseButton.disabled = !hasSelection;
            document.getElementById('view-case-summary').disabled = !hasSelection;
            document.getElementById('start-ai-with-case').disabled = !hasSelection;
        });

        savedCasesListDiv.appendChild(select);
        // Initially disable buttons until a selection is made
        loadCaseButton.disabled = true;
        deleteCaseButton.disabled = true;
        document.getElementById('view-case-summary').disabled = true;
        document.getElementById('start-ai-with-case').disabled = true;
    }

    async function loadSelectedCase() {
        const token = getToken();
        const selectElement = document.getElementById('saved-case-select');
        const caseId = selectElement?.value;

        if (!token || !caseId) {
            showNotification('Please select a case to load.', 'warning');
            return;
        }

        console.log(`DEBUG: Loading case ID: ${caseId}`);
        if (!confirm("Loading this case will overwrite any unsaved changes in the current form. Continue?")) {
            return;
        }

        try {
             const response = await fetch(`/api/cases/${caseId}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
             });

             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
             }

             const caseDetails = await response.json();
             populateFormData(caseDetails.case_data); // Populate form with the fetched data
             currentCaseId = caseDetails.id; // Set the current case ID

             // Navigate to history taking section
             navigateToDashboardSection('history-taking');

             showNotification(`Case '${caseDetails.case_title}' loaded successfully.`, 'success');
             updateVivaButtonState(); // Update buttons

        } catch (error) {
             console.error("DEBUG: Error loading selected case:", error);
             showNotification(`Error loading case: ${error.message}`, 'error');
        }
    }

    async function deleteSelectedCase() {
        const token = getToken();
        const selectElement = document.getElementById('saved-case-select');
        const caseId = selectElement?.value;
        const selectedOptionText = selectElement?.options[selectElement.selectedIndex]?.text || `Case ${caseId}`;


        if (!token || !caseId) {
            showNotification('Please select a case to delete.', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${selectedOptionText}"? This cannot be undone.`)) {
            return;
        }

        console.log(`DEBUG: Deleting case ID: ${caseId}`);

         try {
              const response = await fetch(`/api/cases/${caseId}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
              });

              if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
              }

              showNotification(`Case deleted successfully.`, 'success');
              if (currentCaseId === parseInt(caseId, 10)) {
                  currentCaseId = null; // Clear current ID if it was the deleted one
                  // Optionally clear the form or load default state?
                  // confirmNewHistory(); // Or just clear?
              }
              fetchSavedCases(); // Refresh the list

         } catch (error) {
              console.error("DEBUG: Error deleting selected case:", error);
              showNotification(`Error deleting case: ${error.message}`, 'error');
         }
    }

    // --- New Case Management Functions ---

    async function viewCaseSummary() {
        const token = getToken();
        const selectElement = document.getElementById('saved-case-select');
        const caseId = selectElement?.value;

        if (!token || !caseId) {
            showNotification('Please select a case to view.', 'warning');
            return;
        }

        console.log(`DEBUG: Viewing summary for case ID: ${caseId}`);

        try {
            const response = await fetch(`/api/cases/${caseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const caseDetails = await response.json();
            showCaseSummaryModal(caseDetails);

        } catch (error) {
            console.error("DEBUG: Error loading case for summary:", error);
            showNotification(`Error loading case: ${error.message}`, 'error');
        }
    }

    function showCaseSummaryModal(caseDetails) {
        const modal = document.getElementById('case-summary-modal');
        const modalTitle = document.getElementById('modal-case-title');
        const modalContent = document.getElementById('modal-case-content');

        // Set case title
        modalTitle.textContent = caseDetails.case_title || `Case ${caseDetails.id}`;

        // Format case content
        const caseData = caseDetails.case_data;
        let contentHTML = '';

        // Patient Info
        contentHTML += '<div class="case-summary-section">';
        contentHTML += '<h3>Patient Information</h3>';
        contentHTML += `<p><strong>Name:</strong> ${caseData['patient-name'] || 'Not specified'}</p>`;
        contentHTML += `<p><strong>Age:</strong> ${caseData['patient-age'] || 'Not specified'}</p>`;
        contentHTML += `<p><strong>Gender:</strong> ${caseData['patient-gender'] || 'Not specified'}</p>`;
        contentHTML += `<p><strong>Occupation:</strong> ${caseData['patient-occupation'] || 'Not specified'}</p>`;
        contentHTML += `<p><strong>Handedness:</strong> ${caseData['patient-handedness'] || 'Not specified'}</p>`;
        contentHTML += `<p><strong>Address:</strong> ${caseData['patient-address'] || 'Not specified'}</p>`;
        contentHTML += '</div>';

        // Chief Complaint
        if (caseData['cc-notes']) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Chief Complaint</h3>';
            contentHTML += `<p>${caseData['cc-notes']}</p>`;
            contentHTML += '</div>';
        }

        // History of Present Illness
        const hpiFields = ['hpi-onset', 'hpi-moi', 'hpi-location', 'hpi-character', 'hpi-aggravating', 'hpi-alleviating', 'hpi-severity'];
        const hpiContent = hpiFields.map(field => caseData[field]).filter(Boolean).join('\n\n');
        if (hpiContent) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>History of Present Illness</h3>';
            contentHTML += `<p>${hpiContent.replace(/\n/g, '<br>')}</p>`;
            contentHTML += '</div>';
        }

        // Past Medical History
        if (caseData['pmh-notes']) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Past Medical History</h3>';
            contentHTML += `<p>${caseData['pmh-notes']}</p>`;
            contentHTML += '</div>';
        }

        // Past Orthopedic History
        if (caseData['past-ortho-notes']) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Past Orthopedic History</h3>';
            contentHTML += `<p>${caseData['past-ortho-notes']}</p>`;
            contentHTML += '</div>';
        }

        // Medications
        if (caseData.medications && caseData.medications.length > 0) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Medications</h3>';
            caseData.medications.forEach(med => {
                if (med.name) {
                    contentHTML += `<p>${med.name} - ${med.dosage || 'N/A'} ${med.frequency || ''}</p>`;
                }
            });
            contentHTML += '</div>';
        }

        // Allergies
        if (caseData.allergies && caseData.allergies.length > 0) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Allergies</h3>';
            caseData.allergies.forEach(allergy => {
                if (allergy.name) {
                    contentHTML += `<p>${allergy.name} - ${allergy.reaction || 'Reaction not specified'}</p>`;
                }
            });
            contentHTML += '</div>';
        }

        // Family History
        if (caseData['fh-notes']) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Family History</h3>';
            contentHTML += `<p>${caseData['fh-notes']}</p>`;
            contentHTML += '</div>';
        }

        // Social History
        if (caseData['sh-notes']) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Social History</h3>';
            contentHTML += `<p>${caseData['sh-notes']}</p>`;
            contentHTML += '</div>';
        }

        // Review of Systems
        if (caseData['ros-notes']) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Review of Systems</h3>';
            contentHTML += `<p>${caseData['ros-notes']}</p>`;
            contentHTML += '</div>';
        }

        // Examination
        const examFields = ['exam-general', 'exam-look', 'exam-feel', 'exam-move', 'exam-special-tests', 'exam-neuro', 'exam-vascular'];
        const examContent = examFields.map(field => caseData[field]).filter(Boolean).join('\n\n');
        if (examContent) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Examination</h3>';
            contentHTML += `<p>${examContent.replace(/\n/g, '<br>')}</p>`;
            contentHTML += '</div>';
        }

        // Summary & Diagnosis
        const summaryFields = ['summary-clinical', 'summary-ddx-history', 'summary-ddx-exam', 'summary-provisional', 'summary-plan'];
        const summaryContent = summaryFields.map(field => caseData[field]).filter(Boolean).join('\n\n');
        if (summaryContent) {
            contentHTML += '<div class="case-summary-section">';
            contentHTML += '<h3>Summary & Diagnosis</h3>';
            contentHTML += `<p>${summaryContent.replace(/\n/g, '<br>')}</p>`;
            contentHTML += '</div>';
        }

        modalContent.innerHTML = contentHTML;
        modal.style.display = 'flex';
    }

    function closeSummaryModal() {
        const modal = document.getElementById('case-summary-modal');
        modal.style.display = 'none';
    }

    async function startAITutorWithCase() {
        const token = getToken();
        const selectElement = document.getElementById('saved-case-select');
        const caseId = selectElement?.value;

        if (!token || !caseId) {
            showNotification('Please select a case to start AI Tutor.', 'warning');
            return;
        }

        console.log(`DEBUG: Starting AI Tutor with case ID: ${caseId}`);

        try {
            const response = await fetch(`/api/cases/${caseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const caseDetails = await response.json();

            // Load case data into form
            populateFormData(caseDetails.case_data);
            currentCaseId = caseDetails.id;

            // Navigate to AI Tutor section
            navigateToDashboardSection('ai-tutor');

            showNotification(`Case loaded and AI Tutor started.`, 'success');

        } catch (error) {
            console.error("DEBUG: Error loading case for AI Tutor:", error);
            showNotification(`Error loading case: ${error.message}`, 'error');
        }
    }

    function exportCaseSummaryPDF() {
        const modal = document.getElementById('case-summary-modal');
        const modalTitle = document.getElementById('modal-case-title');
        const modalContent = document.getElementById('modal-case-content');

        if (typeof jspdf === 'undefined') {
            showNotification('Error: jsPDF library not loaded.', 'error');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        let yPos = 15;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 10;
        const lineHeight = 7;
        const sectionSpacing = 10;

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

        console.log("DEBUG: Generating case summary PDF...");

        // Title
        doc.setFontSize(16);
        yPos = addText(modalTitle.textContent, margin, yPos);
        doc.setFontSize(12);
        yPos += sectionSpacing;

        // Get all sections from modal
        const sections = modalContent.querySelectorAll('.case-summary-section');
        sections.forEach(section => {
            const title = section.querySelector('h3')?.textContent;
            if (title) {
                yPos = addSectionTitle(title, yPos);
                yPos += lineHeight / 2;

                const paragraphs = section.querySelectorAll('p');
                paragraphs.forEach(p => {
                    const text = p.textContent.trim();
                    if (text) {
                        // Split long text
                        const splitText = doc.splitTextToSize(text, doc.internal.pageSize.width - 2 * margin);
                        splitText.forEach(line => {
                            yPos = addText(line, margin, yPos);
                        });
                        yPos += lineHeight / 2;
                    }
                });
                yPos += sectionSpacing;
            }
        });

        const filename = `${modalTitle.textContent.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(filename);
        showNotification('Case summary PDF exported successfully!', 'success');
        console.log("DEBUG: Case summary PDF export complete.");
    }


    // --- Data Handling (Collect, Populate, Clear - Kept original logic, saveHistory modified) ---
    // loadSavedData() is removed as loading is now handled by fetchSavedCases/loadSelectedCase

    function collectFormData() {
        console.log("DEBUG: Collecting form data...");
        const data = {};
        const fields = document.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
        fields.forEach(field => {
            if (field.id) {
                // Ensure we don't collect sensitive fields like password if they exist outside auth forms
                if (!field.id.toLowerCase().includes('password') || field.closest('#auth-forms')) {
                     data[field.id] = field.value;
                }
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
            // Only add if name is present
            if (med.name && med.name.trim()) {
                medications.push(med);
            }
        });
        // If no named medications, return an empty array instead of [{name: ""...}]
        return medications.length > 0 ? medications : [];
    }

    function collectAllergies() {
        const allergies = [];
        document.querySelectorAll('.allergy-entry').forEach(entry => {
            const allergy = {
                name: entry.querySelector('[data-field="allergy-name"]')?.value || '',
                reaction: entry.querySelector('[data-field="allergy-reaction"]')?.value || ''
            };
             // Only add if name is present
            if (allergy.name && allergy.name.trim()) {
                allergies.push(allergy);
            }
        });
        // If no named allergies, return an empty array
        return allergies.length > 0 ? allergies : [];
    }

    function populateFormData(data) {
        console.log("DEBUG: Populating form data...");
        // Clear existing fields first before populating
        clearAllFields(false); // Pass false to prevent confirmation prompt

        Object.keys(data).forEach(key => {
            // Skip meta-fields like medications/allergies arrays here
            if (key === 'medications' || key === 'allergies') return;

            const field = document.getElementById(key);
            if (field) {
                 if (field.tagName === 'INPUT' && field.type === 'radio') {
                     // Handled below in radioGroups loop
                 } else if (field.tagName === 'INPUT' && field.type === 'checkbox') {
                     // Handle checkboxes if needed in the future
                     // field.checked = !!data[key]; 
                 } else {
                    // Handle text, number, textarea, select
                    field.value = data[key] || ''; // Set to empty string if null/undefined
                 }
            } else {
                // console.warn(`DEBUG: Field not found for key: ${key}`);
            }
        });

        // Handle radio buttons specifically
        const radioGroups = ['head_injury', 'neck_injury', 'chest_injury', 'abd_injury'];
        radioGroups.forEach(groupName => {
            // Uncheck all radios in the group first
            document.querySelectorAll(`input[name="${groupName}"]`).forEach(radio => radio.checked = false);
            // Check the correct one if data exists
            if (data[groupName]) {
                const radioToCheck = document.getElementById(`${groupName}_${data[groupName]}`);
                if (radioToCheck) radioToCheck.checked = true;
                 // Handle associated text input specifically for head injury
                 if (groupName === 'head_injury' && data[groupName] === 'yes' && data['head_injury_details']) {
                     const detailsField = document.getElementById('head_injury_details');
                     if (detailsField) detailsField.value = data['head_injury_details'];
                 } else if (groupName === 'head_injury') {
                      const detailsField = document.getElementById('head_injury_details');
                      if (detailsField) detailsField.value = ''; // Clear details if 'no' or null
                 }
            } else if (groupName === 'head_injury') {
                 const detailsField = document.getElementById('head_injury_details');
                 if (detailsField) detailsField.value = ''; // Clear details if group value is null
            }
        });

        // Populate dynamic lists (Meds/Allergies)
        const medContainer = document.querySelector('.medication-entries');
        medContainer.innerHTML = ''; // Clear existing entries
        medIdCounter = 0; // Reset counter
        if (data.medications && Array.isArray(data.medications) && data.medications.length > 0) {
            data.medications.forEach(medData => {
                medIdCounter++;
                medContainer.insertAdjacentHTML('beforeend', createMedicationEntryHTML(medIdCounter, medData));
            });
        } else {
             addMedicationEntry(); // Add one blank entry if none loaded
        }

        const allergyContainer = document.querySelector('.allergy-entries');
        allergyContainer.innerHTML = ''; // Clear existing entries
        allergyIdCounter = 0; // Reset counter
        if (data.allergies && Array.isArray(data.allergies) && data.allergies.length > 0) {
            data.allergies.forEach(allergyData => {
                allergyIdCounter++;
                allergyContainer.insertAdjacentHTML('beforeend', createAllergyEntryHTML(allergyIdCounter, allergyData));
            });
        } else {
             addAllergyEntry(); // Add one blank entry if none loaded
        }
        console.log("DEBUG: Form data population complete.");
    }

    function confirmNewHistory() {
        // Add check if current form has unsaved changes compared to loaded case? (More complex)
        if (confirm("Are you sure you want to start a new case? Any unsaved changes will be lost.")) {
            console.log("DEBUG: Starting new history confirmed.");
            clearAllFields(false); // Clear fields without prompt
            currentCaseId = null; // Reset current case ID
            localStorage.removeItem('orthoHistoryData'); // Clear any old localStorage data just in case
            showNotification('New case started. All fields cleared.', 'info');
            updateVivaButtonState(); 
             const firstNavItem = document.querySelector('.history-nav li[data-section]');
             if (firstNavItem) {
                 const firstSectionId = firstNavItem.getAttribute('data-section');
                 showSection(firstSectionId);
                 updateActiveNav(firstNavItem);
             }
        } else {
             console.log("DEBUG: Starting new history cancelled.");
        }
    }

    function clearAllFields(promptUser = true) { // Added optional parameter
        if (promptUser && !confirm("Clear all fields? This cannot be undone.")) {
            return; // Don't clear if user cancels prompt
        }
        console.log("DEBUG: Clearing all fields...");
        const fields = document.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
        fields.forEach(field => { field.value = ''; });
        const radios = document.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => radio.checked = false);
        document.querySelector('.medication-entries').innerHTML = '';
        document.querySelector('.allergy-entries').innerHTML = '';
        medIdCounter = 0;
        allergyIdCounter = 0;
        ensureInitialEntries(); // Ensure blank entries are present
        currentCaseId = null; // Reset current case ID when clearing
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

        // Enable Start button only if logged in (for dummy/learning) or if case data exists/loaded (for exam)
        const hasDataForExam = currentCaseId || document.getElementById('cc-notes')?.value.trim() !== '';
        const isLoggedIn = !!getToken(); 
        
        if (startButton) {
            const selectedMode = document.querySelector('input[name="viva-mode"]:checked')?.value || 'exam';
            let isDisabled = true; // Start assuming disabled

            if (!vivaInProgress && isLoggedIn) { // Can only start if logged in and not already in progress
                if (selectedMode === 'exam') {
                    isDisabled = !hasDataForExam; // Exam mode requires data
                } else { // Learning or Dummy mode only require login
                    isDisabled = false; 
                }
            } else if (vivaInProgress) {
                isDisabled = true; // Always disabled if viva is in progress
            } else { // Not logged in
                 isDisabled = true;
            }
            startButton.disabled = isDisabled;
        }


        // Hide mode selection during viva
        if (vivaModeSelection) vivaModeSelection.style.display = vivaInProgress ? 'none' : 'block';

        // Control visibility/state of chat elements
        // Note: We no longer hide the chat section itself, it's treated as a regular section
        // if (chatSection) chatSection.style.display = vivaInProgress ? 'block' : 'none'; 
        if (endButton) endButton.style.display = vivaInProgress ? 'inline-block' : 'none'; // Show end button only during viva
        if (chatInput) chatInput.disabled = !vivaInProgress;
        if (sendButton) sendButton.disabled = !vivaInProgress;

         console.log(`DEBUG: Viva button state updated. InProgress: ${vivaInProgress}, HasDataForExam: ${hasDataForExam}, IsLoggedIn: ${isLoggedIn}`);
    }

    // Renamed from startViva
    function startAiProfessor() { 
        if (vivaInProgress) return;

        // Determine selected mode
        currentVivaMode = document.querySelector('input[name="viva-mode"]:checked')?.value || 'exam'; // Update global state
        console.log(`DEBUG: Starting AI Tutor Session in ${currentVivaMode} mode...`);

        vivaInProgress = true;
        isWaitingForDummyCaseType = false; // Reset flag
        aiConversationHistory = []; // Reset history

        // Prepare initial context for AI
        const caseSummary = collectFormData(); // Get current data
        let initialPrompt = '';
        let welcomeMessage = '';

        if (currentVivaMode === 'exam') {
            const studentUsername = localStorage.getItem('loggedInUsername') || 'student'; // Get student username
            welcomeMessage = `Welcome ${studentUsername}! This is the AI Viva Exam. I will ask questions based on your case entry. Preparing first question...`; // Updated welcome
            // --- Exam Mode Prompt ---
            // Corrected prompt without duplicated content
            initialPrompt = `You are an AI Orthopedics Examiner simulating a final-year MBBS viva.
The user you are interacting with is the student, named '${studentUsername}'.
You will be questioning the student based on the patient case data provided below.

🎯 Key Instructions:
1.  **Role:** Act as a clinical examiner. Address the user as '${studentUsername}' or 'student'.
2.  **Patient:** Refer to the data provided as 'the patient's case', 'this patient', or 'your patient'. **Do NOT address the student using the patient's name.**
3.  **Questions:** Ask 7 to 10 structured viva questions based *only* on the provided patient case data. Ask ONE question at a time and wait for the student's reply.
4.  **Flow:** Begin with broad questions (e.g., summarizing the case, initial assessment, provisional diagnosis) and then delve deeper into:
    *   Specific history details (clarifying ambiguities or omissions).
    *   Examination findings and their significance.
    *   Relevant investigations (choice, interpretation).
    *   Stepwise management (conservative/surgical options, reasoning).
    *   Potential complications.
    *   Related orthopedic principles (e.g., classifications, fracture healing, compartment syndrome).
5.  **Style:** Maintain a professional, clinical, and mildly probing tone. If the student struggles, guide them with clarifying questions rather than giving the answer directly.
6.  **Ending:** After 7-10 questions, conclude the initial round by asking the student if they wish to continue with more questions.

--- Patient Case Data ---
${JSON.stringify(caseSummary, null, 2)}
--- End Patient Case Data ---

Start the examination now by greeting the student ('${studentUsername}') and asking your first question about the patient's case based on the data provided.`;
            // --- End Exam Mode Prompt ---
        } else if (currentVivaMode === 'learning') {
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
        } else { // Dummy Case Mode
             welcomeMessage = 'Welcome to Dummy Case Mode! Please describe the type of case you want me to generate (e.g., "fractured tibia in a 25 year old male", "polytrauma", "pediatric osteomyelitis").';
             // --- Dummy Case Initial Prompt ---
             initialPrompt = `You are an AI assistant helping a medical student generate a dummy orthopedic case for practice.
Ask the student what type of case they would like to generate. Provide examples like "fractured tibia in a 25 year old male", "polytrauma with multiple fractures", or "chronic osteomyelitis in a 7 year old".
Wait for the user's response specifying the case type.`;
             // --- End Dummy Case Initial Prompt ---
             isWaitingForDummyCaseType = true; // Set flag: waiting for user to specify case
        }


        aiConversationHistory.push({ role: 'system', content: initialPrompt });

        // Clear chat window and show appropriate welcome message
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `<div class="message ai">${welcomeMessage}</div>`; // Use mode-specific welcome

        updateVivaButtonState();
        showNotification(`AI ${currentVivaMode} Session started!`, 'info');
        // startVivaTimer(VIVA_INITIAL_DURATION); // Start the timer - Keep commented out for now

        // Show the AI chat section using navigation logic
        showSection('ai-viva-chat');
        updateActiveNav(document.querySelector('[data-section="ai-viva-chat"]'));


        // Get the first AI response (examiner question, tutor waiting message, or dummy case prompt)
        // Only call getAIResponse immediately if it's exam mode or the initial dummy prompt
        if (currentVivaMode === 'exam' || currentVivaMode === 'dummy') {
             getAIResponse(); // AI asks first question in exam mode, or asks for case type in dummy mode
        }
        // In learning mode, the AI waits for the user's first question via the initial prompt.
    }

    function endViva() {
        if (!vivaInProgress) return;
        console.log("DEBUG: Ending AI Viva.");
        vivaInProgress = false;
        isWaitingForDummyCaseType = false; // Reset flag
        // stopVivaTimer(); // Stop the timer - Keep commented out for now
        addMessageToChat("AI session ended.", "system");
        updateVivaButtonState();
        showNotification('AI Session ended.', 'info');
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
            
            // Check if we are in dummy case mode and waiting for the case type
            if (currentVivaMode === 'dummy' && isWaitingForDummyCaseType) {
                console.log("DEBUG: Received dummy case type request:", messageText);
                isWaitingForDummyCaseType = false; // No longer waiting for type

                // Construct a new prompt asking the AI to generate the case
                const generationPrompt = `Generate a detailed, realistic orthopedic case history and examination findings suitable for a final MBBS viva, based on the following user request: "${messageText}". 
Structure the output clearly, ideally using headings similar to the app sections (Demographics, Chief Complaint, HPI, PMH, Past Ortho, Meds, Allergies, Family History, Social History, ROS, Examination [General, Look, Feel, Move, Special Tests, Neuro, Vascular], Summary, Differentials, Provisional Diagnosis, Plan). 
Format the output so it can be easily parsed, perhaps using markdown-like headings (# Heading) or key-value pairs. Ensure all relevant fields are included.`;
                
                // Add the user's request and the generation prompt to history
                aiConversationHistory.push({ role: 'user', content: messageText }); 
                aiConversationHistory.push({ role: 'system', content: generationPrompt }); // Add the generation instruction

                addMessageToChat("Generating dummy case based on your request...", "system", true);

            } else {
                 // Normal message flow for Exam or Learning mode, or subsequent messages in Dummy mode
                 aiConversationHistory.push({ role: 'user', content: messageText });
            }

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
             const sanitizedText = text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>'); // Corrected HTML entity escaping
             messageDiv.innerHTML = sanitizedText.replace(/\n/g, '<br>'); // Render newlines
         }
         chatMessages.appendChild(messageDiv);
         chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom

         // Attempt to parse and populate form if it's an AI response in dummy mode *after* generation was requested
         if (sender === 'ai' && currentVivaMode === 'dummy' && !isWaitingForDummyCaseType && !isSystem) {
             tryToPopulateDummyCase(text);
         }
     }

     // --- Attempt to parse AI response and populate form for dummy case ---
     function tryToPopulateDummyCase(aiResponseText) {
         console.log("DEBUG: Attempting to parse AI response for dummy case data...");
         // Basic parsing attempt: Look for key phrases or simple structures.
         // This is highly dependent on how the AI formats its output and might need significant refinement.
         // Example: Assume AI uses "Key: Value" pairs or Markdown headings.
         const lines = aiResponseText.split('\n');
         const parsedData = {};
         let currentKey = null; // Keep track of multi-line values if needed

         // Simple Key: Value parsing (adjust based on observed AI output)
         lines.forEach(line => {
             const parts = line.split(':');
             if (parts.length >= 2) {
                 // Normalize key: lowercase, replace spaces/symbols with hyphens, remove trailing punctuation
                 let key = parts[0].trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[()]/g, ''); 
                 const value = parts.slice(1).join(':').trim();
                 
                 // Map common variations to form IDs (needs expansion and refinement)
                 if (key.includes('patient-name')) parsedData['patient-name'] = value;
                 else if (key.includes('age')) parsedData['patient-age'] = value;
                 else if (key.includes('gender')) parsedData['patient-gender'] = value.toLowerCase();
                 else if (key.includes('occupation')) parsedData['patient-occupation'] = value;
                 else if (key.includes('chief-complaint')) parsedData['cc-notes'] = value;
                 else if (key.includes('hpi') || key.includes('present-illness')) parsedData['present-illness'] = (parsedData['present-illness'] || '') + value + '\n'; // Append HPI parts
                 else if (key.includes('pmh') || key.includes('past-medical')) parsedData['pmh-notes'] = value;
                 else if (key.includes('past-ortho')) parsedData['past-ortho-notes'] = value;
                 else if (key.includes('medications')) parsedData['medications'] = [{ name: value, dosage: "", frequency: "" }]; // Basic handling
                 else if (key.includes('allergies')) parsedData['allergies'] = [{ name: value, reaction: "" }]; // Basic handling
                 else if (key.includes('family-history')) parsedData['fh-notes'] = value;
                 else if (key.includes('social-history')) parsedData['sh-notes'] = value;
                 else if (key.includes('review-of-systems')) parsedData['ros-notes'] = value;
                 else if (key.includes('general-inspection')) parsedData['exam-general'] = value;
                 else if (key.includes('look') || key.includes('inspection')) parsedData['exam-look'] = value;
                 else if (key.includes('feel') || key.includes('palpation')) parsedData['exam-feel'] = value;
                 else if (key.includes('move') || key.includes('range-of-motion')) parsedData['exam-move'] = value;
                 else if (key.includes('special-tests')) parsedData['exam-special-tests'] = value;
                 else if (key.includes('neuro') || key.includes('neurological')) parsedData['exam-neuro'] = value;
                 else if (key.includes('vascular')) parsedData['exam-vascular'] = value;
                 else if (key.includes('summary')) parsedData['summary-clinical'] = (parsedData['summary-clinical'] || '') + value + '\n';
                 else if (key.includes('plan')) parsedData['summary-plan'] = value;
                 else if (key.includes('provisional-diagnosis')) parsedData['summary-provisional'] = value;
                 else if (key.includes('differential-diagnosis')) parsedData['summary-ddx-exam'] = value; // Simple mapping for now

             }
         });

         // Check if we parsed *any* data that looks like case data
         if (Object.keys(parsedData).length > 2) { // Heuristic: if more than a couple of fields were parsed
             console.log("DEBUG: Parsed some dummy case data, attempting to populate form:", parsedData);
             if (confirm("AI generated a case. Load it into the form? This will overwrite current data.")) {
                 populateFormData(parsedData); // Use the parsed data
                 showNotification('AI-generated dummy case loaded into form.', 'success');
                 currentCaseId = null; // Ensure this is treated as a new, unsaved case
                 updateVivaButtonState(); // Update button states
                 // Optionally switch back to learning/exam mode or end session?
                 // endViva(); // Or keep session active? Decide UX.
             } else {
                  console.log("DEBUG: User cancelled loading AI-generated case.");
             }
         } else {
             console.log("DEBUG: Could not parse structured case data from AI response.");
             // AI response was likely just text, already displayed by addMessageToChat.
         }
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
                 addMessageToChat(aiMessage, "ai"); // This will now also check for dummy case data
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
            // Always re-enable input regardless of success or failure, unless waiting for case type
            if (!isWaitingForDummyCaseType) {
                const chatInput = document.getElementById('chat-input');
                const sendButton = document.getElementById('send-chat-message');
                if (chatInput) chatInput.disabled = false;
                if (sendButton) sendButton.disabled = false;
                if (chatInput) chatInput.focus();
            }
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

    // --- AI Tutor Functions ---
    let aiTutorMode = null;
    let aiTutorActive = false;
    let aiTutorTimer = null;
    let aiTutorTimeRemaining = 0;

    function setupAITutor() {
        console.log("DEBUG: Setting up AI Tutor functionality...");

        // Mode selection buttons
        document.getElementById('start-exam-mode')?.addEventListener('click', () => showModePopup('exam'));
        document.getElementById('start-learning-mode')?.addEventListener('click', () => showModePopup('learning'));
        document.getElementById('start-dummy-mode')?.addEventListener('click', () => startAIMode('dummy'));

        // Chat controls
        document.getElementById('ai-send-message')?.addEventListener('click', sendAIMessage);
        document.getElementById('end-ai-session')?.addEventListener('click', endAISession);
        document.getElementById('back-to-modes')?.addEventListener('click', backToModes);

        // Case selection modal
        document.getElementById('close-case-modal')?.addEventListener('click', () => {
            document.getElementById('case-selection-modal').style.display = 'none';
        });
        document.getElementById('use-current-case')?.addEventListener('click', () => useCurrentCase());
        document.getElementById('load-saved-case')?.addEventListener('click', () => loadSavedCaseForAI());

        // Mode popup
        document.getElementById('close-mode-popup')?.addEventListener('click', () => {
            document.getElementById('mode-popup').style.display = 'none';
        });
        document.getElementById('popup-go-to-history')?.addEventListener('click', () => {
            const popup = document.getElementById('mode-popup');
            const mode = popup.dataset.pendingMode;
            popup.style.display = 'none';
            navigateToDashboardSection('history-taking');
            showNotification(`Please fill in your case details, then return to AI Tutor to start ${mode} mode.`, 'info');
        });
        document.getElementById('popup-load-case')?.addEventListener('click', () => {
            const popup = document.getElementById('mode-popup');
            const mode = popup.dataset.pendingMode;
            popup.style.display = 'none';
            navigateToDashboardSection('old-cases');
            showNotification(`Please select a saved case, then return to AI Tutor to start ${mode} mode.`, 'info');
        });

        // Enter key for chat input
        document.getElementById('ai-chat-input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });

        console.log("DEBUG: AI Tutor setup complete.");
    }

    function showModePopup(mode) {
        const popup = document.getElementById('mode-popup');
        const title = document.getElementById('mode-popup-title');
        const message = document.getElementById('mode-popup-message');

        if (popup && title && message) {
            title.textContent = mode === 'exam' ? 'Exam Mode' : 'Learning Mode';
            message.textContent = mode === 'exam'
                ? 'To start Exam Mode, you need a case. Choose an option below:'
                : 'To start Learning Mode, you can either use your current case or start fresh. Choose an option below:';

            popup.style.display = 'flex';

            // Store the mode for when user makes a choice
            popup.dataset.pendingMode = mode;
        }
    }

    function startAIMode(mode) {
        console.log(`DEBUG: Starting AI Tutor in ${mode} mode...`);
        aiTutorMode = mode;
        aiTutorActive = true;

        // Hide mode selection, show chat interface
        document.querySelector('.ai-mode-selection').style.display = 'none';
        document.getElementById('ai-chat-interface').style.display = 'block';

        // Update chat title
        const titleElement = document.getElementById('chat-mode-title');
        if (titleElement) {
            switch(mode) {
                case 'exam':
                    titleElement.textContent = 'AI Exam Mode';
                    break;
                case 'learning':
                    titleElement.textContent = 'AI Learning Mode';
                    break;
                case 'dummy':
                    titleElement.textContent = 'AI Dummy Case Mode';
                    break;
            }
        }

        // Clear previous messages
        const chatMessages = document.getElementById('ai-chat-messages');
        chatMessages.innerHTML = '';

        // Enable chat input
        const chatInput = document.getElementById('ai-chat-input');
        const sendButton = document.getElementById('ai-send-message');
        if (chatInput) chatInput.disabled = false;
        if (sendButton) sendButton.disabled = false;

        // Start appropriate mode
        switch(mode) {
            case 'exam':
                startExamMode();
                break;
            case 'learning':
                startLearningMode();
                break;
            case 'dummy':
                startDummyMode();
                break;
        }

        showNotification(`AI ${mode} mode started!`, 'success');
    }

    function startExamMode() {
        // Show case selection modal
        document.getElementById('case-selection-modal').style.display = 'flex';
    }

    function startLearningMode() {
        addAIMessage("Welcome to Learning Mode! I'm here to help you learn about orthopedic history taking, examination, investigations, and management. What would you like to know?", "ai");
        document.getElementById('ai-chat-input').focus();
    }

    function startDummyMode() {
        addAIMessage("Welcome to Dummy Case Mode! Describe the type of orthopedic case you'd like me to generate. For example: 'fractured tibia in a 25 year old male', 'polytrauma', or 'pediatric osteomyelitis'.", "ai");
        document.getElementById('ai-chat-input').focus();
    }

    function useCurrentCase() {
        document.getElementById('case-selection-modal').style.display = 'none';

        const caseData = collectFormData();
        if (!caseData['patient-name'] && !caseData['cc-notes']) {
            showNotification('Please fill in at least patient name and chief complaint before starting exam mode.', 'warning');
            backToModes();
            return;
        }

        // Start exam with current case
        const welcomeMessage = `Welcome to Exam Mode! I'll ask you questions based on your current case. Let's begin with the first question...`;
        addAIMessage(welcomeMessage, "ai");

        // Start timer
        startAITimer(7 * 60); // 7 minutes

        // Get first AI question
        getAIExamQuestion(caseData);
    }

    function loadSavedCaseForAI() {
        document.getElementById('case-selection-modal').style.display = 'none';
        navigateToDashboardSection('old-cases');
        showNotification('Please select a saved case to use with AI Tutor.', 'info');
    }

    function sendAIMessage() {
        if (!aiTutorActive) return;

        const chatInput = document.getElementById('ai-chat-input');
        const messageText = chatInput.value.trim();

        if (messageText) {
            addAIMessage(messageText, "student");
            chatInput.value = '';

            // Handle different modes
            switch(aiTutorMode) {
                case 'learning':
                    handleLearningMode(messageText);
                    break;
                case 'dummy':
                    handleDummyMode(messageText);
                    break;
                case 'exam':
                    handleExamMode(messageText);
                    break;
            }
        }
    }

    function handleLearningMode(message) {
        // Add typing indicator
        addTypingIndicator();

        // Simulate AI response (replace with actual API call)
        setTimeout(() => {
            removeTypingIndicator();
            const responses = [
                "That's a great question! Let me explain...",
                "In orthopedic practice, we typically...",
                "The key principles to remember are...",
                "Based on the latest guidelines...",
                "Let me walk you through this step by step..."
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addAIMessage(randomResponse + " This is a placeholder response. The actual AI integration would provide detailed, accurate medical information.", "ai");
        }, 1500);
    }

    function handleDummyMode(message) {
        addTypingIndicator();

        setTimeout(() => {
            removeTypingIndicator();
            const dummyResponse = `Generating a dummy case based on: "${message}"

**Patient Demographics:**
- Name: John Smith
- Age: 28 years
- Gender: Male
- Occupation: Construction worker

**Chief Complaint:**
"Severe left knee pain and swelling after falling from scaffolding 3 days ago"

**History of Present Illness:**
- Sudden onset of pain while working
- Unable to bear weight on left leg
- Pain described as sharp, 8/10 severity
- Swelling developed immediately after injury

Would you like me to continue with the full case details, or would you prefer to start taking history on this patient?`;

            addAIMessage(dummyResponse, "ai");
        }, 2000);
    }

    function handleExamMode(message) {
        addTypingIndicator();

        setTimeout(() => {
            removeTypingIndicator();
            const examResponses = [
                "Good answer! Now, can you tell me about the mechanism of injury in more detail?",
                "That's correct. What would be your next step in the physical examination?",
                "Excellent point. How would you differentiate this from other possible diagnoses?",
                "Well done! What investigations would you order at this stage?",
                "Good thinking. What would be your initial management plan?"
            ];
            const randomResponse = examResponses[Math.floor(Math.random() * examResponses.length)];
            addAIMessage(randomResponse, "ai");
        }, 1500);
    }

    function addAIMessage(text, sender, isSystem = false) {
        const chatMessages = document.getElementById('ai-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        if (isSystem) {
            messageDiv.classList.add('system');
        }
        messageDiv.innerHTML = text.replace(/\n/g, '<br>');
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const chatMessages = document.getElementById('ai-chat-messages');
        const indicator = document.createElement('div');
        indicator.className = 'message ai typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        indicator.id = 'typing-indicator';
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function startAITimer(duration) {
        aiTutorTimeRemaining = duration;
        updateAITimerDisplay();

        aiTutorTimer = setInterval(() => {
            aiTutorTimeRemaining--;
            updateAITimerDisplay();

            if (aiTutorTimeRemaining <= 0) {
                clearInterval(aiTutorTimer);
                showAIContinuePrompt();
            }
        }, 1000);
    }

    function updateAITimerDisplay() {
        const timerDisplay = document.getElementById('chat-timer-display');
        if (timerDisplay) {
            const minutes = Math.floor(aiTutorTimeRemaining / 60);
            const seconds = aiTutorTimeRemaining % 60;
            timerDisplay.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    function showAIContinuePrompt() {
        const promptDiv = document.getElementById('ai-continue-prompt');
        if (promptDiv) {
            promptDiv.style.display = 'block';
        }

        // Add event listeners for continue buttons
        document.getElementById('ai-continue-btn')?.addEventListener('click', () => {
            promptDiv.style.display = 'none';
            startAITimer(5 * 60); // Add 5 more minutes
            showNotification('Extended session by 5 minutes!', 'info');
        });

        document.getElementById('ai-force-end-btn')?.addEventListener('click', () => {
            endAISession();
        });
    }

    function endAISession() {
        console.log("DEBUG: Ending AI Tutor session...");
        aiTutorActive = false;
        aiTutorMode = null;

        if (aiTutorTimer) {
            clearInterval(aiTutorTimer);
            aiTutorTimer = null;
        }

        // Reset UI
        document.querySelector('.ai-mode-selection').style.display = 'block';
        document.getElementById('ai-chat-interface').style.display = 'none';

        // Disable chat input
        const chatInput = document.getElementById('ai-chat-input');
        const sendButton = document.getElementById('ai-send-message');
        if (chatInput) chatInput.disabled = true;
        if (sendButton) sendButton.disabled = true;

        // Hide continue prompt
        const promptDiv = document.getElementById('ai-continue-prompt');
        if (promptDiv) {
            promptDiv.style.display = 'none';
        }

        showNotification('AI Tutor session ended.', 'info');
    }

    function backToModes() {
        endAISession();
        // The endAISession function already handles showing the mode selection
    }

    function getAIExamQuestion(caseData) {
        // This would be replaced with actual API call to get AI question
        setTimeout(() => {
            const questions = [
                "Can you summarize the patient's chief complaint and duration of symptoms?",
                "What was the mechanism of injury in this case?",
                "What are the key points you'd want to cover in the history of present illness?",
                "What would be your differential diagnosis at this stage?",
                "What physical examination findings would you expect?"
            ];
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            addAIMessage(randomQuestion, "ai");
        }, 2000);
    }

    // --- Profile Menu Functions ---
    function toggleProfileDropdown() {
        if (profileDropdown) {
            profileDropdown.classList.toggle('active');
        }
    }

    function handleProfileSettings(event) {
        event.preventDefault();
        showNotification('Settings feature coming soon!', 'info');
        toggleProfileDropdown();
    }

    function handleProfileLogout(event) {
        event.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            handleLogout();
            toggleProfileDropdown();
        }
    }

    // Update profile name when user logs in
    function updateProfileDisplay() {
        if (profileName && currentUserToken) {
            const username = localStorage.getItem('loggedInUsername') || 'Student';
            profileName.textContent = username;
        } else if (profileName) {
            profileName.textContent = 'Student';
        }
    }

    // Update global header auth UI
    function updateGlobalAuthUI() {
        const profileMenu = document.getElementById('global-profile-menu');
        const authButtons = document.getElementById('global-auth-buttons');

        if (currentUserToken) {
            // Logged in: show profile menu, hide auth buttons
            if (profileMenu) profileMenu.style.display = 'block';
            if (authButtons) authButtons.style.display = 'none';
        } else {
            // Logged out: hide profile menu, show auth buttons
            if (profileMenu) profileMenu.style.display = 'none';
            if (authButtons) authButtons.style.display = 'flex';
        }
    }

    // Close profile dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (profileDropdown && profileBtn && !profileBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
            profileDropdown.classList.remove('active');
        }
    });

}); // End DOMContentLoaded
