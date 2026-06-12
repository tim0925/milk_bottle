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
    countEmpty: "countEmpty",
    isOverflow: "isOverflow",
    totalDrinks: "totalDrinks"
};

let level = Number(localStorage.getItem(STORAGE_KEYS.milkLevel)) || 0;
let isOverflow = localStorage.getItem(STORAGE_KEYS.isOverflow) === "true";

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

// ---- 波アニメーション ----
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

// ---- 溜まったミルクの表面に付着し、垂れ落ちる液体表現 ----
const SVG_NS = "http://www.w3.org/2000/svg";

const DRIPS = [
    { x: 22,  y: 230, armW: 9,  capH: 5, tailW: 5, maxTail: 26, minLevel: 0.5 },
    { x: 88,  y: 60,  armW: 13, capH: 7, tailW: 7, maxTail: 42, minLevel: 1.0 },
    { x: 44,  y: 90,  armW: 12, capH: 6, tailW: 6, maxTail: 38, minLevel: 1.5 },
    { x: 66,  y: 180, armW: 8,  capH: 4, tailW: 4, maxTail: 20, minLevel: 2.0 },
    { x: 108, y: 150, armW: 10, capH: 5, tailW: 5, maxTail: 30, minLevel: 2.5 },
    { x: 70,  y: 220, armW: 11, capH: 6, tailW: 6, maxTail: 34, minLevel: 3.0 },
];

const dripsGroup = document.getElementById("dripsGroup");
let dripEls = [];
if (dripsGroup) {
    dripEls = DRIPS.map(() => {
        const cap = document.createElementNS(SVG_NS, "ellipse");
        cap.setAttribute("fill", "url(#dripGrad)");
        const capHl = document.createElementNS(SVG_NS, "path");
        capHl.setAttribute("stroke", "rgba(255,255,255,0.7)");
        capHl.setAttribute("stroke-width", "1.5");
        capHl.setAttribute("stroke-linecap", "round");
        capHl.setAttribute("fill", "none");
        const tail = document.createElementNS(SVG_NS, "path");
        tail.setAttribute("fill", "url(#dripGrad)");
        const tailHl = document.createElementNS(SVG_NS, "path");
        tailHl.setAttribute("stroke", "rgba(255,255,255,0.65)");
        tailHl.setAttribute("stroke-width", "1.5");
        tailHl.setAttribute("stroke-linecap", "round");
        tailHl.setAttribute("fill", "none");
        dripsGroup.appendChild(cap);
        dripsGroup.appendChild(capHl);
        dripsGroup.appendChild(tail);
        dripsGroup.appendChild(tailHl);
        return { cap, capHl, tail, tailHl };
    });
}

function dripPath(x, topY, length, width) {
    const half = width / 2;
    const bulbR = width * 0.62;
    const neckBottom = Math.max(topY + half, topY + length - bulbR);
    return `M ${x - half},${topY}
        C ${x - half - 1},${topY + (neckBottom - topY) * 0.5} ${x - half + 1.5},${neckBottom - bulbR * 0.4} ${x - bulbR},${neckBottom}
        A ${bulbR},${bulbR} 0 1 0 ${x + bulbR},${neckBottom}
        C ${x + half - 1.5},${neckBottom - bulbR * 0.4} ${x + half + 1},${topY + (neckBottom - topY) * 0.5} ${x + half},${topY}
        Z`;
}

function dripHighlight(x, topY, length, width) {
    const bulbR = width * 0.62;
    const bottomY = Math.max(topY + width, topY + length - bulbR * 0.6);
    return `M ${x - width * 0.15},${topY + 3} L ${x - width * 0.15},${bottomY}`;
}

function updateDrips(lv) {
    if (!dripEls.length) return;

    DRIPS.forEach((d, i) => {
        const { cap, capHl, tail, tailHl } = dripEls[i];
        if (lv < d.minLevel) {
            cap.setAttribute("opacity", "0");
            capHl.setAttribute("opacity", "0");
            tail.setAttribute("opacity", "0");
            tailHl.setAttribute("opacity", "0");
            return;
        }

        const y = d.y;

        cap.setAttribute("cx", d.x);
        cap.setAttribute("cy", y);
        cap.setAttribute("rx", d.armW);
        cap.setAttribute("ry", d.capH);
        cap.setAttribute("opacity", "1");

        capHl.setAttribute("d", `M ${d.x - d.armW * 0.6},${y - d.capH * 0.3} Q ${d.x},${y - d.capH * 1.4} ${d.x + d.armW * 0.6},${y - d.capH * 0.3}`);
        capHl.setAttribute("opacity", "0.7");

        tail.setAttribute("d", dripPath(d.x, y + d.capH * 0.4, d.maxTail, d.tailW));
        tailHl.setAttribute("d", dripHighlight(d.x, y + d.capH * 0.4, d.maxTail, d.tailW));
        tail.setAttribute("opacity", "1");
        tailHl.setAttribute("opacity", "0.8");
    });
}

