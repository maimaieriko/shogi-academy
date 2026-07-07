/* board.js — interactive shogi board component.
   Renders a 9x9 board + both hand trays, handles touch & mouse input,
   legal-move highlighting, drops, the promotion dialog, hint highlights,
   an animated hint arrow, last-move / check indicators, and themes.

   Usage (from main.js):
     const board = new ShogiBoard(containerEl);
     board.setState(state, { interactive:true, playerOwner:0, onMove(move){...} });
     board.highlightHint({piece:[r,c], hand:'G', dests:[[r,c],...]});
     board.showArrow([fr,fc] | {hand:'G'}, [tr,tc]);
     board.clearHints(); board.setLastMove(move); board.flashCheck();
     board.setTheme('wood','classic'); board.lock(); board.unlock();
*/
class ShogiBoard {
  constructor(container){
    this.container = container;
    this.state = null;
    this.opts = { interactive:false, playerOwner:0, onMove:null };
    this.legal = [];
    this.sel = null;        // {type:'sq', r, c} | {type:'hand', t}
    this.locked = false;
    this.lastMove = null;
    this._buildDOM();
    ShogiBoard._ensurePromoModal();
  }

  /* iOS Safari では指のわずかなブレで click が発火しないことがあるため、
     pointerup を主イベントにし、click はフォールバック（重複ガード付き）。 */
  _bindTap(el, fn){
    let last = 0;
    const go = e => {
      const now = Date.now();
      if (now - last < 400) return;
      last = now;
      if (e.cancelable) e.preventDefault();
      fn();
    };
    if (window.PointerEvent) el.addEventListener('pointerup', go);
    else el.addEventListener('touchend', go, { passive:false });
    el.addEventListener('click', go);
  }

  /* ---------- DOM construction ---------- */
  _buildDOM(){
    const c = this.container;
    c.classList.add('sg-wrap');
    c.innerHTML = '';

    this.handGoteEl = document.createElement('div');
    this.handGoteEl.className = 'sg-hand sg-hand-gote';
    c.appendChild(this.handGoteEl);

    const frame = document.createElement('div');
    frame.className = 'sg-frame';
    c.appendChild(frame);

    // file labels (9..1 left to right, sente's view)
    const files = document.createElement('div');
    files.className = 'sg-files';
    for (let i=9;i>=1;i--){
      const s = document.createElement('span'); s.textContent = i; files.appendChild(s);
    }
    frame.appendChild(files);

    const inner = document.createElement('div');
    inner.className = 'sg-inner';
    frame.appendChild(inner);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'sg-grid';
    inner.appendChild(this.gridEl);

    this.cells = [];
    for (let r=0;r<9;r++){
      this.cells.push([]);
      for (let col=0;col<9;col++){
        const sq = document.createElement('button');
        sq.type = 'button';
        sq.className = 'sg-sq';
        sq.dataset.r = r; sq.dataset.c = col;
        this._bindTap(sq, () => this._tapSquare(r, col));
        this.gridEl.appendChild(sq);
        this.cells[r].push(sq);
      }
    }

    // rank labels（一〜九, right side)
    const ranks = document.createElement('div');
    ranks.className = 'sg-ranks';
    const KAN = ['一','二','三','四','五','六','七','八','九'];
    for (let i=0;i<9;i++){
      const s = document.createElement('span'); s.textContent = KAN[i]; ranks.appendChild(s);
    }
    inner.appendChild(ranks);

    // hint arrow overlay
    this.svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    this.svg.setAttribute('class','sg-arrow-layer');
    this.svg.setAttribute('viewBox','0 0 9 9');
    this.svg.setAttribute('preserveAspectRatio','none');
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    defs.innerHTML = '<marker id="sg-arrowhead" markerWidth="4" markerHeight="4" refX="2.6" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 Z" fill="currentColor"/></marker>';
    this.svg.appendChild(defs);
    this.arrowLine = document.createElementNS('http://www.w3.org/2000/svg','line');
    this.arrowLine.setAttribute('class','sg-arrow');
    this.arrowLine.setAttribute('marker-end','url(#sg-arrowhead)');
    this.arrowLine.style.display = 'none';
    this.svg.appendChild(this.arrowLine);
    this.gridEl.appendChild(this.svg);

    this.handSenteEl = document.createElement('div');
    this.handSenteEl.className = 'sg-hand sg-hand-sente';
    c.appendChild(this.handSenteEl);
  }

