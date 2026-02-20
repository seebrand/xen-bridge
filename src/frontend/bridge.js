

class Card {

    constructor(symbol) {
        this.symbol = symbol
        this.suit = 'SHDC'.indexOf(symbol[0])
        this.rank = symbol[1]
        this.value = 'AKQJT98765432'.indexOf(symbol[1])
    }

    render(element) {
        let card = document.createElement('div')
        card.classList.add('card')
        card.setAttribute('data-value', this.rank)
        card.setAttribute('symbol', this.symbol)
        card.innerHTML = ['&spades;', '&hearts;', '&diams;', '&clubs;'][this.suit]
        if (this.suit == 1) {
            card.classList.add('red')
        }
        if (this.suit == 2) {
            card.classList.add('orange')
        }
        if (this.suit == 3) {
            card.classList.add('green')
        }

        element.appendChild(card)
    }

}

class Hand {

    constructor(cards, isPublic, rendered) {
        this._cards = cards;
        this._cardsInitialized = cards.length > 0;
        this._hiddenCount = cards.length > 0 ? cards.length : 13;
        this.isPublic = isPublic;
        this.rendered = rendered;
        // Initialize suits based on the initial cards
        this.updateSuits();
    }

    get cards() {
        return this._cards;
    }

    set cards(newCards) {
        this._cards = newCards;
        this._cardsInitialized = true;
        this._hiddenCount = newCards.length;
        this.updateSuits(); // Update suits whenever cards are set
    }

    updateSuits() {
        this.suits = [[], [], [], []];
        for (const element of this._cards) {
            this.suits[element.suit].push(element)
        }
    }
    
    isPlayable(card, trick) {
        if (!this.hasCard(card)) {
            return false
        }
        if (trick.cards.length == 0) {
            return true
        }
        if (trick.cards.length >= 4) {
            return false
        }
        let leadSuit = trick.cards[0].suit
        if (this.suits[leadSuit].length == 0) {
            return true
        }
        return card.suit == leadSuit
    }

    hasCard(card) {
        let found = false;
        for (const element of this.cards) {
            if (element.symbol == card.symbol) {
                found = true
                break
            }
        }
        return found
    }

    // returns a new hand with the played card removed
    play(card) {
        let remainingCards = []
        for (const element of this.cards) {
            if (card.symbol != element.symbol) {
                remainingCards.push(element)
            }
        }
        let newHand = new Hand(remainingCards, this.isPublic, this.rendered)
        // For hidden hands without card data, decrement the hidden count
        if (!this._cardsInitialized) {
            newHand._cardsInitialized = false;
            newHand._hiddenCount = Math.max(0, this._hiddenCount - 1);
        }
        return newHand
    }

    render(element, direction) {
        if (this._cards.length === 0) return
        element.textContent = ''
        element.style.visibility = 'visible';
        // Move trump to the left
        let order = [0, 1, 3, 2];
        if (deal.strain == 2) order = [1, 0, 3, 2];
        if (deal.strain == 3) order = [2, 0, 1, 3];
        if (deal.strain == 4) order = [3, 1, 0, 2];
        for (let i of order) {
            const suitContainer = document.createElement('div');
            suitContainer.style.display = 'flex'; // Set suit containers to flex display

            element.appendChild(suitContainer);

            // Check if the suit has no cards
            if (this.suits[i].length === 0) {
                suitContainer.classList.add('empty-suit'); // Add a class for an empty suit
            } else {
                // Render elements for each non-empty suit into their respective containers
                this.suits[i].forEach(card => {
                    card.render(suitContainer);
                });
            }
        }

        this.rendered = true

        // Dynamic overlap adjustment for all directions
        requestAnimationFrame(() => Hand.adjustOverlap(element));
    }

    renderCardBacks(element, direction) {
        let count = this._cardsInitialized ? this._cards.length : this._hiddenCount;
        if (count === 0) return
        element.textContent = ''
        element.style.visibility = 'visible';
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        if (direction === 'west' || direction === 'east') {
            wrapper.style.flexDirection = 'column';
        }
        for (let i = 0; i < count; i++) {
            let back = document.createElement('div')
            back.classList.add('card-back')
            wrapper.appendChild(back)
        }
        element.appendChild(wrapper)
        this.rendered = true

        // Dynamic overlap for horizontal card-backs
        if (direction === 'north' || direction === 'south') {
            requestAnimationFrame(() => Hand.adjustCardBackOverlap(wrapper, element));
        }
        // Dynamic vertical overlap for W/E card-backs
        if (direction === 'west' || direction === 'east') {
            requestAnimationFrame(() => Hand.adjustCardBackVerticalOverlap(wrapper, element));
        }
    }