// ---- 💦噴出アニメーション（Canvas物理・噴水風） ----
const burstCanvas = document.getElementById("burstCanvas");
const burstCtx = burstCanvas ? burstCanvas.getContext("2d") : null;
const appEl = document.querySelector(".app");
const bottleSvgEl = document.getElementById("bottleSvg");
let burstDrops = [];
let burstSplats = [];
let burstEmitFrames = 0;
let burstAnimating = false;
let burstWidth = 0;
let burstHeight = 0;
let BURST_CX = 0;
let BURST_TOP_Y = 0;
let BURST_GROUND_Y = 0;

// .app全体を覆うサイズに合わせ、ボトルの位置を.app基準で求める
function updateBurstGeometry() {
    if (!burstCtx || !appEl || !bottleSvgEl) return;
    const appRect = appEl.getBoundingClientRect();
    const bottleRect = bottleSvgEl.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;

    burstWidth = appRect.width;
    burstHeight = appRect.height;
    burstCanvas.style.width = `${burstWidth}px`;
    burstCanvas.style.height = `${burstHeight}px`;
    burstCanvas.width = burstWidth * scale;
    burstCanvas.height = burstHeight * scale;
    burstCtx.setTransform(scale, 0, 0, scale, 0, 0);

    const bottleScale = bottleRect.width / 140; // bottleSvgのviewBox(140x280)に対する表示倍率
    BURST_CX = (bottleRect.left - appRect.left) + bottleRect.width / 2;
    BURST_TOP_Y = (bottleRect.top - appRect.top) + BOTTLE_TOP_Y * bottleScale;
    BURST_GROUND_Y = (bottleRect.top - appRect.top) + BOTTLE_BOT_Y * bottleScale;
}

if (appEl && "ResizeObserver" in window) {
    new ResizeObserver(updateBurstGeometry).observe(appEl);
} else {
    window.addEventListener("resize", updateBurstGeometry);
}
updateBurstGeometry();

function drawDrop(x, y, r, opacity) {
    const grad = burstCtx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    grad.addColorStop(0.6, `rgba(255, 248, 220, ${opacity})`);
    grad.addColorStop(1, `rgba(224, 208, 144, ${opacity})`);
    burstCtx.beginPath();
    burstCtx.arc(x, y, r, 0, Math.PI * 2);
    burstCtx.fillStyle = grad;
    burstCtx.fill();
}

function drawSplat(s) {
    burstCtx.beginPath();
    burstCtx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
    burstCtx.strokeStyle = `rgba(224, 208, 144, ${s.life * 0.6})`;
    burstCtx.lineWidth = 1.5;
    burstCtx.stroke();
}

function spawnBurstParticle() {
    const angle = -55 - Math.random() * 70; // 左上〜右上に幅広く噴出
    const speed = 4.5 + Math.random() * 6;
    const rad = (angle * Math.PI) / 180;
    burstDrops.push({
        x: BURST_CX,
        y: BURST_TOP_Y,
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        r: 3 + Math.random() * 5,
        bounces: 0,
        life: 1,
    });
}

function triggerBurst() {
    if (!burstCtx) return;

    burstEmitFrames = 16; // 連続噴出フレーム数（噴水風）

    if (!burstAnimating) {
        burstAnimating = true;
        requestAnimationFrame(burstStep);
    }
}

function burstStep() {
    burstCtx.clearRect(0, 0, burstWidth, burstHeight);

    if (burstEmitFrames > 0) {
        for (let i = 0; i < 3; i++) spawnBurstParticle();
        burstEmitFrames--;
    }

    burstDrops.forEach(d => {
        if (d.bounces < 2) {
            d.vy += 0.3; // 重力
            d.x += d.vx;
            d.y += d.vy;

            if (d.y + d.r >= BURST_GROUND_Y) {
                d.y = BURST_GROUND_Y - d.r;
                d.vy *= -0.35;
                d.vx *= 0.6;
                d.bounces++;
                burstSplats.push({ x: d.x, y: BURST_GROUND_Y, r: d.r * 0.6, life: 1 });
            }
        } else {
            d.life -= 0.06;
        }
        drawDrop(d.x, d.y, d.r, Math.max(0, d.life));
    });

    burstSplats.forEach(s => {
        s.r += 1.3;
        s.life -= 0.05;
        if (s.life > 0) drawSplat(s);
    });

    burstDrops = burstDrops.filter(d => d.life > 0);
    burstSplats = burstSplats.filter(s => s.life > 0);

    if (burstDrops.length || burstSplats.length || burstEmitFrames > 0) {
        requestAnimationFrame(burstStep);
    } else {
        burstAnimating = false;
    }
}