  static _ensurePromoModal(){
    if (document.getElementById('sg-promo')) return;
    const m = document.createElement('div');
    m.id = 'sg-promo';
    m.className = 'modal-backdrop hidden';
    m.innerHTML =
      '<div class="modal-card sg-promo-card">' +
        '<div class="sg-promo-title"></div>' +
        '<div class="sg-promo-btns">' +
          '<button type="button" class="btn btn-primary" id="sg-promo-yes"></button>' +
          '<button type="button" class="btn" id="sg-promo-no"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
  }

  _askPromote(){
    return new Promise(resolve => {
      const m = document.getElementById('sg-promo');
      m.querySelector('.sg-promo-title').textContent = t('promoteAsk');
      const yes = document.getElementById('sg-promo-yes');
      const no  = document.getElementById('sg-promo-no');
      yes.textContent = t('promoteYes');
      no.textContent  = t('promoteNo');
      m.classList.remove('hidden');
      const done = v => {
        m.classList.add('hidden');
        yes.onclick = no.onclick = null;
        resolve(v);
      };
      yes.onclick = ()=>{ Sound.sfx('promote'); done(true); };
      no.onclick  = ()=> done(false);
    });
  }

  /* ---------- state & rendering ---------- */
  setState(state, opts){
    this.state = state;
    if (opts) this.opts = Object.assign({ interactive:false, playerOwner:0, onMove:null }, opts);
    this.legal = state ? Rules.legalMoves(state) : [];
    this.sel = null;
    this.render();
  }

  refreshLegal(){ this.legal = this.state ? Rules.legalMoves(this.state) : []; }

  setTheme(boardTheme, pieceTheme){
    const themes = ['wood','sakura','night','crystal','autumn','festival'];
    const pthemes = ['classic','sakura','crystal','ink'];
    for (const th of themes) this.container.classList.remove('bt-'+th);
    for (const th of pthemes) this.container.classList.remove('pt-'+th);
    this.container.classList.add('bt-'+(themes.includes(boardTheme)?boardTheme:'wood'));
    this.container.classList.add('pt-'+(pthemes.includes(pieceTheme)?pieceTheme:'classic'));
  }

  render(){
    if (!this.state) return;
    const s = this.state;
    for (let r=0;r<9;r++) for (let c=0;c<9;c++){
      const sq = this.cells[r][c];
      const cell = s.b[r][c];
      sq.className = 'sg-sq';
      sq.innerHTML = '';
      if (cell){
        const pc = document.createElement('span');
        pc.className = 'sg-pc ' + (cell.o===0 ? 'sente' : 'gote') + (cell.p ? ' promoted' : '');
        pc.textContent = Rules.kanji(cell);
        sq.appendChild(pc);
      }
    }
    this._renderHands();
    this._applyLastMove();
    this._applyCheck();
    this._applySelection();
  }

  _renderHands(){
    const s = this.state;
    const mk = (owner, el, label) => {
      el.innerHTML = '';
      const lab = document.createElement('span');
      lab.className = 'sg-hand-label';
      lab.textContent = label;
      el.appendChild(lab);
      let any = false;
      for (const tp of ['R','B','G','S','N','L','P']){
        const n = s.hands[owner][tp];
        if (n <= 0) continue;
        any = true;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'sg-chip' + (owner===1 ? ' gote' : '');
        chip.dataset.t = tp;
        chip.innerHTML = '<span class="sg-chip-k">' + Rules.KANJI[tp] + '</span>' +
                         (n>1 ? '<span class="sg-chip-n">' + n + '</span>' : '');
        if (owner === this.opts.playerOwner){
          this._bindTap(chip, () => this._tapHand(tp));
        }
        el.appendChild(chip);
      }
      if (!any){
        const none = document.createElement('span');
        none.className = 'sg-hand-none';
        none.textContent = 'なし';
        el.appendChild(none);
      }
    };
    mk(1, this.handGoteEl, t('handFoe'));
    mk(0, this.handSenteEl, t('handYou'));
  }

  _applyLastMove(){
    if (!this.lastMove) return;
    const m = this.lastMove;
    if (!m.drop && m.fr!==undefined) this.cells[m.fr][m.fc].classList.add('last-from');
    this.cells[m.tr][m.tc].classList.add('last');
  }

  _applyCheck(){
    const s = this.state;
    for (const o of [0,1]){
      if (Rules.inCheck(s, o)){
        const k = Rules.findKing(s, o);
        if (k) this.cells[k[0]][k[1]].classList.add('check');
      }
    }
  }