    static adjustOverlap(handElement) {
        const allCards = handElement.querySelectorAll('.card');
        if (allCards.length <= 1) return;
        const availWidth = handElement.offsetWidth || handElement.getBoundingClientRect().width;
        if (availWidth === 0) return;
        const cardW = allCards[0].offsetWidth;

        // Detect if suits are stacked vertically (W/E visible cards)
        const computedDir = getComputedStyle(handElement).flexDirection;
        const isVertical = computedDir === 'column';

        if (isVertical) {
            // For vertical suit-stacked layout (W/E), adjust overlap per suit container
            const suitContainers = Array.from(handElement.children).filter(el => el.querySelector('.card'));
            suitContainers.forEach(container => {
                const cards = container.querySelectorAll('.card');
                if (cards.length === 0) return;
                const totalNeeded = cardW * cards.length;
                if (totalNeeded > availWidth) {
                    const maxOverlap = Math.floor(cardW * 0.65);
                    const idealOverlap = Math.ceil((totalNeeded - availWidth) / Math.max(1, cards.length - 1));
                    const overlap = Math.min(idealOverlap, maxOverlap);
                    cards.forEach((card, i) => {
                        card.style.marginLeft = i === 0 ? '0' : `-${overlap}px`;
                    });
                } else {
                    cards.forEach((card, i) => {
                        card.style.marginLeft = i === 0 ? '0' : `-${Math.min(8, cardW * 0.12)}px`;
                    });
                }
            });

            // Also ensure vertical stacking of suit rows fits within available height
            const availHeight = handElement.offsetHeight || handElement.getBoundingClientRect().height;
            if (availHeight > 0 && suitContainers.length > 1) {
                const cardH = allCards[0].offsetHeight;
                const totalVertical = cardH * suitContainers.length;
                if (totalVertical > availHeight) {
                    const visiblePerRow = Math.max(8, Math.floor((availHeight - cardH) / (suitContainers.length - 1)));
                    const vOverlap = cardH - visiblePerRow;
                    suitContainers.forEach((c, i) => {
                        c.style.marginTop = i === 0 ? '0' : `-${vOverlap}px`;
                    });
                } else {
                    suitContainers.forEach((c, i) => {
                        c.style.marginTop = i === 0 ? '0' : '-2px';
                    });
                }
            }
        } else {
            // Horizontal layout (N/S) — adjust across all cards
            const suitGap = 4;
            let suitCount = 0;
            for (const child of handElement.children) {
                if (child.querySelector('.card')) suitCount++;
            }
            const totalNeeded = cardW * allCards.length + suitGap * Math.max(0, suitCount - 1);
            if (totalNeeded > availWidth) {
                const maxOverlap = Math.floor(cardW * 0.55);
                const idealOverlap = Math.ceil((cardW * allCards.length - availWidth) / (allCards.length - 1));
                const overlap = Math.min(idealOverlap, maxOverlap);
                let firstInHand = true;
                allCards.forEach((card) => {
                    if (firstInHand) {
                        card.style.marginLeft = '0';
                        firstInHand = false;
                    } else {
                        card.style.marginLeft = `-${overlap}px`;
                    }
                });
            } else {
                let firstInHand = true;
                allCards.forEach((card) => {
                    if (firstInHand) {
                        card.style.marginLeft = '0';
                        firstInHand = false;
                    } else if (card.previousElementSibling && card.previousElementSibling.classList.contains('card')) {
                        card.style.marginLeft = `-${Math.min(8, cardW * 0.12)}px`;
                    } else {
                        card.style.marginLeft = `${suitGap}px`;
                    }
                });
            }
        }
    }

    static adjustCardBackOverlap(wrapper, handElement) {
        const backs = wrapper.querySelectorAll('.card-back');
        if (backs.length <= 1) return;
        const availWidth = handElement.offsetWidth || handElement.getBoundingClientRect().width;
        if (availWidth === 0) return;
        const backW = backs[0].offsetWidth;
        const maxOverlap = Math.floor(backW * 0.7);
        const totalNeeded = backW * backs.length;
        if (totalNeeded > availWidth) {
            const idealOverlap = Math.ceil((totalNeeded - availWidth) / (backs.length - 1));
            const overlap = Math.min(idealOverlap, maxOverlap);
            backs.forEach((back, i) => {
                if (i > 0) back.style.marginLeft = `-${overlap}px`;
            });
        } else {
            const defaultOverlap = Math.min(40, backW * 0.55);
            backs.forEach((back, i) => {
                if (i > 0) back.style.marginLeft = `-${defaultOverlap}px`;
            });
        }
    }

