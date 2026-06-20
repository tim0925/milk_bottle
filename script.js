const MAX_LEVEL = 3;
const HARD_MAX_LEVEL = 10;
const OVERFLOW_THRESHOLD = 3.6; // この値以上でOVERFLOW表示
const STEP = 0.5;
const RECOVERY_STEP = 0.1;
const RECOVERY_INTERVAL = 24 * 60 * 60 * 1000 / 10; // 24時間で1（0.1刻み）
const LOG_LIMIT = 500;

const STORAGE_KEYS = {
    milkLevel: "milkLevel",
    lastGameTime: "lastGameTime",
    gameLogs: "gameLogs",
    countFull: "countFull",
    countHot: "countHot",
    countBetter: "countBetter",
    countEmpty: "countEmpty",
    isOverflow: "isOverflow",
    totalDrinks: "totalDrinks",
    energyHistory: "energyHistory",
    energyPulse: "energyPulse",
    energySyncUrl: "energySyncUrl",
    reactionLinesSyncUrl: "reactionLinesSyncUrl",
    reactionLinesOverride: "reactionLinesOverride",
    pinnedReactionChar: "pinnedReactionChar"
};

const ENERGY_HISTORY_LIMIT = 14;
const PULSE_MAX_DURATION = 2.2; // 秒（鼓動が遅い状態・スタート時）
const PULSE_MIN_DURATION = 0.4; // 秒（鼓動が速い状態）
const PULSE_STEP = 0.03; // +1エナジーごとに鼓動が早くなる量
const ICON_MIN_SIZE = 100; // px（スタート時のサイズ）
const ICON_MAX_SIZE = 260; // px（最大サイズ。脈拍のピーク時(最大1.28倍)でも画面幅に収まるよう抑えてある）
const ICON_SIZE_STEP = 12; // +1エナジーごとに大きくなるサイズ

let level = Number(localStorage.getItem(STORAGE_KEYS.milkLevel)) || 0;
let isOverflow = localStorage.getItem(STORAGE_KEYS.isOverflow) === "true";
let activeTab = "bottle";

const BOTTLE_TOP_Y = 8;
const BOTTLE_BOT_Y = 272;

function getLevelState(value) {
    if (value >= 3) return { key: "full", label: "🍼FULL❤️", text: "🍼FULL❤️", className: "full", effect: "pulse" };
    if (value >= 1.5) return { key: "hot", label: "HOT🔥", text: "HOT🔥", className: "hot", effect: "floaty" };
    if (value >= 0.6) return { key: "better", label: "BETTER", text: "Better", className: "better", effect: "floaty" };
    return { key: "empty", label: "EMPTY", text: "Empty...", className: "empty", effect: "" };
}

// 0.1刻みの計算で生じる浮動小数点誤差(0.30000000000000004など)を補正
function roundLevel(value) {
    return Math.round(value * 10) / 10;
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

// ベースとなる出現位置と出現レベル。実際の見た目はbuildDrip()でランダムに生成する。
const DRIP_BASE = [
    { x: 22, y: 230, minLevel: 0.4 },
    { x: 50, y: 95, minLevel: 0.7 },
    { x: 86, y: 55, minLevel: 1.0 },
    { x: 112, y: 145, minLevel: 1.3 },
    { x: 36, y: 130, minLevel: 1.6 },
    { x: 68, y: 185, minLevel: 1.9 },
    { x: 96, y: 205, minLevel: 2.2 },
    { x: 58, y: 60, minLevel: 2.6 },
    { x: 116, y: 95, minLevel: 3.0 },
];

// 毎回ランダムに形・揺れ・しずくの付き方を生成し、粘性のある液だれっぽい表現にする
function buildDrip(base) {
    const tailW = 4 + Math.random() * 6;
    return {
        x: base.x + (Math.random() * 8 - 4),
        y: base.y + (Math.random() * 12 - 6),
        armW: tailW * (1.4 + Math.random() * 0.5),
        capH: tailW * (0.55 + Math.random() * 0.2),
        tailW,
        maxTail: 14 + Math.random() * 30,
        bend: (Math.random() - 0.5) * tailW * 2.4,
        bulgeShiftX: (Math.random() - 0.5) * tailW * 0.8,
        bulbScaleX: 0.55 + Math.random() * 0.25,
        bulbScaleY: 0.85 + Math.random() * 0.3,
        hasSatellite: Math.random() < 0.55,
        satelliteOffsetX: (Math.random() - 0.5) * 14,
        satelliteOffsetY: 8 + Math.random() * 14,
        satelliteR: 2 + Math.random() * 2.5,
        minLevel: base.minLevel,
    };
}

const DRIPS = DRIP_BASE.map(buildDrip);

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
        const satellite = document.createElementNS(SVG_NS, "ellipse");
        satellite.setAttribute("fill", "url(#dripGrad)");
        const satelliteHl = document.createElementNS(SVG_NS, "circle");
        satelliteHl.setAttribute("fill", "rgba(255,255,255,0.8)");
        dripsGroup.appendChild(cap);
        dripsGroup.appendChild(capHl);
        dripsGroup.appendChild(tail);
        dripsGroup.appendChild(tailHl);
        dripsGroup.appendChild(satellite);
        dripsGroup.appendChild(satelliteHl);
        return { cap, capHl, tail, tailHl, satellite, satelliteHl };
    });
}

// 揺れ(bend)と非対称なしずく先端(bulge)を持つ、粘性液っぽい輪郭
function dripPath(d, topY) {
    const half = d.tailW / 2;
    const bulbRx = d.tailW * d.bulbScaleX;
    const bulbRy = d.tailW * d.bulbScaleY;
    const neckBottom = Math.max(topY + half, topY + d.maxTail - bulbRy);
    const midY = topY + (neckBottom - topY) * 0.5;
    const bend = d.bend;
    const bx = d.x + d.bulgeShiftX;

    return `M ${d.x - half},${topY}
        C ${d.x - half + bend},${midY} ${bx - bulbRx + 1},${neckBottom - bulbRy * 0.5} ${bx - bulbRx},${neckBottom}
        A ${bulbRx},${bulbRy} 0 1 0 ${bx + bulbRx},${neckBottom}
        C ${bx + bulbRx - 1},${neckBottom - bulbRy * 0.5} ${d.x + half + bend},${midY} ${d.x + half},${topY}
        Z`;
}

// ネックの揺れに沿って弧を描くハイライト（つや感）
function dripHighlight(d, topY) {
    const half = d.tailW / 2;
    const bulbRy = d.tailW * d.bulbScaleY;
    const neckBottom = Math.max(topY + half, topY + d.maxTail - bulbRy);
    const midY = topY + (neckBottom - topY) * 0.5;
    const hx = d.x - half * 0.3;
    return `M ${hx},${topY + 3} Q ${hx + d.bend * 0.6},${midY} ${hx + d.bend * 0.3},${neckBottom - bulbRy * 0.6}`;
}

