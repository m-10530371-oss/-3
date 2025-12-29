// --- 游戏配置 ---
const MODES = {
    easy: { gridSize: 10, bombCount: 10, cellSize: 30 },
    normal: { gridSize: 20, bombCount: 40, cellSize: 20 }, // 单元格小一点，适应20x20
    hard: { gridSize: 30, bombCount: 99, cellSize: 16 }   // 单元格更小，适应30x30
};

let currentMode = MODES.easy; // 默认模式
let GRID_SIZE;
let BOOM_COUNT;
let CELL_SIZE; // 单元格大小

// --- 游戏状态变量 ---
let board = [];
let gameStarted = false;
let gameOver = false;
let revealedCells = 0; // 已经揭示的非雷单元格数量
let flagsPlaced = 0;   // 已放置的旗帜数量
let correctFlags = 0;  // 正确标记的雷数量
let flagMode = false; // 新增：旗帜模式开关

// --- 计时器相关 ---
let timerInterval;
let startTime;

// --- DOM 元素获取 ---
const startPage = document.getElementById('start-page');
const gamePage = document.getElementById('game-page');
const modeButtons = document.querySelectorAll('.mode-button');
const gameContainer = document.getElementById('game-container');
const messageDisplay = document.getElementById('message');
const resetButton = document.getElementById('reset-button');
const backToMenuButton = document.getElementById('back-to-menu');
const timerDisplay = document.getElementById('timer');
const flagCountDisplay = document.getElementById('flag-count');

// 新增：旗帜模式按钮
const toggleFlagModeButton = document.createElement('button');
toggleFlagModeButton.id = 'toggle-flag-mode';
toggleFlagModeButton.textContent = '🚩 模式';
toggleFlagModeButton.classList.add('mode-button'); // 复用样式
toggleFlagModeButton.style.marginTop = '10px';
// 在 game-page 中找到一个合适的位置插入按钮，例如在 game-info 下面
gamePage.insertBefore(toggleFlagModeButton, gameContainer);


// --- 事件监听器 ---
modeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const modeName = e.target.dataset.mode;
        startGame(modeName);
    });
});
resetButton.addEventListener('click', () => startGame(currentMode.name)); // 重新开始当前模式
backToMenuButton.addEventListener('click', showStartPage);
toggleFlagModeButton.addEventListener('click', toggleFlagMode); // 监听旗帜模式按钮

// --- 页面切换函数 ---
function showStartPage() {
    startPage.style.display = 'flex';
    gamePage.style.display = 'none';
    stopTimer(); // 确保计时器停止
    flagMode = false; // 返回菜单时重置旗帜模式
    updateFlagModeButton(); // 更新按钮样式
}

function showGamePage() {
    startPage.style.display = 'none';
    gamePage.style.display = 'flex';
}

// --- 游戏初始化和开始 ---
function startGame(modeName) {
    currentMode = MODES[modeName];
    currentMode.name = modeName; // 保存模式名称，用于重新开始
    GRID_SIZE = currentMode.gridSize;
    BOOM_COUNT = currentMode.bombCount;
    CELL_SIZE = currentMode.cellSize;

    initGame();
    showGamePage();
    flagMode = false; // 每次新游戏开始时，默认不是旗帜模式
    updateFlagModeButton(); // 更新按钮样式
}

function initGame() {
    board = [];
    gameContainer.innerHTML = '';
    messageDisplay.textContent = '';
    gameStarted = false;
    gameOver = false;
    revealedCells = 0;
    flagsPlaced = 0;
    correctFlags = 0;

    // 重置计时器和旗帜显示
    stopTimer();
    timerDisplay.textContent = '⏱ 00:00';
    updateFlagCount();

    // 根据模式调整单元格大小和网格布局
    gameContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
    gameContainer.style.width = `${GRID_SIZE * CELL_SIZE}px`; // 确保容器宽度正确
    gameContainer.style.height = `${GRID_SIZE * CELL_SIZE}px`; // 确保容器高度正确


    // 创建空的网格
    for (let i = 0; i < GRID_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
            board[i][j] = {
                isBomb: false,
                isRevealed: false,
                isFlagged: false,
                neighborBombs: 0
            };
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.row = i;
            cellElement.dataset.col = j;
            cellElement.style.width = `${CELL_SIZE}px`;
            cellElement.style.height = `${CELL_SIZE}px`;
            cellElement.addEventListener('click', () => handleCellInteraction(i, j)); // 修改为统一处理函数
            cellElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // 阻止默认右键菜单
                handleCellRightClick(i, j); // 保留右键菜单功能，仅PC端有效
            });
            gameContainer.appendChild(cellElement);
        }
    }

    // 随机放置雷
    placeBombs();

    // 计算每个单元格周围的雷数
    calculateNeighborBombs();
}

