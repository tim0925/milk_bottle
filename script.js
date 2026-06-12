const MAX_LEVEL = 3;
const STEP = 0.5;
const RECOVERY_INTERVAL = 12 * 60 * 60 * 1000;
const LOG_LIMIT = 10;

const STORAGE_KEYS = {
    milkLevel: "milkLevel",
    lastGameTime: "lastGameTime",
    gameLogs: "gameLogs",
    countFull: "countFull",
    countHot: "countHot",
    countBetter: "countBetter",
    countEmpty: "countEmpty"
};

let level = Number(localStorage.getItem(STORAGE_KEYS.milkLevel)) || 0;

const SVG_HEIGHT = 280;
const BOTTLE_TOP_Y = 8;
const BOTTLE_BOT_Y = 272;

function getLevelState(value) {
    if (value >= 3) return { key: "full",   label: "🍼FULL❤️", text: "🍼FULL❤️", className: "full",   effect: "pulse"  };
    if (value >= 2) return { key: "hot",    label: "HOT🔥",    text: "HOT🔥",    className: "hot",    effect: "floaty" };
    if (value >= 1) return { key: "better", label: "BETTER",   text: "Better",   className: "better", effect: "floaty" };
    return              { key: "empty",  label: "EMPTY",    text: "Empty...", className: "empty",  effect: ""       };
}

function saveLevel() {
    localStorage.setItem(STORAGE_KEYS.milkLevel, String(level));
}

function getLogs() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.gameLogs)) || [];
}

function saveLogs(logs) {
    localStorage.setItem(STORAGE_KEYS.gameLogs, JSON.stringify(logs));
}

function getCount(key) {
    return Number(localStorage.getItem(key)) || 0;
}

function setCount(key, value) {
    localStorage.setItem(key, String(value));
}

// 波アニメーション
let waveOffset = 0;
let currentDisplayLevel = level;
let targetDisplayLevel = level;

function animateWave() {
    waveOffset += 1.2;

    const wave1El = document.getElementById("wave1");
    const wave2El = document.getElementById("wave2");
    const x1 = (waveOffset % 280) - 280;
    const x2 = ((waveOffset * 0.7) % 280) - 280;
    if (wave1El) wave1El.setAttribute("transform", `translate(${x1}, 0)`);
    if (wave2El) wave2El.setAttribute("transform", `translate(${x2}, 0)`);

    if (Math.abs(currentDisplayLevel - targetDisplayLevel) > 0.005) {
        currentDisplayLevel += (targetDisplayLevel - currentDisplayLevel) * 0.08;
    } else {
        currentDisplayLevel = targetDisplayLevel;
    }

    updateMilkPosition(currentDisplayLevel);

    requestAnimationFrame(animateWave);
}

function updateMilkPosition(lv) {
    const ratio = lv / MAX_LEVEL;
    const milkTopY = BOTTLE_BOT_Y - ratio * (BOTTLE_BOT_Y - BOTTLE_TOP_Y);

    const milkFill = document.getElementById("milkFill");
    const waveGroup = document.getElementById("waveGroup");

    if (milkFill) {
        milkFill.setAttribute("y", milkTopY);
        milkFill.setAttribute("height", BOTTLE_BOT_Y - milkTopY + 10);
    }
    if (waveGroup) {
        waveGroup.setAttribute("transform", `translate(0, ${milkTopY})`);
    }
}

function updateDisplay() {
    const status = document.getElementById("status");
    const message = document.getElementById("message");
    const state = getLevelState(level);

    targetDisplayLevel = level;

    status.textContent = `${level} / ${MAX_LEVEL}`;
    message.textContent = state.text;

    message.classList.remove("full", "hot", "better", "empty", "floaty", "pulse");
    message.classList.add(state.className);
    if (state.effect) message.classList.add(state.effect);
}

function renderStats() {
    const stats = document.getElementById("stats");
    const items = [
        { label: "FULL❤️", value: getCount(STORAGE_KEYS.countFull),   className: "full"   },
        { label: "HOT🔥",  value: getCount(STORAGE_KEYS.countHot),    className: "hot"    },
        { label: "BETTER", value: getCount(STORAGE_KEYS.countBetter), className: "better" },
        { label: "EMPTY",  value: getCount(STORAGE_KEYS.countEmpty),  className: "empty"  }
    ];
    stats.innerHTML = items.map(item => `
        <div class="stat-row ${item.className}">
            <span class="stat-label">${item.label}</span>
            <span class="stat-value">${item.value}</span>
        </div>
    `).join("");
}