function updateDrips(lv) {
    if (!dripEls.length) return;

    DRIPS.forEach((d, i) => {
        const { cap, capHl, tail, tailHl, satellite, satelliteHl } = dripEls[i];
        if (lv < d.minLevel) {
            [cap, capHl, tail, tailHl, satellite, satelliteHl].forEach(el => el.setAttribute("opacity", "0"));
            return;
        }

        const y = d.y;
        const topY = y + d.capH * 0.4;

        cap.setAttribute("cx", d.x);
        cap.setAttribute("cy", y);
        cap.setAttribute("rx", d.armW);
        cap.setAttribute("ry", d.capH);
        cap.setAttribute("opacity", "1");

        capHl.setAttribute("d", `M ${d.x - d.armW * 0.6},${y - d.capH * 0.3} Q ${d.x + d.bend * 0.3},${y - d.capH * 1.4} ${d.x + d.armW * 0.6},${y - d.capH * 0.3}`);
        capHl.setAttribute("opacity", "0.7");

        tail.setAttribute("d", dripPath(d, topY));
        tailHl.setAttribute("d", dripHighlight(d, topY));
        tail.setAttribute("opacity", "1");
        tailHl.setAttribute("opacity", "0.8");

        // 本体から少し離れた位置に飛び散ったしずくを表示
        if (d.hasSatellite && lv >= d.minLevel + 0.4) {
            const bulbRy = d.tailW * d.bulbScaleY;
            const neckBottom = Math.max(topY + d.tailW / 2, topY + d.maxTail - bulbRy);
            const sx = d.x + d.bulgeShiftX + d.satelliteOffsetX;
            const sy = neckBottom + d.satelliteOffsetY;
            satellite.setAttribute("cx", sx);
            satellite.setAttribute("cy", sy);
            satellite.setAttribute("rx", d.satelliteR);
            satellite.setAttribute("ry", d.satelliteR * 1.2);
            satellite.setAttribute("opacity", "0.9");
            satelliteHl.setAttribute("cx", sx - d.satelliteR * 0.3);
            satelliteHl.setAttribute("cy", sy - d.satelliteR * 0.3);
            satelliteHl.setAttribute("r", d.satelliteR * 0.3);
            satelliteHl.setAttribute("opacity", "0.8");
        } else {
            satellite.setAttribute("opacity", "0");
            satelliteHl.setAttribute("opacity", "0");
        }
    });
}

// ---- ミルクの溜まり具合に応じて瓶の左右に出現する❤ ----
const heartsLayer = document.getElementById("heartsLayer");
const energyHeartsLayer = document.getElementById("energyHeartsLayer");

function spawnHeartIn(layer) {
    if (!layer) return;
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = "❤️";

    const fromLeft = Math.random() < 0.5;
    const xPos = fromLeft ? Math.random() * 18 : 82 + Math.random() * 18;
    const yPos = 10 + Math.random() * 70;

    heart.style.left = `${xPos}%`;
    heart.style.top = `${yPos}%`;
    heart.style.fontSize = `${14 + Math.random() * 10}px`;
    heart.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;

    layer.appendChild(heart);
    heart.addEventListener("animationend", () => heart.remove());
}

function spawnHeart() {
    spawnHeartIn(heartsLayer);
}

function spawnEnergyHeart() {
    spawnHeartIn(energyHeartsLayer);
}

function heartTick() {
    const ratio = level / MAX_LEVEL;
    if (ratio <= 0) return;

    if (ratio >= 1) {
        // FULL: あちこちからひっきりなしに❤が溢れ出す
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) spawnHeart();
    } else if (Math.random() < ratio) {
        spawnHeart();
    }
}

// ---- エナジーが溜まっているほど浮遊する❤ ----
function energyHeartTick() {
    const maxCount = Math.ceil((ICON_MAX_SIZE - ICON_MIN_SIZE) / ICON_SIZE_STEP);
    const ratio = Math.min(1, getPulseCount() / maxCount);
    if (ratio <= 0) return;

    if (ratio >= 1) {
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) spawnEnergyHeart();
    } else if (Math.random() < ratio) {
        spawnEnergyHeart();
    }
}

setInterval(() => {
    if (activeTab === "bottle") heartTick();
    if (activeTab === "emotion") energyHeartTick();
}, 250);

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

    const logs = getLogs();
    const total = getCount(STORAGE_KEYS.totalDrinks);
    const startedText = logs.length
        ? logs[logs.length - 1].date
        : "—";

    el.innerHTML = `Tracking started: ${startedText}<br>Total 💦: ${total}`;
}

// ---- レベル表示用のテキスト（HARD_MAX_LEVEL以上は「10+」と表記） ----
function formatLevelText(value) {
    return value >= HARD_MAX_LEVEL ? `${HARD_MAX_LEVEL}+` : `${value}`;
}

// ---- 表示更新 ----
function updateDisplay() {
    const status = document.getElementById("status");
    const message = document.getElementById("message");
    const state = getLevelState(level);

    targetDisplayLevel = level;
    updateDrips(level);
    status.textContent = `${formatLevelText(level)} / ${MAX_LEVEL}`;
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
        { label: "FULL❤️", value: getCount(STORAGE_KEYS.countFull), className: "full" },
        { label: "HOT🔥", value: getCount(STORAGE_KEYS.countHot), className: "hot" },
        { label: "BETTER", value: getCount(STORAGE_KEYS.countBetter), className: "better" },
        { label: "EMPTY", value: getCount(STORAGE_KEYS.countEmpty), className: "empty" }
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
            <span class="log-main">${log.label} (${formatLevelText(log.milk)}/${MAX_LEVEL})</span>
        </div>
    `).join("");
}

function updateAll() {
    updateDisplay();
    renderStats();
    renderLogs();
}

function addMilk() {
    if (level >= HARD_MAX_LEVEL) {
        setOverflow(true);
        updateOverflowDisplay();
        return;
    }
    level = roundLevel(Math.min(HARD_MAX_LEVEL, level + STEP));
    setOverflow(level >= OVERFLOW_THRESHOLD);
    saveLevel();
    updateDisplay();
    updateReaction();
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

// ---- 日付ヘッダー ----
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function renderDateHeader() {
    const el = document.getElementById("dateHeader");
    if (!el) return;
    const d = new Date();
    el.textContent = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[d.getDay()]})`;
}

// ---- タブ切り替え ----
function setupTabs() {
    const tabBottleBtn = document.getElementById("tabBottleBtn");
    const tabEmotionBtn = document.getElementById("tabEmotionBtn");
    const pageBottle = document.getElementById("pageBottle");
    const pageEmotion = document.getElementById("pageEmotion");
    if (!tabBottleBtn || !tabEmotionBtn || !pageBottle || !pageEmotion) return;

    function showTab(tab) {
        const isBottle = tab === "bottle";
        activeTab = tab;
        tabBottleBtn.classList.toggle("active", isBottle);
        tabEmotionBtn.classList.toggle("active", !isBottle);
        pageBottle.hidden = !isBottle;
        pageEmotion.hidden = isBottle;
        if (isBottle) {
            updateBurstGeometry();
            updateReaction();
        }
        if (!isBottle) {
            renderEnergyGraph();
            setRandomEnergyIcon();
        }
    }

    tabBottleBtn.addEventListener("click", () => showTab("bottle"));
    tabEmotionBtn.addEventListener("click", () => showTab("emotion"));
}

// ---- EMOTION（エナジー）----
function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getEnergyHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.energyHistory)) || [];
}

function saveEnergyHistory(history) {
    localStorage.setItem(STORAGE_KEYS.energyHistory, JSON.stringify(history));
}

function ensureTodayEnergyEntry() {
    const history = getEnergyHistory();
    const todayKey = getTodayKey();
    let today = history.find(e => e.date === todayKey);
    if (!today) {
        today = { date: todayKey, energy: 0, drink: false };
        history.push(today);
        if (history.length > ENERGY_HISTORY_LIMIT) {
            history.splice(0, history.length - ENERGY_HISTORY_LIMIT);
        }
        saveEnergyHistory(history);
    }
    return { history, today };
}

