// Master Prep Application Logic & Mind Map Controller

class MasterPrepApp {
  constructor() {
    this.config = window.APP_CONFIG || {};
    this.schema = null;
    this.recapMarkdown = '';
    this.activePath = null;
    this.activeContext = null; // Tracks active topic or guide for AI Assistant
    this.aiChatHistory = []; // Stores persistent chat conversation history
    this.guideOrigin = 'mindmap'; // Tracks which view opened the guide: 'recap', 'mindmap', or 'simulators'
    this.guideOriginScrollY = 0; // Scroll position to restore on back
    this.guideOriginElementId = null; // Element ID to highlight on back

    // 5 Curated Theme Definitions (Zero runtime overhead)
    this.themes = {
      'obsidian-dark': { name: 'Obsidian Cyber', icon: '🌌', mode: 'dark', color: '#06b6d4' },
      'slate-light': { name: 'Slate Studio', icon: '☀️', mode: 'light', color: '#2563eb' },
      'alpine-nord': { name: 'Alpine Nord', icon: '🌲', mode: 'dark', color: '#88c0d0' },
      'warm-sepia': { name: 'Warm Sepia', icon: '☕', mode: 'light', color: '#c25e00' },
      'tokyo-midnight': { name: 'Tokyo Midnight', icon: '🌆', mode: 'dark', color: '#ec4899' }
    };
    this.activeTheme = 'obsidian-dark';

    const checklistKey = this.config.storage?.recapChecklist || 'master_prep_recap_checklist';
    this.recapChecked = JSON.parse(localStorage.getItem(checklistKey) || '{}');
    this.simulatorMap = this.config.simulators || {};
    this.searchIndex = [];
    this.cmdSelectedIndex = 0;
    this.cmdItems = [];
    this.initTheme();
    this.init();
  }

