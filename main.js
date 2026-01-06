// Configuração do Jogo
const CONFIG = {
    cellSize: 4, // Pixels um pouco menores para um visual mais fluido
    cols: 80, // Tabuleiro mais largo
    rows: 120, // Tabuleiro mais alto
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

// Função para aumentar as formas (ex: 1 bloco abstrato -> grade de 4x4 pixels)
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

const SCALE_FACTOR = 6; // Cada bloco tem 6x6 pixels
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
        this.particles = []; // Para efeitos

        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.frameCount = 0;
        this.isPlaying = false;
        this.mode = 'classic'; // 'classic' ou 'arcade'
        this.currentColors = [];

        this.currentPiece = null;
        this.nextPiece = null;

        // Manipulação de Entrada
        this.keys = {};
        window.addEventListener('keydown', (e) => this.handleInput(e));
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Estado de manipulação de toque
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.touchThreshold = 3; // Sensibilidade aumentada (valor menor = mais sensível)

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

        // Configuração específica do modo
        if (this.mode === 'classic') {
            // Começar com menos cores, adicionar mais gradualmente
            this.currentColors = CONFIG.colors.slice(0, 3);
        } else {
            // Arcade: Todas as cores desde o início, foco na velocidade
            this.currentColors = [...CONFIG.colors];
        }

        this.nextPiece = this.generateRandomPiece(); // Gerar a primeira próxima peça
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

        // Centralizar a nova peça
        this.currentPiece.x = Math.floor(CONFIG.cols / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentPiece.y = 0;

        // Gerar nova próxima peça
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

        // Calcular posição centralizada
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
                        if (py < 20) hitLimit = true; // Cruzou a linha
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
        // Iterar de baixo para cima, randomizando a direção X para evitar viés
        for (let y = CONFIG.rows - 2; y >= 0; y--) {
            // Randomizar travessia X
            let xOrder = [];
            for (let x = 0; x < CONFIG.cols; x++) xOrder.push(x);
            xOrder.sort(() => Math.random() - 0.5);

            for (let x of xOrder) {
                if (this.grid[x][y]) {
                    let color = this.grid[x][y];

                    // 1. Tentar cair direto para baixo
                    if (!this.grid[x][y + 1]) {
                        this.grid[x][y + 1] = color;
                        this.grid[x][y] = null;
                    }
                    // 2. Tentar cair na diagonal (deslizar)
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
        // Estilo Sandtrix: Verificar caminhos conectados da esquerda para a direita da MESMA cor
        const cols = CONFIG.cols;
        const rows = CONFIG.rows;
        let visitedGlobal = new Set(); // Para evitar verificar novamente nós em pesquisas diferentes, mas é mais simples fazer por cor

        // precisamos processar isso com cuidado. Uma maneira simples:
        // iterar todos os pixels em x=0. Iniciar uma BFS para cada pixel não visitado.
        // Se a BFS alcançar x=cols-1, coletar todos os pixels nesse componente e removê-los.

        let pixelsToRemove = [];

        // Auxiliar para ID único
        const getId = (x, y) => `${x},${y}`;

        // Precisamos verificar cada cor presente na parede esquerda? ou apenas iterar todos os pixels da coluna 0
        let visitedInFrame = new Set();

        for (let y = 0; y < rows; y++) {
            if (this.grid[0][y] && !visitedInFrame.has(getId(0, y))) {
                let color = this.grid[0][y];
                // Iniciar BFS
                let queue = [{ x: 0, y: y }];
                let component = []; // Armazenar coordenadas deste aglomerado
                let reachedRight = false;
                let visitedCluster = new Set(); // Visitado local para esta BFS

                visitedCluster.add(getId(0, y));
                visitedInFrame.add(getId(0, y));

                let head = 0;
                while (head < queue.length) {
                    let curr = queue[head++];
                    component.push(curr);

                    if (curr.x === cols - 1) {
                        reachedRight = true;
                    }

                    // 8 Vizinhos (incluir diagonais) para pegar fragmentos e facilitar linhas
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
                                visitedInFrame.add(nid); // Marcar como processado
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
            // Remover pixels e adicionar efeitos
            pixelsToRemove.forEach(p => {
                const color = this.grid[p.x][p.y];
                this.grid[p.x][p.y] = null;

                // Adicionar efeito de partícula
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

            // Pontuação baseada nos pixels limpos
            let points = pixelsToRemove.length * 10;
            this.score += points;

            // Atualizar linhas limpas (aproximado: total de pixels / largura)
            // Ou apenas contar 1 "linha" por evento de limpeza
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
            p.life -= 0.03; // Desaparecer mais devagar
            p.alpha = p.life;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    checkLevelUp() {
        // Subir de nível a cada 2 linhas limpas (já que linhas são difíceis de conseguir)
        const newLevel = Math.floor(this.linesCleared / 2) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;

            if (this.mode === 'classic') {
                // Adicionar nova cor a cada 3 níveis se disponível
                if (this.level % 3 === 0 && this.currentColors.length < CONFIG.colors.length) {
                    this.currentColors.push(CONFIG.colors[this.currentColors.length]);
                }
            }
            // Modo Arcade: a velocidade aumenta naturalmente via cálculo de dropSpeed
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

    // Manipulação de Toque
    handleTouchStart(e) {
        if (!this.isPlaying) return;
        e.preventDefault(); // Prevenir rolagem
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;

        // Toque Longo para Drop Rápido
        this.longPressTimer = setTimeout(() => {
            this.hardDrop();
            this.longPressTimer = null; // Prevenir toque após drop
        }, 400); // tempo de espera de 400ms
    }

    handleTouchMove(e) {
        if (!this.isPlaying) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - this.lastTouchX;
        const dy = touch.clientY - this.lastTouchY;

        // Cancelar toque longo se moveu significativamente
        if (this.longPressTimer && (Math.abs(touch.clientX - this.touchStartX) > 10 || Math.abs(touch.clientY - this.touchStartY) > 10)) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // Movimento Horizontal
        if (Math.abs(dx) > this.touchThreshold) {
            const direction = dx > 0 ? 1 : -1;
            this.movePiece(direction, 0);
            this.lastTouchX = touch.clientX; // Resetar para evitar movimento contínuo super rápido
        }

        // Drop Suave (deslizar para baixo)
        if (dy > this.touchThreshold) { // Alterado de touchThreshold * 1.5 para touchThreshold conforme snippet do usuário
            this.movePiece(0, 1);
            this.lastTouchY = touch.clientY;
        }
    }

    handleTouchEnd(e) {
        if (!this.isPlaying) return;
        e.preventDefault();

        // Se o temporizador ainda estiver rodando, significa que não seguramos tempo suficiente -> é um TOQUE ou DESLIZE
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;

            // Calcular movimento geral para detecção de Toque
            const touch = e.changedTouches[0]; // Usar changedTouches para evento final
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;

            // Detecção de toque (movimento mínimo)
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                this.rotatePiece();
            }
        }
    }

    hardDrop() {
        while (this.movePiece(0, 1)) {
            // Continuar movendo para baixo até colisão
            this.score += 2; // Pontos bônus para drop rápido
        }
        this.updateUI(); // Changed from updateScore to updateUI
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

        // Verificar se o botão de reiniciar existe
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                document.getElementById('game-over-screen').classList.add('hidden');
                document.getElementById('start-screen').classList.remove('hidden');
            });
        }

        // Ouvintes de Toque no Documento (Controle de Tela Cheia)
        document.addEventListener('touchstart', (e) => {
            // Apenas lidar com toques do jogo se o alvo não for um botão ou link
            if (!e.target.closest('button') && !e.target.closest('a') && this.isPlaying) {
                this.handleTouchStart(e);
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && this.isPlaying) {
                this.handleTouchMove(e);
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && this.isPlaying) {
                this.handleTouchEnd(e);
            }
        }, { passive: false });
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

        // Atualização de física (rodar várias vezes por quadro para simulação fluida mais rápida?)
        // Por enquanto, uma vez por quadro está bom, talvez quadro sim quadro não se for muito rápido
        if (this.frameCount % 1 === 0) this.updatePhysics();

        // Lidar com partículas
        this.updateParticles();

        // Verificação contínua de linha (a cada 10 quadros)
        if (this.frameCount % 10 === 0) this.checkLines();

        // Lógica de queda do jogo
        let baseSpeed = CONFIG.dropSpeed;
        if (this.mode === 'arcade') {
            // Arcade: Velocidade aumenta mais rápido
            baseSpeed = Math.max(1, CONFIG.dropSpeed - (this.level * 2));
        } else {
            // Clássico: Velocidade aumenta mais devagar
            baseSpeed = Math.max(5, CONFIG.dropSpeed - this.level);
        }

        if (this.frameCount % baseSpeed === 0) {
            if (!this.movePiece(0, 1)) {
                // Atingiu o fundo ou pilha
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

        // Desenhar Grade (Areia)
        for (let x = 0; x < CONFIG.cols; x++) {
            for (let y = 0; y < CONFIG.rows; y++) {
                if (this.grid[x][y]) {
                    this.ctx.fillStyle = this.grid[x][y];
                    this.ctx.fillRect(x * CONFIG.cellSize, y * CONFIG.cellSize, CONFIG.cellSize, CONFIG.cellSize);
                }
            }
        }

        // Desenhar Partículas
        if (this.particles) {
            this.particles.forEach(p => {
                this.ctx.globalAlpha = p.alpha;
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(p.x, p.y, CONFIG.cellSize, CONFIG.cellSize);
                this.ctx.globalAlpha = 1.0;
            });
        }

        // Desenhar Linha Limite (Zona de Perigo)
        const limitY = 20 * CONFIG.cellSize; // ex: Linha 20
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.setLineDash([10, 10]);
        this.ctx.moveTo(0, limitY);
        this.ctx.lineTo(this.canvas.width, limitY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Desenhar Peça Atual
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