const ENERGY_ICON_DIR = "icon/";
const ENERGY_ICON_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

// icon/icons.js に列挙したファイル名一覧（file://で開いた場合のフォールバック）
function getEnergyIconListFromManifest() {
    if (typeof ENERGY_ICON_LIST !== "undefined" && ENERGY_ICON_LIST.length) {
        return ENERGY_ICON_LIST.map(f => ENERGY_ICON_DIR + encodeURIComponent(f));
    }
    return [];
}

// 簡易サーバー(python -m http.server等)のディレクトリ一覧から画像ファイルを自動検出する
async function loadEnergyIconList() {
    try {
        const res = await fetch(ENERGY_ICON_DIR);
        if (!res.ok) throw new Error("directory listing not available");
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const files = Array.from(doc.querySelectorAll("a"))
            .map(a => a.getAttribute("href") || "")
            .filter(href => ENERGY_ICON_EXTENSIONS.some(ext => href.toLowerCase().endsWith(ext)));
        if (files.length === 0) throw new Error("no images found");
        return files.map(f => ENERGY_ICON_DIR + decodeURIComponent(f));
    } catch (e) {
        return getEnergyIconListFromManifest();
    }
}

// ---- 自分で選んだ画像をブラウザ内（IndexedDB）に保存（GitHubには公開しない） ----
const ENERGY_IMAGE_DB_NAME = "milkBottleEnergyImages";
const ENERGY_IMAGE_DB_STORE = "images";

function openEnergyImageDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(ENERGY_IMAGE_DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(ENERGY_IMAGE_DB_STORE, { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function addEnergyImages(files) {
    const db = await openEnergyImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ENERGY_IMAGE_DB_STORE, "readwrite");
        const store = tx.objectStore(ENERGY_IMAGE_DB_STORE);
        Array.from(files).forEach(file => store.add({ blob: file }));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllEnergyImages() {
    const db = await openEnergyImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ENERGY_IMAGE_DB_STORE, "readonly");
        const req = tx.objectStore(ENERGY_IMAGE_DB_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function clearEnergyImages() {
    const db = await openEnergyImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ENERGY_IMAGE_DB_STORE, "readwrite");
        tx.objectStore(ENERGY_IMAGE_DB_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ---- PCで用意した画像セットを秘密URL経由でこの端末に取り込む ----
// URLは自分のブラウザ（localStorage）にのみ保存され、リポジトリには含まれないため
// 他の利用者には公開されない。取得先には data URL の配列（JSON）を置いておくこと。
function getEnergySyncUrl() {
    return localStorage.getItem(STORAGE_KEYS.energySyncUrl) || "";
}

function saveEnergySyncUrl(url) {
    if (url) {
        localStorage.setItem(STORAGE_KEYS.energySyncUrl, url);
    } else {
        localStorage.removeItem(STORAGE_KEYS.energySyncUrl);
    }
}

async function syncEnergyImagesFromUrl(url) {
    const statusEl = document.getElementById("energySyncStatus");
    if (statusEl) statusEl.textContent = "同期中…";
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const list = await res.json();
        if (!Array.isArray(list) || !list.length) throw new Error("empty list");
        const blobs = await Promise.all(list.map(async (dataUrl) => (await fetch(dataUrl)).blob()));
        await clearEnergyImages();
        await addEnergyImages(blobs);
        await updateEnergyImageCount();
        setRandomEnergyIcon();
        if (statusEl) statusEl.textContent = `同期完了（${blobs.length}枚）`;
    } catch (e) {
        if (statusEl) statusEl.textContent = "同期に失敗しました";
    }
}

async function updateEnergyImageCount() {
    const el = document.getElementById("energyImageCount");
    if (!el) return;
    const stored = await getAllEnergyImages();
    el.textContent = stored.length
        ? `登録画像: ${stored.length}枚`
        : "登録画像なし（icon内の画像を表示中）";
}

let energyIconObjectUrl = null;

async function setRandomEnergyIcon() {
    const img = document.getElementById("energyIconImg");
    if (!img) return;

    const stored = await getAllEnergyImages();
    if (stored.length) {
        const blob = stored[Math.floor(Math.random() * stored.length)].blob;
        if (energyIconObjectUrl) URL.revokeObjectURL(energyIconObjectUrl);
        energyIconObjectUrl = URL.createObjectURL(blob);
        img.src = energyIconObjectUrl;
        return;
    }

    const icons = await loadEnergyIconList();
    if (!icons.length) return;
    if (energyIconObjectUrl) {
        URL.revokeObjectURL(energyIconObjectUrl);
        energyIconObjectUrl = null;
    }
    img.src = icons[Math.floor(Math.random() * icons.length)];
}

function getPulseCount() {
    return Number(localStorage.getItem(STORAGE_KEYS.energyPulse)) || 0;
}

function setPulseCount(value) {
    localStorage.setItem(STORAGE_KEYS.energyPulse, String(Math.max(0, value)));
}

function applyPulseSpeed() {
    const icon = document.getElementById("energyIcon");
    const levelEl = document.getElementById("energyLevelStatus");
    if (!icon) return;

    const count = getPulseCount();
    if (count <= 0) {
        icon.classList.remove("pulsing");
    } else {
        const duration = Math.max(PULSE_MIN_DURATION, PULSE_MAX_DURATION - count * PULSE_STEP);
        icon.style.setProperty("--pulse-duration", `${duration}s`);
        icon.classList.add("pulsing");
    }

    const size = Math.min(ICON_MAX_SIZE, ICON_MIN_SIZE + count * ICON_SIZE_STEP);
    icon.style.setProperty("--icon-size", `${size}px`);

    if (levelEl) levelEl.textContent = `Lv${count}`;
}

// ---- 鼓動アイコンをタップして拡大表示（ライトボックス） ----
// 鼓動・Lv・ランダム表示の状態には一切触らず、表示中の画像をそのまま大きく見せるだけ。
function openEnergyLightbox() {
    const iconImg = document.getElementById("energyIconImg");
    const lightbox = document.getElementById("energyLightbox");
    const lightboxImg = document.getElementById("energyLightboxImg");
    if (!iconImg || !lightbox || !lightboxImg) return;
    if (!iconImg.src) return; // 画像が無いときは開かない
    lightboxImg.src = iconImg.src; // いま表示中の画像をそのまま拡大
    lightbox.classList.add("open");
}

function closeEnergyLightbox() {
    const lightbox = document.getElementById("energyLightbox");
    if (lightbox) lightbox.classList.remove("open");
}

function setupEnergyLightbox() {
    const icon = document.getElementById("energyIcon");
    const lightbox = document.getElementById("energyLightbox");
    const closeBtn = document.getElementById("energyLightboxClose");
    const inner = lightbox ? lightbox.querySelector(".energy-lightbox-inner") : null;
    if (!icon || !lightbox) return;

    icon.addEventListener("click", openEnergyLightbox);
    lightbox.addEventListener("click", closeEnergyLightbox); // 背景タップで閉じる
    if (inner) inner.addEventListener("click", (e) => e.stopPropagation()); // 画像タップでは閉じない
    if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeEnergyLightbox(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEnergyLightbox(); });
}

function addEnergy() {
    const { history, today } = ensureTodayEnergyEntry();
    today.energy += 1;
    saveEnergyHistory(history);
    setPulseCount(getPulseCount() + 1);
    applyPulseSpeed();
    renderEnergyGraph();
}

function removeEnergy() {
    const { history, today } = ensureTodayEnergyEntry();
    if (today.energy <= 0) return;
    today.energy -= 1;
    saveEnergyHistory(history);
    setPulseCount(getPulseCount() - 1);
    applyPulseSpeed();
    renderEnergyGraph();
}

function renderEnergyGraph() {
    const svg = document.getElementById("energyGraph");
    if (!svg) return;

    const { history } = ensureTodayEnergyEntry();

    const width = 320;
    const height = 120;
    const padL = 22;
    const padR = 10;
    const padT = 22;
    const padB = 24;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const n = history.length;
    const actualMax = history.length ? Math.max(...history.map(e => e.energy)) : 0;
    const maxEnergy = Math.max(5, actualMax + 1);

    const points = history.map((e, i) => {
        const x = n === 1 ? padL : padL + (plotW * i) / (n - 1);
        const y = padT + plotH - (e.energy / maxEnergy) * plotH;
        return { x, y, e };
    });

    const linePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const labelStep = n > 7 ? 2 : 1;
    const baselineY = padT + plotH;

    let svgContent = `
        <line x1="${padL}" y1="${baselineY}" x2="${width - padR}" y2="${baselineY}" stroke="#eee" stroke-width="1"/>
        <polyline points="${linePoints}" fill="none" stroke="#ff6f91" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    `;

    points.forEach((p, i) => {
        svgContent += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#ff6f91"/>`;
        svgContent += `<text x="${p.x.toFixed(1)}" y="${Math.max(p.y - 8, 10).toFixed(1)}" font-size="10" font-weight="700" text-anchor="middle" fill="#c25b80">${p.e.energy}</text>`;
        if (p.e.drink) {
            svgContent += `<text x="${p.x.toFixed(1)}" y="${baselineY + 12}" font-size="11" text-anchor="middle">💦</text>`;
        }
        if (i % labelStep === 0 || i === points.length - 1) {
            const [, mo, da] = p.e.date.split("-");
            svgContent += `<text x="${p.x.toFixed(1)}" y="${height - 4}" font-size="9" text-anchor="middle" fill="#aaa">${Number(mo)}/${Number(da)}</text>`;
        }
    });

    svg.innerHTML = svgContent;
}

function resetEnergyForDrink() {
    const { history, today } = ensureTodayEnergyEntry();
    today.drink = true;
    saveEnergyHistory(history);
    setPulseCount(0);
    applyPulseSpeed();
    renderEnergyGraph();
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
        resetEnergyForDrink();
        updateAll();
        updateReaction();
    }, 300);
}

function clearLogs() {
    if (!confirm("Are you sure?")) return;
    [STORAGE_KEYS.gameLogs, STORAGE_KEYS.countFull, STORAGE_KEYS.countHot, STORAGE_KEYS.countBetter, STORAGE_KEYS.countEmpty, STORAGE_KEYS.totalDrinks, STORAGE_KEYS.lastGameTime, STORAGE_KEYS.energyHistory, STORAGE_KEYS.energyPulse]
        .forEach(k => localStorage.removeItem(k));
    updateAll();
    updateRecoveryTimer();
    renderEnergyGraph();
    applyPulseSpeed();
}

function applyMilkRecovery() {
    const lastGameTime = Number(localStorage.getItem(STORAGE_KEYS.lastGameTime));
    if (!lastGameTime) return;

    const recovered = Math.floor((Date.now() - lastGameTime) / RECOVERY_INTERVAL);
    if (recovered <= 0) return;

    level = roundLevel(Math.min(HARD_MAX_LEVEL, level + recovered * RECOVERY_STEP));
    setOverflow(level >= OVERFLOW_THRESHOLD);
    saveLevel();
    localStorage.setItem(STORAGE_KEYS.lastGameTime, String(lastGameTime + recovered * RECOVERY_INTERVAL));
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

// ---- リアクションキャラ ----
// 以下はファイル読み込みに失敗した場合（file://で直接開いた等）に使うデフォルト値。
// 通常は起動時に reaction_lines.txt を読み込んで上書きされる。
let REACTION_CHAR_LABELS = {
    chara: "チャラギャル系（からかうチャラ系＋ノリのいいギャル）",
    kouhai: "後輩系・タメ口、生意気で甘え混じり",
    amaone: "甘めのお姉さん系",
    seijo: "聖女系・慈愛に満ちた優しさ",
    dom: "格上女王系（毒舌叱咤＋命令）",
    ojousama: "気高い上品お嬢様系",
    ai: "機械観測AI系（分析データ口調）",
    shitsuji: "執事系・終始敬語、慇懃だが辛辣",
    kansai: "肝っ玉母さん関西弁系（語尾に♡）",
    baby: "赤ちゃん言葉ぶりっこ系"
};

let REACTION_CHAR_IDS = Object.keys(REACTION_CHAR_LABELS);

let REACTION_CHARS = {
    chara: {
        empty: ["え、空っぽ？マジで何もないじゃん笑", "スカスカすぎてウケるんだけど〜", "からっぽとか、逆に潔いね？笑", "おいおい、ちゃんと溜めようよ〜", "まじ空っぽなんだけど、やばたにえん", "ゼロとかえぐい、盛り直そ？", "からっぽまじ卍、はよ溜めよ？"],
        better: ["お、ちょっとはやる気出た？笑", "まあまあじゃん、悪くないね〜", "へぇ、意外とやるんだ？", "この調子で頼むよ〜、まだまだっしょ", "お、ちょい盛れてきたじゃん？", "ぼちぼち上がってきてて草", "悪くないじゃん、その調子〜"],
        hot: ["お、急に本気モードじゃん？笑", "いい顔してきたね〜、やるじゃん", "もうこぼしそう、大丈夫〜？笑", "さっきまでの空っぽ何だったの？笑", "いい感じになってきたね。張り切ってんじゃん笑", "そのまま行ったら溢れるって、強気じゃん？笑", "うわ、まじ盛れてる！えぐくない？", "テンション爆上がりなんだけど〜🔥", "もうほぼ満タンじゃん、神では？", "このまま盛り散らかしていこ！", "急にギア入ったね、まじ卍", "えぐい勢い、優勝目前じゃん！"],
        full: ["うっわ満タン、やるじゃ〜ん笑", "見直したよ、ちゃんとできるんだ？", "満タンとか欲張りさんだね〜笑", "やればできるじゃん、いいね！", "満タン優勝、まじ盛れすぎ✨", "えぐっ、完璧すぎて語彙力消えた", "これは表彰モノでしょ、おめでと〜", "満タンとか神すぎ、まじリスペクト"],
        overflow: ["溜めすぎでしょ笑、こぼれてるって！", "欲張りにもほどがあるって〜笑", "もう手がつけられないね、きみ笑", "溢れてるって！盛りすぎ案件〜", "やりすぎてもはや事故、ウケる"]
    },
    kouhai: {
        empty: ["あれ、空っぽっすか？先輩しっかりしてくださいよ〜", "なんもないじゃないっすか、もう〜", "ゼロからとか、先輩らしいといえば先輩らしい？笑", "からっぽっすね。まあ手伝ってあげてもいいっすけど"],
        better: ["へぇ、ちょっと溜まってきたじゃないっすか", "やればできるんすね、先輩。意外〜", "まあまあっすね。もうちょい頑張りましょ？", "順調っぽいっすね、ふーん"],
        hot: ["お〜、先輩やるじゃないっすか！", "もうちょいで満タンっすよ、頑張って〜", "先輩、もう限界っすか？笑 まだまだ行けますよ", "あと少しっすよ、ここで止めたらダサいっす", "先輩がそんなに頑張るの、新鮮っすね。もっと見せてくださいよ", "先輩がこんなにやるとか、レアっすね笑"],
        full: ["満タンっす！やればできるんじゃないっすか", "お〜完璧っすね、ちょっと尊敬したかも", "満タンの先輩、なんか可愛いっすね。笑", "満タンとか、ちゃんとしてて偉いっす〜"],
        overflow: ["溢れてるじゃないっすか、溜めすぎっすよ笑", "やりすぎっす先輩〜、ほどほどに〜", "こぼれてるって、もう〜世話が焼けるなぁ"]
    },
    amaone: {
        empty: ["まだ始まったばかりだよ、ここから溜めていこう", "今日はゆっくりでいいんだよ、焦らないで", "空っぽも悪くない、いったんリセットだね", "空っぽな今のきみも、ちゃんと見てるよ", "うっわ、見事に空っぽじゃん〜", "え、こんなにスカスカでいいの？笑", "からっぽすぎてこっちが心配になるんだけど", "ねぇ、ちゃんと溜めてよ〜"],
        better: ["お、だいぶ溜まってきたね。手応え感じてきたでしょ？", "うんうん、順調そのものだよ。やる気が出てきた？", "ちゃんと前に進んでるよ、えらい", "ここまで来たら、止まらないでね…、その調子", "ふーん、ちょっとはやる気出したみたいだね？", "まだまだ序の口だけどね〜", "へぇ、やればできるんだ？笑", "このくらいで満足しないでよ？"],
        hot: ["もうすぐ満タンだよ、楽しみだね", "見てるこっちまで嬉しくなってきた", "ここまで頑張ったの、すごいことだよ", "すごいすごい、あと少しで満タンだね", "きみならフルまで行けるって信じてたよ？", "いい流れ来てる、この勢いに乗っちゃえ", "ふふ、いい顔になってきたじゃん", "もうこぼしそうだけど大丈夫？", "調子乗りすぎて溢れさせないでよ〜", "急にアツくなっちゃって、どうしたの〜", "このまま溢れさせちゃう気でしょ、欲張りさん", "ねえ、このまま最後までやる？それとも…ここでやめとく？"],
        full: ["満タンだ〜！よくここまで溜めたね", "完璧、お疲れさま。ゆっくり休んでね", "こんなにいっぱいになって、嬉しそうだね", "たくさん頑張ったんだね…もう力を抜いていいよ", "うっわ満タン、欲張りさんめ〜笑", "やればできるじゃん、見直したよ", "満タンにしないと気が済まないタイプ？笑", "ここまで溜めるとはね、やるねぇ"],
        overflow: ["あふれてる、あふれてるって！", "すごすぎて器が追いついてないよ", "こんなに溢すなんて、よっぽど溜まってたんだね", "ちょっと、溜めすぎでしょ！？笑", "こぼれてるよ〜もったいない！", "もう手がつけられないって、きみ"]
    },
    seijo: {
        empty: ["空っぽでも大丈夫、あなたはあなたのままで尊いのです", "祈りましょう…あなたがたっぷり満たされますように", "真っ白なあなただからこそ、これからゆっくり満たしていきます", "からっぽな心にも、これから光が満ちていきます"],
        better: ["おや…少しずつ満ちてきましたね。よく頑張りました", "あなたの歩みを、わたくしは祝福しています", "着実に育っていますね。誇りに思いますよ", "この調子で、ゆっくり満たしていきましょう"],
        hot: ["まあ、こんなに満ちて…とっても情熱的ですよ", "もう少しで満タンですね。こんなに熱くなって…", "あなたの頑張りが、こうして実っているのですね", "あと少しです。我慢なさって…神様も見てますよ", "まだ耐えていらっしゃる。健気ですね", "もっと満ちていきましょう。最後まで見守っていますから"],
        full: ["満タンです…よく耐えましたね。偉いですよ", "見事に満ちました。心から祝福いたします", "完璧です。あなたを誇りに思いますよ", "満たされたあなたは、本当に美しい…"],
        overflow: ["まあ、あふれてしまいましたね。豊かなことです", "こんなに満ちて…でも、それがあなたの本物です", "あら…溢れてしまいましたね。それもまた、あなたらしいことです"]
    },
    dom: {
        empty: ["空っぽ。中身ないのはきみだけにしときな", "ここまで何もないと逆に才能だよ", "見るものがなさすぎる。さっさと溜めな", "ゼロ？やる気あんの？", "空っぽじゃない。さっさと溜めなさい", "何もないわね。わたしを失望させないで", "ゼロですって？まったく、しっかりしなさい", "溜めることもできないの？それじゃ話にならないわ"],
        better: ["中途半端が一番かっこ悪いよ、知ってた？", "このへんで止めたら全部台無しだけど", "まだ半分も行ってない。気ぃ抜くな", "悪かないけど、満足すんのは早い", "ようやく始めたわね。遅いわよ", "この程度で満足するな。まだまだ続くぞ", "少しはマシになってきた…だが、まだまだだ", "やればできるじゃない。続けなさい"],
        hot: ["ここで満足したら一生フルは見れないよ？", "中途半端にアツいの、一番じれったいんだけど", "あと少しもできないなら最初から溜めるな", "いいとこまで来たのに止まったら笑うからね", "ここからが正念場だろ、しっかりしな", "やればできるじゃん。なら最後までやんな", "いいわよ、その調子。もっと溜めなさい", "あと少しだ。ここで我慢しろ、命令だ", "ようやくわたしの期待に応えてきたわね", "ここまで来たのだから、最後までやりなさい", "悪くないペースよ。そのまま続けなさい", "フルまで行きなさい。途中でやめたら承知しないわよ"],
        full: ["やればできるじゃん、なんで毎回やらないの？", "満タン。次もこれ維持できたら本物だけどね", "認めるよ。よくやった", "上出来。でも油断すんなよ", "満タンだ。よく我慢したわね", "よくやったわ。褒めてあげる、特別にね", "完璧じゃない。最初からこうしなさい", "合格よ。次もこの調子を保ちなさい"],
        overflow: ["加減って言葉、知ってる？", "溢れさせるとか、やることが極端なんだよ", "規格外。コメントに困るわ", "溢れさせるなんて、やりすぎよ", "加減を知りなさい。まったく…", "規格外ね。でも、嫌いじゃないわ"]
    },
    ojousama: {
        empty: ["空っぽですって？まったく、だらしないこと", "これっぽっちもないなんて、見ていられませんわ", "わたくしを退屈させないでくださる？", "ゼロですの…はぁ、世話の焼ける", "あら、すっかり空になってしまいましたのね", "まだ何もございませんわね、これからですわ", "ゆるりと始めればよろしいのですわ", "焦らずに、じっくり進めていきましょう"],
        better: ["あら、少しはやる気を出したのね。褒めてはいませんわよ", "まだ半分にも満たないくせに、得意げにしないこと", "ふん、その程度で満足されては困りますわ", "まあ…悪くはなくてよ。あくまで「悪くはない」だけ", "だいぶ形になってまいりましたわね", "なかなか良い兆しでございますこと", "順調そのもの、よろしゅうございますわ", "この調子で参りましょうね"],
        hot: ["あら、やればできるじゃありませんの。意外ですわ", "ふふっ、ようやくわたくしの目に適う量になってきましたわ", "調子に乗らないこと…でも、まあ、いい感じですわね", "もう少しでフルですわよ。気を抜いたら承知しませんから", "べ、別に期待などしていませんけれど…いい線ですわ", "ここまで来たのですから、最後までやり遂げなさい", "まあ、たっぷり溜まってきましたこと", "あらあら、ずいぶん勢いづいてまいりましたわね", "見事な伸びでございますこと", "満タンも目前、お見事ですわ", "ほほ、これは期待できますわね", "実に結構な溜まりっぷりですこと"],
        full: ["満タン…ふん、当然の結果ですわ。褒めてあげなくもなくてよ", "まあ！…っ、べ、別に感心などしていませんわよ？", "やればできるではありませんの。最初からそうなさい", "完璧ですわね。…ほんの少しだけ、見直しましてよ", "まあ、見事な満タンでございますわ", "完璧でございます。これ以上は望めませんわね", "お見事、拍手を送らせていただきますわ", "完璧でございます、達成感を味わってくださいまし"],
        overflow: ["溢れさせるなんて、はしたないですわ！", "まったく、加減を知らないのですから…でも嫌いじゃなくてよ", "やりすぎですわ。でも…まあ、あなたらしいこと", "まあ、あふれてしまいましたわね…", "少々溜めすぎでございましょうか、ほほ", "あらあら、こぼれてしまいましたこと"]
    },
    ai: {
        empty: ["観測対象：残量ゼロ。蓄積プロセスの開始を待機する", "充填量ゼロの場合、評価対象が存在しません。早急に充填を", "残量はゼロ。これより計測を継続する", "空の状態を記録。次の補充を待つ", "現在値ゼロ。回復を待つフェーズだ", "残量なし。ここが起点になる", "数値はゼロ。伸びしろは最大とも言える", "計測不能なほどの空。補充を推奨する"],
        better: ["蓄積を検知。数値は上昇傾向にある", "順調な蓄積です。このまま継続を推奨します", "感覚値の上昇を観測。観測対象の出力は安定している。", "中間地点に接近中。データは正常範囲内です。", "順調に増加中。このペースを維持", "データは右肩上がり。やる気が可視化されてきた", "数値は安定して上昇している", "悪くない進捗。継続を推奨する"],
        hot: ["数値が急上昇。まもなく限界値です", "進捗データが加速しています。目標値まであと少し", "数値を確認。ピーク到達は時間の問題と予測する", "進捗速度が上昇中。目標値に近づいています", "蓄積率は理想値に近い。継続を推奨", "上昇トレンド継続。フル到達は目前", "データ上は理想的な伸びだ", "このペースなら満タンは時間の問題", "効率的な蓄積。申し分ない", "数値は加速傾向。期待値が高い", "ピークが近い。維持を推奨する"],
        full: ["完全に満たされました。データとして優秀です", "完璧な結果。達成率100%を記録", "これ以上の蓄積は不可能です。おめでとうございます", "満タン状態を確認。申し分ない数値だ", "最大値到達。申し分のない結果だ", "目標達成。完璧な数値だ", "理想的な着地。文句のつけようがない", "満タン確認。最適解と言える"],
        overflow: ["上限超過。数値は計測不能です", "上限を逸脱。予想以上の溢出です。", "オーバーフローを検知。ユーザーは制御を失いました", "上限超過。完全にキャパオーバーだ", "許容量を逸脱している。記録的だ", "規格外の数値。計測の意味を超えた"]
    },
    shitsuji: {
        empty: ["何もおありになりませんね…ご主人様、情けないですよ", "何も入っておりませんね。お紅茶でもお淹れしてお待ちします", "何もない状態は、私がもっとも管理しやすい状態でございます", "これがご主人様の実力でございますか？正直、拍子抜けでございます"],
        better: ["おや、溜まってまいりましたね。さすがでございます", "順調な滑り出しかと。引き続きお任せください", "まだまだですが…ご主人様にも可能性はあるようです", "半ばまでもう少々。お見守りしております"],
        hot: ["もうこんなに溜まって…ご主人様、よほど頑張られたのですね", "満タンが見えてまいりました。あと一押しを", "あと少しで溢れますよ…どうなさいます？お止めしますか？", "ご主人様の本気、しかと拝見しております", "ここまでの頑張り、しかと記録いたしました", "ここまで来られましたか。立派でございます"],
        full: ["満タンでございます。よくここまでお持ちになりました", "お見事。わたくし、感服いたしました", "いっぱいになりましたね。さあ、どうなさいます？", "最高の仕上がりでございます。お疲れ様でした"],
        overflow: ["あ…溢れておりますね。ご主人様、お粗末でございます", "少々溜めすぎかと。布巾をご用意いたします", "少々やりすぎではございますが…私には正直にご報告ください"]
    },
    kansai: {
        empty: ["なんもないやんか〜、はよ溜めな♡", "からっぽやで〜、しっかりしいや♡", "まっさらやんか、気楽にいこな♡", "からっぽやと寂しいやろ？ほら、はよ満たそう♡"],
        better: ["ええ調子やん、その勢いやで♡", "ぼちぼち溜まってきたなぁ♡", "ええ感じや、その調子で頼むで♡", "おっ、やる気出てきたな、やるやんか〜♡"],
        hot: ["めっちゃええやん！あと一息やで♡", "ええ感じに来とるで、ここで気ぃ抜くなや♡", "もうちょいで満タンや、頑張りぃ♡", "ええ溜まりっぷりやなぁ、感心するわ♡", "この勢い止めたらあかんで〜♡", "あとちょっとや、ふんばりぃ♡"],
        full: ["ようここまで溜めたなぁ、えらいえらい♡", "満タンや！よう頑張ったなぁ♡", "完璧やん、言うことないわ♡", "見事や〜、花マルあげるわ♡"],
        overflow: ["もうこぼれとるやんか！もったいないわ〜♡", "溜めすぎや〜、ええ加減にしぃや♡", "あふれてもうたなぁ、やりすぎやで♡"]
    },
    baby: {
        empty: ["からっぽでしゅ〜、さみしいよぉ", "なんにもないねぇ、いっしょに溜めよ？", "ぴえん、ゼロからがんばろ？", "からっぽぴえん…がんばるぞぉ"],
        better: ["たまってきたねぇ〜、えらいえらい", "ちょっとずつだねぇ、いいこいいこ", "もうちょっとだよぉ、ふぁいと〜", "じょうずじょうず〜、その調子だよぉ"],
        hot: ["わぁ、いっぱいになってきたねぇ💕", "すごいすごい〜、もうちょいだよぉ", "ぽかぽかだねぇ、がんばってえらい！", "このまま満タンめざそ？ねっ？", "きゅんとしちゃうくらいいい感じ〜", "もうちょいで満タンだよぉ、わくわく〜"],
        full: ["まんたんだぁ〜！すっごいねぇ💕", "いっぱいいっぱい、はなまるあげる〜", "よくがんばったねぇ、なでなで〜", "かんぺきだよぉ、だいすき〜💕"],
        overflow: ["あぁん、こぼれちゃったぁ", "ためすぎだよぉ、よくばりさん〜", "あふれちゃったねぇ、びっくり〜"]
    }
};

// ---- reaction_lines.txt（メモと同じ書式）を読み込んでキャラ・セリフを上書きする ----
// 書式: "id（ラベル）" の見出し行 → "[band]" 見出し → セリフを1行ずつ。
// キャラ同士は "====...====" の行、見出しの下は "----...----" の行で区切る（どちらも任意の長さでよい）。
function parseReactionLinesText(text) {
    const labels = {};
    const chars = {};
    const ids = [];
    const blocks = text.split(/^=+$/m);

    for (const block of blocks) {
        const lines = block.split("\n");
        let headerLine = null;
        let headerIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();
            if (!t || /^-+$/.test(t)) continue;
            headerLine = t;
            headerIndex = i;
            break;
        }
        if (!headerLine) continue;

        const m = headerLine.match(/^([A-Za-z0-9_]+)（(.+)）$/);
        if (!m) continue;
        const id = m[1];
        labels[id] = m[2];
        ids.push(id);
        chars[id] = { empty: [], better: [], hot: [], full: [], overflow: [] };

        let currentBand = null;
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const t = lines[i].trim();
            if (!t || /^-+$/.test(t)) continue;
            const bandMatch = t.match(/^\[(\w+)\]$/);
            if (bandMatch) {
                currentBand = bandMatch[1];
                continue;
            }
            if (currentBand && chars[id][currentBand]) {
                chars[id][currentBand].push(t.replace(/\s*\[修正\]\s*$/, ""));
            }
        }
    }
    return { labels, chars, ids };
}