// 放置雷
function placeBombs() {
    let bombsPlaced = 0;
    while (bombsPlaced < BOOM_COUNT) {
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);

        if (!board[row][col].isBomb) {
            board[row][col].isBomb = true;
            bombsPlaced++;
        }
    }
}

// 计算周围雷数
function calculateNeighborBombs() {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (!board[i][j].isBomb) {
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;

                        const newRow = i + dr;
                        const newCol = j + dc;

                        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                            if (board[newRow][newCol].isBomb) {
                                count++;
                            }
                        }
                    }
                }
                board[i][j].neighborBombs = count;
            }
        }
    }
}

// --- 计时器功能 ---
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    timerDisplay.textContent = `⏱ ${minutes}:${seconds}`;
}

function stopTimer() {
    clearInterval(timerInterval);
}

// --- 旗帜计数更新 ---
function updateFlagCount() {
    flagCountDisplay.textContent = `🚩 ${flagsPlaced} / ${BOOM_COUNT}`;
}

// --- 新增：切换旗帜模式 ---
function toggleFlagMode() {
    flagMode = !flagMode;
    updateFlagModeButton();
}

// 新增：更新旗帜模式按钮的显示
function updateFlagModeButton() {
    if (flagMode) {
        toggleFlagModeButton.textContent = '✅ 旗帜模式 (点击取消)';
        toggleFlagModeButton.style.backgroundColor = '#28a745'; // 绿色表示激活
    } else {
        toggleFlagModeButton.textContent = '🚩 模式';
        toggleFlagModeButton.style.backgroundColor = '#007bff'; // 蓝色表示非激活
    }
}

// 新增：统一处理单元格点击事件
function handleCellInteraction(row, col) {
    if (gameOver || board[row][col].isRevealed) {
        return;
    }

    if (!gameStarted) {
        gameStarted = true;
        startTimer(); // 第一次点击才开始计时
    }

    if (flagMode) {
        toggleFlag(row, col);
    } else {
        revealCell(row, col);
    }
}

// 保留右键点击，仅PC端使用
function handleCellRightClick(row, col) {
    if (gameOver || board[row][col].isRevealed) {
        return;
    }

    if (!gameStarted) {
        gameStarted = true;
        startTimer(); // 第一次右键点击也开始计时
    }

    toggleFlag(row, col);
}


// 揭示单元格
function revealCell(row, col) {
    // 再次检查，防止递归揭示时重复处理
    if (gameOver || board[row][col].isRevealed || board[row][col].isFlagged) {
        return;
    }

    const cell = board[row][col];
    const cellElement = gameContainer.children[row * GRID_SIZE + col];

    cell.isRevealed = true;
    cellElement.classList.add('revealed');
    // 揭示后移除事件监听器，避免再次点击
    cellElement.removeEventListener('click', () => handleCellInteraction(row, col));
    cellElement.removeEventListener('contextmenu', (e) => handleCellRightClick(row, col));


    if (cell.isBomb) {
        cellElement.textContent = '💣';
        cellElement.classList.add('bomb');
        endGame(false); // 踩到雷，游戏结束
        return;
    }

    revealedCells++;
    
    if (cell.neighborBombs > 0) {
        cellElement.textContent = cell.neighborBombs;
        cellElement.classList.add(`number-${cell.neighborBombs}`);
    } else {
        // 如果是空白单元格，则自动揭示周围的单元格
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;

                const newRow = row + dr;
                const newCol = col + dc;

                if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                    revealCell(newRow, newCol); // 递归揭示
                }
            }
        }
    }
    checkWinCondition(); // 检查是否胜利，放到这里更合理
}