  // Initialize theme system & listeners
  initTheme() {
    const savedTheme = localStorage.getItem('hub_theme') || localStorage.getItem('master_prep_theme');
    if (savedTheme && this.themes[savedTheme]) {
      this.setTheme(savedTheme, false);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.setTheme('slate-light', false);
    } else {
      this.setTheme('obsidian-dark', false);
    }

    // Dismiss theme dropdown & mastery popover on outside click
    document.addEventListener('click', (e) => {
      const container = document.getElementById('theme-switcher-container');
      const menu = document.getElementById('theme-dropdown-menu');
      if (menu && menu.classList.contains('show')) {
        if (!container || !container.contains(e.target)) {
          menu.classList.remove('show');
        }
      }

      const masteryGauge = document.getElementById('header-mastery-gauge');
      const masteryPopover = document.getElementById('mastery-popover');
      if (masteryPopover && masteryPopover.classList.contains('show')) {
        if (!masteryGauge || !masteryGauge.contains(e.target)) {
          masteryPopover.classList.remove('show');
        }
      }
    });

    // Keyboard shortcut: Alt+T to cycle theme
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        this.cycleTheme();
      }
    });
  }

  // Set and apply theme
  setTheme(themeId, save = true) {
    if (!this.themes[themeId]) themeId = 'obsidian-dark';
    this.activeTheme = themeId;
    const themeMeta = this.themes[themeId];

    // Apply data-theme attribute on root and body
    document.documentElement.setAttribute('data-theme', themeId);
    document.body.setAttribute('data-theme', themeId);

    // Update Header Theme Button UI
    const iconEl = document.getElementById('theme-active-icon');
    const nameEl = document.getElementById('theme-active-name');
    if (iconEl) iconEl.textContent = themeMeta.icon;
    if (nameEl) nameEl.textContent = themeMeta.name;

    // Update Mobile Sidebar Theme Name
    const gnavNameEl = document.getElementById('gnav-theme-name');
    if (gnavNameEl) gnavNameEl.textContent = themeMeta.name;

    // Update Active indicators in Dropdown Menu
    document.querySelectorAll('.theme-option-item').forEach(el => {
      if (el.getAttribute('data-theme-id') === themeId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update Active indicators in Mobile Sidebar
    document.querySelectorAll('.gnav-theme-btn').forEach(el => {
      if (el.getAttribute('data-gnav-theme') === themeId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Close Dropdown Menu
    const dropdown = document.getElementById('theme-dropdown-menu');
    if (dropdown) dropdown.classList.remove('show');

    // Persist in localStorage
    if (save) {
      localStorage.setItem('hub_theme', themeId);
    }

    // Refresh graph canvas if open
    if (this.graphEngine) {
      this.graphEngine.resizeCanvas();
    }

    // Propagate theme to System Design Hub iframe if loaded
    const sdIframe = document.getElementById('sd-module-iframe');
    if (sdIframe) {
      try {
        if (sdIframe.contentDocument) {
          sdIframe.contentDocument.documentElement.setAttribute('data-theme', themeId);
          sdIframe.contentDocument.body.setAttribute('data-theme', themeId);
        }
      } catch (err) {
        // Cross-origin guard if any
      }
    }
  }

  // Toggle or Cycle Themes
  toggleTheme() {
    const isLight = this.themes[this.activeTheme]?.mode === 'light';
    this.setTheme(isLight ? 'obsidian-dark' : 'slate-light');
  }

  cycleTheme() {
    const themeKeys = Object.keys(this.themes);
    const currentIndex = themeKeys.indexOf(this.activeTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    this.setTheme(themeKeys[nextIndex]);
  }

  toggleThemeDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('theme-dropdown-menu');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  async init() {
    try {
      const mindmapPath = this.config.paths?.mindmapSchema || 'docs/mindmap_schema.json';
      const recapPath = this.config.paths?.recapMarkdown || 'docs/Definitions.md';
      const indexPath = this.config.paths?.searchIndex || 'docs/search_index.json';

      const [schemaRes, recapRes, indexRes] = await Promise.all([
        fetch(mindmapPath),
        fetch(recapPath),
        fetch(indexPath).catch(() => null)
      ]);
      this.schema = await schemaRes.json();
      this.recapMarkdown = await recapRes.text();
      if (indexRes && indexRes.ok) {
        this.searchIndex = await indexRes.json();
      }
      this.renderLearningPaths();
      this.renderPathwayStepper();
      this.renderDomainsTree();
      this.renderRecapDocument();
      this.initSpotlightEffect();
      this.initCommandPalette();
      this.updateHeaderMasteryGauge();
      this.initScrollListener();
      this.initGlobalSidebarState();
      this.loadAiChatHistory();
      this.showMindmapView();
    } catch (err) {
      console.error('Failed to load schemas:', err);
    }
  }

  // Back to Top & Reading Progress Scroll Listener
  initScrollListener() {
    const topBtn = document.getElementById('back-to-top-btn');
    window.addEventListener('scroll', () => {
      if (topBtn) {
        if (window.scrollY > 300) {
          topBtn.classList.add('visible');
        } else {
          topBtn.classList.remove('visible');
        }
      }

      // Live Guide Reading Progress Bar
      const progressBar = document.getElementById('guide-reading-progress');
      const guideSection = document.getElementById('guide-viewer-section');
      if (progressBar && guideSection && guideSection.style.display !== 'none') {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100)) : 0;
        progressBar.style.width = `${progress}%`;
      }
    });
  }

  // Render the Sleek 4-Track Segmented Subheader Rail
  renderLearningPaths() {
    const container = document.getElementById('learning-paths-container');
    if (!container || !this.schema?.learningPaths) return;

    const trackMeta = {
      'lead-fullstack': { icon: '🎯', shortTitle: 'Lead Full-Stack', subtitle: '6 Pillars • End-to-End' },
      'system-design-mastery-path': { icon: '🏗️', shortTitle: 'Staff System Design', subtitle: 'HLD • Math • Primitives' },
      'systems-architect': { icon: '☁️', shortTitle: 'Systems Architect', subtitle: 'Dist. Systems • Cloud' },
      'frontend-mastery': { icon: '🎨', shortTitle: 'Frontend Mastery', subtitle: 'JS/TS • Angular • React' }
    };

    container.innerHTML = this.schema.learningPaths.map(path => {
      const meta = trackMeta[path.id] || { icon: '🧭', shortTitle: path.name, subtitle: path.description };
      const isActive = this.activePath === path.id;
      const stepCount = path.sequence ? path.sequence.length : 0;
      return `
      <div class="track-pill-card ${isActive ? 'active' : ''}" onclick="app.selectPath('${path.id}')" title="Click to focus ${path.name} curriculum">
        <div class="track-pill-icon">${meta.icon}</div>
        <div class="track-pill-body">
          <div class="track-pill-title">
            <span>${meta.shortTitle}</span>
            <span class="track-pill-badge">${stepCount} Steps</span>
          </div>
          <div class="track-pill-sub">${meta.subtitle}</div>
        </div>
      </div>
    `}).join('');
  }

  // Render the Dynamic Pathway Stepper Bar
  renderPathwayStepper() {
    const stepperContainer = document.getElementById('pathway-stepper-container');
    const heading = document.getElementById('mindmap-section-heading');
    const subheading = document.getElementById('mindmap-section-subheading');
    if (!stepperContainer) return;

    if (!this.activePath || !this.schema?.learningPaths) {
      stepperContainer.style.display = 'none';
      stepperContainer.innerHTML = '';
      if (heading) heading.textContent = '6 Core Engineering Domains';
      if (subheading) subheading.textContent = 'Click any node to explore in-depth architectural guides, runnable code templates, and interactive simulators.';
      return;
    }

    const path = this.schema.learningPaths.find(p => p.id === this.activePath);
    if (!path) return;

    // Calculate total topics and completed topics in this path
    let totalTopics = 0;
    let completedTopics = 0;

    const stepItems = path.sequence.map((stepKey, idx) => {
      // Find matching domain or frontend level
      let domain = this.schema.domains.find(d => d.id === stepKey);
      let stepName = stepKey;
      let stepIcon = '📌';
      let targetDomainId = stepKey;

      if (domain) {
        stepName = domain.name.split('&')[0].trim();
        stepIcon = domain.icon || '📌';
        targetDomainId = domain.id;
        const subList = domain.subtopics || [];
        totalTopics += subList.length;
        completedTopics += subList.filter(s => this.recapChecked[s.id]).length;
      } else if (path.id === 'frontend-mastery') {
        const feDomain = this.schema.domains.find(d => d.id === 'frontend-engineering');
        targetDomainId = 'frontend-engineering';
        stepIcon = '🎨';
        if (stepKey === 'frontend-foundations') stepName = 'Level 1: Foundations';
        else if (stepKey === 'frontend-jsts') stepName = 'Level 2: JS/TS Core';
        else if (stepKey === 'frontend-angular') stepName = 'Level 3: Angular Ecosystem';
        else if (stepKey === 'frontend-react') stepName = 'Level 4: React Ecosystem';

        if (feDomain && feDomain.levels) {
          const matchedLevel = feDomain.levels.find(lvl => lvl.level.toLowerCase().includes(stepKey.replace('frontend-', '')) || lvl.level.toLowerCase().includes(stepName.toLowerCase()));
          if (matchedLevel) {
            totalTopics += matchedLevel.topics.length;
            completedTopics += matchedLevel.topics.filter(t => this.recapChecked[t.id]).length;
          }
        }
      }

      return {
        stepNum: idx + 1,
        name: stepName,
        icon: stepIcon,
        targetDomainId: targetDomainId
      };
    });

    const percent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    stepperContainer.style.display = 'block';
    stepperContainer.innerHTML = `
      <div class="pathway-stepper-card">
        <div class="stepper-header">
          <div class="stepper-title-group">
            <span class="stepper-icon">🎯</span>
            <div>
              <div class="stepper-title">Career Track: ${path.name}</div>
              <div class="stepper-desc">${path.description}</div>
            </div>
          </div>
          <div class="stepper-actions">
            <div class="stepper-stat-badge">
              <span>📊 ${completedTopics}/${totalTopics} Topics Completed (${percent}%)</span>
            </div>
            <button class="btn btn-sm btn-outline stepper-reset-btn" onclick="app.clearPathSelection()" title="Reset to show all domains">
              ✖ Show All Domains
            </button>
          </div>
        </div>

        <div class="stepper-track-label">⚡ RECOMMENDED STEP-BY-STEP PROGRESSION (CLICK TO JUMP):</div>
        <div class="stepper-track">
          ${stepItems.map((s, idx) => `
            <button class="step-pill" onclick="app.scrollToStepDomain('${s.targetDomainId}')" title="Jump to Step ${s.stepNum}: ${s.name}">
              <span class="step-num">${s.stepNum}</span>
              <span>${s.icon}</span>
              <span class="step-name">${s.name}</span>
            </button>
            ${idx < stepItems.length - 1 ? `<span class="step-arrow">➔</span>` : ''}
          `).join('')}
        </div>
      </div>
    `;

    if (heading) heading.textContent = `Focused Track Curriculum: ${path.name}`;
    if (subheading) subheading.textContent = `Follow the ${stepItems.length}-step structured sequence below or click any step above to jump directly to that module.`;
  }

  // Select/Filter by Path
  selectPath(pathId) {
    if (this.activePath === pathId) {
      this.activePath = null;
    } else {
      this.activePath = pathId;
    }
    this.renderLearningPaths();
    this.renderPathwayStepper();
    this.renderDomainsTree();

    if (this.activePath) {
      // Smooth scroll to the pathway stepper with offset so the user sees immediate feedback
      requestAnimationFrame(() => {
        const stepper = document.getElementById('pathway-stepper-container');
        if (stepper) {
          stepper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  // Clear Path Selection
  clearPathSelection() {
    this.activePath = null;
    this.renderLearningPaths();
    this.renderPathwayStepper();
    this.renderDomainsTree();
  }

  // Scroll smoothly to a specific domain card in the curriculum and flash a pulse
  scrollToStepDomain(domainId) {
    const card = document.querySelector(`.domain-card[data-domain-id="${domainId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove('highlight-pulse');
      // Trigger reflow for animation restart
      void card.offsetWidth;
      card.classList.add('highlight-pulse');
      setTimeout(() => {
        card.classList.remove('highlight-pulse');
      }, 1600);
    }
  }

  // Render the Domain Cards & Mind Map Subtopics (Re-ordered if activePath is set)
  renderDomainsTree(filterText = '') {
    const container = document.getElementById('domains-tree-container');
    if (!container || !this.schema?.domains) return;

    const query = filterText.toLowerCase();

    // Determine domain list and order
    let domainList = [...this.schema.domains];

    if (this.activePath && !query) {
      const path = this.schema.learningPaths.find(p => p.id === this.activePath);
      if (path && path.sequence) {
        if (path.id === 'frontend-mastery') {
          // Keep only frontend engineering domain
          domainList = domainList.filter(d => d.id === 'frontend-engineering');
        } else {
          // Re-order domains strictly according to path sequence
          const ordered = [];
          path.sequence.forEach(seqId => {
            const d = domainList.find(item => item.id === seqId);
            if (d && !ordered.includes(d)) ordered.push(d);
          });
          domainList = ordered;
        }
      }
    }

    container.innerHTML = domainList.map(domain => {
      // Check if domain matches query
      let matches = domain.name.toLowerCase().includes(query) || domain.description.toLowerCase().includes(query);

      let subtopicsHtml = '';
      let domainTotal = 0;
      let domainCompleted = 0;

      if (domain.subtopics) {
        domainTotal = domain.subtopics.length;
        domainCompleted = domain.subtopics.filter(s => this.recapChecked[s.id]).length;

        const filtered = domain.subtopics.filter(sub =>
          !query || matches || sub.name.toLowerCase().includes(query)
        );
        if (filtered.length > 0) matches = true;

        subtopicsHtml = `
          <div class="subtopics-list">
            ${filtered.map(sub => `
              <div class="subtopic-item ${this.recapChecked[sub.id] ? 'completed' : ''}" id="subtopic-${sub.id}" onclick="app.openGuide('${sub.guide}', '${domain.name}', '${sub.name}', 'subtopic-${sub.id}')" title="Click to read in-depth guide">
                <div class="subtopic-info">
                  <span class="subtopic-dot" style="${this.recapChecked[sub.id] ? 'background-color: var(--accent-emerald);' : ''}"></span>
                  <span class="subtopic-title">${sub.name}</span>
                </div>
                <span class="subtopic-badge">${this.recapChecked[sub.id] ? '✓ Mastered' : '📖 Read Guide'}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else if (domain.levels) {
        // Multi-level for Frontend Engineering
        domain.levels.forEach(lvl => {
          domainTotal += lvl.topics.length;
          domainCompleted += lvl.topics.filter(t => this.recapChecked[t.id]).length;
        });

        subtopicsHtml = domain.levels.map(level => {
          const filteredTopics = level.topics.filter(t =>
            !query || matches || t.name.toLowerCase().includes(query)
          );
          if (filteredTopics.length > 0) matches = true;

          return `
            <div class="level-group">
              <div class="level-title">📌 ${level.level}</div>
              <div class="subtopics-list">
                ${filteredTopics.map(t => `
                  <div class="subtopic-item ${this.recapChecked[t.id] ? 'completed' : ''}" id="subtopic-${t.id}" onclick="app.openGuide('${t.guide}', '${domain.name}', '${t.name}', 'subtopic-${t.id}')" title="Click to read in-depth guide">
                    <div class="subtopic-info">
                      <span class="subtopic-dot" style="${this.recapChecked[t.id] ? 'background-color: var(--accent-emerald);' : ''}"></span>
                      <span class="subtopic-title">${t.name}</span>
                    </div>
                    <span class="subtopic-badge">${this.recapChecked[t.id] ? '✓ Mastered' : '📖 Read Guide'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('');
      }

      if (query && !matches) return '';

      // Step indicator if path is active
      let stepBadgeHtml = '';
      if (this.activePath) {
        const path = this.schema.learningPaths.find(p => p.id === this.activePath);
        if (path) {
          const stepIndex = path.sequence.indexOf(domain.id);
          if (stepIndex !== -1) {
            stepBadgeHtml = `
              <div class="domain-step-badge">
                <span>🎯 STEP ${stepIndex + 1} OF ${path.sequence.length}</span>
                <span style="opacity: 0.6;">•</span>
                <span>${path.name.split(' ')[0]} Track</span>
              </div>
            `;
          }
        }
      }

      const domainPct = domainTotal > 0 ? Math.round((domainCompleted / domainTotal) * 100) : 0;

      return `
        <div class="domain-card" data-domain-id="${domain.id}">
          ${stepBadgeHtml}
          <div class="domain-header">
            <div class="domain-identity">
              <span class="domain-icon">${domain.icon}</span>
              <div>
                <div class="domain-name">${domain.name}</div>
                <div class="domain-progress-stat">Mastery: ${domainCompleted}/${domainTotal} Topics (${domainPct}%)</div>
              </div>
            </div>
            <span class="domain-badge">${domain.badge}</span>
          </div>
          <div class="domain-desc">${domain.description}</div>
          ${subtopicsHtml}
        </div>
      `;
    }).join('');
  }

  // Live Global Topic & Quick Recap Filtering
  filterTopics(query) {
    const q = (query || '').toLowerCase().trim();

    // 1. Filter Mindmap Tree
    this.renderDomainsTree(q);

    // 2. Filter Quick Recap Tree Navigation
    this.renderRecapTree(q);

    // 3. Filter Quick Recap Document Topic Cards & Sections
    const recapCards = document.querySelectorAll('.recap-topic-card');
    recapCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });

    // Automatically expand/collapse section groups based on search matches
    document.querySelectorAll('.recap-section-group').forEach(sec => {
      if (!q) {
        sec.style.display = 'block';
        return;
      }
      const visibleCards = Array.from(sec.querySelectorAll('.recap-topic-card')).filter(c => c.style.display !== 'none');
      if (visibleCards.length > 0) {
        sec.classList.remove('collapsed');
        sec.style.display = 'block';
      } else {
        sec.style.display = 'none';
      }
    });

    // 4. Filter Deep Architectural Guide Search Index Matches
    const searchOverlay = document.getElementById('global-search-results');
    if (!searchOverlay) return;

    if (!q || q.length < 2) {
      searchOverlay.style.display = 'none';
      searchOverlay.innerHTML = '';
      return;
    }

    const matches = (this.searchIndex || []).filter(item => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const headerMatch = item.headers.some(h => h.toLowerCase().includes(q));
      const pathMatch = item.path.toLowerCase().includes(q);
      return titleMatch || headerMatch || pathMatch;
    }).slice(0, 6);

    if (matches.length > 0) {
      searchOverlay.style.display = 'block';
      searchOverlay.innerHTML = `
        <div class="search-results-header">
          <span class="search-results-title">📄 In-Depth Architectural Guide Matches (${matches.length})</span>
          <span style="font-size: 0.75rem; color: var(--text-dim);">Click any card to launch full guide viewer</span>
        </div>
        <div class="search-results-grid">
          ${matches.map(m => {
        const matchedHeader = m.headers.find(h => h.toLowerCase().includes(q)) || 'General Overview';
        return `
              <div class="search-match-card" onclick="app.openGuide('${m.path}', '${m.domainDir || 'Guide'}', '${m.title}')">
                <div class="search-match-title">
                  <span>📖</span> ${m.title}
                </div>
                <div class="search-match-header">Matched section: <strong>${matchedHeader}</strong></div>
              </div>
            `;
      }).join('')}
        </div>
      `;
    } else {
      searchOverlay.style.display = 'none';
      searchOverlay.innerHTML = '';
    }
  }

  // Open & Render Markdown Guide
  async openGuide(rawGuidePath, domainName, topicName, sourceElementId = null) {
    try {
      const guidePath = rawGuidePath ? rawGuidePath.replace(/^\.\//, '') : '';
      const response = await fetch(guidePath);
      if (!response.ok) throw new Error(`Guide file not found: ${guidePath}`);
      const markdown = await response.text();

      if (this.graphEngine) this.graphEngine.stopAnimation();

      const isGuideViewerVisible = document.getElementById('guide-viewer-section').style.display === 'block';

      // Only record origin scroll and element if navigating from a primary view (not already inside guide viewer)
      if (!isGuideViewerVisible) {
        this.guideOriginScrollY = window.scrollY;
        this.guideOriginElementId = sourceElementId;

        const isVisible = (id) => {
          const el = document.getElementById(id);
          return el && getComputedStyle(el).display !== 'none';
        };

        if (isVisible('recap-view')) {
          this.guideOrigin = 'recap';
        } else if (isVisible('simulators-view')) {
          this.guideOrigin = 'simulators';
        } else if (isVisible('graph-dashboard-view')) {
          this.guideOrigin = 'graph';
        } else {
          this.guideOrigin = 'mindmap';
        }
      }

      // Render markdown using marked.js
      const htmlContent = marked.parse(markdown);
      const displayContainer = document.getElementById('guide-content-display');
      displayContainer.innerHTML = htmlContent;
      document.getElementById('guide-title-display').textContent = `${domainName} » ${topicName}`;
      document.getElementById('raw-guide-link').setAttribute('href', guidePath);

      // Compute estimated reading time (avg 200 words/min)
      const wordCount = markdown.trim().split(/\s+/).length;
      const readMinutes = Math.max(1, Math.ceil(wordCount / 200));
      const readTimeBadge = document.getElementById('guide-read-time-display');
      if (readTimeBadge) {
        readTimeBadge.textContent = `⏱️ ${readMinutes} min read`;
        readTimeBadge.style.display = 'inline-block';
      }

      // Reset reading progress bar
      const progressBar = document.getElementById('guide-reading-progress');
      if (progressBar) progressBar.style.width = '0%';

      // Wrap code blocks with container & 1-click copy button
      displayContainer.querySelectorAll('pre').forEach(pre => {
        if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const codeEl = pre.querySelector('code');
        let lang = 'CODE';
        if (codeEl) {
          const langMatch = Array.from(codeEl.classList).find(c => c.startsWith('language-') || c.startsWith('lang-'));
          if (langMatch) lang = langMatch.replace(/^language-|^lang-/, '').toUpperCase();
        }
        wrapper.setAttribute('data-lang', lang);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.type = 'button';
        copyBtn.innerHTML = '<span>📋</span> Copy';
        copyBtn.onclick = () => app.copyCodeSnippet(copyBtn, pre);
        wrapper.appendChild(copyBtn);
      });

      // Configure Toolbar Interactive Simulator Button if a simulator exists for this guide
      const simBtn = document.getElementById('guide-sim-btn');
      const matchedSim = this.simulatorMap[guidePath];
      if (simBtn) {
        if (matchedSim) {
          simBtn.style.display = 'inline-flex';
          simBtn.textContent = matchedSim.label;
          simBtn.onclick = () => app.launchSimulator(matchedSim.url, matchedSim.title);
        } else {
          simBtn.style.display = 'none';
        }
      }

      // Intercept inline guide-to-guide links & interactive simulator links in the rendered guide body
      displayContainer.querySelectorAll('a[href*="guides/"], a[href$=".md"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPath = (link.getAttribute('href') || '').replace(/^\.\//, '');
          app.openGuide(targetPath, domainName, link.textContent || 'Guide');
        });
        link.style.cursor = 'pointer';
        link.title = 'Click to view guide inline';
      });

      displayContainer.querySelectorAll('a[href*="interactive/"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const simUrl = link.getAttribute('href');
          app.launchSimulator(simUrl, link.textContent || 'Interactive Simulator');
        });
      });

      // Update Back button text based on origin
      const backBtn = document.getElementById('guide-back-btn');
      const originLabels = { recap: 'Quick Recap', mindmap: 'Learning Paths', simulators: 'Simulators', graph: 'Graph Dashboard' };
      if (backBtn) backBtn.textContent = `← Back to ${originLabels[this.guideOrigin] || 'Learning Paths'}`;

      // Update Breadcrumb with correct origin action restoring state
      this.updateBreadcrumb([
        { text: originLabels[this.guideOrigin] || 'Learning Paths', action: 'app.goBackFromGuide()' },
        { text: domainName, action: 'app.goBackFromGuide()' },
        { text: topicName, active: true }
      ]);

      // Switch View — hide all main sections, show guide viewer
      const graphView = document.getElementById('graph-dashboard-view');
      if (graphView) graphView.style.display = 'none';
      document.getElementById('mindmap-view').style.display = 'none';
      document.getElementById('simulators-view').style.display = 'none';
      document.getElementById('recap-view').style.display = 'none';
      document.getElementById('guide-viewer-section').style.display = 'block';

      const originBtnMap = { recap: 'recap-btn', mindmap: 'mindmap-toggle-btn', simulators: 'simulators-btn', graph: 'graph-dashboard-btn' };
      this.updateHeaderActiveButton(originBtnMap[this.guideOrigin] || 'mindmap-toggle-btn');

      this.setActiveContext('guide', topicName, guidePath);

      // Scroll to specific topic heading within the rendered guide if matched
      let targetHeading = null;
      if (topicName && topicName !== 'Guide') {
        const cleanTopic = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '');
        const headings = displayContainer.querySelectorAll('h1, h2, h3, h4');
        for (const h of headings) {
          const cleanH = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (cleanH && (cleanH.includes(cleanTopic) || cleanTopic.includes(cleanH))) {
            targetHeading = h;
            break;
          }
        }
      }

      if (targetHeading) {
        requestAnimationFrame(() => {
          targetHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetHeading.style.transition = 'background-color 0.3s ease, color 0.3s ease';
          targetHeading.style.backgroundColor = 'rgba(6, 182, 212, 0.2)';
          targetHeading.style.borderRadius = '6px';
          targetHeading.style.padding = '0.2rem 0.5rem';
          setTimeout(() => {
            targetHeading.style.backgroundColor = '';
          }, 2200);
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      alert(`Guide ${guidePath} is currently being prepared.`);
    }
  }

  // Navigate back from guide to the originating view, restoring scroll + highlight
  goBackFromGuide() {
    switch (this.guideOrigin) {
      case 'recap': this.showRecapView(true); break;
      case 'simulators': this.showSimulatorsView(true); break;
      case 'graph': this.showGraphDashboardView(true); break;
      default: this.showMindmapView(true); break;
    }

    // Restore scroll position after the view switch renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: this.guideOriginScrollY, behavior: 'instant' });

      // Highlight the source element briefly so the user can see where they were
      if (this.guideOriginElementId) {
        const sourceEl = document.getElementById(this.guideOriginElementId);
        if (sourceEl) {
          sourceEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
          sourceEl.style.borderColor = 'var(--accent-cyan)';
          sourceEl.style.boxShadow = '0 0 18px rgba(6, 182, 212, 0.5)';
          setTimeout(() => {
            sourceEl.style.borderColor = '';
            sourceEl.style.boxShadow = '';
          }, 1800);
        }
      }
    });
  }

  // Render Quick Recap Document with Interactive Checkboxes & Collapsible Sections
  renderRecapDocument() {
    const container = document.getElementById('recap-document-container');
    const tocContainer = document.getElementById('recap-toc-chips');
    const treeContainer = document.getElementById('recap-tree-nav');
    if (!container || !this.recapMarkdown) return;

    // Parse Markdown Sections (H2: ##) and Topics (H3: ###)
    const lines = this.recapMarkdown.split('\n');
    let html = '';
    let currentSection = '';
    let currentSectionId = '';
    let currentTopic = '';
    let topicLines = [];
    let totalTopics = 0;
    let completedTopics = 0;
    const sectionsList = [];
    const treeData = [];

    const flushTopic = () => {
      if (!currentTopic) return;
      totalTopics++;
      const rawSlug = currentTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const topicId = `${currentSectionId}-${rawSlug}`;
      const isChecked = !!this.recapChecked[topicId] || !!this.recapChecked[rawSlug];
      if (isChecked) completedTopics++;

      if (treeData.length > 0) {
        treeData[treeData.length - 1].topics.push({ id: topicId, rawSlug: rawSlug, name: currentTopic, checked: isChecked });
      }

      let bodyHtml = '';
      try {
        bodyHtml = (window.marked && window.marked.parse) ? marked.parse(topicLines.join('\n')) : topicLines.join('<br>');
      } catch (e) {
        bodyHtml = topicLines.join('<br>');
      }

      // Check if topic or detailed guide has a related simulator
      let simHtml = '';
      const matchedGuideKey = Object.keys(this.simulatorMap).find(gPath => {
        return topicLines.some(l => l.includes(gPath));
      });
      const matchedSim = matchedGuideKey ? this.simulatorMap[matchedGuideKey] : null;

      if (matchedSim) {
        simHtml = `
          <div class="recap-sim-callout" style="margin-top: 0.8rem; padding: 0.6rem 0.8rem; background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <span style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 500;">⚡ Interactive Playground Available</span>
            <button class="btn btn-sm btn-accent" style="padding: 0.25rem 0.65rem; font-size: 0.8rem;" onclick="app.launchSimulator('${matchedSim.url}', '${matchedSim.title}', 'recap-card-${topicId}')">
              ${matchedSim.label}
            </button>
          </div>
        `;
      }

      html += `
        <div class="recap-topic-card ${isChecked ? 'completed' : ''}" id="recap-card-${topicId}">
          <div class="recap-topic-header">
            <input type="checkbox" class="recap-checkbox" id="recap-chk-${topicId}" ${isChecked ? 'checked' : ''} onchange="app.toggleRecapItem('${topicId}')">
            <label for="recap-chk-${topicId}" class="recap-topic-title">${currentTopic}</label>
          </div>
          <div class="recap-topic-body">
            ${bodyHtml}
            ${simHtml}
          </div>
        </div>
      `;
      currentTopic = '';
      topicLines = [];
    };

    const flushSection = () => {
      flushTopic();
      if (currentSection) {
        html += `</div></div>`; // Close recap-section-body & recap-section-group
        currentSection = '';
      }
    };

    let sectionHeaderLines = [];

    for (let line of lines) {
      if (line.startsWith('## ')) {
        flushSection();
        currentSection = line.replace('## ', '').trim();
        currentSectionId = 'sec-' + currentSection.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        sectionsList.push({ id: currentSectionId, name: currentSection });
        treeData.push({ sectionId: currentSectionId, sectionName: currentSection, topics: [] });
        sectionHeaderLines = [];

        html += `
          <div class="recap-section-group" id="${currentSectionId}">
            <div class="recap-section-header" onclick="app.toggleRecapSection('${currentSectionId}')">
              <div class="recap-section-title-wrap">
                <span>📌</span>
                <span>${currentSection}</span>
              </div>
              <span class="recap-section-toggle-icon" id="icon-${currentSectionId}">▼</span>
            </div>
            <div class="recap-section-body">
        `;
      } else if (line.startsWith('### ')) {
        if (!currentTopic && sectionHeaderLines.length > 0) {
          const rawIntro = sectionHeaderLines.join('\n').trim();
          if (rawIntro) {
            const sectionIntroHtml = (window.marked && window.marked.parse) ? marked.parse(rawIntro) : rawIntro;
            if (sectionIntroHtml && sectionIntroHtml.replace(/<[^>]*>/g, '').trim().length > 0) {
              html += `<div class="recap-section-intro">${sectionIntroHtml}</div>`;
            }
          }
          sectionHeaderLines = [];
        }
        flushTopic();
        currentTopic = line.replace('### ', '').trim();
      } else if (currentTopic) {
        topicLines.push(line);
      } else if (currentSection) {
        sectionHeaderLines.push(line);
      }
    }
    flushSection();

    container.innerHTML = html;
    this.treeData = treeData;

    // Render Left Sticky Tree Navigation
    this.renderRecapTree();

    // Render TOC Chips
    if (tocContainer) {
      tocContainer.innerHTML = sectionsList.map(sec => `
        <button class="recap-toc-chip" onclick="app.scrollToRecapSection('${sec.id}')">
          ${sec.name.split(' ')[0]} ${sec.name.split(' ').slice(1, 3).join(' ')}
        </button>
      `).join('');
    }

    // Update Progress Stats
    this.updateRecapStats(completedTopics, totalTopics);

    // Intercept guide links rendered by marked.js so they open in the inline Guide Viewer
    container.querySelectorAll('a[href*="guides/"], a[href$=".md"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const rawGuidePath = link.getAttribute('href');
        const guidePath = rawGuidePath ? rawGuidePath.replace(/^\.\//, '') : '';
        // Extract domain and topic from the closest recap-topic-card
        const card = link.closest('.recap-topic-card');
        const topicTitle = card ? card.querySelector('.recap-topic-title')?.textContent?.trim() || 'Guide' : 'Guide';
        const cardId = card ? card.id : null;
        // Extract domain from the closest recap-section-group
        const section = link.closest('.recap-section-group');
        const domainTitle = section ? section.querySelector('.recap-section-title-wrap span:last-child')?.textContent?.trim() || 'Domain' : 'Domain';
        app.openGuide(guidePath, domainTitle, topicTitle, cardId);
      });
      // Add visual cue that these are interactive links
      link.style.cursor = 'pointer';
      link.title = 'Click to open guide in viewer';
    });

    // Intercept strategy guide links so they open the Strategy & Observability SPA view
    container.querySelectorAll('a[href*="strategy/index.html"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        app.showStrategyView();
      });
      link.style.cursor = 'pointer';
      link.title = 'Click to open Enterprise Observability & Strategy Guide';
    });

    // Intercept internal topic links (href^="#") so they jump to & highlight target card
    container.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        
        const cleanTarget = href.replace(/^#/, '').trim();
        const targetSlug = cleanTarget.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const allCards = Array.from(container.querySelectorAll('.recap-topic-card'));
        
        // 1. Direct ID match (e.g. recap-card-sec-microservices-microservices-architecture)
        let targetCard = document.getElementById(cleanTarget) || 
                         document.getElementById(`recap-card-${cleanTarget}`) ||
                         allCards.find(c => c.id === `recap-card-${cleanTarget}`);

        // 2. Flexible slug search (handles sec- or sec-- or topic slug endings)
        if (!targetCard && targetSlug) {
          const strippedSlug = targetSlug.replace(/^sec-[^-]*-*/, '');
          targetCard = allCards.find(c => {
            const cardSlug = c.id.replace(/^recap-card-sec-[^-]*-*/, '');
            return cardSlug.includes(strippedSlug) || strippedSlug.includes(cardSlug);
          });
        }

        // 3. Match by link text (e.g. "Microservices", "PostgreSQL", "RAG", "C#")
        if (!targetCard) {
          const rawText = link.textContent.replace(/^[⚡\d\s.#-]+/, '').trim().toLowerCase();
          const cleanText = rawText.replace(/\(.*?\)/g, '').trim(); // e.g. "JavaScript (ES6+)" -> "javascript"
          if (cleanText) {
            targetCard = allCards.find(c => {
              const titleEl = c.querySelector('.recap-topic-title');
              if (!titleEl) return false;
              const titleText = titleEl.textContent.trim().toLowerCase();
              return titleText === cleanText || titleText.startsWith(cleanText) || cleanText.startsWith(titleText);
            });
          }
        }

        // 4. Keyword fuzzy fallback
        if (!targetCard && targetSlug) {
          const keywords = targetSlug.split('-').filter(k => k.length > 2 && k !== 'sec');
          targetCard = allCards.find(c => {
            const titleEl = c.querySelector('.recap-topic-title');
            if (!titleEl) return false;
            const titleText = titleEl.textContent.toLowerCase();
            return keywords.some(kw => titleText.includes(kw));
          });
        }

        if (targetCard) {
          const sectionGroup = targetCard.closest('.recap-section-group');
          if (sectionGroup) sectionGroup.classList.remove('collapsed');
          
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
          targetCard.style.borderColor = 'var(--accent-cyan)';
          targetCard.style.boxShadow = '0 0 24px rgba(6, 182, 212, 0.75)';
          setTimeout(() => {
            targetCard.style.borderColor = '';
            targetCard.style.boxShadow = '';
          }, 2200);
        }
      });
      link.style.cursor = 'pointer';
      link.title = 'Click to jump to connected topic card';
    });
  }

  // Render Sidebar Tree Navigation
  renderRecapTree(filterText = '') {
    const treeContainer = document.getElementById('recap-tree-nav');
    if (!treeContainer || !this.treeData) return;

    const query = filterText.toLowerCase();

    const domainHtml = this.treeData.map(domain => {
      const filteredTopics = domain.topics.filter(t =>
        !query || t.name.toLowerCase().includes(query) || domain.sectionName.toLowerCase().includes(query)
      );

      if (query && filteredTopics.length === 0) return '';

      return `
        <div class="recap-tree-domain" id="tree-domain-${domain.sectionId}">
          <div class="recap-tree-domain-title" onclick="app.toggleTreeDomain('${domain.sectionId}')">
            <span>${domain.sectionName.split(' ')[0]} ${domain.sectionName.replace(/^[^\s]+\s*/, '')}</span>
            <span class="recap-tree-domain-arrow" id="arrow-${domain.sectionId}">▼</span>
          </div>
          <div class="recap-tree-items-list" id="tree-list-${domain.sectionId}">
            ${!query ? `
              <div class="recap-tree-item-link flow-pointer" onclick="app.scrollToSectionFlowchart('${domain.sectionId}')" style="background: rgba(6, 182, 212, 0.08); border-left: 2px solid var(--accent-cyan); font-weight: 600; color: var(--accent-cyan);" title="Click to view domain system execution flow diagram">
                <span>🗺️ Execution Flow Diagram</span>
              </div>
            ` : ''}
            ${filteredTopics.map(t => {
        const isChecked = !!this.recapChecked[t.id];
        return `
                <div class="recap-tree-item-link ${isChecked ? 'checked' : ''}" id="tree-link-${t.id}" onclick="app.scrollToRecapTopic('${domain.sectionId}', '${t.id}')">
                  <span>${t.name}</span>
                  <span class="recap-tree-status-dot"></span>
                </div>
              `;
      }).join('')}
          </div>
        </div>
      `;
    }).join('');

    treeContainer.innerHTML = domainHtml;
  }

  // Toggle Global App Navigation Left Sidebar (Desktop collapse & Mobile off-canvas drawer)
  toggleGlobalSidebar(forceState) {
    if (window.innerWidth <= 768) {
      this.toggleMobileSidebar(forceState);
      return;
    }

    const bodyLayout = document.getElementById('app-layout-body');
    const collapseBtn = document.getElementById('global-sidebar-collapse-btn');
    if (!bodyLayout) return;

    const shouldCollapse = forceState !== undefined ? forceState : !bodyLayout.classList.contains('global-sidebar-collapsed');

    if (shouldCollapse) {
      bodyLayout.classList.add('global-sidebar-collapsed');
      if (collapseBtn) collapseBtn.title = 'Expand Menu';
    } else {
      bodyLayout.classList.remove('global-sidebar-collapsed');
      if (collapseBtn) collapseBtn.title = 'Collapse Menu';
    }

    if (forceState === undefined) {
      localStorage.setItem('global_sidebar_collapsed', shouldCollapse ? 'true' : 'false');
    }
  }

  // Mobile Off-Canvas Navigation Drawer Controller
  toggleMobileSidebar(forceState) {
    const bodyLayout = document.getElementById('app-layout-body');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!bodyLayout) return;

    const isOpen = bodyLayout.classList.contains('mobile-drawer-open');
    const shouldOpen = forceState !== undefined ? forceState : !isOpen;

    if (shouldOpen) {
      bodyLayout.classList.add('mobile-drawer-open');
      if (backdrop) backdrop.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      bodyLayout.classList.remove('mobile-drawer-open');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  closeMobileSidebar() {
    this.toggleMobileSidebar(false);
  }

  openMobileSidebar() {
    this.toggleMobileSidebar(true);
  }

  // Mobile Toggle for Architecture Tree in Quick Recap View
  toggleRecapMobileTree() {
    const treeSidebar = document.getElementById('recap-tree-sidebar');
    const toggleBtn = document.getElementById('recap-tree-mobile-toggle');
    if (!treeSidebar) return;

    const isExpanded = treeSidebar.classList.toggle('mobile-expanded');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', isExpanded);
      const arrow = toggleBtn.querySelector('.recap-tree-toggle-arrow');
      if (arrow) arrow.textContent = isExpanded ? '▴' : '▾';
    }
  }

  initGlobalSidebarState() {
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
      return;
    }
    const savedState = localStorage.getItem('global_sidebar_collapsed');
    // Default to open (false) if not explicitly set to 'true'
    const shouldCollapse = savedState === 'true';
    this.toggleGlobalSidebar(shouldCollapse);
  }

  collapseGlobalSidebar() {
    this.toggleGlobalSidebar(true);
  }

  expandGlobalSidebar() {
    this.toggleGlobalSidebar(false);
  }

  updateGlobalNavActive(viewId) {
    // Auto close mobile drawer on view switch
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }

    const gnavMap = {
      'recap-view': 'gnav-recap',
      'system-design-hub-view': 'gnav-system-design',
      'graph-dashboard-view': 'gnav-graph',
      'mindmap-view': 'gnav-paths',
      'simulators-view': 'gnav-simulators'
    };
    const headerMap = {
      'recap-view': 'recap-btn',
      'system-design-hub-view': 'system-design-btn',
      'graph-dashboard-view': 'graph-dashboard-btn',
      'mindmap-view': 'mindmap-toggle-btn',
      'simulators-view': 'simulators-btn'
    };

    document.querySelectorAll('.gnav-item-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.header-actions .btn').forEach(btn => {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    });

    const activeGnavId = gnavMap[viewId];
    if (activeGnavId) {
      const activeGnavBtn = document.getElementById(activeGnavId);
      if (activeGnavBtn) activeGnavBtn.classList.add('active');
    }

    const activeHeaderId = headerMap[viewId];
    if (activeHeaderId) {
      const activeHeaderBtn = document.getElementById(activeHeaderId);
      if (activeHeaderBtn) {
        activeHeaderBtn.classList.remove('btn-outline');
        activeHeaderBtn.classList.add('btn-primary');
      }
    }
  }

  // Toggle Single Domain in Tree Sidebar
  toggleTreeDomain(sectionId) {
    const domainEl = document.getElementById(`tree-domain-${sectionId}`);
    if (!domainEl) return;
    domainEl.classList.toggle('tree-collapsed');
  }

  // Toggle All Tree Domains (Expand All vs Collapse to Headlines)
  toggleAllTreeDomains(expand) {
    document.querySelectorAll('.recap-tree-domain').forEach(el => {
      if (expand) {
        el.classList.remove('tree-collapsed');
      } else {
        el.classList.add('tree-collapsed');
      }
    });
  }

  // Toggle Single Section in Main Document
  toggleRecapSection(sectionId) {
    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) return;
    sectionEl.classList.toggle('collapsed');
  }

  // Toggle All Sections in Main Document (Expand All vs Collapse All)
  toggleAllRecapSections(expand) {
    document.querySelectorAll('.recap-section-group').forEach(el => {
      if (expand) {
        el.classList.remove('collapsed');
      } else {
        el.classList.add('collapsed');
      }
    });
  }

  // Scroll to Specific Section from TOC or Tree Header
  scrollToRecapSection(sectionId) {
    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) return;
    sectionEl.classList.remove('collapsed');
    sectionEl.scrollIntoView({ behavior: 'smooth' });
  }

  // Scroll directly to Section Flowchart Callout Box
  scrollToSectionFlowchart(sectionId) {
    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) return;
    sectionEl.classList.remove('collapsed');

    const intro = sectionEl.querySelector('.recap-section-intro');
    const targetEl = intro || sectionEl;

    targetEl.scrollIntoView({ behavior: 'smooth' });
    targetEl.style.borderColor = 'var(--accent-cyan)';
    targetEl.style.boxShadow = '0 0 22px rgba(6, 182, 212, 0.6)';
    setTimeout(() => {
      targetEl.style.borderColor = '';
      targetEl.style.boxShadow = '';
    }, 1800);
  }

  // Filter Keywords in Tree
  filterRecapTree(query) {
    this.renderRecapTree(query);
  }

  // Scroll to Canonical Topic Card from Top 25 or Cross-Links
  scrollToCanonicalTopic(slug) {
    const rawTarget = (slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const allMatchingCards = Array.from(document.querySelectorAll(`[id*="-${rawTarget}"], [id="recap-card-${rawTarget}"]`));
    const preferredCard = allMatchingCards.find(c => !c.id.includes('top-25')) || allMatchingCards[0];

    if (preferredCard) {
      const sectionGroup = preferredCard.closest('.recap-section-group');
      if (sectionGroup) sectionGroup.classList.remove('collapsed');

      preferredCard.scrollIntoView({ behavior: 'smooth' });
      preferredCard.style.borderColor = 'var(--accent-cyan)';
      preferredCard.style.boxShadow = '0 0 16px rgba(6, 182, 212, 0.4)';
      setTimeout(() => {
        preferredCard.style.borderColor = '';
        preferredCard.style.boxShadow = '';
      }, 1600);
    }
  }

  // Scroll to Specific Topic Card
  scrollToRecapTopic(sectionId, topicId) {
    const card = document.getElementById(`recap-card-${topicId}`) || document.getElementById(`recap-card-${sectionId}-${topicId}`);
    if (card) {
      const topicTitle = card.querySelector('.recap-topic-title')?.textContent || topicId;
      this.setActiveContext('topic', topicTitle);

      const sectionEl = document.getElementById(sectionId);
      if (sectionEl) sectionEl.classList.remove('collapsed');

      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      card.style.borderColor = 'var(--accent-cyan)';
      card.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.6)';
      setTimeout(() => {
        card.style.borderColor = '';
        card.style.boxShadow = '';
      }, 2000);
    }
  }

  // Toggle Checkbox for a Topic
  toggleRecapItem(topicId) {
    const chk = document.getElementById(`recap-chk-${topicId}`);
    const isChecked = chk ? chk.checked : !this.recapChecked[topicId];

    if (isChecked) {
      this.recapChecked[topicId] = true;
    } else {
      delete this.recapChecked[topicId];
    }
    localStorage.setItem('master_prep_recap_checklist', JSON.stringify(this.recapChecked));

    const card = document.getElementById(`recap-card-${topicId}`);
    const treeLink = document.getElementById(`tree-link-${topicId}`);
    if (card) {
      if (isChecked) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
    }
    if (treeLink) {
      if (isChecked) {
        treeLink.classList.add('checked');
      } else {
        treeLink.classList.remove('checked');
      }
    }

    // Re-count stats
    const total = document.querySelectorAll('.recap-checkbox').length;
    const completed = document.querySelectorAll('.recap-checkbox:checked').length;
    this.updateRecapStats(completed, total);
  }

  // Reset Progress Checklist
  resetRecapProgress() {
    this.recapChecked = {};
    localStorage.removeItem('master_prep_recap_checklist');

    // Uncheck all rendered checkboxes and remove classes in DOM immediately
    document.querySelectorAll('.recap-checkbox').forEach(chk => {
      chk.checked = false;
    });
    document.querySelectorAll('.recap-topic-card').forEach(card => {
      card.classList.remove('completed');
    });
    document.querySelectorAll('.recap-tree-item-link').forEach(link => {
      link.classList.remove('checked');
    });

    // Re-render document & tree navigation to guarantee consistency
    this.renderRecapDocument();

    // Re-count and update stats to 0
    const total = document.querySelectorAll('.recap-checkbox').length;
    this.updateRecapStats(0, total);
  }

  // Update Stats Bar & Header Mastery Gauge
  updateRecapStats(completed, total) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.querySelectorAll('#recap-completed-count').forEach(el => el.textContent = completed);
    document.querySelectorAll('#recap-total-count').forEach(el => el.textContent = total);
    document.querySelectorAll('#recap-percentage').forEach(el => el.textContent = `${percentage}%`);
    document.querySelectorAll('#recap-progress-fill').forEach(el => el.style.width = `${percentage}%`);

    this.updateHeaderMasteryGauge(completed, total);
  }

  // Update Header Actions Active Highlight State
  updateHeaderActiveButton(activeId) {
    const navButtons = ['recap-btn', 'system-design-btn', 'graph-dashboard-btn', 'mindmap-toggle-btn', 'simulators-btn'];
    navButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (id === activeId) {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
      }
    });
  }

  // Switch Umbrella Track (Full-Stack Developer vs System Design Hub)
  switchUmbrella(umbrellaId) {
    document.querySelectorAll('.umbrella-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById(`umbrella-${umbrellaId}`);
    if (activeTab) activeTab.classList.add('active');

    if (umbrellaId === 'system-design') {
      this.showSystemDesignHubView();
    } else {
      this.showMindmapView();
    }
  }

  // Switch to System Design Hub View
  showSystemDesignHubView(isBackNavigation = false) {
    if (this.graphEngine) this.graphEngine.stopAnimation();
    this.updateGlobalNavActive('system-design-hub-view');
    const graphView = document.getElementById('graph-dashboard-view');
    if (graphView) graphView.style.display = 'none';
    document.getElementById('guide-viewer-section').style.display = 'none';
    const simView = document.getElementById('simulators-view');
    if (simView) simView.style.display = 'none';
    document.getElementById('mindmap-view').style.display = 'none';
    document.getElementById('recap-view').style.display = 'none';
    document.getElementById('system-design-hub-view').style.display = 'block';

    this.updateBreadcrumb([
      { text: 'Learning Paths', action: 'app.showMindmapView()' },
      { text: 'System Design Hub', active: true }
    ]);

    if (!isBackNavigation) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // Load Interactive System Design Module inside iframe
  loadSystemDesignModule(moduleName) {
    const iframe = document.getElementById('sd-module-iframe');
    if (!iframe) return;

    document.querySelectorAll('.sd-module-btn').forEach(btn => {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    });

    let tabId = 'sd-tab-fundamentals';
    if (moduleName === 'hld_framework') tabId = 'sd-tab-hld';
    if (moduleName === 'architectural_primitives') tabId = 'sd-tab-primitives';
    if (moduleName === 'case_studies') tabId = 'sd-tab-casestudies';
    if (moduleName === 'observability_request_flow') tabId = 'sd-tab-observability';

    const activeBtn = document.getElementById(tabId);
    if (activeBtn) {
      activeBtn.classList.remove('btn-outline');
      activeBtn.classList.add('btn-primary');
    }

    iframe.onload = () => {
      try {
        if (iframe.contentDocument) {
          iframe.contentDocument.documentElement.setAttribute('data-theme', this.activeTheme);
          if (iframe.contentDocument.body) {
            iframe.contentDocument.body.setAttribute('data-theme', this.activeTheme);
          }
        }
      } catch (err) {}
    };

    iframe.src = `docs/system_design/${moduleName}.html`;
  }

  // Switch to Quick Recap View
  showRecapView(isBackNavigation = false) {
    if (this.graphEngine) this.graphEngine.stopAnimation();
    this.updateGlobalNavActive('recap-view');
    const graphView = document.getElementById('graph-dashboard-view');
    if (graphView) graphView.style.display = 'none';
    document.getElementById('guide-viewer-section').style.display = 'none';
    const simView = document.getElementById('simulators-view');
    if (simView) simView.style.display = 'none';
    document.getElementById('mindmap-view').style.display = 'none';
    const sdView = document.getElementById('system-design-hub-view');
    if (sdView) sdView.style.display = 'none';
    document.getElementById('recap-view').style.display = 'block';

    this.updateBreadcrumb([
      { text: 'Learning Paths', action: 'app.showMindmapView()' },
      { text: 'Master Knowledge Base & Quick Recap', active: true }
    ]);

    if (!isBackNavigation) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // Switch to Mindmap View (Learning Paths)
  showMindmapView(isBackNavigation = false) {
    if (this.graphEngine) this.graphEngine.stopAnimation();
    this.updateGlobalNavActive('mindmap-view');
    const graphView = document.getElementById('graph-dashboard-view');
    if (graphView) graphView.style.display = 'none';
    document.getElementById('guide-viewer-section').style.display = 'none';
    const simView = document.getElementById('simulators-view');
    if (simView) simView.style.display = 'none';
    document.getElementById('recap-view').style.display = 'none';
    const sdView = document.getElementById('system-design-hub-view');
    if (sdView) sdView.style.display = 'none';
    document.getElementById('mindmap-view').style.display = 'block';

    this.updateBreadcrumb([
      { text: 'Learning Paths & Career Tracks', active: true }
    ]);

    if (!isBackNavigation) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // Switch to Simulators View
  showSimulatorsView(isBackNavigation = false) {
    if (this.graphEngine) this.graphEngine.stopAnimation();
    this.updateGlobalNavActive('simulators-view');
    const graphView = document.getElementById('graph-dashboard-view');
    if (graphView) graphView.style.display = 'none';
    document.getElementById('guide-viewer-section').style.display = 'none';
    document.getElementById('mindmap-view').style.display = 'none';
    document.getElementById('recap-view').style.display = 'none';
    const sdView = document.getElementById('system-design-hub-view');
    if (sdView) sdView.style.display = 'none';
    const simView = document.getElementById('simulators-view');
    if (simView) simView.style.display = 'block';

    this.updateBreadcrumb([
      { text: 'Master Knowledge Base', action: 'app.showRecapView()' },
      { text: 'Interactive Simulators', active: true }
    ]);

    if (!isBackNavigation) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // Switch to Graph Dashboard View (Preserving zoom level, camera position & active category filters)
  async showGraphDashboardView() {
    const isBackNavigation = arguments[0] === true;
    this.updateGlobalNavActive('graph-dashboard-view');
    document.getElementById('guide-viewer-section').style.display = 'none';
    document.getElementById('mindmap-view').style.display = 'none';
    document.getElementById('recap-view').style.display = 'none';
    document.getElementById('simulators-view').style.display = 'none';
    document.getElementById('graph-dashboard-view').style.display = 'block';

    this.updateBreadcrumb([
      { text: 'Master Knowledge Base', action: 'app.showRecapView()' },
      { text: 'Interactive Graph Dashboard', active: true }
    ]);

    const isFirstLoad = !this.graphEngine;
    if (isFirstLoad) {
      await this.initGraphEngine();
    } else {
      this.graphEngine.resizeCanvas();
      this.graphEngine.startAnimation();
    }

    // Restore scroll position when returning from guide; position view appropriately on initial navigation
    setTimeout(() => {
      if (isBackNavigation && this.guideOrigin === 'graph' && this.guideOriginScrollY) {
        window.scrollTo({ top: this.guideOriginScrollY, behavior: 'smooth' });
      } else {
        if (window.innerWidth <= 768) {
          const graphView = document.getElementById('graph-dashboard-view');
          if (graphView) {
            graphView.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          const graphCanvasContainer = document.getElementById('graph-canvas-container');
          if (graphCanvasContainer) {
            graphCanvasContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
      if (this.graphEngine) {
        this.graphEngine.resizeCanvas();
        this.graphEngine.startAnimation();
      }
    }, 50);
  }

  // Initialize Canvas Graph Engine
  async initGraphEngine() {
    try {
      const topologyRes = await fetch('docs/graph_topology.json');
      if (!topologyRes.ok) throw new Error('Failed to load docs/graph_topology.json');
      this.topologyData = await topologyRes.json();

      this.graphEngine = new MindMapGraphEngine('graph-canvas-container', {
        initialViewAxis: 'techDomain',
        onNodeClick: (node) => this.openGraphNodeModal(node)
      });

      this.graphEngine.loadData(this.topologyData);
      this.activeGraphAxis = 'techDomain';
      this.populateGraphCategoryDropdown('techDomain');
      this.populateGraphTopicDropdown();
    } catch (err) {
      console.error('Failed to initialize Graph Engine:', err);
    }
  }

  setGraphViewAxis(axisKey) {
    if (!this.graphEngine) return;
    this.activeGraphAxis = axisKey;
    this.graphEngine.setViewAxis(axisKey);

    document.querySelectorAll('.btn-axis').forEach(btn => btn.classList.remove('active'));
    if (axisKey === 'sdlcPhase') document.getElementById('btn-axis-sdlc')?.classList.add('active');
    else if (axisKey === 'techDomain') document.getElementById('btn-axis-tech')?.classList.add('active');
    else if (axisKey === 'archLayer') document.getElementById('btn-axis-arch')?.classList.add('active');

    this.populateGraphCategoryDropdown(axisKey);
    this.onCategorySelectChange('');
  }

  // Populate dynamic category section dropdown based on active view axis
  populateGraphCategoryDropdown(axisKey) {
    const catSelect = document.getElementById('graph-category-select');
    if (!catSelect) return;

    let categories = [];
    let defaultLabel = '📁 All Sections';

    if (axisKey === 'techDomain') {
      defaultLabel = '📁 All Tech Domains';
      categories = this.topologyData?.taxonomyCategories?.techDomains || [
        'Backend', 'System Design', 'Cloud/DevOps', 'Security/Data', 'Frontend', 'AI'
      ];
    } else if (axisKey === 'sdlcPhase') {
      defaultLabel = '🔄 All SDLC Phases';
      categories = this.topologyData?.taxonomyCategories?.sdlcPhases || [
        'Requirements & Domain', 'Design & Architecture', 'Development', 'Testing & Quality', 'Security & Compliance', 'Deployment & Ops', 'Maintenance & Ops'
      ];
    } else if (axisKey === 'archLayer') {
      defaultLabel = '🏗️ All System Layers';
      categories = this.topologyData?.taxonomyCategories?.archLayers || [
        'Presentation Layer', 'API & Gateway Layer', 'Application/Domain Layer', 'Persistence Layer', 'Infrastructure Layer'
      ];
    }

    catSelect.innerHTML = `<option value="">${defaultLabel}</option>` +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  }

  // Populate dynamic topic node dropdown (filtered by category or showing all)
  populateGraphTopicDropdown(nodesToDisplay = null) {
    const topicSelect = document.getElementById('graph-topic-select');
    if (!topicSelect) return;

    const nodes = nodesToDisplay || (this.graphEngine ? this.graphEngine.nodes : []);
    const sortedNodes = [...nodes].filter(n => n.name).sort((a, b) => a.name.localeCompare(b.name));

    topicSelect.innerHTML = `<option value="">🎯 Focus Topic Node...</option>` +
      sortedNodes.map(n => `<option value="${n.id}">${n.name}</option>`).join('');
  }

  // Handle Category Section Selection
  onCategorySelectChange(categoryVal) {
    if (!this.graphEngine) return;
    const activeAxis = this.activeGraphAxis || 'techDomain';

    if (!categoryVal) {
      this.graphEngine.nodes.forEach(n => {
        n.radius = n.val ? Math.max(12, n.val * 0.9) : 14;
      });
      this.graphEngine.resetCamera();
      this.populateGraphTopicDropdown();
      return;
    }

    const matchingNodes = this.graphEngine.nodes.filter(n =>
      n.taxonomies && n.taxonomies[activeAxis] === categoryVal
    );

    this.graphEngine.nodes.forEach(n => {
      if (n.taxonomies && n.taxonomies[activeAxis] === categoryVal) {
        n.radius = Math.max(18, (n.val || 14) * 1.35);
      } else {
        n.radius = Math.max(8, (n.val || 14) * 0.65);
      }
    });

    if (matchingNodes.length > 0) {
      this.graphEngine.focusOnCluster(matchingNodes, 0.92);
      this.populateGraphTopicDropdown(matchingNodes);
    }
  }

  // Handle Specific Topic Node Selection
  onTopicSelectChange(nodeId) {
    if (!this.graphEngine || !nodeId) return;
    const targetNode = this.graphEngine.nodes.find(n => n.id === nodeId);
    if (targetNode) {
      this.graphEngine.focusOnNode(targetNode);
      this.openGraphNodeModal(targetNode);
    }
  }

  filterGraphNodes(query) {
    if (!this.graphEngine) return;
    const q = (query || '').toLowerCase().trim();
    this.graphEngine.nodes.forEach(n => {
      if (q && n.name.toLowerCase().includes(q)) {
        n.radius = Math.max(18, (n.val || 14) * 1.3);
      } else {
        n.radius = n.val ? Math.max(12, n.val * 0.9) : 14;
      }
    });
  }

  zoomGraphIn() {
    if (this.graphEngine) this.graphEngine.zoomIn();
  }

  zoomGraphOut() {
    if (this.graphEngine) this.graphEngine.zoomOut();
  }

  resetGraphCamera() {
    if (this.graphEngine) {
      this.graphEngine.resetCamera();
      const catSelect = document.getElementById('graph-category-select');
      const topicSelect = document.getElementById('graph-topic-select');
      if (catSelect) catSelect.value = '';
      if (topicSelect) topicSelect.value = '';
      this.onCategorySelectChange('');
    }
  }

  // Parse 4-Part Executive Definition from Definitions.md for a given topic
  getDefinitionForNode(nodeName) {
    if (!this.recapMarkdown) {
      return null;
    }

    const cleanName = (nodeName || '').replace(/^(Code Snippet:|Interactive Tool:)/i, '').trim().toLowerCase();
    const sections = this.recapMarkdown.split(/^###\s+/m);

    for (const sec of sections) {
      const firstLineEnd = sec.indexOf('\n');
      if (firstLineEnd === -1) continue;
      const heading = sec.substring(0, firstLineEnd).trim().toLowerCase();

      if (heading.includes(cleanName) || cleanName.includes(heading)) {
        const body = sec.substring(firstLineEnd);

        const extractField = (prefix) => {
          const regex = new RegExp(`-\\s*\\*\\*${prefix}\\*\\*:\\s*([^\n]+)`, 'i');
          const m = body.match(regex);
          return m ? m[1].trim() : null;
        };

        return {
          what: extractField('What It Is') || extractField('What it is'),
          why: extractField('Why It Is Used') || extractField('Why it is used'),
          when: extractField('When Used') || extractField('When used'),
          tradeoffs: extractField('Benefits & Trade-offs') || extractField('Benefits and Trade-offs')
        };
      }
    }

    return null;
  }

  openGraphNodeModal(node) {
    this.activeGraphNode = node;
    const modal = document.getElementById('graph-node-modal');
    if (!modal) return;

    document.getElementById('gmodal-level').textContent = node.level || 'Topic';
    document.getElementById('gmodal-title').textContent = node.name;
    document.getElementById('gmodal-domain').textContent = node.clusterId || 'System';
    document.getElementById('gmodal-sdlc').textContent = node.taxonomies?.sdlcPhase || '-';
    document.getElementById('gmodal-tech').textContent = node.taxonomies?.techDomain || '-';
    document.getElementById('gmodal-arch').textContent = node.taxonomies?.archLayer || '-';

    // Lookup 4-Part Recap Definition
    const def = this.getDefinitionForNode(node.name);

    document.getElementById('gmodal-what').textContent = def?.what || node.description || 'Core technical concept within the engineering architecture hub.';
    document.getElementById('gmodal-why').textContent = def?.why || 'Solves critical scalability, reliability, and modularity challenges in enterprise architectures.';
    document.getElementById('gmodal-when').textContent = def?.when || 'Architected and tuned during enterprise development, system design, and production deployment.';
    document.getElementById('gmodal-tradeoffs').textContent = def?.tradeoffs || 'Provides high engineering velocity and operational clarity; requires disciplined architecture governance.';

    modal.style.display = 'flex';
  }

  closeGraphModal() {
    const modal = document.getElementById('graph-node-modal');
    if (modal) modal.style.display = 'none';
  }

  openGraphNodeGuide() {
    if (!this.activeGraphNode) return;
    this.closeGraphModal();
    const node = this.activeGraphNode;

    let targetGuide = node.guidePath || '';
    if (!targetGuide || !targetGuide.endsWith('.md')) {
      const domainObj = this.schema?.domains?.find(d => d.id === node.clusterId);
      targetGuide = domainObj?.guidePath || 'guides/01_dotnet_backend/README.md';
    }

    this.openGuide(targetGuide, node.clusterId || 'Guide', node.name);
  }

  // Launch Simulator in Glassmorphic Overlay Modal with Origin State Tracking
  launchSimulator(simUrl, title, originCardId = null) {
    const modal = document.getElementById('sim-modal');
    const iframe = document.getElementById('sim-iframe');
    const titleEl = document.getElementById('sim-modal-title');
    const returnBtn = document.getElementById('sim-modal-return-btn');

    // Record origin context for seamless scroll restoration
    this.simOriginScrollY = window.scrollY;
    this.simOriginCardId = originCardId;

    if (titleEl) titleEl.textContent = `Running: ${title}`;
    if (iframe) iframe.src = simUrl;
    if (modal) modal.style.display = 'flex';

    if (returnBtn) {
      if (originCardId) {
        returnBtn.style.display = 'inline-flex';
        returnBtn.textContent = '← Return to Topic';
      } else {
        returnBtn.style.display = 'none';
      }
    }

    // Bind ESC key to close modal
    if (this._simEscHandler) {
      window.removeEventListener('keydown', this._simEscHandler);
    }
    this._simEscHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        this.closeSimulator();
      }
    };
    window.addEventListener('keydown', this._simEscHandler);
  }

  closeSimulator() {
    const modal = document.getElementById('sim-modal');
    const iframe = document.getElementById('sim-iframe');
    if (iframe) iframe.src = '';
    if (modal) modal.style.display = 'none';

    if (this._simEscHandler) {
      window.removeEventListener('keydown', this._simEscHandler);
      this._simEscHandler = null;
    }

    // If launched from a quick recap topic card, restore scroll & focus target card
    const targetCardId = this.simOriginCardId;
    if (targetCardId) {
      const targetCard = document.getElementById(targetCardId);
      if (targetCard) {
        const sectionGroup = targetCard.closest('.recap-section-group');
        if (sectionGroup) sectionGroup.classList.remove('collapsed');

        requestAnimationFrame(() => {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
          targetCard.style.borderColor = 'var(--accent-cyan)';
          targetCard.style.boxShadow = '0 0 24px rgba(6, 182, 212, 0.75)';
          setTimeout(() => {
            targetCard.style.borderColor = '';
            targetCard.style.boxShadow = '';
          }, 2200);
        });
      }
    }
    this.simOriginCardId = null;
  }

  // Update Breadcrumb Tracker
  updateBreadcrumb(items) {
    const container = document.getElementById('breadcrumb-tracker');
    if (!container) return;

    container.innerHTML = items.map((item, idx) => `
      ${idx > 0 ? '<span class="crumb-sep">/</span>' : ''}
      <span class="crumb ${item.active ? 'active' : ''}" ${item.action ? `onclick="${item.action}"` : ''}>
        ${item.text}
      </span>
    `).join('');
  }

  // BYOK AI Study Assistant Methods (Docked Right Sidebar & Context Aware)
  toggleAiAssistant() {
    const panel = document.getElementById('ai-widget-panel');
    const container = document.querySelector('.app-container');
    if (!panel) return;
    const isVisible = panel.style.display !== 'none';

    if (isVisible) {
      panel.style.display = 'none';
      if (container) container.classList.remove('ai-panel-open');
    } else {
      panel.style.display = 'flex';
      if (container) container.classList.add('ai-panel-open');

      // Auto-collapse global left menu automatically when AI chatbot is opened
      this.collapseGlobalSidebar();

      const storageKey = this.config.storage?.aiApiKey || 'ai_prep_key';
      const savedKey = sessionStorage.getItem(storageKey) || '';
      const keyInput = document.getElementById('ai-api-key');
      if (keyInput) keyInput.value = savedKey;
      this.updateAiKeyStatus();
      this.updateAiContextBar();
      this.loadAiChatHistory();
    }
  }

  toggleAiWidth() {
    const panel = document.getElementById('ai-widget-panel');
    const container = document.querySelector('.app-container');
    const expandBtn = document.getElementById('ai-expand-btn');
    if (!panel || !container) return;

    const isWide = panel.classList.contains('wide-mode');
    if (isWide) {
      panel.classList.remove('wide-mode');
      container.classList.remove('wide-mode');
      if (expandBtn) expandBtn.textContent = '↔️ Expand';
    } else {
      panel.classList.add('wide-mode');
      container.classList.add('wide-mode');
      if (expandBtn) expandBtn.textContent = '↔️ Compact';
    }
  }

  setActiveContext(type, title, path = '') {
    this.activeContext = { type, title, path };
    this.updateAiContextBar();
  }

  updateAiContextBar() {
    const bar = document.getElementById('ai-context-bar');
    const label = document.getElementById('ai-context-label');
    const btn = document.getElementById('ai-context-btn');
    if (!bar) return;

    if (this.activeContext && this.activeContext.title) {
      bar.style.display = 'flex';
      if (label) label.textContent = `📍 Active Context: ${this.activeContext.title}`;
      if (btn) btn.textContent = `⚡ Ask AI about this`;
    } else {
      bar.style.display = 'none';
    }
  }

  askAboutActiveContext() {
    if (!this.activeContext || !this.activeContext.title) return;
    const inputEl = document.getElementById('ai-chat-input');
    if (inputEl) {
      inputEl.value = `Explain "${this.activeContext.title}" in depth with senior engineering trade-offs, architectural design considerations, and common interview questions.`;
      this.sendAiMessage();
    }
  }

  toggleAiSettings() {
    const configEl = document.getElementById('ai-key-config');
    if (!configEl) return;
    const isHidden = configEl.style.display === 'none';
    configEl.style.display = isHidden ? 'block' : 'none';
  }

  closeAiAssistant(evt) {
    if (!evt || evt.target.id === 'ai-drawer-overlay') {
      document.getElementById('ai-drawer-overlay').style.display = 'none';
    }
  }

  onAiProviderChange() {
    const providerId = document.getElementById('ai-provider-select').value;
    const providerConfig = this.config.ai?.providers?.[providerId];
    const keyInput = document.getElementById('ai-api-key');
    if (keyInput) {
      keyInput.placeholder = providerConfig?.placeholder || 'Paste API Key...';
    }
  }

  saveAiKey(val) {
    const storageKey = this.config.storage?.aiApiKey || 'ai_prep_key';
    sessionStorage.setItem(storageKey, val.trim());
    this.updateAiKeyStatus();
  }

  updateAiKeyStatus() {
    const storageKey = this.config.storage?.aiApiKey || 'ai_prep_key';
    const key = (sessionStorage.getItem(storageKey) || '').trim();
    const dot = document.getElementById('ai-key-status-dot');
    const label = document.getElementById('ai-key-status-label');
    if (dot) {
      dot.className = `ai-status-dot ${key ? 'configured' : 'missing'}`;
    }
    if (label) {
      label.textContent = key ? 'Key Configured' : 'Configure API Key';
    }
  }

  loadAiChatHistory() {
    const historyKey = this.config.storage?.aiChatHistory || 'ai_prep_chat_history';
    const raw = sessionStorage.getItem(historyKey);
    const chatBody = document.getElementById('ai-chat-body');
    if (!chatBody) return;

    if (raw) {
      try {
        this.aiChatHistory = JSON.parse(raw);
      } catch (e) {
        this.aiChatHistory = [];
      }
    }

    if (this.aiChatHistory.length > 0) {
      chatBody.innerHTML = '';
      this.aiChatHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = `ai-msg ${msg.role === 'user' ? 'user-msg' : 'bot-msg'}`;
        const senderText = msg.role === 'user' ? 'You' : '🤖 Interview Coach';
        const parsedContent = msg.role === 'user' ? msg.content : (window.marked && window.marked.parse ? marked.parse(msg.content) : msg.content);
        div.innerHTML = `<div class="msg-sender">${senderText}</div><div class="msg-content">${parsedContent}</div>`;
        chatBody.appendChild(div);
      });
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  saveAiChatHistory() {
    const historyKey = this.config.storage?.aiChatHistory || 'ai_prep_chat_history';
    sessionStorage.setItem(historyKey, JSON.stringify(this.aiChatHistory));
  }

  clearAiChatHistory() {
    const historyKey = this.config.storage?.aiChatHistory || 'ai_prep_chat_history';
    sessionStorage.removeItem(historyKey);
    this.aiChatHistory = [];
    const chatBody = document.getElementById('ai-chat-body');
    if (chatBody) {
      chatBody.innerHTML = `
        <div class="ai-msg bot-msg">
          <div class="msg-sender">🤖 Interview Coach</div>
          <div class="msg-content">Conversation history cleared. Ask me any question, request system design mock interviews, or ask for clarifications on any of the 292 terms in this repository!</div>
        </div>
      `;
    }
  }

  async sendAiMessage() {
    const inputEl = document.getElementById('ai-chat-input');
    const chatBody = document.getElementById('ai-chat-body');
    const storageKey = this.config.storage?.aiApiKey || 'ai_prep_key';
    const apiKey = (sessionStorage.getItem(storageKey) || '').trim();
    const providerId = document.getElementById('ai-provider-select').value;

    const userText = inputEl.value.trim();
    if (!userText) return;

    // Append User Message
    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'ai-msg user-msg';
    userMsgDiv.innerHTML = `<div class="msg-sender">You</div><div class="msg-content">${userText}</div>`;
    chatBody.appendChild(userMsgDiv);
    inputEl.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // Record user message in history
    this.aiChatHistory.push({ role: 'user', content: userText });
    this.saveAiChatHistory();

    if (!apiKey) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'ai-msg bot-msg';
      errorDiv.style.borderColor = 'var(--accent-red)';
      errorDiv.innerHTML = `<div class="msg-sender" style="color: var(--accent-red)">⚠️ Key Required</div><div class="msg-content">Please click the ⚙️ settings icon in the top header of this drawer to configure your API key. Your key is stored only in browser memory (\`sessionStorage\`).</div>`;
      chatBody.appendChild(errorDiv);
      chatBody.scrollTop = chatBody.scrollHeight;
      document.getElementById('ai-key-config').style.display = 'block';
      return;
    }

    // Append Loading Indicator
    const botMsgDiv = document.createElement('div');
    botMsgDiv.className = 'ai-msg bot-msg';
    botMsgDiv.innerHTML = `<div class="msg-sender">🤖 Interview Coach</div><div class="msg-content"><em>Thinking & consulting engineering knowledge base...</em></div>`;
    chatBody.appendChild(botMsgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    const providerConfig = this.config.ai?.providers?.[providerId] || {};
    let systemPrompt = this.config.ai?.systemPrompt || `You are an expert Senior/Lead Software Engineer Interview Coach.`;

    if (this.activeContext && this.activeContext.title) {
      systemPrompt += ` The candidate is currently studying/viewing: "${this.activeContext.title}". Frame your explanation in the context of this topic where relevant.`;
    }

    try {
      let responseText = '';
      if (providerConfig.type === 'gemini') {
        const url = `${providerConfig.endpoint}?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${userText}` }] }]
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || 'Gemini API call failed');
        responseText = data.candidates[0].content.parts[0].text;
      } else {
        // OpenAI Compatible (Groq, OpenAI, OpenRouter)
        const endpoint = providerConfig.endpoint || 'https://api.groq.com/openai/v1/chat/completions';
        const model = providerConfig.model || 'llama-3.3-70b-versatile';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userText }]
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || 'AI API call failed');
        responseText = data.choices[0].message.content;
      }

      botMsgDiv.querySelector('.msg-content').innerHTML = marked.parse(responseText);
      this.aiChatHistory.push({ role: 'assistant', content: responseText });
      this.saveAiChatHistory();
    } catch (err) {
      botMsgDiv.style.borderColor = 'var(--accent-red)';
      botMsgDiv.querySelector('.msg-content').innerHTML = `<span style="color: var(--accent-red)">Error: ${err.message}</span>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // ==========================================================================
  // Phase 1: High-Performance Delegated Mouse Spotlight Glow & Code Copy
  // ==========================================================================
  initSpotlightEffect() {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.domain-card, .track-pill-card, .recap-topic-card, .sim-card, .sd-case-card, .spotlight-card, .cmd-item');
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      }
    }, { passive: true });
  }

  async copyCodeSnippet(btn, pre) {
    try {
      const code = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      btn.innerHTML = '<span>✅</span> Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = '<span>📋</span> Copy';
        btn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  }

  // ==========================================================================
  // Phase 2: Global Universal Command Palette (⌘K / Ctrl+K)
  // ==========================================================================
  initCommandPalette() {
    const overlay = document.getElementById('command-palette-modal');
    const input = document.getElementById('cmd-palette-input');
    if (!overlay || !input) return;

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.toggleCommandPalette();
      } else if (e.key === 'Escape' && overlay.classList.contains('show')) {
        e.preventDefault();
        this.closeCommandPalette();
      }
    });

    input.addEventListener('input', (e) => {
      this.filterCommandPalette(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateCommandPalette(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateCommandPalette(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeCommandItem(this.cmdSelectedIndex);
      }
    });
  }

  toggleCommandPalette() {
    const overlay = document.getElementById('command-palette-modal');
    if (overlay && overlay.classList.contains('show')) {
      this.closeCommandPalette();
    } else {
      this.openCommandPalette();
    }
  }

  openCommandPalette() {
    const overlay = document.getElementById('command-palette-modal');
    const input = document.getElementById('cmd-palette-input');
    if (!overlay || !input) return;

    overlay.classList.add('show');
    overlay.style.display = 'flex';
    input.value = '';
    this.filterCommandPalette('');
    setTimeout(() => input.focus(), 60);
  }

  closeCommandPalette() {
    const overlay = document.getElementById('command-palette-modal');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.style.display = 'none';
    }
  }

  closeCommandPaletteOnBackdrop(e) {
    if (e.target === e.currentTarget) {
      this.closeCommandPalette();
    }
  }

  filterCommandPalette(rawQuery) {
    const query = (rawQuery || '').trim().toLowerCase();
    const resultsContainer = document.getElementById('cmd-results-list');
    if (!resultsContainer) return;

    this.cmdItems = [];
    let html = '';

    const navItems = [
      { id: 'nav-paths', icon: '🧭', title: 'Learning Paths & Mind Map', subtitle: 'View full 6-domain engineering curriculum', badge: 'View', action: () => this.showMindmapView() },
      { id: 'nav-sd', icon: '🏗️', title: 'System Design Hub', subtitle: 'Staff HLDs, Capacity Math & Visualizers', badge: 'Hub', action: () => this.showSystemDesignHubView() },
      { id: 'nav-graph', icon: '🌐', title: 'Interactive Graph Dashboard', subtitle: 'Force-directed knowledge graph and node taxonomy', badge: 'Graph', action: () => this.showGraphDashboardView() },
      { id: 'nav-recap', icon: '📝', title: 'Quick Recap & Mastery Checklist', subtitle: 'Unified definitions and interview readiness checklist', badge: 'Checklist', action: () => this.showRecapView() },
      { id: 'nav-sims', icon: '⚡', title: 'Interactive Simulators Hub', subtitle: 'Live visual sandboxes & architectural step-throughs', badge: 'Simulators', action: () => this.showSimulatorsView() }
    ];

    const themeItems = Object.entries(this.themes).map(([key, t]) => ({
      id: `theme-${key}`,
      icon: t.icon,
      title: `Switch Theme: ${t.name}`,
      subtitle: `${t.mode.toUpperCase()} mode design system tokens`,
      badge: 'Theme',
      action: () => this.setTheme(key)
    }));

    const sdItems = [
      { title: 'Ticketmaster / High-Concurrency Booking', path: 'docs/system_design/ticketmaster.html', domain: 'Distributed Locking & High Throughput' },
      { title: 'Video Streaming & Transcoding (Netflix/YouTube)', path: 'docs/system_design/video_streaming.html', domain: 'Chunking, CDN & Resumable Upload' },
      { title: 'Real-Time Chat & Collaboration (Discord/Slack)', path: 'docs/system_design/chat_architecture.html', domain: 'WebSockets, Presence & PubSub' },
      { title: 'Scalable URL Shortener (Bitly)', path: 'docs/system_design/url_shortener.html', domain: 'Base62, Read-Heavy Caching & KGS' },
      { title: 'Distributed Web Crawler (Googlebot)', path: 'docs/system_design/web_crawler.html', domain: 'Frontier, Politeness & Deduplication' },
      { title: 'Proximity Service & Geospatial Search (Yelp/Uber)', path: 'docs/system_design/proximity_service.html', domain: 'Geohash, QuadTree & Spatial DB' }
    ].map(c => ({
      id: `sd-${c.path}`,
      icon: '🏗️',
      title: c.title,
      subtitle: c.domain || 'System Design Case Study',
      badge: 'System Design',
      action: () => {
        this.showSystemDesignHubView();
        const iframe = document.getElementById('sd-module-iframe');
        if (iframe) iframe.src = c.path;
      }
    }));

    const simItems = Object.entries(this.simulatorMap || {}).map(([guide, sim]) => ({
      id: `sim-${sim.url}`,
      icon: '⚡',
      title: sim.title || sim.label,
      subtitle: `Simulator: ${sim.label}`,
      badge: 'Simulator',
      action: () => this.launchSimulator(sim.url, sim.title)
    }));

    const guideItems = (this.searchIndex || []).map(item => ({
      id: `guide-${item.path}`,
      icon: '📖',
      title: item.title,
      subtitle: item.domainDir ? `${item.domainDir.toUpperCase()} • Guide` : 'Architectural Guide',
      badge: 'Guide',
      action: () => this.openGuide(item.path, item.domainDir || 'Engineering', item.title)
    }));

    const matches = (item) => {
      if (!query) return true;
      return item.title.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query) || item.badge.toLowerCase().includes(query);
    };

    const filteredNav = navItems.filter(matches);
    const filteredThemes = themeItems.filter(matches);
    const filteredSD = sdItems.filter(matches);
    const filteredSims = simItems.filter(matches);
    const filteredGuides = guideItems.filter(matches).slice(0, query ? 14 : 5);

    const renderGroup = (title, items) => {
      if (!items.length) return '';
      let groupHtml = `<div class="cmd-group-title">${title}</div>`;
      items.forEach(item => {
        const itemIdx = this.cmdItems.length;
        this.cmdItems.push(item);
        groupHtml += `
          <div class="cmd-item ${itemIdx === 0 ? 'selected' : ''}" id="cmd-item-${itemIdx}" data-index="${itemIdx}" onclick="app.executeCommandItem(${itemIdx})">
            <div class="cmd-item-left">
              <span class="cmd-item-icon">${item.icon}</span>
              <div style="min-width: 0;">
                <div class="cmd-item-title">${item.title}</div>
                <div class="cmd-item-sub">${item.subtitle}</div>
              </div>
            </div>
            <div class="cmd-item-right">
              <span class="cmd-badge">${item.badge}</span>
            </div>
          </div>
        `;
      });
      return groupHtml;
    };

    if (query) {
      if (filteredGuides.length) html += renderGroup('📖 In-Depth Guides', filteredGuides);
      if (filteredSD.length) html += renderGroup('🏗️ System Design Cases', filteredSD);
      if (filteredSims.length) html += renderGroup('⚡ Interactive Simulators', filteredSims);
      if (filteredNav.length) html += renderGroup('🧭 Navigation', filteredNav);
      if (filteredThemes.length) html += renderGroup('🎨 Themes', filteredThemes);
    } else {
      html += renderGroup('🧭 Quick Navigation', filteredNav);
      html += renderGroup('🏗️ System Design Hub', filteredSD.slice(0, 4));
      html += renderGroup('⚡ Popular Simulators', filteredSims.slice(0, 3));
      html += renderGroup('🎨 Switch Theme', filteredThemes);
    }

    if (this.cmdItems.length === 0) {
      resultsContainer.innerHTML = `<div class="cmd-empty-state">No matching guides, topics, or commands found for "<strong>${rawQuery}</strong>"</div>`;
      this.cmdSelectedIndex = 0;
    } else {
      resultsContainer.innerHTML = html;
      this.cmdSelectedIndex = 0;
      this.updateCommandSelection();
    }
  }

  navigateCommandPalette(direction) {
    if (!this.cmdItems.length) return;
    this.cmdSelectedIndex = (this.cmdSelectedIndex + direction + this.cmdItems.length) % this.cmdItems.length;
    this.updateCommandSelection();
  }

  updateCommandSelection() {
    document.querySelectorAll('.cmd-item').forEach((el, idx) => {
      if (idx === this.cmdSelectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  executeCommandItem(index) {
    if (this.cmdItems[index]) {
      const item = this.cmdItems[index];
      this.closeCommandPalette();
      if (typeof item.action === 'function') {
        item.action();
      }
    }
  }

  // ==========================================================================
  // Phase 3: Header Interview Readiness Mastery Gauge & Breakdown Popover
  // ==========================================================================
  updateHeaderMasteryGauge(completed = null, total = null) {
    if (completed === null || total === null) {
      const checkboxes = document.querySelectorAll('.recap-checkbox');
      if (checkboxes.length > 0) {
        total = checkboxes.length;
        completed = document.querySelectorAll('.recap-checkbox:checked').length;
      } else if (this.schema?.domains) {
        let t = 0;
        let c = 0;
        this.schema.domains.forEach(d => {
          if (d.subtopics) {
            t += d.subtopics.length;
            c += d.subtopics.filter(s => this.recapChecked[s.id]).length;
          }
          if (d.levels) {
            d.levels.forEach(lvl => {
              if (lvl.topics) {
                t += lvl.topics.length;
                c += lvl.topics.filter(tp => this.recapChecked[tp.id]).length;
              }
            });
          }
        });
        total = t;
        completed = c;
      } else {
        total = 0;
        completed = 0;
      }
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pctEl = document.getElementById('header-mastery-pct');
    const fillEl = document.getElementById('header-mastery-fill');
    const totalEl = document.getElementById('mastery-popover-total');
    const listEl = document.getElementById('mastery-popover-list');

    if (pctEl) pctEl.textContent = `${percentage}%`;
    if (fillEl) fillEl.style.width = `${percentage}%`;
    if (totalEl) totalEl.textContent = `${completed} / ${total} Mastered`;

    if (listEl && this.schema?.domains) {
      listEl.innerHTML = this.schema.domains.map(d => {
        let domainTotal = 0;
        let domainDone = 0;
        if (d.subtopics) {
          domainTotal += d.subtopics.length;
          domainDone += d.subtopics.filter(s => this.recapChecked[s.id]).length;
        }
        if (d.levels) {
          d.levels.forEach(lvl => {
            if (lvl.topics) {
              domainTotal += lvl.topics.length;
              domainDone += lvl.topics.filter(tp => this.recapChecked[tp.id]).length;
            }
          });
        }
        const dPct = domainTotal > 0 ? Math.round((domainDone / domainTotal) * 100) : 0;
        return `
          <div class="mastery-popover-item">
            <span>${d.icon || '📌'} <strong>${d.name.split('&')[0].trim()}</strong></span>
            <span>${domainDone}/${domainTotal} (${dPct}%)</span>
          </div>
        `;
      }).join('');
    }
  }

  toggleMasteryPopover(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const popover = document.getElementById('mastery-popover');
    if (popover) {
      popover.classList.toggle('show');
    }
  }
}

// Global App Instance
const app = new MasterPrepApp();
window.app = app;
window.MasterPrepApp = MasterPrepApp;