function applyReactionData(parsed) {
    REACTION_CHAR_LABELS = parsed.labels;
    REACTION_CHARS = parsed.chars;
    REACTION_CHAR_IDS = parsed.ids;

    renderReactionCharList();
    refreshAllReactionCharPreviews();
    updateReaction();
}

async function loadReactionLinesFromFile() {
    try {
        const res = await fetch("reaction_lines.txt", { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        const parsed = parseReactionLinesText(text);
        if (!parsed.ids.length) return;
        applyReactionData(parsed);
    } catch (e) {
        // file://で直接開いた場合などはfetchできないので、内蔵デフォルトのまま動作する
    }
}

// ---- セリフをPCから秘密URL経由で同期する（EMOTION画像の同期と同じ仕組み） ----
// reaction_lines.txt はGitHub Pagesで公開されるため、誰でも閲覧できる内容のみを置く。
// 自分専用にしたいセリフは、秘密のGist等にこの形式のテキストを置き、そのURLをここで登録する。
// URLと取得結果はこの端末のlocalStorageにのみ保存され、リポジトリには含まれない。
function getReactionLinesSyncUrl() {
    return localStorage.getItem(STORAGE_KEYS.reactionLinesSyncUrl) || "";
}

function saveReactionLinesSyncUrl(url) {
    if (url) {
        localStorage.setItem(STORAGE_KEYS.reactionLinesSyncUrl, url);
    } else {
        localStorage.removeItem(STORAGE_KEYS.reactionLinesSyncUrl);
    }
}

function loadReactionLinesOverrideFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEYS.reactionLinesOverride);
    if (!raw) return false;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed.ids || !parsed.ids.length) return false;
        applyReactionData(parsed);
        return true;
    } catch (e) {
        return false;
    }
}

