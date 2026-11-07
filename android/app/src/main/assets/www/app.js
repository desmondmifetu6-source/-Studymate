/**
 * StudyMate - iPhone Liquidity Minimalist Offline Engine
 * Clean Onboarding & User Setup First | Blank-Slate Workspace
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'studymate_liquid_v2';
  const LEGACY_STORAGE_KEY = 'studypulse_liquid_v2';

  // State Structure
  let state = {
    user: {
      name: '',
      level: 'Senior High School (SHS)',
      track: 'General Science',
      subjects: [],
      prepGoal: 60,
      isSetupComplete: false
    },
    activeDay: new Date().getDay() === 0 ? 0 : new Date().getDay(), // 0=Sun, 1=Mon, ...
    activeFilter: 'all',
    timetable: [],
    assignments: [],
    dailyGoals: [],
    habits: [],
    customTimerPresets: [],
    studyStats: {
      todayMinutes: 0,
      lastDate: new Date().toISOString().split('T')[0]
    }
  };

  // Preset subject maps by track
  const TRACK_SUBJECTS = {
    'General Science': 'Core Mathematics, Integrated Science, English Language, Social Studies, Elective Mathematics, Physics, Chemistry, Biology',
    'General Arts': 'Core Mathematics, Integrated Science, English Language, Social Studies, Government, Literature in English, Economics, History',
    'Business': 'Core Mathematics, Integrated Science, English Language, Social Studies, Financial Accounting, Business Management, Cost Accounting, Economics',
    'Visual Arts': 'Core Mathematics, Integrated Science, English Language, Social Studies, Graphic Design, Picture Making, Textiles',
    'Home Economics': 'Core Mathematics, Integrated Science, English Language, Social Studies, Food & Nutrition, Clothing & Textiles, Management in Living',
    'Custom': ''
  };

  function getDefaultKitItems() {
    return [
      { id: 'kit-1', name: 'Mathematical Set (Compass & Divider)', subject: 'Core Mathematics', packed: false },
      { id: 'kit-2', name: 'Graph Book (WAEC Standard Grid)', subject: 'Core Mathematics', packed: false },
      { id: 'kit-3', name: 'Scientific Calculator (Casio fx-991)', subject: 'Core Mathematics', packed: false },
      { id: 'kit-4', name: '30cm Shatterproof Ruler & Geometry Kit', subject: 'General', packed: false },
      { id: 'kit-5', name: 'Science Practical Record Book / Lab Manual', subject: 'Integrated Science', packed: false },
      { id: 'kit-6', name: 'Pen & Pencil Case (HB Pencils, Eraser, Blue/Black Pens)', subject: 'General', packed: false }
    ];
  }

  function getDefaultExamTarget() {
    const now = new Date();
    const targetYear = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
    return {
      name: 'WASSCE',
      date: `${targetYear}-05-10`,
      dailyTargetHours: 3
    };
  }

  function loadState() {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      }
      if (saved) {
        state = JSON.parse(saved);
        if (!state.customTimerPresets) state.customTimerPresets = [];
        if (!state.examTarget) state.examTarget = getDefaultExamTarget();
        if (!Array.isArray(state.kitItems) || state.kitItems.length === 0) state.kitItems = getDefaultKitItems();
        const todayStr = new Date().toISOString().split('T')[0];
        if (state.studyStats && state.studyStats.lastDate !== todayStr) {
          state.studyStats.todayMinutes = 0;
          state.studyStats.lastDate = todayStr;
        }
      } else {
        state.examTarget = getDefaultExamTarget();
        state.kitItems = getDefaultKitItems();
      }
    } catch (e) {
      console.error('Failed to load state:', e);
      state.examTarget = getDefaultExamTarget();
      state.kitItems = getDefaultKitItems();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  // ==========================================================================
  // 1. Initial Screen Routing: Intro Onboarding vs. Dashboard
  // ==========================================================================
  function renderScreen() {
    const viewIntro = document.getElementById('view-intro');
    const viewDash = document.getElementById('view-dashboard');
    const userLabel = document.getElementById('header-user-label');

    if (!state.user.isSetupComplete) {
      if (viewIntro) viewIntro.style.display = 'block';
      if (viewDash) viewDash.style.display = 'none';
      if (userLabel) userLabel.textContent = 'Setup';
    } else {
      if (viewIntro) viewIntro.style.display = 'none';
      if (viewDash) viewDash.style.display = 'flex';
      if (userLabel) userLabel.textContent = state.user.name || 'Profile';
      updateSubjectDatalists();
      renderDashboard();
    }
  }

  // ==========================================================================
  // Flexible Subject Directory & Custom Picker Engine
  // ==========================================================================
  const STANDARD_SUBJECT_OPTIONS = [
    'Core Mathematics',
    'Integrated Science',
    'English Language',
    'Social Studies',
    'Elective Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
    'Government',
    'History',
    'Literature in English',
    'Business Management',
    'Financial Accounting',
    'Cost Accounting',
    'Graphic Design',
    'Picture Making',
    'Textiles',
    'Food & Nutrition',
    'Clothing & Textiles',
    'Management in Living',
    'ICT / Computing',
    'General Knowledge in Art'
  ];

  function getAllAvailableSubjects() {
    const userSubs = Array.isArray(state.user.subjects) ? state.user.subjects : [];
    const combined = [...userSubs];
    STANDARD_SUBJECT_OPTIONS.forEach(s => {
      if (!combined.some(item => item.toLowerCase() === s.toLowerCase())) {
        combined.push(s);
      }
    });
    return combined;
  }

  function updateSubjectDatalists() {
    const datalist = document.getElementById('user-subjects-datalist');
    if (!datalist) return;
    datalist.innerHTML = getAllAvailableSubjects().map(s => `<option value="${escapeHTML(s)}">`).join('');
  }

  function populateSubjectDropdown(selectEl, currentVal = '') {
    if (!selectEl) return;
    const userSubs = Array.isArray(state.user.subjects) ? state.user.subjects : [];
    const allSubs = getAllAvailableSubjects();
    let html = `<option value="" disabled ${!currentVal ? 'selected' : ''}>Choose a subject...</option>`;

    if (userSubs.length > 0) {
      html += `<optgroup label="Your Saved Subjects">`;
      userSubs.forEach(s => {
        const sel = currentVal && s.toLowerCase() === currentVal.toLowerCase() ? 'selected' : '';
        html += `<option value="${escapeHTML(s)}" ${sel}>${escapeHTML(s)}</option>`;
      });
      html += `</optgroup>`;
    }

    const standardSubs = allSubs.filter(s => !userSubs.some(u => u.toLowerCase() === s.toLowerCase()));
    if (standardSubs.length > 0) {
      html += `<optgroup label="Standard Subjects">`;
      standardSubs.forEach(s => {
        const sel = currentVal && s.toLowerCase() === currentVal.toLowerCase() ? 'selected' : '';
        html += `<option value="${escapeHTML(s)}" ${sel}>${escapeHTML(s)}</option>`;
      });
      html += `</optgroup>`;
    }

    html += `<option value="__custom__">➕ Enter Custom Subject...</option>`;
    selectEl.innerHTML = html;
  }

  function setupSubjectPickerField(selectId, customInputId, toggleBtnId, initialVal = '') {
    const selectEl = document.getElementById(selectId);
    const customInput = document.getElementById(customInputId);
    const toggleBtn = document.getElementById(toggleBtnId);
    if (!selectEl || !customInput) return;

    populateSubjectDropdown(selectEl, initialVal);

    let matched = false;
    if (initialVal) {
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        if (opt.value && opt.value.toLowerCase() === initialVal.toLowerCase()) {
          opt.selected = true;
          matched = true;
          break;
        }
      }
    }

    if (initialVal && !matched) {
      selectEl.value = '__custom__';
      customInput.value = initialVal;
      customInput.style.display = 'block';
      if (toggleBtn) toggleBtn.textContent = '↩ Use List';
    } else {
      if (!initialVal && selectEl.options.length > 1) {
        const firstValid = Array.from(selectEl.options).find(o => o.value && o.value !== '__custom__');
        if (firstValid) firstValid.selected = true;
      }
      customInput.value = '';
      customInput.style.display = 'none';
      if (toggleBtn) toggleBtn.textContent = '+ Type Custom';
    }

    selectEl.onchange = () => {
      if (selectEl.value === '__custom__') {
        customInput.style.display = 'block';
        customInput.focus();
        if (toggleBtn) toggleBtn.textContent = '↩ Use List';
      } else {
        customInput.style.display = 'none';
        if (toggleBtn) toggleBtn.textContent = '+ Type Custom';
      }
    };

    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.preventDefault();
        if (customInput.style.display === 'none') {
          selectEl.value = '__custom__';
          customInput.style.display = 'block';
          customInput.focus();
          toggleBtn.textContent = '↩ Use List';
        } else {
          customInput.style.display = 'none';
          toggleBtn.textContent = '+ Type Custom';
          const firstValid = Array.from(selectEl.options).find(o => o.value && o.value !== '__custom__');
          if (firstValid) firstValid.selected = true;
        }
      };
    }
  }

  function getChosenSubject(selectId, customInputId) {
    const selectEl = document.getElementById(selectId);
    const customInput = document.getElementById(customInputId);
    if (!selectEl) return '';
    if (selectEl.value === '__custom__' || (customInput && customInput.style.display !== 'none')) {
      return customInput ? customInput.value.trim() : '';
    }
    return selectEl.value.trim();
  }

  function registerCustomSubjectIfNew(subjectName) {
    if (!subjectName) return;
    if (!state.user.subjects) state.user.subjects = [];
    if (!state.user.subjects.some(s => s.toLowerCase() === subjectName.toLowerCase())) {
      state.user.subjects.push(subjectName);
      saveState();
      updateSubjectDatalists();
    }
  }

  function openNewAssignmentModal() {
    const form = document.getElementById('form-add-assignment');
    if (form) form.reset();

    const editIdInput = document.getElementById('task-edit-id');
    if (editIdInput) editIdInput.value = '';

    const modal = document.getElementById('modal-assignment');
    const headerTitle = modal ? modal.querySelector('.modal-title-text') : null;
    if (headerTitle) headerTitle.textContent = 'New Assignment / Project';

    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.textContent = 'Save Assignment';

    const dueInput = document.getElementById('task-due');
    if (dueInput) dueInput.value = new Date().toISOString().split('T')[0];

    const groupField = document.getElementById('group-task-members-field');
    if (groupField) groupField.style.display = 'none';

    setupSubjectPickerField('task-subject-select', 'task-subject-custom', 'btn-toggle-custom-subject', '');

    openModal('modal-assignment');
  }

  function openEditAssignmentModal(task) {
    if (!task) return;
    const modal = document.getElementById('modal-assignment');
    const form = document.getElementById('form-add-assignment');

    const headerTitle = modal ? modal.querySelector('.modal-title-text') : null;
    if (headerTitle) headerTitle.textContent = 'Edit Assignment';

    const editIdInput = document.getElementById('task-edit-id');
    if (editIdInput) editIdInput.value = task.id;

    const titleInput = document.getElementById('task-title');
    if (titleInput) titleInput.value = task.title || '';

    const dueInput = document.getElementById('task-due');
    if (dueInput) dueInput.value = task.due || new Date().toISOString().split('T')[0];

    const typeSelect = document.getElementById('task-type');
    if (typeSelect) {
      typeSelect.value = task.type || 'individual';
      const groupField = document.getElementById('group-task-members-field');
      if (groupField) groupField.style.display = task.type === 'group' ? 'block' : 'none';
    }

    const prioritySelect = document.getElementById('task-priority');
    if (prioritySelect) prioritySelect.value = task.priority || 'medium';

    const membersInput = document.getElementById('task-members');
    if (membersInput) membersInput.value = task.members || '';

    const notesInput = document.getElementById('task-notes');
    if (notesInput) notesInput.value = task.notes || '';

    setupSubjectPickerField('task-subject-select', 'task-subject-custom', 'btn-toggle-custom-subject', task.subject || '');

    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    openModal('modal-assignment');
  }

  // ==========================================================================
  // 2. Intro Setup Interactions
  // ==========================================================================
  function setupIntroForm() {
    const form = document.getElementById('form-intro-setup');
    const subjectsInput = document.getElementById('intro-subjects-input');

    // School Level Chips
    setupChipGroup('#school-level-chips .select-chip', (chip) => {
      state.user.level = chip.dataset.level;
    });

    // Program Track Chips
    setupChipGroup('#program-track-chips .select-chip', (chip) => {
      state.user.track = chip.dataset.track;
      if (subjectsInput && TRACK_SUBJECTS[chip.dataset.track] !== undefined) {
        subjectsInput.value = TRACK_SUBJECTS[chip.dataset.track];
      }
    });

    // Prep Goal Chips
    setupChipGroup('#prep-goal-chips .select-chip', (chip) => {
      state.user.prepGoal = parseInt(chip.dataset.goal, 10);
    });

    // Handle Form Submit
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('intro-name').value.trim();
        const rawSubs = subjectsInput ? subjectsInput.value : '';

        const subjectsList = rawSubs.split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        state.user.name = name;
        state.user.subjects = subjectsList.length > 0 ? subjectsList : ['Core Mathematics', 'Integrated Science', 'English Language', 'Social Studies'];
        state.user.isSetupComplete = true;

        saveState();
        renderScreen();
      });
    }
  }

  function setupChipGroup(selector, onSelect) {
    const chips = document.querySelectorAll(selector);
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (onSelect) onSelect(chip);
      });
    });
  }

  // ==========================================================================
  // 3. Dashboard Segment Navigation
  // ==========================================================================
  function setupDashboardNavigation() {
    const navButtons = document.querySelectorAll('.segment-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabPanes.forEach(pane => {
          if (pane.id === `tab-${targetTab}`) {
            pane.style.display = 'block';
          } else {
            pane.style.display = 'none';
          }
        });

        if (targetTab === 'assistant') {
          renderAssistantTab();
        }
        if (targetTab === 'timetable') renderTimetableTab();
        if (targetTab === 'assignments') renderAssignmentsTab();
        if (targetTab === 'goals') renderGoalsTab();
        if (targetTab === 'focus') {
          renderPresetChips();
          updateTimerDisplay();
          if (!prepLottieAnim) initPrepLottie();
          else if (timerIsRunning) prepLottieAnim.play();
        }
        // About tab needs no dynamic render
      });
    });

    // Quick Action button shortcuts in Assistant card
    const btnQuickAddTask = document.getElementById('btn-quick-add-task');
    if (btnQuickAddTask) {
      btnQuickAddTask.addEventListener('click', () => openNewAssignmentModal());
    }

    const btnQuickAddPeriod = document.getElementById('btn-quick-add-period');
    if (btnQuickAddPeriod) {
      btnQuickAddPeriod.addEventListener('click', () => openNewTimetableModal());
    }

    const btnQuickTimer = document.getElementById('btn-quick-timer');
    if (btnQuickTimer) {
      btnQuickTimer.addEventListener('click', () => {
        const focusBtn = document.querySelector('.segment-btn[data-tab="focus"]');
        if (focusBtn) focusBtn.click();
      });
    }

    const dashCallout = document.getElementById('dash-callout-box');
    if (dashCallout) {
      dashCallout.addEventListener('click', () => {
        const pending = state.assignments.filter(a => !a.completed);
        const almostDue = pending.filter(a => getTaskDueStatus(a) !== null);
        if (almostDue.length > 0) {
          const assignBtn = document.querySelector('.segment-btn[data-tab="assignments"]');
          if (assignBtn) assignBtn.click();
        }
      });
    }

    setupStudyBuddyInteraction();
  }

  // Study Buddy Tips & Interactive Boosts
  const STUDY_BUDDY_TIPS = [
    "“Momentum is everything! Even a 25-minute laser focus session beats 3 hours of distracted multitasking.”",
    "“Active Recall test: Close your books and jot down the core concepts from memory before opening them again.”",
    "“Hydration check! Grab some water to keep your brain firing on all cylinders during evening prep.”",
    "“Past questions are gold. Solving 2-3 WASSCE or exam questions daily builds unbreakable confidence.”",
    "“Tackle your toughest subject first while your willpower and mental energy are at 100%.”",
    "“The Feynman technique: Try explaining what you just learned out loud in simple everyday words.”",
    "“Consistency beats cramming every single time. 1 hour every day outlasts an all-nighter.”",
    "“Study sprints work: 25 minutes of deep focus followed by 5 minutes of rest keeps burnout away.”",
    "“Mistakes in prep are free lessons. Keep a notebook specifically for tricky exam questions!”"
  ];

  let currentBuddyTipIndex = 0;
  function setupStudyBuddyInteraction() {
    const trigger = document.getElementById('mascot-tap-trigger');
    const bubbleText = document.getElementById('companion-speech-text');
    const bubble = document.getElementById('companion-speech-bubble');
    const statusTag = document.getElementById('companion-status-tag');
    if (!trigger || !bubbleText) return;

    trigger.addEventListener('click', () => {
      bubbleText.dataset.touched = 'true';
      currentBuddyTipIndex = (currentBuddyTipIndex + 1) % STUDY_BUDDY_TIPS.length;
      bubbleText.textContent = STUDY_BUDDY_TIPS[currentBuddyTipIndex];

      // Cheerful chime sound
      playOfflineChime('bell');

      // Pop animation on bubble
      if (bubble) {
        bubble.classList.remove('bubble-pop-anim');
        void bubble.offsetWidth; // trigger reflow
        bubble.classList.add('bubble-pop-anim');
      }

      // Pop bounce on the Brain Research mascot image
      const img = document.getElementById('assistant-mascot-img');
      if (img) {
        img.classList.remove('boost-anim');
        void img.offsetWidth;
        img.classList.add('boost-anim');
      }

      if (statusTag) {
        const statuses = ['Brain Insight 🧠', 'Momentum high! 🚀', 'Active Recall 💡', 'Deep Research 🔬', 'In the zone 🔥', 'Sharp & ready 🎯'];
        statusTag.textContent = statuses[Math.floor(Math.random() * statuses.length)];
      }
    });
  }

  // ==========================================================================
  // Task Deadline Due Status & Lottie Bell Notifications
  // ==========================================================================
  function getTaskDueStatus(task) {
    if (!task || task.completed || !task.due) return null;
    const parts = task.due.split('-');
    if (parts.length !== 3) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', label: 'Overdue', days: diffDays, isOverdue: true };
    } else if (diffDays === 0) {
      return { status: 'today', label: 'Due Today', days: 0, isToday: true };
    } else if (diffDays === 1) {
      return { status: 'tomorrow', label: 'Due Tomorrow', days: 1 };
    } else if (diffDays === 2) {
      return { status: 'soon', label: 'Due in 2 days', days: 2 };
    } else if (task.priority === 'high' && diffDays <= 4) {
      return { status: 'soon', label: `Due in ${diffDays}d (Urgent)`, days: diffDays };
    }
    return null;
  }

  let bellLottieAnims = [];

  function clearBellAnimations() {
    bellLottieAnims.forEach(anim => {
      try { anim.destroy(); } catch (e) { }
    });
    bellLottieAnims = [];
  }

  function mountBellAnimations() {
    clearBellAnimations();
    if (typeof lottie === 'undefined') return;

    const mounts = document.querySelectorAll('.lottie-bell-mount');
    mounts.forEach(container => {
      try {
        const anim = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: 'notification.json'
        });
        bellLottieAnims.push(anim);
      } catch (e) {
        console.warn('Failed to mount bell animation:', e);
      }
    });
  }

  // ==========================================================================
  // 4. Assistant Tab
  // ==========================================================================
  function renderAssistantTab() {
    const greetingEl = document.getElementById('dash-greeting');
    const messageEl = document.getElementById('dash-assistant-msg');
    const tasksContainer = document.getElementById('dash-tasks-container');
    const badgeUrgent = document.getElementById('badge-urgent-count');
    const calloutBox = document.getElementById('dash-callout-box');
    const calloutIcon = document.getElementById('dash-callout-icon');
    const calloutTitle = document.getElementById('dash-callout-title');
    const calloutDesc = document.getElementById('dash-callout-desc');

    if (greetingEl) greetingEl.textContent = `Hello, ${state.user.name || 'Student'}`;

    const companionBubble = document.getElementById('companion-speech-text');
    if (companionBubble && !companionBubble.dataset.touched) {
      const name = state.user.name || 'Friend';
      const pendingCount = state.assignments.filter(a => !a.completed).length;
      if (pendingCount > 0) {
        companionBubble.textContent = `“Let's cruise through these ${pendingCount} task(s), ${name}! Tap me anytime for a quick study boost.”`;
      } else {
        companionBubble.textContent = `“You're completely on top of your schedule, ${name}! Ready for a solid prep session?”`;
      }
    }

    const pending = state.assignments.filter(a => !a.completed);
    const almostDue = pending.filter(a => getTaskDueStatus(a) !== null);

    if (badgeUrgent) {
      if (almostDue.length > 0) {
        badgeUrgent.textContent = `${almostDue.length} due soon`;
        badgeUrgent.className = 'item-tag tag-amber';
      } else {
        badgeUrgent.textContent = `${pending.length} tasks`;
        badgeUrgent.className = 'item-tag tag-blue';
      }
    }

    if (pending.length === 0) {
      if (calloutBox) calloutBox.classList.remove('callout-urgent');
      if (calloutIcon) calloutIcon.innerHTML = '📋';
      if (messageEl) messageEl.textContent = `Your schedule is completely clear right now. Add your classes or upcoming homework to stay organized.`;
      if (calloutTitle) calloutTitle.textContent = `All caught up!`;
      if (calloutDesc) calloutDesc.textContent = `You have no pending assignments. You can start a ${state.user.prepGoal}m prep session or add tomorrow's classes.`;
      if (tasksContainer) {
        tasksContainer.innerHTML = `
          <div class="empty-state-card">
            <div class="empty-state-icon-badge badge-purple">✨</div>
            <div class="empty-state-title">No assignments or homework yet</div>
            <p class="empty-state-desc">Whenever you get homework or a group project, add it here to track deadlines and members.</p>
            <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyMate.openNewTask()">+ Add Assignment</button>
          </div>
        `;
      }
    } else if (almostDue.length > 0) {
      const urgentTop = almostDue[0];
      const urgentStatus = getTaskDueStatus(urgentTop);
      if (calloutBox) calloutBox.classList.add('callout-urgent');
      if (calloutIcon) calloutIcon.innerHTML = `<div class="lottie-bell-mount callout-bell-lottie"></div>`;
      if (messageEl) messageEl.textContent = `Attention: You have ${almostDue.length} assignment(s) almost due! Focus on finishing them before the deadline.`;
      if (calloutTitle) calloutTitle.textContent = `Almost Due: ${escapeHTML(urgentTop.title)}`;
      if (calloutDesc) calloutDesc.textContent = `${escapeHTML(urgentTop.subject)} is ${urgentStatus.label} (${escapeHTML(urgentTop.due)}). Complete it now to stay ahead!`;
      if (tasksContainer) {
        tasksContainer.innerHTML = pending.slice(0, 3).map(task => renderTaskItemRow(task)).join('');
      }
    } else {
      if (calloutBox) calloutBox.classList.remove('callout-urgent');
      if (calloutIcon) calloutIcon.innerHTML = '📋';
      const topTask = pending[0];
      if (messageEl) messageEl.textContent = `You have ${pending.length} active assignment(s). Focus on completing them one at a time.`;
      if (calloutTitle) calloutTitle.textContent = `Upcoming: ${escapeHTML(topTask.title)}`;
      if (calloutDesc) calloutDesc.textContent = `Subject: ${escapeHTML(topTask.subject)} • Due: ${escapeHTML(topTask.due)}`;
      if (tasksContainer) {
        tasksContainer.innerHTML = pending.slice(0, 3).map(task => renderTaskItemRow(task)).join('');
      }
    }

    renderExamHorizon();
    renderKitChecklist();
    mountBellAnimations();
  }

  // ==========================================================================
  // 4a. Exam Horizon (WASSCE / Target Countdown Engine - Zero Neon)
  // ==========================================================================
  function renderExamHorizon() {
    const horizonNameEl = document.getElementById('horizon-exam-name');
    const horizonDaysEl = document.getElementById('horizon-days-left');
    const horizonTargetDateEl = document.getElementById('horizon-target-date-str');
    const horizonPrepHoursEl = document.getElementById('horizon-prep-hours');
    const horizonWeeksEl = document.getElementById('horizon-weeks-left');
    const horizonUrgencyEl = document.getElementById('horizon-urgency-tag');
    const horizonFillEl = document.getElementById('horizon-progress-fill');

    if (!state.examTarget) {
      state.examTarget = getDefaultExamTarget();
    }

    if (horizonNameEl) horizonNameEl.textContent = state.examTarget.name || 'WASSCE';

    const now = new Date();
    const target = new Date(state.examTarget.date + 'T00:00:00');
    const diffMs = target - now;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (horizonTargetDateEl) {
      try {
        const d = new Date(state.examTarget.date + 'T00:00:00');
        horizonTargetDateEl.textContent = 'Target: ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        horizonTargetDateEl.textContent = 'Target: ' + state.examTarget.date;
      }
    }

    if (daysLeft < 0) {
      if (horizonDaysEl) horizonDaysEl.textContent = '0';
      if (horizonPrepHoursEl) horizonPrepHoursEl.textContent = '0 hrs';
      if (horizonWeeksEl) horizonWeeksEl.textContent = '0 wks';
      if (horizonUrgencyEl) {
        horizonUrgencyEl.textContent = 'Exam Concluded';
        horizonUrgencyEl.style.color = 'var(--text-muted)';
      }
      if (horizonFillEl) horizonFillEl.style.width = '100%';
    } else {
      if (horizonDaysEl) horizonDaysEl.textContent = daysLeft;
      const hours = Math.round(daysLeft * (state.examTarget.dailyTargetHours || 3));
      if (horizonPrepHoursEl) horizonPrepHoursEl.textContent = `~${hours} hrs`;
      const weeks = Math.floor(daysLeft / 7);
      if (horizonWeeksEl) horizonWeeksEl.textContent = `${weeks} wks`;

      if (horizonUrgencyEl) {
        if (daysLeft <= 30) {
          horizonUrgencyEl.textContent = 'Past Question Sprint';
          horizonUrgencyEl.style.color = 'var(--accent-red)';
        } else if (daysLeft <= 90) {
          horizonUrgencyEl.textContent = 'Topic Mastery Phase';
          horizonUrgencyEl.style.color = 'var(--accent-amber)';
        } else {
          horizonUrgencyEl.textContent = 'Steady Foundation';
          horizonUrgencyEl.style.color = 'var(--accent-green)';
        }
      }

      // Progression percentage (normalized across ~200 day academic preparation cycle)
      const pct = Math.min(100, Math.max(12, Math.round(((200 - daysLeft) / 200) * 100)));
      if (horizonFillEl) horizonFillEl.style.width = `${pct}%`;
    }
  }

  // ==========================================================================
  // 4b. Class Ready Guardian (Essential Kit Checklist - Never Get Sacked)
  // ==========================================================================
  function renderKitChecklist() {
    const listContainer = document.getElementById('kit-items-container');
    const statusTag = document.getElementById('kit-packed-status');
    const headingEl = document.getElementById('kit-schedule-heading');
    if (!listContainer) return;

    if (!Array.isArray(state.kitItems) || state.kitItems.length === 0) {
      state.kitItems = getDefaultKitItems();
    }

    // Determine tomorrow's day and subject context
    const tomorrowDay = (new Date().getDay() + 1) % 7;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const tomorrowName = dayNames[tomorrowDay];
    const tomorrowSlots = state.timetable.filter(s => s.day === tomorrowDay);

    if (headingEl) {
      if (tomorrowSlots.length > 0) {
        const subs = Array.from(new Set(tomorrowSlots.map(s => s.subject))).slice(0, 3).join(', ');
        headingEl.textContent = `${tomorrowName} Kit • ${subs}`;
      } else {
        headingEl.textContent = `${tomorrowName} Essential Kit`;
      }
    }

    const total = state.kitItems.length;
    const packed = state.kitItems.filter(i => i.packed).length;

    if (statusTag) {
      if (total > 0 && packed === total) {
        statusTag.textContent = '✓ 100% Packed — Ready for Class';
        statusTag.className = 'kit-status-tag all-packed';
      } else {
        statusTag.textContent = `${packed}/${total} Packed`;
        statusTag.className = 'kit-status-tag';
      }
    }

    if (total === 0) {
      listContainer.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px 0;">
          No kit items added yet. Tap "+ Add Kit Item" to guard your class readiness.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = state.kitItems.map(item => `
      <div class="kit-item-row ${item.packed ? 'packed' : ''}">
        <div class="kit-item-left">
          <div class="ios-checkbox ${item.packed ? 'checked' : ''}" onclick="window.StudyMate.toggleKitItem('${item.id}')"></div>
          <div>
            <div class="kit-item-name">${escapeHTML(item.name)}</div>
            ${item.subject ? `<div class="kit-item-subject-tag">${escapeHTML(item.subject)}</div>` : ''}
          </div>
        </div>
        <button class="modal-close-icon" style="width: 24px; height: 24px; font-size: 11px;" onclick="window.StudyMate.deleteKitItem('${item.id}')" title="Delete item">✕</button>
      </div>
    `).join('');
  }

  // Offline Data Vault (Export / Import Backup)
  function exportDataBackup() {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStamp = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `StudyMate-Backup-${dateStamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not export backup: ' + err.message);
    }
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || typeof imported !== 'object' || !imported.user) {
          alert('Invalid backup file. Missing StudyMate profile structure.');
          return;
        }
        state = imported;
        if (!state.examTarget) state.examTarget = getDefaultExamTarget();
        if (!Array.isArray(state.kitItems)) state.kitItems = getDefaultKitItems();
        saveState();
        renderScreen();
        alert('Data successfully restored! Your schedule, assignments, and kit checklist are fully up to date.');
      } catch (err) {
        alert('Failed to parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function openNewTimetableModal() {
    document.getElementById('form-add-timetable').reset();
    const editIdInput = document.getElementById('slot-edit-id');
    if (editIdInput) editIdInput.value = '';
    const titleEl = document.getElementById('modal-timetable-title');
    if (titleEl) titleEl.textContent = 'Add Schedule Slot';
    const submitBtn = document.getElementById('btn-submit-timetable-slot');
    if (submitBtn) submitBtn.textContent = 'Add Slot';
    setupSubjectPickerField('slot-subject-select', 'slot-subject-custom', 'btn-toggle-custom-slot-subject', '');
    openModal('modal-timetable');
  }

  function openEditTimetableModal(slot) {
    document.getElementById('form-add-timetable').reset();
    const editIdInput = document.getElementById('slot-edit-id');
    if (editIdInput) editIdInput.value = slot.id;
    const titleEl = document.getElementById('modal-timetable-title');
    if (titleEl) titleEl.textContent = 'Edit Schedule Slot';
    const submitBtn = document.getElementById('btn-submit-timetable-slot');
    if (submitBtn) submitBtn.textContent = 'Update Slot';

    document.getElementById('slot-day').value = slot.day;
    document.getElementById('slot-type').value = slot.type;
    document.getElementById('slot-start').value = slot.start;
    document.getElementById('slot-end').value = slot.end;
    document.getElementById('slot-room').value = slot.room || '';
    setupSubjectPickerField('slot-subject-select', 'slot-subject-custom', 'btn-toggle-custom-slot-subject', slot.subject);
    openModal('modal-timetable');
  }

  // ==========================================================================
  // 4b. Real-Time Transparent Mascot Renderer (Chromakey for Frosted Glass)
  // ==========================================================================
  function setupTransparentMascot(videoId, canvasId) {
    const video = document.getElementById(videoId);
    const canvas = document.getElementById(canvasId);
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let isProcessing = false;
    let rfcId = null;
    let rafId = null;

    // Offscreen buffer prevents tearing and flickering
    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = 150;
    bufferCanvas.height = 150;
    const bufferCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });

    function processSingleFrame() {
      if (!video || video.videoWidth === 0) return;

      try {
        bufferCtx.drawImage(video, 0, 0, 150, 150);
        const imgData = bufferCtx.getImageData(0, 0, 150, 150);
        const data = imgData.data;
        const len = data.length;

        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = (r > g ? (r > b ? r : b) : (g > b ? g : b));

          if (max <= 28) {
            data[i + 3] = 0;
          } else if (max < 60) {
            data[i + 3] = Math.round(((max - 28) / 32) * 255);
          }
        }

        ctx.putImageData(imgData, 0, 0);
      } catch (err) { }
    }

    function scheduleNextFrame() {
      if (!isProcessing || video.paused || video.ended) {
        isProcessing = false;
        return;
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        if (rfcId !== null) video.cancelVideoFrameCallback(rfcId);
        rfcId = video.requestVideoFrameCallback(() => {
          processSingleFrame();
          scheduleNextFrame();
        });
      } else {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          processSingleFrame();
          scheduleNextFrame();
        });
      }
    }

    function startLoop() {
      if (!isProcessing) {
        isProcessing = true;
        scheduleNextFrame();
      }
    }

    function stopLoop() {
      isProcessing = false;
      if (rfcId !== null && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        video.cancelVideoFrameCallback(rfcId);
        rfcId = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    video.addEventListener('play', () => {
      startLoop();
    });

    video.addEventListener('pause', () => {
      stopLoop();
      processSingleFrame();
    });

    video.addEventListener('loadeddata', () => {
      processSingleFrame();
      if (!video.paused) startLoop();
    });

    video.addEventListener('seeked', () => {
      processSingleFrame();
    });

    if (video.readyState >= 2) {
      processSingleFrame();
      if (!video.paused) startLoop();
    }
  }

  function initTransparentMascots() {
    setupTransparentMascot('intro-mascot-video', 'intro-mascot-canvas');
    setupTransparentMascot('assistant-mascot-video', 'assistant-mascot-canvas');
    setupTransparentMascot('timer-mascot-video', 'timer-mascot-canvas');
  }

  // ==========================================================================
  // 5. Timetable Tab
  // ==========================================================================
  function renderTimetableTab() {
    const dayChips = document.querySelectorAll('#timetable-day-chips .select-chip');
    dayChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.day, 10) === state.activeDay);
    });

    const contentCard = document.getElementById('timetable-content-card');
    if (!contentCard) return;

    const daySlots = state.timetable
      .filter(s => s.day === state.activeDay)
      .sort((a, b) => a.start.localeCompare(b.start));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[state.activeDay];

    if (daySlots.length === 0) {
      contentCard.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon-badge badge-blue">🗓️</div>
          <div class="empty-state-title">No classes scheduled for ${currentDayName}</div>
          <p class="empty-state-desc">Keep your day structured. Add your class periods, practicals, or evening boarding prep.</p>
          <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyMate.openNewTimetable()">+ Add Schedule Slot</button>
        </div>
      `;
    } else {
      contentCard.innerHTML = daySlots.map(slot => `
        <div class="item-row">
          <div class="item-left">
            <div>
              <div class="item-title">${escapeHTML(slot.subject)}</div>
              <div class="item-subtitle">${escapeHTML(slot.start)} – ${escapeHTML(slot.end)} ${slot.room ? `• ${escapeHTML(slot.room)}` : ''}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="item-tag ${slot.type === 'prep' ? 'tag-amber' : 'tag-blue'}">${slot.type === 'prep' ? '🌙 Prep' : 'Class'}</span>
            <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyMate.editTimetableSlot('${slot.id}')" title="Edit Slot">✏️</button>
            <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyMate.deleteTimetableSlot('${slot.id}')" title="Delete">✕</button>
          </div>
        </div>
      `).join('');
    }
  }

  // ==========================================================================
  // 6. Assignments Tab
  // ==========================================================================
  function renderTaskItemRow(task) {
    const isGroup = task.type === 'group';
    const dueStatus = getTaskDueStatus(task);
    const isUrgent = dueStatus !== null;

    let tagClass = 'tag-blue';
    let tagText = task.priority;
    if (isUrgent) {
      if (dueStatus.isOverdue) {
        tagClass = 'tag-red';
        tagText = '⚠️ ' + dueStatus.label;
      } else if (dueStatus.isToday) {
        tagClass = 'tag-amber';
        tagText = '🔔 ' + dueStatus.label;
      } else {
        tagClass = 'tag-amber';
        tagText = dueStatus.label;
      }
    } else if (task.priority === 'high') {
      tagClass = 'tag-amber';
    }

    return `
      <div class="item-row ${isUrgent ? 'item-row-urgent' : ''}">
        <div class="item-left">
          <div class="ios-checkbox ${task.completed ? 'checked' : ''}" onclick="window.StudyMate.toggleTask('${task.id}')"></div>
          <div>
            <div class="item-title" style="${task.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${escapeHTML(task.title)}</div>
            <div class="item-subtitle">
              ${escapeHTML(task.subject)} • Due ${escapeHTML(task.due)}
              ${isGroup && task.members ? ` • 👥 ${escapeHTML(task.members)}` : ''}
            </div>
            ${task.notes ? `<div class="item-notes">📝 ${escapeHTML(task.notes)}</div>` : ''}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${isUrgent ? `<div class="lottie-bell-mount task-item-bell" title="${escapeHTML(dueStatus.label)}"></div>` : ''}
          <span class="item-tag ${tagClass}">${escapeHTML(tagText)}</span>
          <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyMate.editTask('${task.id}')" title="Edit Assignment">✏️</button>
          <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyMate.deleteTask('${task.id}')" title="Delete">✕</button>
        </div>
      </div>
    `;
  }

  function renderAssignmentsTab() {
    const contentCard = document.getElementById('assignments-content-card');
    const bannerEl = document.getElementById('assignments-almost-due-banner');
    if (!contentCard) return;

    // Check almost-due tasks
    const pending = state.assignments.filter(a => !a.completed);
    const almostDue = pending.filter(a => getTaskDueStatus(a) !== null);

    if (bannerEl) {
      if (almostDue.length > 0) {
        const topUrgent = almostDue[0];
        const status = getTaskDueStatus(topUrgent);
        bannerEl.style.display = 'flex';
        bannerEl.className = 'almost-due-banner';
        bannerEl.innerHTML = `
          <div class="lottie-bell-mount banner-bell-lottie"></div>
          <div style="flex: 1;">
            <div class="almost-due-heading">🔔 Attention: ${almostDue.length} assignment${almostDue.length > 1 ? 's' : ''} almost due!</div>
            <div class="almost-due-detail">Upcoming: <strong>${escapeHTML(topUrgent.title)}</strong> (${escapeHTML(topUrgent.subject)}) • <span class="almost-due-highlight">${status.label}</span></div>
          </div>
        `;
      } else {
        bannerEl.style.display = 'none';
        bannerEl.innerHTML = '';
      }
    }

    let filtered = [...state.assignments];
    if (state.activeFilter === 'pending') {
      filtered = filtered.filter(a => !a.completed);
    } else if (state.activeFilter === 'group') {
      filtered = filtered.filter(a => a.type === 'group');
    } else if (state.activeFilter === 'completed') {
      filtered = filtered.filter(a => a.completed);
    }

    if (filtered.length === 0) {
      contentCard.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon-badge badge-green">📝</div>
          <div class="empty-state-title">No assignments recorded</div>
          <p class="empty-state-desc">Stay ahead of your coursework by logging assignments and group tasks.</p>
          <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyMate.openNewTask()">+ New Assignment</button>
        </div>
      `;
    } else {
      contentCard.innerHTML = filtered.map(t => renderTaskItemRow(t)).join('');
    }

    mountBellAnimations();
  }

  // ==========================================================================
  // 7. Goals & Habits Tab
  // ==========================================================================
  function renderGoalsTab() {
    const contentCard = document.getElementById('goals-content-card');
    if (!contentCard) return;

    const hasDaily = state.dailyGoals.length > 0;
    const hasHabits = state.habits.length > 0;

    if (!hasDaily && !hasHabits) {
      contentCard.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon-badge badge-amber">🎯</div>
          <div class="empty-state-title">No targets or study habits yet</div>
          <p class="empty-state-desc">Break down your study ambitions. Set a target for today or build a recurring daily study habit.</p>
          <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyMate.openModal('modal-goal')">+ Add First Target</button>
        </div>
      `;
    } else {
      let html = '';
      if (hasDaily) {
        html += `<h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 10px; color: var(--text-secondary);">Today's Targets</h4>`;
        html += state.dailyGoals.map(g => `
          <div class="item-row">
            <div class="item-left">
              <div class="ios-checkbox ${g.completed ? 'checked' : ''}" onclick="window.StudyMate.toggleGoal('${g.id}')"></div>
              <div>
                <div class="item-title" style="${g.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${escapeHTML(g.text)}</div>
                ${g.subject ? `<div class="item-subtitle">${escapeHTML(g.subject)}</div>` : ''}
              </div>
            </div>
            <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyMate.deleteGoal('${g.id}')">✕</button>
          </div>
        `).join('');
      }

      if (hasHabits) {
        const todayStr = new Date().toISOString().split('T')[0];
        html += `<h4 style="font-size: 0.88rem; font-weight: 700; margin: 18px 0 10px 0; color: var(--text-secondary);">Habit Streaks</h4>`;
        html += state.habits.map(h => {
          const isLoggedToday = h.lastLoggedDate === todayStr;
          return `
          <div class="item-row">
            <div class="item-left">
              <div>
                <div class="item-title">🔥 ${escapeHTML(h.name)}</div>
                <div class="item-subtitle" id="streak-label-${h.id}">${h.streak} ${h.streak === 1 ? 'day' : 'days'} streak 🔥 ${isLoggedToday ? '• <span style="color: var(--accent-green); font-weight: 600;">✓ Done today</span>' : ''}</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-liquid ${isLoggedToday ? 'btn-liquid-secondary' : 'btn-liquid-primary'}" style="font-size: 0.75rem; padding: 5px 12px; ${isLoggedToday ? 'opacity: 0.75;' : ''}" id="btn-log-${h.id}" onclick="window.StudyMate.incrementHabit('${h.id}')" ${isLoggedToday ? 'title="Already logged for today"' : ''}>${isLoggedToday ? '✓ Logged' : '+ Log Today'}</button>
              <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyMate.deleteHabit('${h.id}')" title="Delete">✕</button>
            </div>
          </div>
        `;
        }).join('');
      }
      contentCard.innerHTML = html;
    }
  }

  // ==========================================================================
  // ==========================================================================
  // 8. Offline Prep Timer with 5 Presets & Dynamic Rest Sessions
  // ==========================================================================
  const DEFAULT_TIMER_PRESETS = [
    { id: 'p-15', focus: 15, rest: 3, label: '15m (3m rest)' },
    { id: 'p-25', focus: 25, rest: 5, label: '25m (5m rest)' },
    { id: 'p-45', focus: 45, rest: 10, label: '45m (10m rest)' },
    { id: 'p-60', focus: 60, rest: 15, label: '60m (15m rest)' },
    { id: 'p-90', focus: 90, rest: 20, label: '90m (20m rest)' }
  ];

  let currentPreset = DEFAULT_TIMER_PRESETS[1]; // default 25m
  let timerMode = 'focus'; // 'focus' or 'rest'
  let timerInterval = null;
  let timerRemainingSeconds = 25 * 60;
  let timerTotalSeconds = 25 * 60;
  let timerIsRunning = false;

  // Lottie Animation Instances
  let prepLottieAnim = null;
  let celebrationLottieAnim = null;

  // ----------------------------------------------------------------
  // Lottie: Prep Timer Motherboard Animation
  // ----------------------------------------------------------------
  function initPrepLottie() {
    const container = document.getElementById('prep-lottie-stage');
    if (!container || typeof lottie === 'undefined') return;
    prepLottieAnim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'man-repairing-motherboard.json'
    });
  }

  // ----------------------------------------------------------------
  // Lottie: Task Completion Celebration
  // ----------------------------------------------------------------
  function showCelebration(taskTitle) {
    const modal = document.getElementById('celebration-modal');
    const titleEl = document.getElementById('celebration-task-title');
    const lottieBox = document.getElementById('celebration-lottie');
    if (!modal || !lottieBox) return;

    if (titleEl) titleEl.textContent = taskTitle || 'Great work on finishing your task.';

    // Re-init Lottie each time so animation replays from the start
    if (celebrationLottieAnim) {
      celebrationLottieAnim.destroy();
      celebrationLottieAnim = null;
    }
    lottieBox.innerHTML = '';

    if (typeof lottie !== 'undefined') {
      celebrationLottieAnim = lottie.loadAnimation({
        container: lottieBox,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: 'successfully-done.json'
      });
    }

    modal.style.display = 'flex';
    // Auto-dismiss after 4.5 s if user doesn't tap
    setTimeout(() => hideCelebration(), 4500);

    playOfflineChime('success');
  }

  function hideCelebration() {
    const modal = document.getElementById('celebration-modal');
    if (modal) modal.style.display = 'none';
  }

  // Web Audio API Synthesizer for 100% Offline Chimes
  let audioContext = null;
  function playOfflineChime(type = 'bell') {
    try {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioContext = new AudioCtx();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      if (!audioContext) return;

      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      if (type === 'bell') {
        // Double tone school bell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else {
        // Upbeat chime for rest completion
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      }

      if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
    } catch (e) {
      console.log('Chime error:', e);
    }
  }

  function renderPresetChips() {
    const container = document.getElementById('timer-preset-chips');
    if (!container) return;

    if (!state.customTimerPresets) state.customTimerPresets = [];
    const allPresets = [...DEFAULT_TIMER_PRESETS, ...state.customTimerPresets];

    let html = allPresets.map(p => {
      const isAct = currentPreset && currentPreset.id === p.id;
      const isCustom = p.id.startsWith('cust-');
      return `
        <button type="button" class="select-chip ${isAct ? 'active' : ''}" onclick="window.StudyMate.selectTimerPreset('${p.id}')">
          ${escapeHTML(p.label)}
          ${isCustom ? `<span style="margin-left: 6px; opacity: 0.6; font-size: 10px;" onclick="event.stopPropagation(); window.StudyMate.deleteCustomPreset('${p.id}')">✕</span>` : ''}
        </button>
      `;
    }).join('');

    // Add + Custom Button — use ONLY data-open-modal, no inline onclick
    html += `
      <button type="button" class="select-chip" data-open-modal="modal-custom-timer" style="background: rgba(15, 23, 42, 0.05); font-weight: 700;">
        + Custom
      </button>
    `;

    container.innerHTML = html;
  }

  function updateTimerDisplay() {
    const displayEl = document.getElementById('timer-display');
    const todayMinsEl = document.getElementById('timer-today-mins');
    const modeEl = document.getElementById('timer-mode-name');

    const mins = Math.floor(timerRemainingSeconds / 60);
    const secs = timerRemainingSeconds % 60;
    if (displayEl) {
      displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (todayMinsEl) {
      todayMinsEl.textContent = `${state.studyStats.todayMinutes} mins`;
    }

    if (modeEl) {
      if (timerMode === 'focus') {
        modeEl.textContent = `Focus Session • ${currentPreset.rest}m Rest Scheduled`;
        modeEl.style.color = 'var(--text-muted)';
      } else {
        modeEl.textContent = `☕ Recharge Rest Break • ${mins}m Remaining`;
        modeEl.style.color = 'var(--accent-blue)';
      }
    }
  }

  function selectTimerPreset(id) {
    if (!state.customTimerPresets) state.customTimerPresets = [];
    const all = [...DEFAULT_TIMER_PRESETS, ...state.customTimerPresets];
    const found = all.find(p => p.id === id);
    if (!found) return;

    pauseTimer();
    timerMode = 'focus';
    currentPreset = found;
    timerTotalSeconds = found.focus * 60;
    timerRemainingSeconds = timerTotalSeconds;

    hideRestCard();
    renderPresetChips();
    updateTimerDisplay();
  }

  function syncTimerMascot(status) {
    const box = document.getElementById('timer-mascot-box');
    const badgeText = document.getElementById('timer-mascot-badge-text');
    if (!box || !badgeText) return;

    if (status === 'running') {
      box.classList.remove('paused');
      box.classList.add('running');
      badgeText.textContent = timerMode === 'focus' ? 'Cruising in Focus 🛹' : 'Recharging ☕';
      if (prepLottieAnim) {
        prepLottieAnim.play();
      }
    } else if (status === 'paused') {
      box.classList.remove('running');
      box.classList.add('paused');
      badgeText.textContent = timerMode === 'focus' ? 'Focus Paused ⏸️' : 'Rest Paused ⏸️';
      if (prepLottieAnim) {
        prepLottieAnim.pause();
      }
    } else if (status === 'idle') {
      box.classList.remove('running', 'paused');
      badgeText.textContent = 'Focus Ready';
      if (prepLottieAnim) {
        prepLottieAnim.pause();
        prepLottieAnim.goToAndStop(0, true);
      }
    }
  }

  function toggleTimer() {
    if (timerIsRunning) pauseTimer();
    else startTimer();
  }

  function startTimer() {
    timerIsRunning = true;
    const label = document.getElementById('timer-toggle-label');
    if (label) label.textContent = 'Pause';
    syncTimerMascot('running');

    timerInterval = setInterval(() => {
      if (timerRemainingSeconds > 0) {
        timerRemainingSeconds--;
        updateTimerDisplay();
      } else {
        // Finished current countdown
        pauseTimer();

        if (timerMode === 'focus') {
          // Focus completed!
          playOfflineChime('bell');
          const studyMins = Math.round(timerTotalSeconds / 60);
          state.studyStats.todayMinutes += studyMins;
          saveState();
          updateTimerDisplay();
          showRestCard(studyMins, currentPreset.rest);
        } else {
          // Rest completed!
          playOfflineChime('success');
          alert(`Break complete! You are refreshed and ready for your next study session.`);
          hideRestCard();
          timerMode = 'focus';
          timerTotalSeconds = currentPreset.focus * 60;
          timerRemainingSeconds = timerTotalSeconds;
          updateTimerDisplay();
          syncTimerMascot('idle');
        }
      }
    }, 1000);
  }

  function pauseTimer() {
    timerIsRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    const label = document.getElementById('timer-toggle-label');
    if (label) label.textContent = timerMode === 'focus' ? 'Start Focus' : 'Resume Rest';
    syncTimerMascot('paused');
  }

  function resetTimer() {
    pauseTimer();
    timerMode = 'focus';
    timerTotalSeconds = currentPreset.focus * 60;
    timerRemainingSeconds = timerTotalSeconds;
    hideRestCard();
    updateTimerDisplay();
    syncTimerMascot('idle');
  }

  function showRestCard(studyMins, restMins) {
    const card = document.getElementById('timer-rest-card');
    const heading = document.getElementById('rest-card-heading');
    const desc = document.getElementById('rest-card-desc');
    const restText = document.getElementById('rest-duration-text');

    if (heading) heading.textContent = `Focus Session Complete (${studyMins}m)!`;
    if (desc) desc.textContent = `Outstanding concentration! Taking a ${restMins}-minute break lets your mind consolidate what you just learned.`;
    if (restText) restText.textContent = `${restMins}m`;
    if (card) card.style.display = 'flex';
  }

  function hideRestCard() {
    const card = document.getElementById('timer-rest-card');
    if (card) card.style.display = 'none';
  }

  function startRestSession() {
    hideRestCard();
    timerMode = 'rest';
    timerTotalSeconds = currentPreset.rest * 60;
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();
    startTimer();
    syncTimerMascot('running');
  }

  function skipRestSession() {
    hideRestCard();
    timerMode = 'focus';
    timerTotalSeconds = currentPreset.focus * 60;
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();
    syncTimerMascot('idle');
  }

  // ==========================================================================
  // 9. Modals & Action Listeners
  // ==========================================================================
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      const firstInput = el.querySelector('input:not([type="hidden"]), select, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 80);
      }
    }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function setupModals() {
    // SINGLE delegated listener for ALL modal openers (static + dynamic)
    document.addEventListener('click', (e) => {
      // Open modal
      const opener = e.target.closest('[data-open-modal]');
      if (opener) {
        e.preventDefault();
        e.stopPropagation();
        openModal(opener.dataset.openModal);
        return;
      }
      // Close modal via data-close
      const closer = e.target.closest('[data-close]');
      if (closer) {
        e.preventDefault();
        closeModal(closer.dataset.close);
        return;
      }
      // Close modal by clicking the overlay backdrop
      const overlay = e.target.closest('.liquid-modal-overlay');
      if (overlay && e.target === overlay) {
        overlay.classList.remove('active');
        return;
      }
    });

    // Modal Openers
    const btnModalAddTimetable = document.getElementById('btn-modal-add-timetable');
    if (btnModalAddTimetable) {
      btnModalAddTimetable.addEventListener('click', () => {
        openNewTimetableModal();
      });
    }

    const btnModalAddAssignment = document.getElementById('btn-modal-add-assignment');
    if (btnModalAddAssignment) {
      btnModalAddAssignment.addEventListener('click', () => {
        openNewAssignmentModal();
      });
    }

    const btnModalAddGoal = document.getElementById('btn-modal-add-goal');
    if (btnModalAddGoal) btnModalAddGoal.addEventListener('click', () => openModal('modal-goal'));

    const btnProfile = document.getElementById('btn-header-profile');
    if (btnProfile) {
      btnProfile.addEventListener('click', () => {
        if (!state.user.isSetupComplete) return;
        document.getElementById('prof-display-name').textContent = state.user.name;
        document.getElementById('prof-display-track').textContent = `${state.user.level} • ${state.user.track}`;
        document.getElementById('prof-display-subjects').textContent = `Subjects: ${state.user.subjects.join(', ')}`;
        openModal('modal-profile');
      });
    }

    // Form: Add / Edit Assignment
    const formAssignment = document.getElementById('form-add-assignment');
    const taskTypeSelect = document.getElementById('task-type');
    if (taskTypeSelect) {
      taskTypeSelect.addEventListener('change', () => {
        const groupField = document.getElementById('group-task-members-field');
        if (groupField) groupField.style.display = taskTypeSelect.value === 'group' ? 'block' : 'none';
      });
    }

    if (formAssignment) {
      formAssignment.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const subject = getChosenSubject('task-subject-select', 'task-subject-custom');
        const due = document.getElementById('task-due').value;
        const type = document.getElementById('task-type').value;
        const priority = document.getElementById('task-priority').value;
        const members = document.getElementById('task-members').value.trim();
        const notes = document.getElementById('task-notes') ? document.getElementById('task-notes').value.trim() : '';
        const editId = document.getElementById('task-edit-id').value;

        if (!title) {
          alert('Please enter an assignment title.');
          return;
        }

        if (!subject) {
          alert('Please choose or type a subject for this assignment.');
          const customInput = document.getElementById('task-subject-custom');
          if (customInput && customInput.style.display !== 'none') customInput.focus();
          return;
        }

        registerCustomSubjectIfNew(subject);

        if (editId) {
          // Editing existing assignment
          const existing = state.assignments.find(a => a.id === editId);
          if (existing) {
            existing.title = title;
            existing.subject = subject;
            existing.due = due;
            existing.type = type;
            existing.priority = priority;
            existing.members = members;
            existing.notes = notes;
          }
        } else {
          // Creating new assignment
          state.assignments.unshift({
            id: 'task-' + Date.now(),
            title,
            subject,
            due,
            type,
            priority,
            members,
            notes,
            completed: false
          });
        }

        saveState();
        closeModal('modal-assignment');
        renderAssignmentsTab();
        renderAssistantTab();
      });
    }

    // Form: Add Timetable Slot
    const formTimetable = document.getElementById('form-add-timetable');
    if (formTimetable) {
      formTimetable.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = getChosenSubject('slot-subject-select', 'slot-subject-custom');
        const day = parseInt(document.getElementById('slot-day').value, 10);
        const type = document.getElementById('slot-type').value;
        const start = document.getElementById('slot-start').value;
        const end = document.getElementById('slot-end').value;
        const room = document.getElementById('slot-room').value.trim();

        if (!subject) {
          alert('Please choose or type a subject or activity name.');
          return;
        }

        if (start && end && start >= end) {
          alert('Start time must be earlier than end time.');
          return;
        }

        registerCustomSubjectIfNew(subject);

        const editId = document.getElementById('slot-edit-id') ? document.getElementById('slot-edit-id').value : '';
        if (editId) {
          const existing = state.timetable.find(s => s.id === editId);
          if (existing) {
            existing.day = day;
            existing.subject = subject;
            existing.type = type;
            existing.start = start;
            existing.end = end;
            existing.room = room;
          }
        } else {
          state.timetable.push({
            id: 'slot-' + Date.now(),
            day,
            subject,
            type,
            start,
            end,
            room
          });
        }

        state.activeDay = day;
        saveState();
        closeModal('modal-timetable');
        renderTimetableTab();
        renderAssistantTab();
      });
    }

    // Form: Add Goal / Habit
    const formGoal = document.getElementById('form-add-goal');
    if (formGoal) {
      formGoal.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('goal-type').value;
        const desc = document.getElementById('goal-desc').value.trim();
        const subject = document.getElementById('goal-subject-input').value.trim();

        if (type === 'daily') {
          state.dailyGoals.push({ id: 'dg-' + Date.now(), text: desc, subject, completed: false });
        } else {
          state.habits.push({ id: 'hb-' + Date.now(), name: desc, subject, streak: 1 });
        }

        saveState();
        closeModal('modal-goal');
        renderGoalsTab();
      });
    }

    // Profile & Reset Buttons
    const btnEditSetup = document.getElementById('btn-edit-setup');
    if (btnEditSetup) {
      btnEditSetup.addEventListener('click', () => {
        closeModal('modal-profile');
        state.user.isSetupComplete = false;
        renderScreen();
        // Populate intro fields with existing
        document.getElementById('intro-name').value = state.user.name;
        document.getElementById('intro-subjects-input').value = state.user.subjects.join(', ');
      });
    }

    const btnResetAll = document.getElementById('btn-reset-all');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('Clear all schedule data, assignments, and start fresh?')) {
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        }
      });
    }

    // Timetable Day Filter Chips
    const ttDayChips = document.querySelectorAll('#timetable-day-chips .select-chip');
    ttDayChips.forEach(chip => {
      chip.addEventListener('click', () => {
        state.activeDay = parseInt(chip.dataset.day, 10);
        renderTimetableTab();
      });
    });

    // Assignment Filter Chips
    const assignChips = document.querySelectorAll('#assignment-filter-chips .select-chip');
    assignChips.forEach(chip => {
      chip.addEventListener('click', () => {
        assignChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter;
        renderAssignmentsTab();
      });
    });

    // Rest Session Action Buttons
    const btnStartRest = document.getElementById('btn-start-rest');
    if (btnStartRest) btnStartRest.addEventListener('click', startRestSession);

    const btnSkipRest = document.getElementById('btn-skip-rest');
    if (btnSkipRest) btnSkipRest.addEventListener('click', skipRestSession);

    // Custom Timer Modal Form
    const customStudyInput = document.getElementById('custom-study-mins');
    const customRestInput = document.getElementById('custom-rest-mins');
    if (customStudyInput && customRestInput) {
      customStudyInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 0;
        customRestInput.value = Math.max(1, Math.round(val * 0.2));
      });
    }

    const formCustomTimer = document.getElementById('form-custom-timer');
    if (formCustomTimer) {
      formCustomTimer.addEventListener('submit', (e) => {
        e.preventDefault();
        const focus = parseInt(document.getElementById('custom-study-mins').value, 10);
        const rest = parseInt(document.getElementById('custom-rest-mins').value, 10);
        const labelInput = document.getElementById('custom-timer-label').value.trim();
        const label = labelInput || `${focus}m (${rest}m rest)`;

        const newPreset = {
          id: 'cust-' + Date.now(),
          focus,
          rest,
          label
        };

        if (!state.customTimerPresets) state.customTimerPresets = [];
        state.customTimerPresets.push(newPreset);
        saveState();

        selectTimerPreset(newPreset.id);
        closeModal('modal-custom-timer');
        formCustomTimer.reset();
      });
    }

    // Timer Controls
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    if (btnTimerToggle) btnTimerToggle.addEventListener('click', toggleTimer);

    const btnTimerReset = document.getElementById('btn-timer-reset');
    if (btnTimerReset) btnTimerReset.addEventListener('click', resetTimer);

    // Celebration Modal Close
    const btnCloseCelebration = document.getElementById('btn-close-celebration');
    if (btnCloseCelebration) btnCloseCelebration.addEventListener('click', hideCelebration);

    // Configure Exam Target Modal
    const btnConfigExam = document.getElementById('btn-config-exam');
    if (btnConfigExam) {
      btnConfigExam.addEventListener('click', () => {
        if (!state.examTarget) state.examTarget = getDefaultExamTarget();
        document.getElementById('target-exam-name').value = state.examTarget.name || 'WASSCE';
        document.getElementById('target-exam-date').value = state.examTarget.date || '';
        document.getElementById('target-exam-hours').value = state.examTarget.dailyTargetHours || 3;
        openModal('modal-exam-target');
      });
    }

    const formExamTarget = document.getElementById('form-exam-target');
    if (formExamTarget) {
      formExamTarget.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('target-exam-name').value.trim();
        const date = document.getElementById('target-exam-date').value;
        const hours = parseFloat(document.getElementById('target-exam-hours').value) || 3;
        if (!name || !date) return;
        state.examTarget = { name, date, dailyTargetHours: hours };
        saveState();
        closeModal('modal-exam-target');
        renderExamHorizon();
      });
    }

    // Add Kit Item Modal
    const btnAddKitItem = document.getElementById('btn-add-kit-item');
    if (btnAddKitItem) {
      btnAddKitItem.addEventListener('click', () => {
        document.getElementById('form-kit-item').reset();
        openModal('modal-kit-item');
      });
    }

    const formKitItem = document.getElementById('form-kit-item');
    if (formKitItem) {
      formKitItem.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('kit-input-name').value.trim();
        const subject = document.getElementById('kit-input-subject').value.trim();
        if (!name) return;
        if (!Array.isArray(state.kitItems)) state.kitItems = [];
        state.kitItems.push({
          id: 'kit-' + Date.now(),
          name,
          subject: subject || 'General',
          packed: false
        });
        saveState();
        closeModal('modal-kit-item');
        renderKitChecklist();
      });
    }

    // Data Vault Backup & Restore Listeners
    const btnExport = document.getElementById('btn-export-backup');
    const btnAboutExport = document.getElementById('btn-about-export-backup');
    const btnImport = document.getElementById('btn-trigger-import');
    const btnAboutImport = document.getElementById('btn-about-trigger-import');
    const fileInput = document.getElementById('input-backup-file');

    if (btnExport) btnExport.addEventListener('click', exportDataBackup);
    if (btnAboutExport) btnAboutExport.addEventListener('click', exportDataBackup);
    if (btnImport && fileInput) btnImport.addEventListener('click', () => fileInput.click());
    if (btnAboutImport && fileInput) btnAboutImport.addEventListener('click', () => fileInput.click());
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImportFile(e.target.files[0]);
          fileInput.value = '';
        }
      });
    }
  }

  // ==========================================================================
  // 10. Public API
  // ==========================================================================
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  window.StudyMate = window.StudyPulse = {
    openModal,
    closeModal,

    selectTimerPreset: (id) => selectTimerPreset(id),

    deleteCustomPreset: (id) => {
      state.customTimerPresets = (state.customTimerPresets || []).filter(p => p.id !== id);
      saveState();
      if (currentPreset && currentPreset.id === id) {
        selectTimerPreset('p-25');
      } else {
        renderPresetChips();
      }
    },

    openNewTimetable: () => openNewTimetableModal(),
    editTimetableSlot: (id) => {
      const slot = state.timetable.find(s => s.id === id);
      if (slot) openEditTimetableModal(slot);
    },

    toggleKitItem: (id) => {
      const item = (state.kitItems || []).find(i => i.id === id);
      if (item) {
        item.packed = !item.packed;
        saveState();
        renderKitChecklist();
      }
    },

    deleteKitItem: (id) => {
      state.kitItems = (state.kitItems || []).filter(i => i.id !== id);
      saveState();
      renderKitChecklist();
    },

    exportBackup: () => exportDataBackup(),

    openNewTask: () => openNewAssignmentModal(),
    editTask: (id) => {
      const task = state.assignments.find(a => a.id === id);
      if (task) openEditAssignmentModal(task);
    },

    toggleTask: (id) => {
      const task = state.assignments.find(a => a.id === id);
      if (task) {
        const wasCompleted = task.completed;
        task.completed = !task.completed;
        saveState();
        renderAssignmentsTab();
        renderAssistantTab();
        // 🎉 Celebrate only when newly marking as done (not unchecking)
        if (!wasCompleted && task.completed) {
          showCelebration(task.title);
        }
      }
    },

    deleteTask: (id) => {
      state.assignments = state.assignments.filter(a => a.id !== id);
      saveState();
      renderAssignmentsTab();
      renderAssistantTab();
    },

    deleteTimetableSlot: (id) => {
      state.timetable = state.timetable.filter(s => s.id !== id);
      saveState();
      renderTimetableTab();
    },

    toggleGoal: (id) => {
      const g = state.dailyGoals.find(item => item.id === id);
      if (g) {
        g.completed = !g.completed;
        saveState();
        renderGoalsTab();
      }
    },

    deleteGoal: (id) => {
      state.dailyGoals = state.dailyGoals.filter(item => item.id !== id);
      saveState();
      renderGoalsTab();
    },

    incrementHabit: (id) => {
      const h = state.habits.find(item => item.id === id);
      if (h) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (h.lastLoggedDate === todayStr) {
          alert(`You have already logged "${h.name}" for today! Keep the streak alive tomorrow.`);
          return;
        }
        h.streak += 1;
        h.lastLoggedDate = todayStr;
        saveState();
        renderGoalsTab();
        // Streak burst animation
        const label = document.getElementById(`streak-label-${id}`);
        if (label) {
          label.classList.remove('streak-burst');
          void label.offsetWidth; // reflow to restart animation
          label.classList.add('streak-burst');
        }
        if (h.streak > 0 && h.streak % 7 === 0) {
          // Weekly milestone celebration
          showCelebration(`${h.streak} day streak on "${h.name}"! Keep it up! 🔥`);
        }
      }
    },

    deleteHabit: (id) => {
      state.habits = state.habits.filter(item => item.id !== id);
      saveState();
      renderGoalsTab();
    }
  };

  function renderDashboard() {
    renderAssistantTab();
    renderTimetableTab();
    renderAssignmentsTab();
    renderGoalsTab();
    renderPresetChips();
    updateTimerDisplay();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.log('[StudyMate] Offline Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('[StudyMate] Service Worker registration failed:', err);
      });
    }
  }

  function init() {
    loadState();
    setupIntroForm();
    setupDashboardNavigation();
    setupModals();
    initTransparentMascots();
    registerServiceWorker();
    renderScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