  _applySelection(){
    if (!this.sel) return;
    if (this.sel.type === 'sq'){
      this.cells[this.sel.r][this.sel.c].classList.add('sel');
      for (const m of this._movesFromSel()){
        this.cells[m.tr][m.tc].classList.add('dest');
      }
    } else {
      const chip = this.handSenteEl.querySelector('.sg-chip[data-t="' + this.sel.t + '"]');
      if (chip) chip.classList.add('sel');
      for (const m of this._movesFromSel()){
        this.cells[m.tr][m.tc].classList.add('dest');
      }
    }
  }

  _movesFromSel(){
    if (!this.sel) return [];
    if (this.sel.type === 'sq'){
      return this.legal.filter(m => !m.drop && m.fr===this.sel.r && m.fc===this.sel.c);
    }
    return this.legal.filter(m => m.drop === this.sel.t);
  }

  /* ---------- input ---------- */
  _canAct(){
    return this.opts.interactive && !this.locked && this.state &&
           this.state.turn === this.opts.playerOwner;
  }

  _tapSquare(r, c){
    if (!this._canAct()) return;
    const cell = this.state.b[r][c];

    if (this.sel){
      const candidates = this._movesFromSel().filter(m => m.tr===r && m.tc===c);
      if (candidates.length){
        this._commit(candidates);
        return;
      }
      // tapping own other piece switches selection; anything else clears
      this.sel = null;
      this.render();
      if (cell && cell.o === this.opts.playerOwner) this._selectSquare(r, c);
      return;
    }
    if (cell && cell.o === this.opts.playerOwner) this._selectSquare(r, c);
  }

  _selectSquare(r, c){
    const has = this.legal.some(m => !m.drop && m.fr===r && m.fc===c);
    this.sel = { type:'sq', r, c };
    this.render();
    if (!has){ /* piece with no legal moves stays selectable but shows no dests */ }
  }

  _tapHand(tp){
    if (!this._canAct()) return;
    if (this.sel && this.sel.type==='hand' && this.sel.t===tp){
      this.sel = null; this.render(); return;
    }
    this.sel = { type:'hand', t: tp };
    this.render();
  }

  async _commit(candidates){
    let move;
    if (candidates.length === 1){
      move = candidates[0];
    } else {
      // both promote / no-promote available → ask the player
      const yes = await this._askPromote();
      move = candidates.find(m => !!m.promote === yes) || candidates[0];
    }
    this.sel = null;
    if (this.opts.onMove) this.opts.onMove(move);
  }

  lock(){ this.locked = true; }
  unlock(){ this.locked = false; }

  setLastMove(m){ this.lastMove = m || null; }

  flashCheck(){
    const s = this.state;
    const k = Rules.findKing(s, s.turn);
    if (!k) return;
    const el = this.cells[k[0]][k[1]];
    el.classList.add('check-flash');
    setTimeout(()=>el.classList.remove('check-flash'), 900);
  }

  pulseSquare(r, c){
    const el = this.cells[r][c];
    el.classList.add('pulse');
    setTimeout(()=>el.classList.remove('pulse'), 800);
  }

  /* ---------- hints ---------- */
  highlightHint(h){
    this.clearHints(false);
    if (!h) return;
    if (h.piece){
      const [r,c] = h.piece;
      this.cells[r][c].classList.add('hint-piece');
    }
    if (h.hand){
      const chip = this.handSenteEl.querySelector('.sg-chip[data-t="' + h.hand + '"]');
      if (chip) chip.classList.add('hint-piece');
    }
    if (h.dests){
      for (const [r,c] of h.dests) this.cells[r][c].classList.add('hint-dest');
    }
  }

  showArrow(from, to){
    let x1, y1;
    const x2 = to[1] + 0.5, y2 = to[0] + 0.5;
    if (Array.isArray(from)){
      x1 = from[1] + 0.5; y1 = from[0] + 0.5;
    } else {
      // from hand: start just below the board, pointing to the drop square
      x1 = x2; y1 = 8.9;
      if (Math.abs(y2 - y1) < 0.6) y1 = y2 + 1.2;
    }
    this.arrowLine.setAttribute('x1', x1);
    this.arrowLine.setAttribute('y1', y1);
    this.arrowLine.setAttribute('x2', x2);
    this.arrowLine.setAttribute('y2', y2);
    this.arrowLine.style.display = '';
  }

  clearHints(clearArrow = true){
    this.gridEl.querySelectorAll('.hint-piece,.hint-dest').forEach(el=>{
      el.classList.remove('hint-piece','hint-dest');
    });
    this.handSenteEl.querySelectorAll('.hint-piece').forEach(el=>el.classList.remove('hint-piece'));
    if (clearArrow) this.arrowLine.style.display = 'none';
  }
}