async function syncReactionLinesFromUrl(url) {
    const statusEl = document.getElementById("reactionLinesSyncStatus");
    if (statusEl) statusEl.textContent = "同期中…";
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const text = await res.text();
        const parsed = parseReactionLinesText(text);
        if (!parsed.ids.length) throw new Error("empty");
        localStorage.setItem(STORAGE_KEYS.reactionLinesOverride, JSON.stringify(parsed));
        applyReactionData(parsed);
        if (statusEl) statusEl.textContent = `同期完了（${parsed.ids.length}体）`;
    } catch (e) {
        if (statusEl) statusEl.textContent = "同期に失敗しました";
    }
}

// ---- リアクションキャラ画像（IndexedDB、EMOTION用画像とは別ストア） ----
const REACTION_IMAGE_DB_NAME = "milkBottleReactionImages";
const REACTION_IMAGE_DB_STORE = "images";

function openReactionImageDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(REACTION_IMAGE_DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(REACTION_IMAGE_DB_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveReactionImage(charId, blob) {
    const db = await openReactionImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REACTION_IMAGE_DB_STORE, "readwrite");
        tx.objectStore(REACTION_IMAGE_DB_STORE).put(blob, charId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getReactionImage(charId) {
    const db = await openReactionImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REACTION_IMAGE_DB_STORE, "readonly");
        const req = tx.objectStore(REACTION_IMAGE_DB_STORE).get(charId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

async function deleteReactionImage(charId) {
    const db = await openReactionImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REACTION_IMAGE_DB_STORE, "readwrite");
        tx.objectStore(REACTION_IMAGE_DB_STORE).delete(charId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// 中央を正方形にクロップしてリサイズ→blob化
function cropSquareToBlob(file, size = 200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const side = Math.min(img.width, img.height);
                const sx = (img.width - side) / 2;
                const sy = (img.height - side) / 2;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("toBlob failed")), "image/jpeg", 0.85);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ---- リアクション表示 ----
let lastReactionLine = "";
let reactionFaceObjectUrl = null;

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getCurrentBand() {
    if (isOverflow) return "overflow";
    return getLevelState(level).key;
}

// ---- 表示するキャラの固定（ピン留め）。未設定/オールランダムなら毎回ランダム ----
function getPinnedReactionChar() {
    return localStorage.getItem(STORAGE_KEYS.pinnedReactionChar) || "";
}

function savePinnedReactionChar(id) {
    if (id) {
        localStorage.setItem(STORAGE_KEYS.pinnedReactionChar, id);
    } else {
        localStorage.removeItem(STORAGE_KEYS.pinnedReactionChar);
    }
}

async function updateReaction() {
    const textEl = document.getElementById("reactionText");
    const faceWrap = document.getElementById("reactionFaceWrap");
    const faceImg = document.getElementById("reactionFaceImg");
    if (!textEl || !faceWrap || !faceImg) return;

    const band = getCurrentBand();
    const pinned = getPinnedReactionChar();
    const charId = (pinned && REACTION_CHAR_IDS.includes(pinned)) ? pinned : pickRandom(REACTION_CHAR_IDS);
    const lines = (REACTION_CHARS[charId] && REACTION_CHARS[charId][band]) || [];
    let line = pickRandom(lines);
    if (lines.length > 1 && line === lastReactionLine) {
        line = pickRandom(lines);
    }
    lastReactionLine = line;
    textEl.textContent = line || "";

    const blob = await getReactionImage(charId);
    if (blob) {
        if (reactionFaceObjectUrl) URL.revokeObjectURL(reactionFaceObjectUrl);
        reactionFaceObjectUrl = URL.createObjectURL(blob);
        faceImg.src = reactionFaceObjectUrl;
        faceWrap.classList.remove("no-face");
    } else {
        faceImg.src = "";
        faceWrap.classList.add("no-face");
    }
}

// ---- 顔写真／コメント欄タップで表示キャラを選ぶピッカー ----
async function renderReactionCharPickerList() {
    const list = document.getElementById("reactionCharPickerList");
    if (!list) return;
    const pinned = getPinnedReactionChar();

    list.innerHTML = `
        <button type="button" class="reaction-char-picker-option${!pinned ? " selected" : ""}" data-char-id="">
            オールランダム
        </button>
    ` + REACTION_CHAR_IDS.map(id => `
        <button type="button" class="reaction-char-picker-option${pinned === id ? " selected" : ""}" data-char-id="${id}">
            <span class="reaction-char-picker-option-preview"><img id="reactionPickerPreview-${id}" alt="" /></span>
            ${REACTION_CHAR_LABELS[id]}
        </button>
    `).join("");

    for (const id of REACTION_CHAR_IDS) {
        const blob = await getReactionImage(id);
        const img = document.getElementById(`reactionPickerPreview-${id}`);
        if (blob && img) {
            img.src = URL.createObjectURL(blob);
            img.classList.add("has-image");
        }
    }
}

function openReactionCharPicker() {
    const picker = document.getElementById("reactionCharPicker");
    if (!picker) return;
    renderReactionCharPickerList();
    picker.classList.add("open");
}

function closeReactionCharPicker() {
    const picker = document.getElementById("reactionCharPicker");
    if (picker) picker.classList.remove("open");
}

function setupReactionCharPicker() {
    const row = document.getElementById("reactionRow");
    const picker = document.getElementById("reactionCharPicker");
    const closeBtn = document.getElementById("reactionCharPickerClose");
    const inner = picker ? picker.querySelector(".reaction-char-picker-inner") : null;
    const list = document.getElementById("reactionCharPickerList");
    if (!row || !picker) return;

    row.addEventListener("click", openReactionCharPicker);
    row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openReactionCharPicker();
        }
    });
    picker.addEventListener("click", closeReactionCharPicker); // 背景タップで閉じる
    if (inner) inner.addEventListener("click", (e) => e.stopPropagation());
    if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeReactionCharPicker(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeReactionCharPicker(); });

    if (list) {
        list.addEventListener("click", (e) => {
            const btn = e.target.closest(".reaction-char-picker-option");
            if (!btn) return;
            savePinnedReactionChar(btn.dataset.charId || "");
            closeReactionCharPicker();
            updateReaction();
        });
    }
}