    static adjustCardBackVerticalOverlap(wrapper, handElement) {
        const backs = wrapper.querySelectorAll('.card-back');
        if (backs.length <= 1) return;
        const availHeight = handElement.offsetHeight || handElement.getBoundingClientRect().height || 300;
        const backH = backs[0].offsetHeight;
        if (backH === 0 || availHeight === 0) return;

        // Default: 70% overlap (show 30% per card)
        const defaultVisible = Math.floor(backH * 0.3);
        // Calculate max visible per card that fits in available height
        const maxVisible = Math.floor((availHeight - backH) / Math.max(1, backs.length - 1));
        // Use whichever is smaller, but at least 4px visible per card
        const visiblePerCard = Math.max(4, Math.min(defaultVisible, maxVisible));
        const overlap = backH - visiblePerCard;

        backs.forEach((back, i) => {
            back.style.marginTop = i === 0 ? '0' : `-${overlap}px`;
        });
    }

    suitHtml(symbol, cards, red) {
        let html = '<div class="suit">'
        if (red) {
            html += '<span class="red">'
        } else {
            html += '<span>'
        }
        html += symbol
        html += '</span>\n' // end of symbol

        for (const element of cards) {
            html = html + '<span class="card-ew">' + element + '</span>\n'
        }

        html += '</div>'
        return html
    }

}

function parseHand(pbnString) {
    let suits = pbnString.split('.')
    let cards = []
    let suitSymbols = 'SHDC'

    for (let i = 0; i < suits.length; i++) {
        for (const element of suits[i]) {
            cards.push(new Card(suitSymbols[i] + element))
        }
    }

    return cards
}

class Contract {
    // TODO: implement
    constructor() {

    }

    level() {

    }

    trumpSuit() {

    }

    isNoTrump() {

    }

    isDoubled() {

    }

    isRedoubled() {

    }
}


class Trick {

    constructor(leadPlayer, cards) {
        this.leadPlayer = leadPlayer
        this.cards = cards
    }

    isComplete() {
        return this.cards.length == 4
    }

    winner(strain) {
        if (this.isComplete()) {
            let trump = strain - 1

            let trumpPlayed = false
            if (trump >= 0) {
                for (const element of this.cards) {
                    if (element.suit == trump) {
                        trumpPlayed = true
                        break
                    }
                }
            }

            let bestValue = 100
            let bestIndex = -1

            if (trumpPlayed) {
                for (let i = 0; i < this.cards.length; i++) {
                    if (this.cards[i].suit != trump) {
                        continue
                    }
                    if (this.cards[i].value < bestValue) {
                        bestValue = this.cards[i].value
                        bestIndex = i
                    }
                }
            } else {
                let ledSuit = this.cards[0].suit
                for (let i = 0; i < this.cards.length; i++) {
                    if (this.cards[i].suit != ledSuit) {
                        continue
                    }
                    if (this.cards[i].value < bestValue) {
                        bestValue = this.cards[i].value
                        bestIndex = i
                    }
                }
            }

            return (this.leadPlayer + bestIndex) % 4
        }
    }

    render(slotElements) {
        slotElements.forEach(el => {
            el.textContent = '';
            el.style.visibility  = 'visible';
        });
        for (let i = this.leadPlayer, j = 0; j < this.cards.length; i = (i + 1) % 4, j++) {
            this.cards[j].render(slotElements[i])
        }
    }

}

class Deal {

    constructor(dealer, vuln, hands, board_no) {
        this.dealer = dealer
        this.vuln = vuln
        this.hands = []
        for (let i = 0; i < 4; i++) {
            this.hands[i] = new Hand([], false, false)
            if (hands[i] != "") {
                this.hands[i].cards = parseHand(hands[i])
            }
        }
        this.tricksCount = [0, 0]

        this.turn = this.dealer
        this.auction = []
        this.tricks = []
        this.currentTrick = undefined

        this.expectCardInput = false
        this.expectTrickConfirm = false
        this.expectBidInput = false

        this.canDouble = false
        this.canRedouble = false
        this.board_no = board_no 
    }

    renderNumber(element) {
        element.textContent = ''
        element.innerHTML = this.board_no
    }

    renderTricks(element) {
        element.textContent = ''
        element.innerHTML = 'Tricks NS:' + this.tricksCount[0] + ' EW:' + this.tricksCount[1]
    }

    renderAuction(element) {

        let auction = new Auction(this.dealer, this.vuln, this.auction)

        auction.render(element)
    }

    renderClaim(element) {
        element.textContent = ''
        let html = ''
        //if ((this.tricksCount[0] + this.tricksCount[1]) > 0) {
        for (let i = 0; i < 14 - (this.tricksCount[0] + this.tricksCount[1]); i++) {
            html += '<div tricks="' + i + '">'+i+'</div>'
        }
        //}
        element.innerHTML = html
    }

