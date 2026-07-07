/* rules.js — Authentic shogi rules engine.
   Board: 9x9 array, [row][col], row 0 = top (gote back rank).
   Owner 0 = sente (bottom, moves up / -row). Owner 1 = gote (top, moves down).
   Cell: null or {t:'K|R|B|G|S|N|L|P', o:0|1, p:bool promoted} */
const Rules = (() => {
  const TYPES = ['K','R','B','G','S','N','L','P'];
  const GOLD_STEPS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,0]];
  const STEPS = {
    K: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    G: GOLD_STEPS,
    S: [[-1,-1],[-1,0],[-1,1],[1,-1],[1,1]],
    N: [[-2,-1],[-2,1]],
    P: [[-1,0]],
    L: [], R: [], B: []
  };
  const SLIDES = {
    R: [[-1,0],[1,0],[0,-1],[0,1]],
    B: [[-1,-1],[-1,1],[1,-1],[1,1]],
    L: [[-1,0]],
    K:[],G:[],S:[],N:[],P:[]
  };
  const PROMOTABLE = {R:1,B:1,S:1,N:1,L:1,P:1};

  function vecs(cell){ // returns {steps, slides} in board coords for this piece
    let st, sl;
    if (cell.p){
      if (cell.t==='R'){ st = [[-1,-1],[-1,1],[1,-1],[1,1]]; sl = SLIDES.R; }
      else if (cell.t==='B'){ st = [[-1,0],[1,0],[0,-1],[0,1]]; sl = SLIDES.B; }
      else { st = GOLD_STEPS; sl = []; } // +S +N +L +P move like gold
    } else { st = STEPS[cell.t]; sl = SLIDES[cell.t]; }
    if (cell.o === 1){ // flip vertically for gote
      st = st.map(v=>[-v[0], v[1]]);
      sl = sl.map(v=>[-v[0], v[1]]);
    }
    return {st, sl};
  }

  function emptyHands(){ return [{K:0,R:0,B:0,G:0,S:0,N:0,L:0,P:0},{K:0,R:0,B:0,G:0,S:0,N:0,L:0,P:0}]; }

  function newState(){
    const b = Array.from({length:9},()=>Array(9).fill(null));
    return { b, hands: emptyHands(), turn: 0 };
  }

  function initialState(){
    const s = newState();
    const back = ['L','N','S','G','K','G','S','N','L'];
    for (let c=0;c<9;c++){
      s.b[0][c] = {t:back[c], o:1, p:false};
      s.b[8][c] = {t:back[c], o:0, p:false};
      s.b[2][c] = {t:'P', o:1, p:false};
      s.b[6][c] = {t:'P', o:0, p:false};
    }
    s.b[1][1] = {t:'R', o:1, p:false}; s.b[1][7] = {t:'B', o:1, p:false};
    s.b[7][1] = {t:'B', o:0, p:false}; s.b[7][7] = {t:'R', o:0, p:false};
    return s;
  }

  function clone(s){
    return {
      b: s.b.map(r=>r.map(c=>c?{t:c.t,o:c.o,p:c.p}:null)),
      hands: [Object.assign({},s.hands[0]), Object.assign({},s.hands[1])],
      turn: s.turn
    };
  }

  const inB = (r,c)=> r>=0 && r<9 && c>=0 && c<9;

  function pieceTargets(s, r, c){ // pseudo-legal destination squares for piece at r,c
    const cell = s.b[r][c], out = [];
    const {st, sl} = vecs(cell);
    for (const [dr,dc] of st){
      const nr=r+dr, nc=c+dc;
      if (inB(nr,nc) && (!s.b[nr][nc] || s.b[nr][nc].o!==cell.o)) out.push([nr,nc]);
    }
    for (const [dr,dc] of sl){
      let nr=r+dr, nc=c+dc;
      while (inB(nr,nc)){
        if (!s.b[nr][nc]) out.push([nr,nc]);
        else { if (s.b[nr][nc].o!==cell.o) out.push([nr,nc]); break; }
        nr+=dr; nc+=dc;
      }
    }
    return out;
  }

  function attacked(s, r, c, by){ // is square (r,c) attacked by owner `by`?
    for (let i=0;i<9;i++) for (let j=0;j<9;j++){
      const cell = s.b[i][j];
      if (!cell || cell.o!==by) continue;
      const {st, sl} = vecs(cell);
      for (const [dr,dc] of st) if (i+dr===r && j+dc===c) return true;
      for (const [dr,dc] of sl){
        let nr=i+dr, nc=j+dc;
        while (inB(nr,nc)){
          if (nr===r && nc===c) return true;
          if (s.b[nr][nc]) break;
          nr+=dr; nc+=dc;
        }
      }
    }
    return false;
  }

  function findKing(s, o){
    for (let r=0;r<9;r++) for (let c=0;c<9;c++){
      const cell=s.b[r][c];
      if (cell && cell.t==='K' && cell.o===o) return [r,c];
    }
    return null;
  }

  function inCheck(s, o){
    const k = findKing(s, o);
    if (!k) return false;
    return attacked(s, k[0], k[1], 1-o);
  }

  function promoZone(o, r){ return o===0 ? r<=2 : r>=6; }
  function lastRank(o, r){ return o===0 ? r===0 : r===8; }
  function lastTwo(o, r){ return o===0 ? r<=1 : r>=7; }

  function mustPromote(cell, tr){
    if (cell.p || !PROMOTABLE[cell.t]) return false;
    if ((cell.t==='P'||cell.t==='L') && lastRank(cell.o, tr)) return true;
    if (cell.t==='N' && lastTwo(cell.o, tr)) return true;
    return false;
  }
  function canPromote(cell, fr, tr){
    if (cell.p || !PROMOTABLE[cell.t]) return false;
    return promoZone(cell.o, fr) || promoZone(cell.o, tr);
  }

  function applyMove(s, m){ // mutates s; returns captured type or null
    let captured = null;
    if (m.drop){
      s.b[m.tr][m.tc] = {t:m.drop, o:s.turn, p:false};
      s.hands[s.turn][m.drop]--;
    } else {
      const cell = s.b[m.fr][m.fc];
      const tgt = s.b[m.tr][m.tc];
      if (tgt){ captured = tgt.t; s.hands[s.turn][tgt.t]++; }
      s.b[m.fr][m.fc] = null;
      s.b[m.tr][m.tc] = {t:cell.t, o:cell.o, p: cell.p || !!m.promote};
    }
    s.turn = 1 - s.turn;
    return captured;
  }

  function moveLeavesCheck(s, m){
    const t = clone(s); applyMove(t, m);
    return inCheck(t, s.turn);
  }

  function nifu(s, o, col){
    for (let r=0;r<9;r++){
      const cell = s.b[r][col];
      if (cell && cell.o===o && cell.t==='P' && !cell.p) return true;
    }
    return false;
  }

  function legalMoves(s, opts){ // opts: {noUchifuzumeCheck} for recursion safety
    const me = s.turn, out = [];
    for (let r=0;r<9;r++) for (let c=0;c<9;c++){
      const cell = s.b[r][c];
      if (!cell || cell.o!==me) continue;
      for (const [tr,tc] of pieceTargets(s,r,c)){
        const must = mustPromote(cell, tr);
        const can = canPromote(cell, r, tr);
        const variants = must ? [true] : (can ? [true,false] : [false]);
        for (const pr of variants){
          const m = {fr:r,fc:c,tr,tc,promote:pr};
          if (!moveLeavesCheck(s, m)) out.push(m);
        }
      }
    }
    // drops
    for (const t of ['R','B','G','S','N','L','P']){
      if (s.hands[me][t] <= 0) continue;
      for (let r=0;r<9;r++) for (let c=0;c<9;c++){
        if (s.b[r][c]) continue;
        if ((t==='P'||t==='L') && lastRank(me, r)) continue;
        if (t==='N' && lastTwo(me, r)) continue;
        if (t==='P' && nifu(s, me, c)) continue;
        const m = {drop:t, tr:r, tc:c};
        if (moveLeavesCheck(s, m)) continue;
        if (t==='P' && !opts?.noUchifuzumeCheck){ // pawn-drop-mate is illegal
          const t2 = clone(s); applyMove(t2, m);
          if (inCheck(t2, t2.turn) && legalMoves(t2, {noUchifuzumeCheck:true}).length===0) continue;
        }
        out.push(m);
      }
    }
    return out;
  }

  function isMate(s){ // side to move is checkmated
    return inCheck(s, s.turn) && legalMoves(s).length===0;
  }
  function noMoves(s){ return legalMoves(s).length===0; }

  function givesCheck(s, m){
    const t = clone(s); applyMove(t, m);
    return inCheck(t, t.turn);
  }

  function findAllMatesIn1(s){
    const out = [];
    for (const m of legalMoves(s)){
      const t = clone(s); applyMove(t, m);
      if (isMate(t)) out.push(m);
    }
    return out;
  }

  // tsume solver: forced mate in exactly 3 plies (check, any defense, mate)
  function findMateIn3(s){
    for (const m1 of legalMoves(s)){
      if (!givesCheck(s, m1)) continue; // tsume: every attacker move is check
      const s1 = clone(s); applyMove(s1, m1);
      if (isMate(s1)) continue; // that's mate-in-1, not what we want here
      const replies = legalMoves(s1);
      if (replies.length===0) continue;
      let allMated = true;
      for (const r of replies){
        const s2 = clone(s1); applyMove(s2, r);
        if (findAllMatesIn1(s2).length===0){ allMated = false; break; }
      }
      if (allMated) return m1;
    }
    return null;
  }

  function hash(s){ // simple position key for repetition
    let h = 't'+s.turn;
    for (let r=0;r<9;r++) for (let c=0;c<9;c++){
      const cell = s.b[r][c];
      h += cell ? (cell.o? cell.t.toLowerCase(): cell.t)+(cell.p?'+':'') : '.';
    }
    h += '|'+JSON.stringify(s.hands);
    return h;
  }

  /* Compact position builder for puzzles.
     tokens: "k04 +R12 S26 P34" — lowercase = gote, uppercase = sente,
     optional '+' prefix = promoted, then row digit, col digit.
     hands: strings like "G" / "GGP" for sente/gote. turn defaults 0. */
  function pos(tokens, senteHand, goteHand, turn){
    const s = newState();
    if (tokens) for (const tk of tokens.trim().split(/\s+/)){
      let i = 0, p = false;
      if (tk[i]==='+'){ p = true; i++; }
      const ch = tk[i]; i++;
      const r = +tk[i], c = +tk[i+1];
      const o = ch===ch.toLowerCase() ? 1 : 0;
      s.b[r][c] = {t: ch.toUpperCase(), o, p};
    }
    if (senteHand) for (const ch of senteHand.replace(/\s/g,'')) s.hands[0][ch]++;
    if (goteHand) for (const ch of goteHand.replace(/\s/g,'')) s.hands[1][ch]++;
    s.turn = turn || 0;
    return s;
  }

  const KANJI = {K:'王', K2:'玉', R:'飛', B:'角', G:'金', S:'銀', N:'桂', L:'香', P:'歩'};
  const KANJI_P = {R:'龍', B:'馬', S:'全', N:'圭', L:'杏', P:'と'};
  const KANJI_P_LONG = {R:'龍', B:'馬', S:'成銀', N:'成桂', L:'成香', P:'と'};
  function kanji(cell){
    if (cell.p && KANJI_P[cell.t]) return KANJI_P[cell.t];
    if (cell.t==='K') return cell.o===1 ? KANJI.K2 : KANJI.K;
    return KANJI[cell.t];
  }

  return { initialState, newState, clone, legalMoves, applyMove, inCheck, isMate, noMoves,
           givesCheck, findAllMatesIn1, findMateIn3, attacked, findKing, pieceTargets,
           canPromote, mustPromote, pos, hash, kanji, KANJI, KANJI_P_LONG, TYPES };
})();
