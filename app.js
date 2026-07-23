/**
 * Python 100 Days of Code - Mobile-First Interactive Engine
 */

(function () {
  'use strict';

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
    // Header
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    appSidebar: document.getElementById('app-sidebar'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    daySelectDropdown: document.getElementById('day-select-dropdown'),

    // Sidebar
    searchInput: document.getElementById('sidebar-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    categoryPills: document.getElementById('category-pills'),
    lessonsList: document.getElementById('lessons-list'),
    statsCompletedCount: document.getElementById('stats-completed-count'),
    statsPercentCount: document.getElementById('stats-percent-count'),
    sidebarProgressFill: document.getElementById('sidebar-progress-fill'),
    resetProgressBtn: document.getElementById('reset-progress-btn'),

    // Workspace & Meta Badges
    lessonDayBadge: document.getElementById('lesson-day-badge'),
    lessonCategoryBadge: document.getElementById('lesson-category-badge'),

    // Tabs
    tabTheoryBtn: document.getElementById('tab-theory-btn'),
    tabCodeBtn: document.getElementById('tab-code-btn'),
    paneTheory: document.getElementById('pane-theory'),
    paneCode: document.getElementById('pane-code'),
    markdownContainer: document.getElementById('markdown-container'),
    mainCodeBlock: document.getElementById('main-code-block'),
    copyMainCodeBtn: document.getElementById('copy-main-code-btn'),

    // Bottom Navigation
    navPrevBtn: document.getElementById('nav-prev-btn'),
    navNextBtn: document.getElementById('nav-next-btn'),
    navDayText: document.getElementById('nav-day-text'),
    readingProgressBar: document.getElementById('reading-progress-bar'),

    // Sticky Bottom Bar
    fontDrawerBtn: document.getElementById('font-drawer-btn'),
    tocToggleBtn: document.getElementById('toc-toggle-btn'),
    markDoneBtn: document.getElementById('mark-done-btn'),
    markDoneText: document.getElementById('mark-done-text'),

    // Bottom Sheet Drawers & Overlays
    sheetOverlay: document.getElementById('sheet-overlay'),
    fontBottomSheet: document.getElementById('font-bottom-sheet'),
    closeFontSheet: document.getElementById('close-font-sheet'),
    fontRangeSlider: document.getElementById('font-range-slider'),
    fontSizeValDisplay: document.getElementById('font-size-val-display'),

    tocBottomSheet: document.getElementById('toc-bottom-sheet'),
    closeTocSheet: document.getElementById('close-toc-sheet'),
    tocList: document.getElementById('toc-list'),

    // Toast Container
    toastContainer: document.getElementById('toast-container'),
    contentArea: document.getElementById('content-area')
  };

  // --- INITIALIZATION ---
  function init() {
    loadLocalStorage();
    
    if ((!state.lessons || state.lessons.length === 0)) {
      if (typeof LESSONS_DATA !== 'undefined') state.lessons = LESSONS_DATA;
      else if (window.LESSONS_DATA) state.lessons = window.LESSONS_DATA;
    }

    configureMarked();
    populateDaySelectDropdown();
    setupEventListeners();
    setupTouchGestures();

    if (state.lessons && state.lessons.length > 0) {
      const found = state.lessons.find(l => l.day === state.currentDay);
      if (!found) state.currentDay = state.lessons[0].day;
    }

    renderSidebar();
    renderLesson(state.currentDay);
    updateProgressUI();
    applyTheme(state.theme);
    applyFontSize(state.fontSize);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- POPULATE DAY DROPDOWN ---
  function populateDaySelectDropdown() {
    if (!el.daySelectDropdown) return;
    el.daySelectDropdown.innerHTML = '';
    
    state.lessons.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.day;
      opt.textContent = `Day ${l.day}`;
      el.daySelectDropdown.appendChild(opt);
    });
  }

  // --- LOCAL STORAGE HELPERS ---
  function loadLocalStorage() {
    try {
      const savedCompleted = localStorage.getItem('py100_completed');
      if (savedCompleted) {
        state.completedDays = new Set(JSON.parse(savedCompleted));
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
      console.warn("localStorage error:", e);
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
      } catch (e) {}
    }
  }

  window.copyCodeSnippet = function (btn) {
    const codeBlock = btn.closest('.code-block-wrapper').querySelector('code');
    if (codeBlock) {
      navigator.clipboard.writeText(codeBlock.textContent).then(() => {
        showToast("Code copied to clipboard!", "success");
      });
    }
  };

  // --- RENDER SIDEBAR ---
  function renderSidebar() {
    el.lessonsList.innerHTML = '';

    const filtered = state.lessons.filter(item => {
      if (state.selectedCategory !== 'all' && item.category !== state.selectedCategory) {
        return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        return `day ${item.day}`.includes(q) || `${item.day}` === q || item.title.toLowerCase().includes(q) || item.folder.toLowerCase().includes(q);
      }
      return true;
    });

    if (filtered.length === 0) {
      el.lessonsList.innerHTML = `<li style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No matching days found.</li>`;
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

    // Update Header Select Dropdown & Badges
    if (el.daySelectDropdown) el.daySelectDropdown.value = dayNum;
    el.lessonDayBadge.textContent = `DAY ${lesson.day}`;
    el.lessonCategoryBadge.textContent = lesson.category.toUpperCase();

    // Mark Done Button state
    const isDone = state.completedDays.has(lesson.day);
    if (isDone) {
      el.markDoneBtn.classList.add('completed');
      el.markDoneText.textContent = 'Completed';
    } else {
      el.markDoneBtn.classList.remove('completed');
      el.markDoneText.textContent = 'Mark Complete';
    }

    // Render Markdown Theory (prevent duplicate H1)
    let rawTutorial = lesson.tutorial || '*No theory tutorial available for this day.*';

    try {
      if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        el.markdownContainer.innerHTML = marked.parse(rawTutorial);
      } else {
        el.markdownContainer.textContent = rawTutorial;
      }
    } catch (err) {
      el.markdownContainer.innerText = rawTutorial;
    }

    // Highlight Code Blocks
    el.markdownContainer.querySelectorAll('pre code').forEach((block) => {
      if (typeof hljs !== 'undefined') hljs.highlightElement(block);
    });

    // Render Code Tab
    const codeContent = lesson.code && lesson.code.trim() ? lesson.code : '# No code snippet provided in main.py for this day.';
    el.mainCodeBlock.textContent = codeContent;
    if (typeof hljs !== 'undefined') hljs.highlightElement(el.mainCodeBlock);

    // Build Table of Contents
    buildTableOfContents();

    // Update Bottom Nav
    updateNavButtons(dayNum);

    // Update Sidebar active state
    document.querySelectorAll('.lesson-item').forEach(item => {
      const d = parseInt(item.getAttribute('data-day'), 10);
      if (d === dayNum) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active');
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- TABLE OF CONTENTS GENERATOR ---
  function buildTableOfContents() {
    el.tocList.innerHTML = '';
    const headings = el.markdownContainer.querySelectorAll('h1, h2, h3');

    if (headings.length === 0) {
      el.tocList.innerHTML = '<span style="font-size:0.85rem; color:var(--text-muted); padding:0.5rem;">No outline headings found.</span>';
      return;
    }

    headings.forEach((heading, idx) => {
      if (!heading.id) heading.id = `heading-${idx}`;

      const a = document.createElement('a');
      a.className = `toc-item level-${heading.tagName.charAt(1)}`;
      a.href = `#${heading.id}`;
      a.textContent = heading.textContent;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeBottomSheets();
      });

      el.tocList.appendChild(a);
    });
  }

  // --- UPDATE PREV / NEXT NAV ---
  function updateNavButtons(dayNum) {
    const index = state.lessons.findIndex(l => l.day === dayNum);
    
    el.navPrevBtn.disabled = (index <= 0);
    el.navPrevBtn.style.opacity = (index <= 0) ? '0.4' : '1';

    el.navNextBtn.disabled = (index >= state.lessons.length - 1);
    el.navNextBtn.style.opacity = (index >= state.lessons.length - 1) ? '0.4' : '1';

    el.navDayText.textContent = `Day ${dayNum} of ${state.lessons.length}`;
  }

  // --- DAY SELECTION HANDLER ---
  function selectDay(dayNum) {
    const target = state.lessons.find(l => l.day === dayNum);
    if (target) {
      renderLesson(dayNum);
    }
  }

  // --- PROGRESS UI UPDATE ---
  function updateProgressUI() {
    const count = state.completedDays.size;
    const total = 100;
    const percent = Math.round((count / total) * 100);

    if (el.statsCompletedCount) el.statsCompletedCount.textContent = count;
    if (el.statsPercentCount) el.statsPercentCount.textContent = `${percent}%`;
    if (el.sidebarProgressFill) el.sidebarProgressFill.style.width = `${percent}%`;
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Mobile Drawer
    el.mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    el.sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Day Select Dropdown
    el.daySelectDropdown.addEventListener('change', (e) => {
      selectDay(parseInt(e.target.value, 10));
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

    // Tabs Switch
    el.tabTheoryBtn.addEventListener('click', () => switchTab('theory'));
    el.tabCodeBtn.addEventListener('click', () => switchTab('code'));

    // Search Input
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.searchQuery) el.clearSearchBtn.classList.add('show');
      else el.clearSearchBtn.classList.remove('show');
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

    // Copy Code
    el.copyMainCodeBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(el.mainCodeBlock.textContent).then(() => {
        showToast("Code copied to clipboard!", "success");
      });
    });

    // Theme Toggle
    el.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(state.theme);
    });

    // Bottom Sheet Drawers (Font & TOC)
    el.fontDrawerBtn.addEventListener('click', openFontSheet);
    el.tocToggleBtn.addEventListener('click', openTocSheet);
    el.closeFontSheet.addEventListener('click', closeBottomSheets);
    el.closeTocSheet.addEventListener('click', closeBottomSheets);
    el.sheetOverlay.addEventListener('click', closeBottomSheets);

    // Font Range Slider
    el.fontRangeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      applyFontSize(val);
    });

    // Nav Buttons
    el.navPrevBtn.addEventListener('click', () => navigateDay(-1));
    el.navNextBtn.addEventListener('click', () => navigateDay(1));

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'ArrowLeft') navigateDay(-1);
      else if (e.key === 'ArrowRight') navigateDay(1);
    });

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
      const threshold = 70;
      if (touchEndX < touchStartX - threshold) navigateDay(1);
      else if (touchEndX > touchStartX + threshold) navigateDay(-1);
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

  function openFontSheet() {
    closeBottomSheets();
    el.fontBottomSheet.classList.add('active');
    el.sheetOverlay.classList.add('active');
  }

  function openTocSheet() {
    closeBottomSheets();
    el.tocBottomSheet.classList.add('active');
    el.sheetOverlay.classList.add('active');
  }

  function closeBottomSheets() {
    el.fontBottomSheet.classList.remove('active');
    el.tocBottomSheet.classList.remove('active');
    el.sheetOverlay.classList.remove('active');
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('py100_theme', theme); } catch (e) {}

    const hljsStyle = document.getElementById('hljs-theme');
    if (hljsStyle) {
      hljsStyle.href = (theme === 'light')
        ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css"
        : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css";
    }
  }

  function applyFontSize(size) {
    state.fontSize = size;
    el.markdownContainer.style.fontSize = `${size}px`;
    if (el.fontRangeSlider) el.fontRangeSlider.value = size;
    if (el.fontSizeValDisplay) el.fontSizeValDisplay.textContent = `${size}px (${size === 16 ? 'Default' : size < 16 ? 'Smaller' : 'Larger'})`;
    try { localStorage.setItem('py100_fontsize', size); } catch (e) {}
  }

  function updateReadingProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight > 0) {
      el.readingProgressBar.style.width = `${Math.min((scrollTop / docHeight) * 100, 100)}%`;
    } else {
      el.readingProgressBar.style.width = '0%';
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle-2' : 'info';
    toast.innerHTML = `<i data-lucide="${icon}"></i> ${escapeHtml(message)}`;

    el.toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);

})();
