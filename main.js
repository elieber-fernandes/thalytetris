// Game Configuration
const CONFIG = {
    cellSize: 4, // Slightly smaller pixels for better fluid look
    cols: 80, // Wider board
    rows: 120, // Taller board
    gravitySpeed: 5,
    dropSpeed: 30,
    colors: ["#FF5555", "#55FF55", "#5555FF", "#FFFF55", "#FF55FF", "#55FFFF"],
};

const BASE_SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    L: [[1, 0], [1, 0], [1, 1]],
    J: [[0, 1], [0, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]]
};

// Function to scale up shapes (e.g. 1 abstract block -> 4x4 grid of pixels)
function scaleShape(shape, scale) {
    const newShape = [];
    for (let r = 0; r < shape.length; r++) {
        for (let sr = 0; sr < scale; sr++) {
            const newRow = [];
            for (let c = 0; c < shape[r].length; c++) {
                const value = shape[r][c];
                for (let sc = 0; sc < scale; sc++) {
                    newRow.push(value);
                }
            }
            newShape.push(newRow);
        }
    }
    return newShape;
}

const SCALE_FACTOR = 6; // Each block is 6x6 pixels
const SHAPES = {};
Object.keys(BASE_SHAPES).forEach(k => {
    SHAPES[k] = scaleShape(BASE_SHAPES[k], SCALE_FACTOR);
});

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.canvas.width = CONFIG.cols * CONFIG.cellSize;
        this.canvas.height = CONFIG.rows * CONFIG.cellSize;

        this.grid = Array.from({ length: CONFIG.cols }, () => Array(CONFIG.rows).fill(null));
        this.particles = []; // For effects

        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.frameCount = 0;
        this.isPlaying = false;
        this.mode = 'classic'; // 'classic' or 'arcade'
        this.currentColors = [];

        this.currentPiece = null;
        this.nextPiece = null;

        // Input handling
        this.keys = {};
        window.addEventListener('keydown', (e) => this.handleInput(e));
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Touch handling state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.touchThreshold = 10; // Increased sensitivity (lower value = more sensitive)

        this.bindEvents();
    }

    start(mode = 'classic') {
        this.mode = mode;
        this.grid = Array.from({ length: CONFIG.cols }, () => Array(CONFIG.rows).fill(null));
        this.particles = [];
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.frameCount = 0;
        this.isPlaying = true;

        // Mode specific setup
        if (this.mode === 'classic') {
            // Start with fewer colors, add more partially
            this.currentColors = CONFIG.colors.slice(0, 3);
        } else {
            // Arcade: All colors from start, focus on speed
            this.currentColors = [...CONFIG.colors];
        }

        this.nextPiece = this.generateRandomPiece(); // Generate first next piece
        this.spawnPiece();
        this.updateUI();
        this.loop();
    }

    generateRandomPiece() {
        const shapeKeys = Object.keys(SHAPES);
        const shapeKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
        const shape = SHAPES[shapeKey];
        const color = this.currentColors[Math.floor(Math.random() * this.currentColors.length)];

        return {
            shape: shape,
            color: color,
            x: 0,
            y: 0
        };
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;

        // Center the new piece
        this.currentPiece.x = Math.floor(CONFIG.cols / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentPiece.y = 0;

        // Generate new next piece
        this.nextPiece = this.generateRandomPiece();
        this.drawNextPiece();

        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y)) {
            this.gameOver();
        }
    }

    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (!this.nextPiece) return;

        // Calculate centered position
        const pieceWidth = this.nextPiece.shape[0].length * CONFIG.cellSize;
        const pieceHeight = this.nextPiece.shape.length * CONFIG.cellSize;
        const offsetX = (this.nextCanvas.width - pieceWidth) / 2;
        const offsetY = (this.nextCanvas.height - pieceHeight) / 2;

        this.nextCtx.fillStyle = this.nextPiece.color;
        this.nextPiece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val) {
                    this.nextCtx.fillRect(
                        offsetX + c * CONFIG.cellSize,
                        offsetY + r * CONFIG.cellSize,
                        CONFIG.cellSize,
                        CONFIG.cellSize
                    );
                }
            });
        });
    }

    rotatePiece() {
        if (!this.currentPiece) return;
        const newShape = this.currentPiece.shape[0].map((_, i) => this.currentPiece.shape.map(row => row[i]).reverse());
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, newShape)) {
            this.currentPiece.shape = newShape;
        }
    }

    movePiece(dx, dy) {
        if (!this.currentPiece) return;
        if (!this.checkCollision(this.currentPiece.x + dx, this.currentPiece.y + dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            return true;
        }
        return false;
    }

    checkCollision(x, y, shape = this.currentPiece.shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    let nx = x + c;
                    let ny = y + r;
                    if (nx < 0 || nx >= CONFIG.cols || ny >= CONFIG.rows || (ny >= 0 && this.grid[nx][ny])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    meltPiece() {
        if (!this.currentPiece) return;
        let hitLimit = false;

        this.currentPiece.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value) {
                    let px = this.currentPiece.x + c;
                    let py = this.currentPiece.y + r;
                    if (px >= 0 && px < CONFIG.cols && py >= 0 && py < CONFIG.rows) {
                        this.grid[px][py] = this.currentPiece.color;
                        if (py < 20) hitLimit = true; // Crossed the line
                    }
                }
            });
        });

        this.currentPiece = null;

        if (hitLimit) {
            this.gameOver();
        } else {
            this.checkLines();
        }
    }

    updatePhysics() {
        // Iterate bottom-up, randomizing X direction to prevent bias
        for (let y = CONFIG.rows - 2; y >= 0; y--) {
            // Randomize X traversal
            let xOrder = [];
            for (let x = 0; x < CONFIG.cols; x++) xOrder.push(x);
            xOrder.sort(() => Math.random() - 0.5);

            for (let x of xOrder) {
                if (this.grid[x][y]) {
                    let color = this.grid[x][y];

                    // 1. Try to fall straight down
                    if (!this.grid[x][y + 1]) {
                        this.grid[x][y + 1] = color;
                        this.grid[x][y] = null;
                    }
                    // 2. Try to fall diagonally (slip)
                    else {
                        let dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
                        let moved = false;
                        for (let dx of dirs) {
                            if (x + dx >= 0 && x + dx < CONFIG.cols && !this.grid[x + dx][y + 1]) {
                                this.grid[x + dx][y + 1] = color;
                                this.grid[x][y] = null;
                                moved = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    checkLines() {
        // Sandtrix-style: Check for connected paths from left to right of the SAME color
        const cols = CONFIG.cols;
        const rows = CONFIG.rows;
        let visitedGlobal = new Set(); // To avoid re-checking nodes across different searches if wanted, but simpler to just do per-color searches

        // we need to process this carefully. One simple way:
        // iterate all pixels at x=0. Start a BFS for each unvisited pixel.
        // If BFS reaches x=cols-1, collect all pixels in that component and remove them.

        let pixelsToRemove = [];

        // Helper for unique ID
        const getId = (x, y) => `${x},${y}`;

        // We need to check for each color present on the left wall? or just iterate all 0-column pixels
        let visitedInFrame = new Set();

        for (let y = 0; y < rows; y++) {
            if (this.grid[0][y] && !visitedInFrame.has(getId(0, y))) {
                let color = this.grid[0][y];
                // Start BFS
                let queue = [{ x: 0, y: y }];
                let component = []; // Store coordinates of this cluster
                let reachedRight = false;
                let visitedCluster = new Set(); // Local visited for this BFS

                visitedCluster.add(getId(0, y));
                visitedInFrame.add(getId(0, y));

                let head = 0;
                while (head < queue.length) {
                    let curr = queue[head++];
                    component.push(curr);

                    if (curr.x === cols - 1) {
                        reachedRight = true;
                    }

                    // 8 Neighbors (include diagonals) to catch fragments and make lines easier
                    const dirs = [
                        [0, 1], [0, -1], [1, 0], [-1, 0],
                        [-1, -1], [-1, 1], [1, -1], [1, 1]
                    ];

                    for (let d of dirs) {
                        let nx = curr.x + d[0];
                        let ny = curr.y + d[1];
                        let nid = getId(nx, ny);

                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                            if (this.grid[nx][ny] === color && !visitedCluster.has(nid)) {
                                visitedCluster.add(nid);
                                visitedInFrame.add(nid); // Mark as processed
                                queue.push({ x: nx, y: ny });
                            }
                        }
                    }
                }

                if (reachedRight) {
                    pixelsToRemove.push(...component);
                }
            }
        }

        if (pixelsToRemove.length > 0) {
            // Remove pixels & Add effects
            pixelsToRemove.forEach(p => {
                const color = this.grid[p.x][p.y];
                this.grid[p.x][p.y] = null;

                // Add particle effect
                this.particles.push({
                    x: p.x * CONFIG.cellSize,
                    y: p.y * CONFIG.cellSize,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    color: color,
                    alpha: 1.0,
                    life: 1.0
                });
            });

            // Score based on pixels cleared
            let points = pixelsToRemove.length * 10;
            this.score += points;

            // Update lines cleared (approximate: total pixels / width)
            // Or just count 1 "line" per clear event
            this.linesCleared += 1;

            this.checkLevelUp();
            this.updateUI();
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03; // Fade out slower
            p.alpha = p.life;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    checkLevelUp() {
        // Simple level up every 2 lines cleared (since lines are hard to get)
        const newLevel = Math.floor(this.linesCleared / 2) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;

            if (this.mode === 'classic') {
                // Add new color every 3 levels if available
                if (this.level % 3 === 0 && this.currentColors.length < CONFIG.colors.length) {
                    this.currentColors.push(CONFIG.colors[this.currentColors.length]);
                }
            }
            // Arcade mode: speed just increases naturally via dropSpeed calculation
        }
    }

    updateUI() {
        document.getElementById('score').innerText = this.score;
        document.getElementById('level').innerText = this.level;
    }

    gameOver() {
        this.isPlaying = false;
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    handleInput(e) {
        if (!this.isPlaying) return;

        switch (e.code) {
            case 'ArrowLeft': this.movePiece(-1, 0); break;
            case 'ArrowRight': this.movePiece(1, 0); break;
            case 'ArrowDown': this.movePiece(0, 1); break;
            case 'ArrowUp': this.rotatePiece(); break;
        }
    }

    // Touch Handling
    handleTouchStart(e) {
        if (!this.isPlaying) return;
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
    }

    handleTouchMove(e) {
        if (!this.isPlaying) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - this.lastTouchX;
        const dy = touch.clientY - this.lastTouchY;

        // Horizontal Movement
        if (Math.abs(dx) > this.touchThreshold) {
            const direction = dx > 0 ? 1 : -1;
            this.movePiece(direction, 0);
            this.lastTouchX = touch.clientX; // Reset to avoid continuous super-fast movement
        }

        // Soft Drop (down swipe)
        if (dy > this.touchThreshold * 1.5) {
            this.movePiece(0, 1);
            this.lastTouchY = touch.clientY;
        }
    }

    handleTouchEnd(e) {
        if (!this.isPlaying) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;

        // Tap detection (minimal movement)
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            this.rotatePiece();
        }
    }

    bindEvents() {
        document.getElementById('btn-classic').addEventListener('click', () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.toggleFullscreen();
            this.start('classic');
        });
        document.getElementById('btn-arcade').addEventListener('click', () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.toggleFullscreen();
            this.start('arcade');
        });

        // Check if restart button exists
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                document.getElementById('game-over-screen').classList.add('hidden');
                document.getElementById('start-screen').classList.remove('hidden');
            });
        }

        // Touch Listeners on Canvas
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    }

    toggleFullscreen() {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => console.log('Fullscreen denied:', err));
            } else if (elem.webkitRequestFullscreen) { /* Safari */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE11 */
                elem.msRequestFullscreen();
            }
        }
    }

    loop() {
        if (!this.isPlaying) return;

        this.frameCount++;

        // Physics update (run multiple times per frame for faster fluid simulation?)
        // For now, once per frame is fine, maybe every other frame if too fast
        if (this.frameCount % 1 === 0) this.updatePhysics();

        // Handle particles
        this.updateParticles();

        // Continuous line check (every 10 frames)
        if (this.frameCount % 10 === 0) this.checkLines();

        // Game Drop Logic
        let baseSpeed = CONFIG.dropSpeed;
        if (this.mode === 'arcade') {
            // Arcade: Speed increases faster
            baseSpeed = Math.max(1, CONFIG.dropSpeed - (this.level * 2));
        } else {
            // Classic: Speed increases slower
            baseSpeed = Math.max(5, CONFIG.dropSpeed - this.level);
        }

        if (this.frameCount % baseSpeed === 0) {
            if (!this.movePiece(0, 1)) {
                // Hit bottom or pile
                this.meltPiece();
                this.spawnPiece();
            }
        }

        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid (Sand)
        for (let x = 0; x < CONFIG.cols; x++) {
            for (let y = 0; y < CONFIG.rows; y++) {
                if (this.grid[x][y]) {
                    this.ctx.fillStyle = this.grid[x][y];
                    this.ctx.fillRect(x * CONFIG.cellSize, y * CONFIG.cellSize, CONFIG.cellSize, CONFIG.cellSize);
                }
            }
        }

        // Draw Particles
        if (this.particles) {
            this.particles.forEach(p => {
                this.ctx.globalAlpha = p.alpha;
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(p.x, p.y, CONFIG.cellSize, CONFIG.cellSize);
                this.ctx.globalAlpha = 1.0;
            });
        }

        // Draw Limit Line (Danger Zone)
        const limitY = 20 * CONFIG.cellSize; // e.g. Row 20
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.setLineDash([10, 10]);
        this.ctx.moveTo(0, limitY);
        this.ctx.lineTo(this.canvas.width, limitY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw Current Piece
        if (this.currentPiece) {
            this.ctx.fillStyle = this.currentPiece.color;
            this.currentPiece.shape.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val) {
                        this.ctx.fillRect(
                            (this.currentPiece.x + c) * CONFIG.cellSize,
                            (this.currentPiece.y + r) * CONFIG.cellSize,
                            CONFIG.cellSize,
                            CONFIG.cellSize
                        );
                    }
                });
            });
        }
    }
}

// Initialize
window.onload = () => {
    const game = new Game('gameCanvas');
};