function renderLogs() {
    const logList = document.getElementById("logList");
    const logs = getLogs();
    if (logs.length === 0) {
        logList.innerHTML = `<div class="empty-box">No logs yet.</div>`;
        return;
    }
    logList.innerHTML = logs.map(log => `
        <div class="log-row ${log.className}">
            <span class="log-date">${log.date}</span>
            <span class="log-main">${log.label} (${log.milk}/${MAX_LEVEL})</span>
        </div>
    `).join("");
}

function updateAll() {
    updateDisplay();
    renderStats();
    renderLogs();
}

function addMilk() {
    if (level >= MAX_LEVEL) return;
    level = Math.min(MAX_LEVEL, level + STEP);
    saveLevel();
    updateDisplay();
}

function countAchievement(milkLevel) {
    const state = getLevelState(milkLevel);
    const keyMap = { full: STORAGE_KEYS.countFull, hot: STORAGE_KEYS.countHot, better: STORAGE_KEYS.countBetter, empty: STORAGE_KEYS.countEmpty };
    const k = keyMap[state.key];
    setCount(k, getCount(k) + 1);
}

function addLog(milkLevel) {
    const logs = getLogs();
    const state = getLevelState(milkLevel);
    logs.unshift({ date: new Date().toLocaleString("ja-JP"), milk: milkLevel, label: state.label, className: state.className });
    saveLogs(logs.slice(0, LOG_LIMIT));
}

function drinkMilk() {
    countAchievement(level);
    addLog(level);
    localStorage.setItem(STORAGE_KEYS.lastGameTime, String(Date.now()));
    level = 0;
    saveLevel();
    updateAll();
}

function clearLogs() {
    if (!confirm("Are you sure?")) return;
    [STORAGE_KEYS.gameLogs, STORAGE_KEYS.countFull, STORAGE_KEYS.countHot, STORAGE_KEYS.countBetter, STORAGE_KEYS.countEmpty]
        .forEach(k => localStorage.removeItem(k));
    updateAll();
}

function applyMilkRecovery() {
    const lastGameTime = Number(localStorage.getItem(STORAGE_KEYS.lastGameTime));
    if (!lastGameTime) return;
    const recovered = Math.floor((Date.now() - lastGameTime) / RECOVERY_INTERVAL);
    if (recovered <= 0) return;
    level = Math.min(MAX_LEVEL, level + recovered * STEP);
    saveLevel();
    localStorage.setItem(STORAGE_KEYS.lastGameTime, String(lastGameTime + recovered * RECOVERY_INTERVAL));
}

function updateRecoveryTimer() {
    const timerEl = document.getElementById("recoveryTimer");
    if (!timerEl) return;
    const lastGameTime = Number(localStorage.getItem(STORAGE_KEYS.lastGameTime));
    if (!lastGameTime || level >= MAX_LEVEL) {
        timerEl.textContent = "";
        timerEl.classList.remove("active");
        return;
    }
    const nextRecovery = RECOVERY_INTERVAL - ((Date.now() - lastGameTime) % RECOVERY_INTERVAL);
    const totalSec = Math.ceil(nextRecovery / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    timerEl.textContent = `🕐 Next +MILK in ${h}:${m}:${s}`;
    timerEl.classList.add("active");
}

document.getElementById("addBtn").addEventListener("click", addMilk);
document.getElementById("drinkBtn").addEventListener("click", drinkMilk);
document.getElementById("clearBtn").addEventListener("click", clearLogs);

applyMilkRecovery();
currentDisplayLevel = level;
targetDisplayLevel = level;
updateMilkPosition(level);
updateAll();
updateRecoveryTimer();

animateWave();

setInterval(() => {
    applyMilkRecovery();
    updateDisplay();
    renderStats();
    renderLogs();
    updateRecoveryTimer();
}, 1000);
