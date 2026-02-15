class Card {
    constructor(rank, suit) {
        this.rank = rank === 1 ? 14 : rank;
        this.suit = suit;
    }

    toString() {
        const rankStr = this.rank === 1 ? 'A' : this.rank === 11 ? 'J' : this.rank === 12 ? 'Q' : this.rank === 13 ? 'K' : this.rank.toString();
        return rankStr + this.suit[0];
    }

    getSuitSymbol() {
        switch (this.suit) {
            case 'Hearts': return '♥';
            case 'Diamonds': return '♦';
            case 'Clubs': return '♣';
            case 'Spades': return '♠';
        }
    }

    getRankDisplay() {
        return this.rank === 14 ? 'A' : this.rank === 11 ? 'J' : this.rank === 12 ? 'Q' : this.rank === 13 ? 'K' : this.rank.toString();
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
        this.shuffle();
    }

    initializeDeck() {
        const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
        for (let suit of suits) {
            for (let rank = 1; rank <= 13; rank++) {
                this.cards.push(new Card(rank, suit));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    dealCard() {
        return this.cards.pop();
    }

    remainingCards() {
        return this.cards.length;
    }
}

class Pile {
    constructor() {
        this.cards = [];
    }

    addCard(card) {
        this.cards.push(card);
    }

    removeCard() {
        return this.cards.pop();
    }

    peekCard() {
        return this.cards[this.cards.length - 1];
    }

    isEmpty() {
        return this.cards.length === 0;
    }

    size() {
        return this.cards.length;
    }
}

class GameState {
    constructor() {
        this.deck = new Deck();
        this.piles = Array(6).fill().map(() => new Pile()); // 0-3: piles, 4: stock, 5: discard
        this.score = 0;
        this.gameOver = false;
        this.gamesPlayed = 0;
        this.gamesWon = 0;
        this.loadStats();
        this.initializeGame();
    }

    loadStats() {
        const saved = localStorage.getItem('idioten-stats');
        if (saved) {
            const stats = JSON.parse(saved);
            this.gamesPlayed = stats.gamesPlayed || 0;
            this.gamesWon = stats.gamesWon || 0;
        }
    }

    saveStats() {
        localStorage.setItem('idioten-stats', JSON.stringify({
            gamesPlayed: this.gamesPlayed,
            gamesWon: this.gamesWon
        }));
    }

    initializeGame() {
        // Fill stock
        while (this.deck.remainingCards() > 0) {
            this.piles[4].addCard(this.deck.dealCard());
        }
        // Deal 4 cards
        for (let i = 0; i < 4; i++) {
            const card = this.piles[4].removeCard();
            if (card) this.piles[i].addCard(card);
        }
    }

    canRemoveCard(card) {
        for (let pile of this.piles.slice(0, 4)) {
            if (pile.cards.length > 0) {
                const top = pile.cards[pile.cards.length - 1];
                if (top.suit === card.suit && top.rank > card.rank) {
                    return true;
                }
            }
        }
        return false;
    }

    processRemovals() {
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < 4; i++) {
                const pile = this.piles[i];
                for (let j = pile.cards.length - 1; j >= 0; j--) {
                    if (this.canRemoveCard(pile.cards[j])) {
                        this.piles[5].addCard(pile.cards[j]);
                        pile.cards.splice(j, 1);
                        this.score++;
                        changed = true;
                    }
                }
            }
        }
    }

    moveToEmpty(fromPile, toPile) {
        if (fromPile >= 0 && fromPile < 4 && toPile >= 0 && toPile < 4 && this.piles[toPile].isEmpty() && this.piles[fromPile].size() > 0) {
            const card = this.piles[fromPile].removeCard();
            this.piles[toPile].addCard(card);
        }
    }

    autoMove() {
        const emptyPiles = this.getEmptyPiles();
        if (emptyPiles.length === 0) return false;
        for (let from = 0; from < 4; from++) {
            if (this.piles[from].size() > 0) {
                this.moveToEmpty(from, emptyPiles[0]);
                return true;
            }
        }
        return false;
    }

    getEmptyPiles() {
        return [0,1,2,3].filter(i => this.piles[i].isEmpty());
    }

    dealNext() {
        if (this.piles[4].size() < 4) {
            this.gameOver = true;
            return;
        }
        for (let i = 0; i < 4; i++) {
            const card = this.piles[4].removeCard();
            this.piles[i].addCard(card);
        }
    }

    isWin() {
        const totalCards = this.piles.slice(0, 4).reduce((sum, pile) => sum + pile.size(), 0);
        return totalCards === 4 && 
               this.piles.slice(0, 4).every(pile => pile.size() === 1 && pile.peekCard().rank === 14) &&
               this.piles[4].isEmpty(); // Stock måste vara tom
    }

    reset() {
        if (this.gamesPlayed > 0) {
            if (this.isWin()) {
                this.gamesWon++;
            }
        }
        this.gamesPlayed++;
        this.saveStats();
        this.deck = new Deck();
        this.piles = Array(6).fill().map(() => new Pile());
        this.score = 0;
        this.gameOver = false;
        this.initializeGame();
    }

    getWinRate() {
        if (this.gamesPlayed === 0) return 0;
        return Math.round((this.gamesWon / this.gamesPlayed) * 100);
    }

    cloneState() {
        return {
            piles: this.piles.map(pile => ({cards: [...pile.cards]})),
            score: this.score,
            gameOver: this.gameOver,
            selectedPile: selectedPile
        };
    }

    restoreState(state) {
        this.piles = state.piles.map(pile => {
            const newPile = new Pile();
            newPile.cards = [...pile.cards];
            return newPile;
        });
        this.score = state.score;
        this.gameOver = state.gameOver;
        selectedPile = state.selectedPile;
    }
}

// UI
let gameState = new GameState();
let selectedPile = null;
let gameHistory = [];
const MAX_HISTORY = 20;

function updateUI() {
    for (let i = 0; i < 4; i++) {
        const pileEl = document.getElementById(`pile${i}`);
        pileEl.innerHTML = '';
        pileEl.classList.remove('selected');
        if (gameState.piles[i].cards.length > 0) {
            const cardCount = gameState.piles[i].cards.length;
            // Dynamisk offset: mindre avstånd när det blir många kort, men aldrig under 20px
            const offset = cardCount > 5 ? Math.max(20, 250 / cardCount) : 40;
            
            gameState.piles[i].cards.forEach((card, cardIndex) => {
                const cardEl = document.createElement('div');
                cardEl.className = 'card';
                cardEl.setAttribute('data-suit', card.suit);
                const isTop = cardIndex === gameState.piles[i].cards.length - 1;
            cardEl.innerHTML = isTop 
                ? `<div class="rank">${card.getRankDisplay()}</div><div class="suit">${card.getSuitSymbol()}</div>`
                : `<div class="bottom">${card.getRankDisplay()} <span class="suit">${card.getSuitSymbol()}</span></div>`;
            cardEl.classList.toggle('top-card', isTop);
            cardEl.classList.toggle('bottom-card', !isTop);
                cardEl.style.top = `${10 + cardIndex * offset}px`;
                cardEl.style.zIndex = cardIndex + 1;
                cardEl.addEventListener('click', (e) => {
    e.stopPropagation();
    selectCard(i, cardIndex);
});
                pileEl.appendChild(cardEl);
            });
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'empty-placeholder';
            placeholder.textContent = 'Tom';
            pileEl.appendChild(placeholder);
        }
        if (selectedPile === i) {
            pileEl.classList.add('selected');
        }
    }
    document.getElementById('stock-count').textContent = gameState.piles[4].size();
    const winRate = gameState.getWinRate();
    document.getElementById('stats').textContent = `Spelade: ${gameState.gamesPlayed} | Vunna: ${gameState.gamesWon} (${winRate}%)`;
    const messageEl = document.getElementById('message');
    if (gameState.isWin()) {
        messageEl.textContent = '🎉 Grattis! Du vann Idioten! 🎉';
    } else if (gameState.gameOver) {
        messageEl.textContent = '😞 Spelet slut! Du är en idiot. 😞';
    } else {
        messageEl.textContent = '';
    }
    document.getElementById('deal-btn').disabled = gameState.gameOver;
    document.getElementById('move-btn').disabled = gameState.getEmptyPiles().length === 0;
    document.getElementById('undo-btn').disabled = gameHistory.length === 0;
}

function saveHistory() {
    gameHistory.push(gameState.cloneState());
    if (gameHistory.length > MAX_HISTORY) {
        gameHistory.shift();
    }
}

function undo() {
    if (gameHistory.length === 0) return;
    const previousState = gameHistory.pop();
    gameState.restoreState(previousState);
    updateUI();
}

function selectCard(pileIndex, cardIndex) {
    if (cardIndex !== gameState.piles[pileIndex].cards.length - 1) return; // Only top card
    const card = gameState.piles[pileIndex].cards[cardIndex];
    if (gameState.canRemoveCard(card)) {
        saveHistory();
        gameState.piles[5].addCard(card);
        gameState.piles[pileIndex].cards.splice(cardIndex, 1);
        gameState.score++;
        selectedPile = null;
        updateUI();
    } else {
        selectedPile = pileIndex;
        updateUI();
    }
}

function selectPile(pileIndex) {
    if (selectedPile !== null && gameState.piles[pileIndex].isEmpty() && pileIndex !== selectedPile) {
        saveHistory();
        const card = gameState.piles[selectedPile].cards.pop();
        gameState.piles[pileIndex].addCard(card);
        selectedPile = null;
    } else if (pileIndex === selectedPile) {
        selectedPile = null;
    }
    updateUI();
}

document.getElementById('deal-btn').addEventListener('click', () => {
    saveHistory();
    gameState.dealNext();
    updateUI();
});

document.getElementById('move-btn').addEventListener('click', () => {
    saveHistory();
    gameState.autoMove();
    updateUI();
});

document.getElementById('reset-btn').addEventListener('click', () => {
    gameHistory = [];
    gameState.reset();
    updateUI();
});

document.getElementById('undo-btn').addEventListener('click', () => {
    undo();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!gameState.gameOver) {
            saveHistory();
            gameState.dealNext();
            updateUI();
        }
    } else if (e.key === 'm' || e.key === 'M') {
        if (gameState.getEmptyPiles().length > 0) {
            saveHistory();
            gameState.autoMove();
            updateUI();
        }
    } else if (e.key === 'r' || e.key === 'R') {
        gameHistory = [];
        gameState.reset();
        updateUI();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

updateUI();

for (let i = 0; i < 4; i++) {
    document.getElementById(`pile${i}`).addEventListener('click', (event) => {
        // Prevent triggering if clicked on a card
        if (event.target.classList.contains('card')) return;
        selectPile(i);
    });
}