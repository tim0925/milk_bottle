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

function getLevelState(value) {
    if (value >= 3) {
        return {
            key: "full",
            label: "🍼FULL❤️",
            text: "🍼FULL❤️",
            className: "full",
            effect: "pulse"
        };
    }

    if (value >= 2) {
        return {
            key: "hot",
            label: "HOT🔥",
            text: "HOT🔥",
            className: "hot",
            effect: "floaty"
        };
    }

    if (value >= 1) {
        return {
            key: "better",
            label: "BETTER",
            text: "Better",
            className: "better",
            effect: "floaty"
        };
    }

    return {
        key: "empty",
        label: "EMPTY",
        text: "Empty...",
        className: "empty",
        effect: ""
    };
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

function updateDisplay() {
    const milk = document.getElementById("milk");
    const status = document.getElementById("status");
    const message = document.getElementById("message");

    const state = getLevelState(level);

    milk.style.height = `${(level / MAX_LEVEL) * 100}%`;
    status.textContent = `${level} / ${MAX_LEVEL}`;
    message.textContent = state.text;

    message.classList.remove("full", "hot", "better", "empty", "floaty", "pulse");
    message.classList.add(state.className);

    if (state.effect) {
        message.classList.add(state.effect);
    }
}

function renderStats() {
    const stats = document.getElementById("stats");

    const items = [
        {
            label: "FULL❤️",
            value: getCount(STORAGE_KEYS.countFull),
            className: "full"
        },
        {
            label: "HOT🔥",
            value: getCount(STORAGE_KEYS.countHot),
            className: "hot"
        },
        {
            label: "BETTER",
            value: getCount(STORAGE_KEYS.countBetter),
            className: "better"
        },
        {
            label: "EMPTY",
            value: getCount(STORAGE_KEYS.countEmpty),
            className: "empty"
        }
    ];

    stats.innerHTML = items
        .map(item => {
            return `
                <div class="stat-row ${item.className}">
                    <span class="stat-label">${item.label}</span>
                    <span class="stat-value">${item.value}</span>
                </div>
            `;
        })
        .join("");
}

function renderLogs() {
    const logList = document.getElementById("logList");
    const logs = getLogs();

    if (logs.length === 0) {
        logList.innerHTML = `<div class="empty-box">No logs yet.</div>`;
        return;
    }

    logList.innerHTML = logs
        .map(log => {
            return `
                <div class="log-row ${log.className}">
                    <span class="log-date">${log.date}</span>
                    <span class="log-main">${log.label} (${log.milk}/${MAX_LEVEL})</span>
                </div>
            `;
        })
        .join("");
}

function updateAll() {
    updateDisplay();
    renderStats();
    renderLogs();
}

function addMilk() {
    if (level >= MAX_LEVEL) {
        return;
    }

    level = Math.min(MAX_LEVEL, level + STEP);
    saveLevel();
    updateDisplay();
}

function countAchievement(milkLevel) {
    const state = getLevelState(milkLevel);

    if (state.key === "full") {
        setCount(STORAGE_KEYS.countFull, getCount(STORAGE_KEYS.countFull) + 1);
    } else if (state.key === "hot") {
        setCount(STORAGE_KEYS.countHot, getCount(STORAGE_KEYS.countHot) + 1);
    } else if (state.key === "better") {
        setCount(STORAGE_KEYS.countBetter, getCount(STORAGE_KEYS.countBetter) + 1);
    } else {
        setCount(STORAGE_KEYS.countEmpty, getCount(STORAGE_KEYS.countEmpty) + 1);
    }
}

function addLog(milkLevel) {
    const logs = getLogs();
    const now = new Date();
    const state = getLevelState(milkLevel);

    logs.unshift({
        date: now.toLocaleString("ja-JP"),
        milk: milkLevel,
        label: state.label,
        className: state.className
    });

    saveLogs(logs.slice(0, LOG_LIMIT));
}

function drinkMilk() {
    const currentLevel = level;

    countAchievement(currentLevel);
    addLog(currentLevel);

    localStorage.setItem(STORAGE_KEYS.lastGameTime, String(Date.now()));

    level = 0;
    saveLevel();
    updateAll();
}

function clearLogs() {
    const result = confirm("Are you sure?");

    if (!result) {
        return;
    }

    localStorage.removeItem(STORAGE_KEYS.gameLogs);
    localStorage.removeItem(STORAGE_KEYS.countFull);
    localStorage.removeItem(STORAGE_KEYS.countHot);
    localStorage.removeItem(STORAGE_KEYS.countBetter);
    localStorage.removeItem(STORAGE_KEYS.countEmpty);

    updateAll();
}

function applyMilkRecovery() {
    const lastGameTime = Number(localStorage.getItem(STORAGE_KEYS.lastGameTime));

    if (!lastGameTime) {
        return;
    }

    const now = Date.now();
    const recovered = Math.floor((now - lastGameTime) / RECOVERY_INTERVAL);

    if (recovered <= 0) {
        return;
    }

    level = Math.min(MAX_LEVEL, level + recovered * STEP);
    saveLevel();

    localStorage.setItem(
        STORAGE_KEYS.lastGameTime,
        String(lastGameTime + recovered * RECOVERY_INTERVAL)
    );
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

    const now = Date.now();
    const elapsed = now - lastGameTime;
    const nextRecovery = RECOVERY_INTERVAL - (elapsed % RECOVERY_INTERVAL);

    const totalSec = Math.ceil(nextRecovery / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");

    timerEl.textContent = `🕐 Next +MILK in ${hh}:${mm}:${ss}`;
    timerEl.classList.add("active");
}

document.getElementById("addBtn").addEventListener("click", addMilk);
document.getElementById("drinkBtn").addEventListener("click", drinkMilk);
document.getElementById("clearBtn").addEventListener("click", clearLogs);

applyMilkRecovery();
updateAll();
updateRecoveryTimer();
setInterval(() => {
    applyMilkRecovery();
    updateAll();
    updateRecoveryTimer();
}, 1000);