// 标记/取消标记单元格
function toggleFlag(row, col) {
    if (gameOver || board[row][col].isRevealed) {
        return;
    }

    const cell = board[row][col];
    const cellElement = gameContainer.children[row * GRID_SIZE + col];

    cell.isFlagged = !cell.isFlagged;

    if (cell.isFlagged) {
        if (flagsPlaced < BOOM_COUNT) { // 只有在旗帜数量未达到雷数时才能放置新旗帜
            cellElement.textContent = '🚩';
            cellElement.classList.add('flag');
            flagsPlaced++;
            if (cell.isBomb) {
                correctFlags++;
            }
        } else {
            // 如果已经达到雷数，不允许放置更多旗帜，并恢复状态
            cell.isFlagged = false; // 取消本次标记操作
        }
    } else {
        cellElement.textContent = '';
        cellElement.classList.remove('flag');
        flagsPlaced--;
        if (cell.isBomb) {
            correctFlags--;
        }
    }
    updateFlagCount();
    checkWinCondition(); // 标记/取消标记后也检查胜利条件
}

// 检查胜利条件
function checkWinCondition() {
    // 胜利条件1：所有非雷单元格都被揭示
    const totalSafeCells = (GRID_SIZE * GRID_SIZE) - BOOM_COUNT;
    const allSafeCellsRevealed = (revealedCells === totalSafeCells);

    // 胜利条件2（可选，更接近扫雷习惯）：所有雷都被正确标记，且没有其他非雷单元格被标记
    // 暂时不启用此复杂条件，只用揭示所有非雷单元格作为胜利条件
    // const allBombsCorrectlyFlagged = (correctFlags === BOOM_COUNT && flagsPlaced === BOOM_COUNT);

    if (allSafeCellsRevealed) {
        endGame(true); // 成功揭示所有非雷单元格
    }
}

// 游戏结束
function endGame(win) {
    gameOver = true;
    stopTimer(); // 停止计时
    const finalTime = timerDisplay.textContent.replace('⏱ ', ''); // 获取最终时间

    if (win) {
        messageDisplay.textContent = `恭喜完成了游戏！用时：${finalTime}。您正确标记了 ${correctFlags} 个雷！`;
    } else {
        messageDisplay.textContent = `可惜再接再厉！用时：${finalTime}。您正确标记了 ${correctFlags} 个雷。`;
        revealAllBombs(); // 显示所有雷
    }

    // 移除所有单元格的点击事件，防止继续操作
    const allCells = gameContainer.querySelectorAll('.cell');
    allCells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.removeEventListener('click', () => handleCellInteraction(row, col));
        cell.removeEventListener('contextmenu', (e) => handleCellRightClick(row, col));
    });
}

// 揭示所有雷
function revealAllBombs() {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (board[i][j].isBomb) { // 只显示是雷的单元格
                const cellElement = gameContainer.children[i * GRID_SIZE + j];
                // 如果是雷，但被错误地标记为旗帜，移除旗帜显示雷
                if (board[i][j].isFlagged && !board[i][j].isBomb) { // 实际上，如果是雷，并且被标记了，说明是正确标记
                    cellElement.textContent = '🚩'; // 正确标记的雷保持旗帜
                    cellElement.classList.remove('flag'); // 移除flag样式，避免覆盖
                    cellElement.classList.add('revealed'); // 标记为已揭示状态
                } else if (!board[i][j].isRevealed) { // 如果未被揭示
                    cellElement.textContent = '💣';
                    cellElement.classList.add('bomb');
                    cellElement.classList.add('revealed');
                }
            } else if (board[i][j].isFlagged && !board[i][j].isBomb) { // 非雷，但被错误标记
                const cellElement = gameContainer.children[i * GRID_SIZE + j];
                cellElement.textContent = '❌'; // 错误标记
                cellElement.classList.remove('flag');
                cellElement.classList.add('revealed');
            }
        }
    }
}

// 首次加载页面时，显示开始页面
showStartPage();
