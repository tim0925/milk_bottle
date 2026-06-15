const MAX_LEVEL = 3;
const HARD_MAX_LEVEL = 10;
const STEP = 0.5;
const RECOVERY_STEP = 0.1;
const RECOVERY_INTERVAL = 24 * 60 * 60 * 1000 / 10; // 24時間で1（0.1刻み）
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
    totalDrinks: "totalDrinks",
    energyHistory: "energyHistory",
    energyPulse: "energyPulse"
};

const ENERGY_HISTORY_LIMIT = 14;
const PULSE_MAX_DURATION = 2.2; // 秒（鼓動が遅い状態・スタート時）
const PULSE_MIN_DURATION = 0.4; // 秒（鼓動が速い状態）
const PULSE_STEP = 0.03; // +1エナジーごとに鼓動が早くなる量
const ICON_MIN_SIZE = 40; // px（スタート時のサイズ）
const ICON_MAX_SIZE = 260; // px（最大サイズ・カードからはみ出るくらい大きく）
const ICON_SIZE_STEP = 12; // +1エナジーごとに大きくなるサイズ

let level = Number(localStorage.getItem(STORAGE_KEYS.milkLevel)) || 0;
let isOverflow = localStorage.getItem(STORAGE_KEYS.isOverflow) === "true";
let activeTab = "bottle";

const BOTTLE_TOP_Y = 8;
const BOTTLE_BOT_Y = 272;

function getLevelState(value) {
    if (value >= 3) return { key: "full",   label: "🍼FULL❤️", text: "🍼FULL❤️", className: "full",   effect: "pulse"  };
    if (value >= 2) return { key: "hot",    label: "HOT🔥",    text: "HOT🔥",    className: "hot",    effect: "floaty" };
    if (value >= 1) return { key: "better", label: "BETTER",   text: "Better",   className: "better", effect: "floaty" };
    return              { key: "empty",  label: "EMPTY",    text: "Empty...", className: "empty",  effect: ""       };
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
    { x: 22,  y: 230, minLevel: 0.4 },
    { x: 50,  y: 95,  minLevel: 0.7 },
    { x: 86,  y: 55,  minLevel: 1.0 },
    { x: 112, y: 145, minLevel: 1.3 },
    { x: 36,  y: 130, minLevel: 1.6 },
    { x: 68,  y: 185, minLevel: 1.9 },
    { x: 96,  y: 205, minLevel: 2.2 },
    { x: 58,  y: 60,  minLevel: 2.6 },
    { x: 116, y: 95,  minLevel: 3.0 },
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
    const status  = document.getElementById("status");
    const message = document.getElementById("message");
    const state   = getLevelState(level);

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
    setOverflow(level > MAX_LEVEL);
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
        if (isBottle) updateBurstGeometry();
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
    today.energy = 0;
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
    setOverflow(level > MAX_LEVEL);
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
setupTabs();
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

setInterval(() => {
    applyMilkRecovery();
    updateAll();
    updateRecoveryTimer();
    renderDateHeader();
}, 1000);

// バックグラウンドから復帰した際に表示を即時再計算する
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        applyMilkRecovery();
        updateAll();
        updateRecoveryTimer();
        renderDateHeader();
    }
});