    renderBiddingBox(element) {
        element.textContent = ''

        let auct = new Auction(this.dealer, this.vuln, this.auction)

        let html = ''
        html += '<div id="bidding-box">'
        html += '<div id="bidding-levels">'
        let minBiddableLevel = auct.getMinimumBiddableLevel()
        for (let i = 1; i <= 7; i++) {
            if (i < minBiddableLevel) {
                html += '<div class="invalid">' + i + '</div>'
            } else {
                html += '<div>' + i + '</div>'
            }
        }
        html += '</div>'

        html += '<div id="bidding-suits" class="hidden">'
        html += '<div class="bid-clubs green" symbol="C">&clubs;</div>'
        html += '<div class="bid-diamonds orange" symbol="D">&diams;</div>'
        html += '<div class="bid-hearts red" symbol="H">&hearts;</div>'
        html += '<div class="bid-spades" symbol="S">&spades;</div>'
        html += '<div class="bid-nt" symbol="N">NT</div>'
        html += '</div>'

        html += '<div id="bidding-calls">'
        html += '<div class="pass">PASS</div>'
        if (this.canDouble) {
            html += '<div class="double">X</div>'
        } else {
            html += '<div class="double invalid">X</div>'
        }
        if (this.canRedouble) {
            html += '<div class="redouble">XX</div>'
        } else {
            html += '<div class="redouble invalid">XX</div>'
        }
        // html += '<div class="alert">Alert</div>'
        html += '<div class="hint">Hint</div>'
        html += '</div>'

        html += '</div>'

        element.innerHTML = html
    }
}

class Auction {

    constructor(dealer, vuln, bids) {
        this.dealer = dealer
        this.vuln = vuln
        this.bids = []

        for (const element of bids) {
            if (element != 'PAD_START') {
                this.bids.push(element)
            }
        }

        let nPad = [1, 2, 3, 0]
        this.paddedBids = []
        for (let i = 0; i < nPad[dealer]; i++) {
            this.paddedBids.push("")
        }

        for (const element of this.bids) {
            this.paddedBids.push(element)
        }
    }

    getMinimumBiddableLevel() {
        for (let i = this.bids.length - 1; i >= 0; i--) {
            let level = parseInt(this.bids[i][0])
            if (isNaN(level)) {
                continue
            }
            if (this.bids[i][1] == "N") {
                return level + 1
            }
            return level
        }
        return 1
    }

    getMinBiddableSuitForLevel(level) {
        for (let i = this.bids.length - 1; i >= 0; i--) {
            let lastBidLevel = parseInt(this.bids[i][0])
            if (isNaN(lastBidLevel)) {
                continue
            }
            if (lastBidLevel < level) {
                return 0
            }
            let suitIndex = 'CDHSN'.indexOf(this.bids[i][1])
            return suitIndex + 1
        }

        return 0
    }

    canDouble() {
        return false
    }

    canRedouble() {
        return false
    }

    render(element) {
        element.innerHTML = ""

        let html = '<div id="auction">'
        html += '<table>'
        html += '<thead>'
        if (this.vuln[1]) {
            html += '<th class="red">West</th>'
        } else {
            html += '<th>West</th>'
        }
        if (this.vuln[0]) {
            html += '<th class="red">North</th>'
        } else {
            html += '<th>North</th>'
        }
        if (this.vuln[1]) {
            html += '<th class="red">East</th>'
        } else {
            html += '<th>East</th>'
        }
        if (this.vuln[0]) {
            html += '<th class="red">South</th>'
        } else {
            html += '<th>South</th>'
        }
        html += '</thead>'
        html += '<tbody>'

        for (let i = 0; i < this.paddedBids.length; i++) {
            if (i % 4 == 0) {
                html += '<tr>'
            }

            html += '<td>' + this.formatBid(this.paddedBids[i]) + '</td>'

            if (i % 4 == 3) {
                html += '</tr>\n'
            }
        }

        html += '</tbody>'
        html += '</table>'
        html += '</div>'

        element.innerHTML = html
    }

    formatBid(bid) {
        let calls = {
            '': '',
            'PASS': 'P',
            'X': 'X',
            'XX': 'XX'
        }

        if (bid in calls) {
            return calls[bid]
        }

        let level = bid[0]
        let symbol = bid[1]

        let symbolFormat = {
            'N': 'NT',
            'S': '<span>&spades;</span>',
            'H': '<span class="red">&hearts;</span>',
            'D': '<span class="orange">&diams;</span>',
            'C': '<span class="green">&clubs;</span>'
        }

        return level + symbolFormat[symbol]
    }

}