// ---- リアクションキャラ設定UI ----
function renderReactionCharList() {
    const list = document.getElementById("reactionCharList");
    if (!list) return;
    list.innerHTML = REACTION_CHAR_IDS.map(id => `
        <div class="reaction-char-row" data-char-id="${id}">
            <span class="reaction-char-label">${REACTION_CHAR_LABELS[id]}</span>
            <div class="reaction-char-preview-wrap">
                <img class="reaction-char-preview" id="reactionPreview-${id}" alt="" />
            </div>
            <label class="btn-small file-label" for="reactionFile-${id}">画像を選ぶ</label>
            <input type="file" id="reactionFile-${id}" class="reaction-char-file-input" data-char-id="${id}" accept="image/*" hidden />
            <button type="button" class="btn-small reaction-char-delete" data-char-id="${id}">削除</button>
        </div>
    `).join("");
}

async function refreshReactionCharPreview(charId) {
    const img = document.getElementById(`reactionPreview-${charId}`);
    if (!img) return;
    const blob = await getReactionImage(charId);
    if (blob) {
        img.src = URL.createObjectURL(blob);
        img.classList.add("has-image");
    } else {
        img.src = "";
        img.classList.remove("has-image");
    }
}

async function refreshAllReactionCharPreviews() {
    for (const id of REACTION_CHAR_IDS) {
        await refreshReactionCharPreview(id);
    }
}

