// content/components/AnalyticsDashboard.js
// Visual Analytics Dashboard for SpicySwipe
// Replaces the text-based AnalysisPanel with a graphical interface

function renderSidebarAnalyticsTab(enabled) {
    const analyticsPanel = document.getElementById('sidebar-tab-analytics');
    if (!analyticsPanel) return;
    if (!chrome.runtime?.id) return;

    // Load Data
    const sessionAnalytics = stateStore.get('sessionAnalytics') || { swipes: 0, likes: 0, nopes: 0, matches: 0, messages: 0 };
    const allTimeAnalytics = stateStore.get('allTimeAnalytics') || { swipes: 0, likes: 0, nopes: 0, matches: 0, messages: 0 };
    const aiPerformance = stateStore.get('aiPerformance') || { gemini: { responses: 0, success: 0 } };
    const messagingStats = stateStore.get('messagingStats') || { responseRate: 0, avgResponseTime: 0 };

    // Check DOM
    if (analyticsPanel.children.length === 0) {
        renderDashboardStructure(analyticsPanel);
    }

    updateDashboardData(allTimeAnalytics, sessionAnalytics, aiPerformance, messagingStats);
}

function renderDashboardStructure(container) {
    const fragment = document.createDocumentFragment();

    // 1. KPI Grid (Match Rate, Response Rate, ELO?)
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'analytics-kpi-grid';
    kpiGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;';

    kpiGrid.appendChild(createKpiCard('Match Rate', '0%', 'match-rate-kpi', '❤️'));
    kpiGrid.appendChild(createKpiCard('Response Rate', '0%', 'response-rate-kpi', '💬'));

    fragment.appendChild(kpiGrid);

    // 2. Swipe Distribution (Bar Chart)
    const distributionBox = createAnalyticsBox('Swipe Ratio', 'swipe-dist');
    const distBody = distributionBox.querySelector('.sidebar-box-body');

    // Custom Chart Container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'analytics-chart-container';
    chartContainer.style.cssText = 'padding: 10px 0;';

    // Bar
    chartContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #aaa;">
            <span id="likes-count">0 Likes</span>
            <span id="nopes-count">0 Nopes</span>
        </div>
        <div style="height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; display: flex;">
            <div id="likes-bar" style="height: 100%; background: #00e676; width: 50%; transition: width 0.5s ease;"></div>
            <div id="nopes-bar" style="height: 100%; background: #ff5252; width: 50%; transition: width 0.5s ease;"></div>
        </div>
        <div style="text-align: center; font-size: 11px; margin-top: 6px; color: #888;" id="total-swipes-label">Total: 0</div>
    `;
    distBody.appendChild(chartContainer);
    fragment.appendChild(distributionBox);

    // 3. Detailed Stats List
    const statsBox = createAnalyticsBox('Detailed Stats', 'detailed-stats');
    const statsBody = statsBox.querySelector('.sidebar-box-body');
    statsBody.id = 'detailed-stats-body';
    // Populated dynamically
    fragment.appendChild(statsBox);

    // 4. Diagnostic Log
    const logBox = createAnalyticsBox('🕵️ Anti-Detection Log', 'diagnostic-log');
    const logBody = logBox.querySelector('.sidebar-box-body');
    logBody.id = 'diagnostic-log-container';
    logBody.style.cssText = 'max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 11px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 4px;';
    fragment.appendChild(logBox);

    container.appendChild(fragment);
}

function createKpiCard(title, value, id, icon) {
    const card = document.createElement('div');
    card.className = 'analytics-kpi-card glass-panel';
    card.style.cssText = `
        background: var(--glass-bg, rgba(255, 255, 255, 0.1));
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    `;

    card.innerHTML = `
        <div style="font-size: 20px; margin-bottom: 4px;">${icon}</div>
        <div class="kpi-title" style="font-size: 11px; color: var(--text-secondary, #666); text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
        <div id="${id}" class="kpi-value" style="font-size: 18px; font-weight: 700; color: var(--text-primary, #fd267a); margin-top: 2px;">${value}</div>
    `;
    return card;
}

function createAnalyticsBox(title, idPrefix) {
    const box = document.createElement('div');
    box.className = 'sidebar-box';
    const header = document.createElement('div');
    header.className = 'sidebar-box-header';
    header.innerHTML = title;
    box.appendChild(header);
    const body = document.createElement('div');
    body.className = 'sidebar-box-body';
    body.id = idPrefix + '-body';
    box.appendChild(body);
    return box;
}

function updateDashboardData(allTime, session, aiPerf, msgStats) {
    // 1. KPI Updates
    const matchRate = allTime.likes > 0 ? ((allTime.matches / allTime.likes) * 100).toFixed(1) : 0;
    const responseRate = msgStats.responseRate || 0;

    const matchEl = document.getElementById('match-rate-kpi');
    if (matchEl) {
        matchEl.textContent = `${matchRate}%`;
        matchEl.style.color = matchRate > 5 ? '#00e676' : (matchRate > 2 ? '#fff' : '#ff5252');
    }

    const respEl = document.getElementById('response-rate-kpi');
    if (respEl) {
        respEl.textContent = `${responseRate}%`;
    }

    // 2. Chart Updates
    const likes = allTime.likes || 0;
    const nopes = allTime.nopes || 0;
    const total = likes + nopes;
    const likePct = total > 0 ? (likes / total) * 100 : 50;
    const nopePct = total > 0 ? (nopes / total) * 100 : 50;

    const likesBar = document.getElementById('likes-bar');
    const nopesBar = document.getElementById('nopes-bar');

    if (likesBar && nopesBar) {
        likesBar.style.width = `${likePct}%`;
        nopesBar.style.width = `${nopePct}%`;
    }

    const likesLabel = document.getElementById('likes-count');
    const nopesLabel = document.getElementById('nopes-count');
    const totalLabel = document.getElementById('total-swipes-label');

    if (likesLabel) likesLabel.textContent = `${likes} Likes`;
    if (nopesLabel) nopesLabel.textContent = `${nopes} Nopes`;
    if (totalLabel) totalLabel.textContent = `Total Swipes: ${allTime.swipes || 0}`;

    // 3. Detailed Stats
    const statsBody = document.getElementById('detailed-stats-body');
    if (statsBody) {
        statsBody.innerHTML = ''; // Rebuild for simplicity
        addStatRow(statsBody, 'Matches', allTime.matches || 0, '❤️');
        addStatRow(statsBody, 'Messages Sent', allTime.messages || 0, '📨');
        addStatRow(statsBody, 'Session Swipes', session.swipes || 0, '⚡');
    }

    // 4. Diagnostic Log
    updateDiagnosticLog();
}

// Utility Helpers for Analytics
function calculateEfficiencyScore(stats) {
    if (!stats || stats.swipes === 0) return '0.0';
    const likeRatio = stats.likes / stats.swipes;
    const matchRate = stats.matches / Math.max(stats.likes, 1);
    const messageRate = stats.messages / Math.max(stats.matches, 1);
    const score = (likeRatio * 0.4 + matchRate * 0.4 + messageRate * 0.2) * 100;
    return Math.min(score, 100).toFixed(1);
}

// Global utility to update analytics (Called from swiping and messaging)
async function updateAllTimeAnalytics(delta) {
    const data = await chrome.storage.local.get(['allTimeAnalytics', 'sessionAnalytics']);
    const allTimeAnalytics = data.allTimeAnalytics || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0 };
    const sessionAnalytics = data.sessionAnalytics || { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };

    // Update All Time
    for (const k in delta) {
        allTimeAnalytics[k] = (allTimeAnalytics[k] || 0) + (delta[k] || 0);
    }

    // Update Session (Reset if date changed)
    let currentSession = sessionAnalytics;
    if (sessionAnalytics.date !== getTodayDateString()) {
        currentSession = { swipes: 0, likes: 0, nopes: 0, skips: 0, matches: 0, messages: 0, date: getTodayDateString() };
    }
    for (const k in delta) {
        currentSession[k] = (currentSession[k] || 0) + (delta[k] || 0);
    }

    await stateStore.set({
        allTimeAnalytics,
        sessionAnalytics: currentSession
    });
}

// Anti-Detection Diagnostic UI (Support for anti-detection.js calls)
function renderSidebarAntiDetectionTab(enabled) {
    // Forward to analytics tab or a specific modal if needed
    // For now, we update the diagnostic section if it exists
    updateDiagnosticLog();
}

function updateDiagnosticLog() {
    const log = (typeof ANTI_DETECTION !== 'undefined' ? ANTI_DETECTION.getDiagnosticLog() : []);
    const logContainer = document.getElementById('diagnostic-log-container');
    if (!logContainer) return;

    logContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    log.forEach(event => {
        const div = document.createElement('div');
        div.className = 'diagnostic-log-entry';

        // Parse timestamp safely (could be ISO string or Date object)
        let timeStr = '';
        try {
            const date = new Date(event.timestamp);
            timeStr = isNaN(date.getTime()) ? 'Now' : date.toLocaleTimeString();
        } catch (e) {
            timeStr = 'Now';
        }

        div.innerHTML = `<span class="diagnostic-log-time">${timeStr}:</span> ${event.message}${event.stealthMode ? ' (Stealth)' : ''}`;
        fragment.appendChild(div);
    });
    logContainer.appendChild(fragment);
}

function addStatRow(container, label, value, icon) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px;';
    row.innerHTML = `
        <span style="color: #ccc; display: flex; align-items: center; gap: 8px;">${icon} ${label}</span>
        <span style="font-weight: 600; color: #fff;">${value}</span>
    `;
    container.appendChild(row);
}
