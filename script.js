let level = Number(localStorage.getItem("milkLevel")) || 0;

function updateDisplay() {

    const milk =
        document.getElementById("milk");

    const status =
        document.getElementById("status");

    const message =
        document.getElementById("message");

    milk.style.height =
        (level / 3 * 100) + "%";

    status.textContent =
        level + " / 3";

    message.classList.remove("floaty");
    message.classList.remove("pulse");

    if (level < 1) {

        message.textContent = "Empty...";
        message.style.color = "gray";

    }
    else if (level < 2) {

        message.textContent = "Better";
        message.style.color = "black";

        message.classList.add("floaty");

    }
    else if (level < 3) {

        message.textContent = "HOT🔥";
        message.style.color = "darkorange";

        message.classList.add("floaty");

    }
    else {

        message.textContent = "🍼FULL❤️";
        message.style.color = "hotpink";

        message.classList.add("pulse");

    }
}

function addMilk() {
    if (level < 3) {
        level += 0.5;
        save();
    }
}

function drinkMilk() {

    countAchievement();

    addLog();

    localStorage.setItem(
        "lastGameTime",
        Date.now()
    );

    level = 0;

    save();
}

function save() {
    localStorage.setItem("milkLevel", level);
    updateDisplay();
}

applyMilkRecovery();

updateDisplay();
displayLogs();
updateStats();

function addLog() {

    let logs =
        JSON.parse(
            localStorage.getItem("gameLogs")
        ) || [];

    const now = new Date();

    logs.unshift({
        date: now.toLocaleString("ja-JP"),
        milk: level
    });

    logs = logs.slice(0, 10);

    localStorage.setItem(
        "gameLogs",
        JSON.stringify(logs)
    );

    displayLogs();
}

function displayLogs() {

    const logList =
        document.getElementById("logList");

    let logs =
        JSON.parse(
            localStorage.getItem("gameLogs")
        ) || [];

    logList.innerHTML = logs
        .map(log => {

            let color = "gray";

            if (log.milk === 3) {
                color = "deeppink";
            }
            else if (log.milk === 2) {
                color = "darkorange";
            }

            return `
                <div style="color:${color}">
                    ${log.date}
                    （${log.milk}/3）
                </div>
            `;
        })
        .join("");
}

function clearLogs() {

    const result =
        confirm("Are you sure?");

    if (!result) return;

    localStorage.removeItem("gameLogs");
    localStorage.removeItem("countFull");
    localStorage.removeItem("countHot");
    localStorage.removeItem("countBetter");
    localStorage.removeItem("countEmpty");

    updateStats();
    displayLogs();
}


function applyMilkRecovery() {

    const lastGameTime =
        Number(
            localStorage.getItem(
                "lastGameTime"
            )
        );

    if (!lastGameTime) return;

    const now = Date.now();

    const hours12 =
        12 * 60 * 60 * 1000;

    const recovered =
        Math.floor(
            (now - lastGameTime)
            / hours12
        );

    level =
        Math.min(
            3,
            level + recovered * 0.5
        );

    save();
    localStorage.setItem(
        "lastGameTime",
        lastGameTime + recovered * hours12
    );
}

function updateStats() {

    const stats =
        document.getElementById("stats");

    const full =
        Number(localStorage.getItem("countFull")) || 0;

    const hot =
        Number(localStorage.getItem("countHot")) || 0;

    const better =
        Number(localStorage.getItem("countBetter")) || 0;

    const empty =
        Number(localStorage.getItem("countEmpty")) || 0;

    stats.innerHTML = `
        <div style="color:hotpink">
            FULL ❤️ : ${full}
        </div>

        <div style="color:darkorange">
            HOT 🔥 : ${hot}
        </div>

        <div style="color:black">
            Better : ${better}
        </div>

        <div style="color:gray">
            Empty... : ${empty}
        </div>
    `;
}
function countAchievement() {

    if (level === 3) {

        const count =
            Number(localStorage.getItem("countFull")) || 0;

        localStorage.setItem(
            "countFull",
            count + 1
        );

    } else if (level === 2) {

        const count =
            Number(localStorage.getItem("countHot")) || 0;

        localStorage.setItem(
            "countHot",
            count + 1
        );

    } else if (level === 1) {

        const count =
            Number(localStorage.getItem("countBetter")) || 0;

        localStorage.setItem(
            "countBetter",
            count + 1
        );

    } else {

        const count =
            Number(localStorage.getItem("countEmpty")) || 0;

        localStorage.setItem(
            "countEmpty",
            count + 1
        );
    }

    updateStats();
}