function setupReactionCharUI() {
    const list = document.getElementById("reactionCharList");
    if (!list) return;

    renderReactionCharList();
    refreshAllReactionCharPreviews();

    list.addEventListener("change", async (e) => {
        const input = e.target.closest(".reaction-char-file-input");
        if (!input || !input.files || !input.files[0]) return;
        const charId = input.dataset.charId;
        const blob = await cropSquareToBlob(input.files[0]);
        await saveReactionImage(charId, blob);
        input.value = "";
        await refreshReactionCharPreview(charId);
    });

    list.addEventListener("click", async (e) => {
        const btn = e.target.closest(".reaction-char-delete");
        if (!btn) return;
        const charId = btn.dataset.charId;
        await deleteReactionImage(charId);
        await refreshReactionCharPreview(charId);
    });
}

document.getElementById("addBtn").addEventListener("click", addMilk);
document.getElementById("drinkBtn").addEventListener("click", drinkMilk);
document.getElementById("clearBtn").addEventListener("click", clearLogs);
document.getElementById("energyBtn").addEventListener("click", addEnergy);
document.getElementById("energyMinusBtn").addEventListener("click", removeEnergy);
document.getElementById("energyImageInput").addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    await addEnergyImages(files);
    e.target.value = "";
    await updateEnergyImageCount();
    setRandomEnergyIcon();
});
document.getElementById("energyImageClearBtn").addEventListener("click", async () => {
    if (!confirm("登録した画像をすべて削除しますか？")) return;
    await clearEnergyImages();
    await updateEnergyImageCount();
    setRandomEnergyIcon();
});
const energySyncUrlInput = document.getElementById("energySyncUrlInput");
if (energySyncUrlInput) energySyncUrlInput.value = getEnergySyncUrl();
document.getElementById("energySyncSaveBtn").addEventListener("click", () => {
    saveEnergySyncUrl(energySyncUrlInput.value.trim());
    document.getElementById("energySyncStatus").textContent = "URLを保存しました";
});
document.getElementById("energySyncNowBtn").addEventListener("click", () => {
    const url = getEnergySyncUrl();
    if (!url) {
        document.getElementById("energySyncStatus").textContent = "先にURLを保存してください";
        return;
    }
    syncEnergyImagesFromUrl(url);
});
const reactionLinesSyncUrlInput = document.getElementById("reactionLinesSyncUrlInput");
if (reactionLinesSyncUrlInput) reactionLinesSyncUrlInput.value = getReactionLinesSyncUrl();
document.getElementById("reactionLinesSyncSaveBtn").addEventListener("click", () => {
    saveReactionLinesSyncUrl(reactionLinesSyncUrlInput.value.trim());
    document.getElementById("reactionLinesSyncStatus").textContent = "URLを保存しました";
});
document.getElementById("reactionLinesSyncNowBtn").addEventListener("click", () => {
    const url = getReactionLinesSyncUrl();
    if (!url) {
        document.getElementById("reactionLinesSyncStatus").textContent = "先にURLを保存してください";
        return;
    }
    syncReactionLinesFromUrl(url);
});
setupTabs();
setupEnergyLightbox();
setupReactionCharUI();
setupReactionCharPicker();
if (!loadReactionLinesOverrideFromStorage()) {
    loadReactionLinesFromFile();
}
renderDateHeader();

applyMilkRecovery();
currentDisplayLevel = level;
targetDisplayLevel = level;
updateMilkPosition(level);
updateAll();
updateRecoveryTimer();
renderEnergyGraph();
setRandomEnergyIcon();
updateEnergyImageCount();
applyPulseSpeed();
animateWave();
updateReaction();

setInterval(() => {
    applyMilkRecovery();
    updateDisplay();
    updateRecoveryTimer();
    renderDateHeader();
}, 1000);

// バックグラウンドから復帰した際に表示を即時再計算する
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        applyMilkRecovery();
        updateDisplay();
        updateRecoveryTimer();
        renderDateHeader();
    }
});