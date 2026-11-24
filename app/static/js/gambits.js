/**
 * Gambit Selector & Theory Guide Component.
 */
class GambitManager {
    constructor() {
        this.gambits = [];
        this.currentGambit = null;
        this.onSelectCallback = null;
    }

    async loadGambits() {
        try {
            const res = await fetch('/api/gambits');
            const data = await res.json();
            this.gambits = data.gambits || [];
            this.renderGambitOptions();
        } catch (e) {
            console.error('Failed to load gambits:', e);
        }
    }

    renderGambitOptions() {
        const selectEl = document.getElementById('gambit-select');
        if (!selectEl) return;

        selectEl.innerHTML = `
            <option value="">🎯 Dynamic Tactical (Adaptive)</option>
            <optgroup label="⚔️ Top White Gambits">
                ${this.gambits.filter(g => g.color === 'white').map(g => `
                    <option value="${g.id}">White: ${g.name} (${g.eco})</option>
                `).join('')}
            </optgroup>
            <optgroup label="🛡️ Top Black Counter-Gambits">
                ${this.gambits.filter(g => g.color === 'black').map(g => `
                    <option value="${g.id}">Black: ${g.name} (${g.eco})</option>
                `).join('')}
            </optgroup>
        `;
    }

    selectGambit(gambitId) {
        this.currentGambit = this.gambits.find(g => g.id === gambitId) || null;
        this.renderGambitInfo();
        if (this.onSelectCallback) {
            this.onSelectCallback(this.currentGambit);
        }
    }

    renderGambitInfo() {
        const panel = document.getElementById('gambit-info-panel');
        if (!panel) return;

        if (!this.currentGambit) {
            panel.innerHTML = `
                <div class="gambit-card empty">
                    <div class="gambit-header">
                        <span class="badge">Adaptive Engine</span>
                        <h3>Dynamic Tactical Repertoire</h3>
                    </div>
                    <p>The AI will evaluate positions dynamically using aggressive piece activity and king attack pressure, ready to punish inaccuracies or seize initiative!</p>
                </div>
            `;
            return;
        }

        const g = this.currentGambit;
        panel.innerHTML = `
            <div class="gambit-card ${g.color}">
                <div class="gambit-header">
                    <span class="badge badge-${g.color}">${g.color.toUpperCase()} • ${g.eco}</span>
                    <h3>${g.name}</h3>
                    <div class="gambit-subtitle">${g.subtitle || ''}</div>
                </div>
                <div class="gambit-moves-badge">${g.san_moves.join(' ')}</div>
                <p class="gambit-desc">${g.description}</p>

                <div class="gambit-section">
                    <h4>⚡ Key Strategic Ideas:</h4>
                    <ul>
                        ${g.key_ideas.map(idea => `<li>${idea}</li>`).join('')}
                    </ul>
                </div>

                ${g.trap_example ? `
                    <div class="gambit-section trap-box">
                        <strong>⚠️ Tactical Trap:</strong> ${g.trap_example}
                    </div>
                ` : ''}

                <div class="gambit-actions">
                    <button class="btn btn-primary" id="btn-play-gambit">
                        ⚔️ Play this Gambit vs Bot
                    </button>
                </div>
            </div>
        `;

        const playBtn = document.getElementById('btn-play-gambit');
        if (playBtn) {
            playBtn.onclick = () => {
                if (window.app) {
                    window.app.startGambitGame(g);
                }
            };
        }
    }
}

window.gambitManager = new GambitManager();
