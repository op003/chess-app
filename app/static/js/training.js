/**
 * AI Bot Training Manager via WebSockets.
 * Provides real-time feedback, weight updates, and live metrics.
 */
class TrainingLab {
    constructor() {
        this.ws = null;
        this.isTraining = false;
        this.history = [];
    }

    init() {
        const modal = document.getElementById('training-modal');
        const openBtn = document.getElementById('btn-open-training');
        const closeBtn = document.getElementById('btn-close-training');
        const startBtn = document.getElementById('btn-start-training');
        const stopBtn = document.getElementById('btn-stop-training');
        const equipBtn = document.getElementById('btn-equip-trained');

        if (openBtn) {
            openBtn.onclick = () => {
                modal.classList.add('active');
                this.loadCurrentWeights();
            };
        }
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }
        if (startBtn) {
            startBtn.onclick = () => this.startTraining();
        }
        if (stopBtn) {
            stopBtn.onclick = () => this.stopTraining();
        }
        if (equipBtn) {
            equipBtn.onclick = () => {
                modal.classList.remove('active');
                if (window.app) {
                    window.app.selectPersonality('trained');
                }
            };
        }
    }

    async loadCurrentWeights() {
        try {
            const res = await fetch('/api/weights/trained');
            const data = await res.json();
            this.updateWeightsDisplay(data);
        } catch (e) {
            console.error('Failed to load weights:', e);
        }
    }

    updateWeightsDisplay(w) {
        document.getElementById('metric-mobility').textContent = w.mobility_weight ?? '13.5';
        document.getElementById('metric-attack').textContent = w.king_attack_weight ?? '34.0';
        document.getElementById('metric-center').textContent = w.center_control_weight ?? '20.0';
        document.getElementById('metric-aggression').textContent = (w.gambit_aggression ?? '2.2') + 'x';
    }

    startTraining() {
        if (this.isTraining) return;

        const generations = parseInt(document.getElementById('train-generations').value, 10) || 3;
        const depth = parseInt(document.getElementById('train-depth').value, 10) || 2;
        const basePersonality = document.getElementById('train-base-personality').value || 'tal';

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/train`;

        this.ws = new WebSocket(wsUrl);
        this.isTraining = true;
        this.setUIState(true);

        const statusEl = document.getElementById('train-status-text');
        statusEl.textContent = 'Connecting to AI Training Engine...';

        this.ws.onopen = () => {
            statusEl.textContent = 'Training Engine Connected. Starting Evolutionary Self-Play...';
            this.ws.send(JSON.stringify({
                action: 'start',
                generations: generations,
                depth: depth,
                personality: basePersonality
            }));
        };

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'started') {
                statusEl.textContent = msg.message;
            } else if (msg.type === 'progress') {
                this.handleProgress(msg.data);
            } else if (msg.type === 'finished') {
                this.isTraining = false;
                this.setUIState(false);
                statusEl.textContent = '✅ ' + msg.message;
                if (msg.weights) {
                    this.updateWeightsDisplay(msg.weights);
                    document.getElementById('btn-equip-trained').style.display = 'inline-flex';
                }
            } else if (msg.type === 'stopped') {
                this.isTraining = false;
                this.setUIState(false);
                statusEl.textContent = 'Training stopped by user.';
            } else if (msg.type === 'error') {
                statusEl.textContent = '❌ Error: ' + msg.message;
                this.isTraining = false;
                this.setUIState(false);
            }
        };

        this.ws.onclose = () => {
            this.isTraining = false;
            this.setUIState(false);
        };
    }

    stopTraining() {
        if (this.ws && this.isTraining) {
            this.ws.send(JSON.stringify({ action: 'stop' }));
        }
    }

    handleProgress(stats) {
        const statusEl = document.getElementById('train-status-text');
        const progressBar = document.getElementById('train-progress-bar');
        const pct = Math.round((stats.generation / stats.total_generations) * 100);

        progressBar.style.width = pct + '%';
        statusEl.innerHTML = `
            <strong>Generation ${stats.generation} / ${stats.total_generations}</strong>
            (Games: ${stats.total_games}, Best Score: ${stats.best_score})
            <br>
            <span class="subtext">Optimizing King Attack & Dynamic Mobility (${stats.elapsed_seconds}s)</span>
        `;

        this.updateWeightsDisplay(stats);
    }

    setUIState(training) {
        document.getElementById('btn-start-training').disabled = training;
        document.getElementById('btn-stop-training').disabled = !training;
        document.getElementById('training-spinner').style.display = training ? 'inline-block' : 'none';
    }
}

window.trainingLab = new TrainingLab();