// ---- OVERFLOW状態 ----
function setOverflow(val) {
    isOverflow = val;
    localStorage.setItem(STORAGE_KEYS.isOverflow, String(val));
}

function updateOverflowDisplay() {
    const msg = document.getElementById("overflowMessage");

    if (isOverflow) {
        if (msg) {
            msg.textContent = "💢OVERFLOW💢";
            msg.classList.add("active");
        }
    } else {
        if (msg) {
            msg.textContent = "";
            msg.classList.remove("active");
        }
    }
}

// ---- 「記録を始めた日」と総💦回数 ----
function updateTrackingInfo() {
    const el = document.getElementById("trackingInfo");
    if (!el) return;

    const lastGameTime = Number(localStorage.getItem(STORAGE_KEYS.lastGameTime));
    const total = getCount(STORAGE_KEYS.totalDrinks);
    const startedText = lastGameTime
        ? new Date(lastGameTime).toLocaleString("ja-JP")
        : "—";

    el.innerHTML = `Tracking started: ${startedText}<br>Total 💦: ${total}`;
}

// ---- 表示更新 ----
function updateDisplay() {
    const status  = document.getElementById("status");
    const message = document.getElementById("message");
    const state   = getLevelState(level);

    targetDisplayLevel = level;
    updateDrips(level);
    status.textContent = `${level} / ${MAX_LEVEL}`;
    message.textContent = state.text;

    message.classList.remove("full", "hot", "better", "empty", "floaty", "pulse");
    message.classList.add(state.className);
    if (state.effect) message.classList.add(state.effect);

    updateOverflowDisplay();
    updateTrackingInfo();
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
    if (level >= MAX_LEVEL) {
        setOverflow(true);
        updateOverflowDisplay();
        return;
    }
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
    // 噴出アニメーション
    triggerBurst();

    // 少し遅らせてからリセット（アニメを見せるため）
    setTimeout(() => {
        countAchievement(level);
        addLog(level);
        localStorage.setItem(STORAGE_KEYS.lastGameTime, String(Date.now()));
        setCount(STORAGE_KEYS.totalDrinks, getCount(STORAGE_KEYS.totalDrinks) + 1);
        level = 0;
        setOverflow(false);
        saveLevel();
        updateAll();
    }, 300);
}

function clearLogs() {
    if (!confirm("Are you sure?")) return;
    [STORAGE_KEYS.gameLogs, STORAGE_KEYS.countFull, STORAGE_KEYS.countHot, STORAGE_KEYS.countBetter, STORAGE_KEYS.countEmpty, STORAGE_KEYS.totalDrinks, STORAGE_KEYS.lastGameTime]
        .forEach(k => localStorage.removeItem(k));
    updateAll();
    updateRecoveryTimer();
}

function applyMilkRecovery() {
    const lastGameTime = Number(localStorage.getItem(STORAGE_KEYS.lastGameTime));
    if (!lastGameTime) return;

    const recovered = Math.floor((Date.now() - lastGameTime) / RECOVERY_INTERVAL);
    if (recovered <= 0) return;

    const prevLevel = level;
    level = Math.min(MAX_LEVEL, level + recovered * STEP);
    saveLevel();
    localStorage.setItem(STORAGE_KEYS.lastGameTime, String(lastGameTime + recovered * RECOVERY_INTERVAL));

    // 満タンのままさらに回復が発生したらOVERFLOW
    if (prevLevel >= MAX_LEVEL && recovered > 0) {
        setOverflow(true);
    }
}

function updateRecoveryTimer() {
    const timerEl = document.getElementById("recoveryTimer");
    if (!timerEl) return;
    const lastGameTime = Number(localStorage.getItem(STORAGE_KEYS.lastGameTime));
    if (!lastGameTime || isOverflow) {
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
    updateAll();
    updateRecoveryTimer();
}, 1000);

// バックグラウンドから復帰した際に表示を即時再計算する
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        applyMilkRecovery();
        updateAll();
        updateRecoveryTimer();
    }
});
