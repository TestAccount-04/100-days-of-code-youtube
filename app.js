/**
 * Python 100 Days of Code - Interactive Web Application
 * Mobile-First Responsive Reader & Progress Tracker
 */

(function () {
  'use strict';

  // --- APP STATE ---
  // --- APP STATE ---
  const state = {
    lessons: (typeof LESSONS_DATA !== 'undefined' ? LESSONS_DATA : (window.LESSONS_DATA || [])),
    currentDay: 1,
    activeTab: 'theory',
    searchQuery: '',
    selectedCategory: 'all',
    completedDays: new Set(),
    fontSize: 16,
    theme: 'dark'
  };

  // --- DOM ELEMENTS ---
  const el = {
    // Header & Navigation
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    appSidebar: document.getElementById('app-sidebar'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    headerProgressBadge: document.getElementById('header-progress-badge'),
    progressPercentText: document.getElementById('progress-percent-text'),
    dayJumpInput: document.getElementById('day-jump-input'),
    jumpGoBtn: document.getElementById('jump-go-btn'),

    // Font Controls
    fontDecreaseBtn: document.getElementById('font-decrease-btn'),
    fontIncreaseBtn: document.getElementById('font-increase-btn'),
    fontDecreaseMobile: document.getElementById('font-decrease-btn-mobile'),
    fontIncreaseMobile: document.getElementById('font-increase-btn-mobile'),

    // Sidebar
    searchInput: document.getElementById('sidebar-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    categoryPills: document.getElementById('category-pills'),
    lessonsList: document.getElementById('lessons-list'),
    statsCompletedCount: document.getElementById('stats-completed-count'),
    sidebarProgressFill: document.getElementById('sidebar-progress-fill'),
    resetProgressBtn: document.getElementById('reset-progress-btn'),

    // Lesson Viewer Header
    lessonDayBadge: document.getElementById('lesson-day-badge'),
    lessonCategoryBadge: document.getElementById('lesson-category-badge'),
    lessonMainTitle: document.getElementById('lesson-main-title'),
    lessonFolderPath: document.getElementById('lesson-folder-path'),
    markDoneBtn: document.getElementById('mark-done-btn'),
    markDoneText: document.getElementById('mark-done-text'),

    // Toolbar & Tabs
    tabTheoryBtn: document.getElementById('tab-theory-btn'),
    tabCodeBtn: document.getElementById('tab-code-btn'),
    paneTheory: document.getElementById('pane-theory'),
    paneCode: document.getElementById('pane-code'),
    markdownContainer: document.getElementById('markdown-container'),
    mainCodeBlock: document.getElementById('main-code-block'),
    copyMainCodeBtn: document.getElementById('copy-main-code-btn'),

    // TOC Popover
    tocToggleBtn: document.getElementById('toc-toggle-btn'),
    tocPopover: document.getElementById('toc-popover'),
    tocCloseBtn: document.getElementById('toc-close-btn'),
    tocList: document.getElementById('toc-list'),

    // Bottom Navigation Bar
    navPrevBtn: document.getElementById('nav-prev-btn'),
    navNextBtn: document.getElementById('nav-next-btn'),
    prevDayTitle: document.getElementById('prev-day-title'),
    nextDayTitle: document.getElementById('next-day-title'),
    indicatorCurrent: document.getElementById('indicator-current'),
    readingProgressBar: document.getElementById('reading-progress-bar'),

    // Toast Container
    toastContainer: document.getElementById('toast-container'),
    contentArea: document.getElementById('content-area')
  };

  // --- INITIALIZATION ---
  function init() {
    loadLocalStorage();
    
    // Ensure lessons data is populated
    if ((!state.lessons || state.lessons.length === 0)) {
      if (typeof LESSONS_DATA !== 'undefined') state.lessons = LESSONS_DATA;
      else if (window.LESSONS_DATA) state.lessons = window.LESSONS_DATA;
    }

    configureMarked();
    setupEventListeners();
    setupTouchGestures();
    
    // Determine initial day to show
    if (state.lessons && state.lessons.length > 0) {
      const found = state.lessons.find(l => l.day === state.currentDay);
      if (!found) state.currentDay = state.lessons[0].day;
    }

    renderSidebar();
    renderLesson(state.currentDay);
    updateProgressUI();
    applyTheme(state.theme);
    applyFontSize(state.fontSize);

    // Re-initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- LOCAL STORAGE HELPERS ---
  function loadLocalStorage() {
    try {
      const savedCompleted = localStorage.getItem('py100_completed');
      if (savedCompleted) {
        const arr = JSON.parse(savedCompleted);
        state.completedDays = new Set(arr);
      }

      const savedDay = localStorage.getItem('py100_last_day');
      if (savedDay) {
        state.currentDay = parseInt(savedDay, 10) || 1;
      }

      const savedTheme = localStorage.getItem('py100_theme');
      if (savedTheme) {
        state.theme = savedTheme;
      }

      const savedFont = localStorage.getItem('py100_fontsize');
      if (savedFont) {
        state.fontSize = parseInt(savedFont, 10) || 16;
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
  }

  function saveCompletedToStorage() {
    try {
      localStorage.setItem('py100_completed', JSON.stringify(Array.from(state.completedDays)));
    } catch (e) {}
  }

  function saveLastDayToStorage(day) {
    try {
      localStorage.setItem('py100_last_day', day);
    } catch (e) {}
  }

  // --- MARKED PARSER SETUP ---
  function configureMarked() {
    if (typeof marked !== 'undefined') {
      const renderer = new marked.Renderer();

      // Custom code block renderer compatible with marked v4 - v12
      renderer.code = function (code, lang) {
        let textVal = '';
        let language = 'python';
        if (typeof code === 'object' && code !== null) {
          textVal = code.text || code.raw || '';
          language = code.lang || lang || 'python';
        } else {
          textVal = code || '';
          language = lang || 'python';
        }

        const escapedCode = String(textVal)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        return `
          <div class="code-block-wrapper">
            <div class="code-header-bar">
              <span class="code-lang-label">${language}</span>
              <button class="copy-snippet-btn" onclick="copyCodeSnippet(this)">
                <i data-lucide="copy" style="width:14px;height:14px;"></i> Copy
              </button>
            </div>
            <pre><code class="language-${language}">${escapedCode}</code></pre>
          </div>
        `;
      };

      try {
        if (typeof marked.use === 'function') {
          marked.use({ renderer: renderer, gfm: true, breaks: true });
        } else if (typeof marked.setOptions === 'function') {
          marked.setOptions({ renderer: renderer, gfm: true, breaks: true });
        }
      } catch (e) {
        console.warn("Marked setup warning:", e);
      }
    }
  }

  // Global helper for code snippet copy
  window.copyCodeSnippet = function (btn) {
    const codeBlock = btn.closest('.code-block-wrapper').querySelector('code');
    if (codeBlock) {
      const text = codeBlock.textContent;
      navigator.clipboard.writeText(text).then(() => {
        showToast("Code copied to clipboard!", "success");
      }).catch(() => {
        showToast("Failed to copy code", "error");
      });
    }
  };

  // --- RENDER SIDEBAR LESSONS LIST ---
  function renderSidebar() {
    el.lessonsList.innerHTML = '';

    const filtered = state.lessons.filter(item => {
      // Category filter
      if (state.selectedCategory !== 'all' && item.category !== state.selectedCategory) {
        return false;
      }
      // Search query filter
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchDay = `day ${item.day}`.includes(q) || `${item.day}` === q;
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchFolder = item.folder.toLowerCase().includes(q);
        return matchDay || matchTitle || matchFolder;
      }
      return true;
    });

    if (filtered.length === 0) {
      el.lessonsList.innerHTML = `
        <li style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No matching days found.
        </li>
      `;
      return;
    }

    filtered.forEach(lesson => {
      const li = document.createElement('li');
      const isActive = lesson.day === state.currentDay;
      const isCompleted = state.completedDays.has(lesson.day);

      li.className = `lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
      li.setAttribute('data-day', lesson.day);

      li.innerHTML = `
        <div class="day-num-box">${lesson.day}</div>
        <div class="item-info">
          <span class="item-title">${escapeHtml(lesson.title)}</span>
          <span class="item-cat">${escapeHtml(lesson.category)}</span>
        </div>
        <i data-lucide="check-circle-2" class="check-icon"></i>
      `;

      li.addEventListener('click', () => {
        selectDay(lesson.day);
        closeMobileSidebar();
      });

      el.lessonsList.appendChild(li);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- RENDER CURRENT LESSON ---
  function renderLesson(dayNum) {
    const lesson = state.lessons.find(l => l.day === dayNum);
    if (!lesson) return;

    state.currentDay = dayNum;
    saveLastDayToStorage(dayNum);

    // Update Header Card Metadata
    el.lessonDayBadge.textContent = `Day ${lesson.day}`;
    el.lessonCategoryBadge.textContent = lesson.category;
    el.lessonMainTitle.textContent = lesson.title;
    el.lessonFolderPath.innerHTML = `<i data-lucide="folder"></i> ${escapeHtml(lesson.folder)}`;
    el.dayJumpInput.value = lesson.day;

    // Mark Done Button state
    const isDone = state.completedDays.has(lesson.day);
    if (isDone) {
      el.markDoneBtn.classList.add('completed');
      el.markDoneText.textContent = 'Completed';
    } else {
      el.markDoneBtn.classList.remove('completed');
      el.markDoneText.textContent = 'Mark Completed';
    }

    // Render Markdown Theory
    try {
      if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        el.markdownContainer.innerHTML = marked.parse(lesson.tutorial || '*No theory tutorial available for this day.*');
      } else {
        el.markdownContainer.textContent = lesson.tutorial;
      }
    } catch (err) {
      console.warn("Markdown parse error:", err);
      el.markdownContainer.innerText = lesson.tutorial || '';
    }

    // Highlight all code blocks in tutorial
    el.markdownContainer.querySelectorAll('pre code').forEach((block) => {
      if (typeof hljs !== 'undefined') {
        hljs.highlightElement(block);
      }
    });

    // Render Main.py Code Tab
    const codeContent = lesson.code && lesson.code.trim() ? lesson.code : '# No code snippet provided in main.py for this day.';
    el.mainCodeBlock.textContent = codeContent;
    if (typeof hljs !== 'undefined') {
      hljs.highlightElement(el.mainCodeBlock);
    }

    // Build Table of Contents
    buildTableOfContents();

    // Update Bottom Prev / Next Nav
    updateNavButtons(dayNum);

    // Update Sidebar active item
    document.querySelectorAll('.lesson-item').forEach(item => {
      const d = parseInt(item.getAttribute('data-day'), 10);
      if (d === dayNum) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active');
      }
    });

    // Re-initialize Lucide Icons for rendered content
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- TABLE OF CONTENTS GENERATOR ---
  function buildTableOfContents() {
    el.tocList.innerHTML = '';
    const headings = el.markdownContainer.querySelectorAll('h1, h2, h3');

    if (headings.length === 0) {
      el.tocList.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted); padding:0.5rem;">No sections found.</span>';
      return;
    }

    headings.forEach((heading, idx) => {
      // Assign ID if missing
      if (!heading.id) {
        heading.id = `heading-${idx}`;
      }

      const a = document.createElement('a');
      a.className = `toc-item level-${heading.tagName.charAt(1)}`;
      a.href = `#${heading.id}`;
      a.textContent = heading.textContent;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.tocPopover.classList.remove('active');
      });

      el.tocList.appendChild(a);
    });
  }

  // --- UPDATE PREV / NEXT NAVIGATION ---
  function updateNavButtons(dayNum) {
    const index = state.lessons.findIndex(l => l.day === dayNum);
    
    // Prev Button
    if (index > 0) {
      const prevLesson = state.lessons[index - 1];
      el.navPrevBtn.disabled = false;
      el.navPrevBtn.style.opacity = '1';
      el.prevDayTitle.textContent = `Day ${prevLesson.day}`;
    } else {
      el.navPrevBtn.disabled = true;
      el.navPrevBtn.style.opacity = '0.4';
      el.prevDayTitle.textContent = 'None';
    }

    // Next Button
    if (index < state.lessons.length - 1) {
      const nextLesson = state.lessons[index + 1];
      el.navNextBtn.disabled = false;
      el.navNextBtn.style.opacity = '1';
      el.nextDayTitle.textContent = `Day ${nextLesson.day}`;
    } else {
      el.navNextBtn.disabled = true;
      el.navNextBtn.style.opacity = '0.4';
      el.nextDayTitle.textContent = 'None';
    }

    el.indicatorCurrent.textContent = dayNum;
  }

  // --- DAY SELECTION HANDLER ---
  function selectDay(dayNum) {
    const target = state.lessons.find(l => l.day === dayNum);
    if (target) {
      renderLesson(dayNum);
    } else {
      showToast(`Day ${dayNum} not found`, "error");
    }
  }

  // --- PROGRESS UI UPDATE ---
  function updateProgressUI() {
    const count = state.completedDays.size;
    const total = 100;
    const percent = Math.round((count / total) * 100);

    el.statsCompletedCount.textContent = count;
    el.sidebarProgressFill.style.width = `${percent}%`;
    el.progressPercentText.textContent = `${percent}%`;
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Mobile menu toggle
    el.mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    el.sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Day Jump Input
    el.jumpGoBtn.addEventListener('click', () => {
      const val = parseInt(el.dayJumpInput.value, 10);
      if (val >= 1 && val <= 100) {
        selectDay(val);
      }
    });

    el.dayJumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = parseInt(el.dayJumpInput.value, 10);
        if (val >= 1 && val <= 100) {
          selectDay(val);
        }
      }
    });

    // Mark Done Button
    el.markDoneBtn.addEventListener('click', () => {
      if (state.completedDays.has(state.currentDay)) {
        state.completedDays.delete(state.currentDay);
        showToast(`Day ${state.currentDay} marked incomplete`);
      } else {
        state.completedDays.add(state.currentDay);
        showToast(`Day ${state.currentDay} completed! 🎉`, "success");
      }
      saveCompletedToStorage();
      renderSidebar();
      renderLesson(state.currentDay);
      updateProgressUI();
    });

    // Reset Progress
    el.resetProgressBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all reading progress?')) {
        state.completedDays.clear();
        saveCompletedToStorage();
        renderSidebar();
        renderLesson(state.currentDay);
        updateProgressUI();
        showToast('Reading progress reset');
      }
    });

    // Tab Switching
    el.tabTheoryBtn.addEventListener('click', () => switchTab('theory'));
    el.tabCodeBtn.addEventListener('click', () => switchTab('code'));

    // Search Input
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.searchQuery) {
        el.clearSearchBtn.classList.add('show');
      } else {
        el.clearSearchBtn.classList.remove('show');
      }
      renderSidebar();
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      state.searchQuery = '';
      el.clearSearchBtn.classList.remove('show');
      renderSidebar();
    });

    // Category Filter Pills
    el.categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.cat-pill');
      if (pill) {
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedCategory = pill.getAttribute('data-cat');
        renderSidebar();
      }
    });

    // Copy Main.py Code
    el.copyMainCodeBtn.addEventListener('click', () => {
      const codeText = el.mainCodeBlock.textContent;
      navigator.clipboard.writeText(codeText).then(() => {
        showToast("Code copied to clipboard!", "success");
      }).catch(() => {
        showToast("Failed to copy code", "error");
      });
    });

    // Theme Toggle
    el.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(state.theme);
    });

    // Font Controls
    const incFont = () => applyFontSize(state.fontSize + 1);
    const decFont = () => applyFontSize(state.fontSize - 1);

    el.fontIncreaseBtn.addEventListener('click', incFont);
    el.fontDecreaseBtn.addEventListener('click', decFont);
    el.fontIncreaseMobile.addEventListener('click', incFont);
    el.fontDecreaseMobile.addEventListener('click', decFont);

    // TOC Toggle
    el.tocToggleBtn.addEventListener('click', () => {
      el.tocPopover.classList.toggle('active');
    });
    el.tocCloseBtn.addEventListener('click', () => {
      el.tocPopover.classList.remove('active');
    });

    // Prev / Next Navigation Buttons
    el.navPrevBtn.addEventListener('click', () => navigateDay(-1));
    el.navNextBtn.addEventListener('click', () => navigateDay(1));

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        navigateDay(-1);
      } else if (e.key === 'ArrowRight') {
        navigateDay(1);
      } else if (e.key === '/') {
        e.preventDefault();
        el.searchInput.focus();
      }
    });

    // Scroll Progress Bar Update
    window.addEventListener('scroll', updateReadingProgress);
  }

  // --- TOUCH SWIPE GESTURES ---
  function setupTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;

    el.contentArea.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    el.contentArea.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const threshold = 70; // Minimum swipe distance in px
      if (touchEndX < touchStartX - threshold) {
        // Swipe Left -> Next Day
        navigateDay(1);
      } else if (touchEndX > touchStartX + threshold) {
        // Swipe Right -> Prev Day
        navigateDay(-1);
      }
    }
  }

  // --- HELPER FUNCTIONS ---
  function switchTab(tabName) {
    state.activeTab = tabName;
    if (tabName === 'theory') {
      el.tabTheoryBtn.classList.add('active');
      el.tabCodeBtn.classList.remove('active');
      el.paneTheory.classList.add('active');
      el.paneCode.classList.remove('active');
    } else {
      el.tabCodeBtn.classList.add('active');
      el.tabTheoryBtn.classList.remove('active');
      el.paneCode.classList.add('active');
      el.paneTheory.classList.remove('active');
    }
  }

  function navigateDay(direction) {
    const index = state.lessons.findIndex(l => l.day === state.currentDay);
    if (index !== -1) {
      const targetIndex = index + direction;
      if (targetIndex >= 0 && targetIndex < state.lessons.length) {
        selectDay(state.lessons[targetIndex].day);
      }
    }
  }

  function toggleMobileSidebar() {
    el.appSidebar.classList.toggle('open');
    el.sidebarOverlay.classList.toggle('active');
  }

  function closeMobileSidebar() {
    el.appSidebar.classList.remove('open');
    el.sidebarOverlay.classList.remove('active');
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('py100_theme', theme);
    } catch (e) {}

    // Update highlight.js theme stylesheet
    const hljsStyle = document.getElementById('hljs-theme');
    if (hljsStyle) {
      if (theme === 'light') {
        hljsStyle.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css";
      } else {
        hljsStyle.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css";
      }
    }
  }

  function applyFontSize(size) {
    if (size < 12 || size > 24) return;
    state.fontSize = size;
    el.markdownContainer.style.fontSize = `${size}px`;
    try {
      localStorage.setItem('py100_fontsize', size);
    } catch (e) {}
  }

  function updateReadingProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight > 0) {
      const progress = (scrollTop / docHeight) * 100;
      el.readingProgressBar.style.width = `${Math.min(progress, 100)}%`;
    } else {
      el.readingProgressBar.style.width = '0%';
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-circle' : 'info';
    toast.innerHTML = `<i data-lucide="${icon}"></i> ${escapeHtml(message)}`;

    el.toastContainer.appendChild(toast);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- BOOTSTRAP APP ---
  document.addEventListener('DOMContentLoaded', init);

})();
