/* ai.js — heuristic shogi AI with 7 levels (fast on mobile). */
const AI = (() => {
  const VAL = {P:100,L:300,N:350,S:500,G:550,B:800,R:1000,K:20000};
  const PVAL = {P:600,L:600,N:600,S:600,B:1150,R:1300,K:20000,G:550};

  function evalState(s, me){
    let sc = 0;
    for (let r=0;r<9;r++) for (let c=0;c<9;c++){
      const cell = s.b[r][c];
      if (!cell) continue;
      let v = cell.p ? PVAL[cell.t] : VAL[cell.t];
      // small advance bonus for non-king pieces
      if (cell.t!=='K'){
        const adv = cell.o===0 ? (8-r) : r;
        v += adv * 2;
        // centralization
        v += (4 - Math.abs(4-c));
      }
      sc += (cell.o===me ? v : -v);
    }
    for (const t of ['R','B','G','S','N','L','P']){
      sc += s.hands[me][t] * VAL[t] * 0.95;
      sc -= s.hands[1-me][t] * VAL[t] * 0.95;
    }
    // king safety: friendly pieces adjacent to king
    for (const o of [0,1]){
      const k = Rules.findKing(s,o);
      if (!k) continue;
      let guard = 0;
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++){
        const r=k[0]+dr, c=k[1]+dc;
        if (r>=0&&r<9&&c>=0&&c<9 && s.b[r][c] && s.b[r][c].o===o) guard++;
      }
      sc += (o===me ? guard*12 : -guard*12);
    }
    return sc;
  }

  function orderedMoves(s, nearKingsOnly){
    let ms = Rules.legalMoves(s);
    if (nearKingsOnly){
      const k0 = Rules.findKing(s,0), k1 = Rules.findKing(s,1);
      ms = ms.filter(m=>{
        if (!m.drop) return true;
        const near = k => k && Math.max(Math.abs(m.tr-k[0]), Math.abs(m.tc-k[1])) <= 2;
        return near(k0) || near(k1);
      });
    }
    return ms.sort((a,b)=>{
      const cap = m => (!m.drop && s.b[m.tr][m.tc]) ? (s.b[m.tr][m.tc].p?PVAL:VAL)[s.b[m.tr][m.tc].t] : 0;
      return cap(b)-cap(a);
    });
  }

  function search(s, depth, alpha, beta, me, deadline){
    if (Date.now() > deadline) return {score: evalState(s, me), timeout:true};
    if (depth===0) return {score: evalState(s, me)};
    const ms = orderedMoves(s, depth < 2 ? false : true);
    if (ms.length===0){ // side to move has no moves: loses
      return {score: s.turn===me ? -50000+depth : 50000-depth};
    }
    let best = null;
    const maximizing = s.turn===me;
    let bestScore = maximizing ? -Infinity : Infinity;
    for (const m of ms){
      const t = Rules.clone(s); Rules.applyMove(t, m);
      const res = search(t, depth-1, alpha, beta, me, deadline);
      if (res.timeout) return {score:bestScore===-Infinity||bestScore===Infinity?evalState(s,me):bestScore, move:best, timeout:true};
      if (maximizing){
        if (res.score > bestScore){ bestScore = res.score; best = m; }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (res.score < bestScore){ bestScore = res.score; best = m; }
        beta = Math.min(beta, bestScore);
      }
      if (beta <= alpha) break;
    }
    return {score: bestScore, move: best};
  }

  const LEVELS = [
    {depth:0, noise:1,   time:100},   // 1 beginner: mostly random
    {depth:1, noise:0.5, time:300},   // 2 easy
    {depth:2, noise:0.15,time:600},   // 3 normal
    {depth:2, noise:0,   time:900},   // 4 strong
    {depth:3, noise:0,   time:1000},  // 5 expert
    {depth:3, noise:0,   time:1500},  // 6 master
    {depth:4, noise:0,   time:1900},  // 7 grandmaster (iterative, time-capped)
  ];

  function pickMove(s, level){
    const cfg = LEVELS[Math.max(0, Math.min(6, level-1))];
    const ms = Rules.legalMoves(s);
    if (ms.length===0) return null;
    // instant mate check at all levels >= 2
    if (level >= 2){
      for (const m of ms){
        const t = Rules.clone(s); Rules.applyMove(t, m);
        if (Rules.isMate(t)) return m;
      }
    }
    if (cfg.depth===0 || Math.random() < cfg.noise){
      // random-ish: prefer a safe capture sometimes
      const caps = ms.filter(m=>!m.drop && s.b[m.tr][m.tc]);
      if (caps.length && Math.random()<0.5) return caps[Math.floor(Math.random()*caps.length)];
      return ms[Math.floor(Math.random()*ms.length)];
    }
    const deadline = Date.now() + cfg.time;
    let best = ms[0];
    for (let d=1; d<=cfg.depth; d++){
      const res = search(s, d, -Infinity, Infinity, s.turn, deadline);
      if (res.move) best = res.move;
      if (res.timeout) break;
    }
    return best;
  }

  // async wrapper so UI stays responsive
  function think(s, level){
    return new Promise(resolve => setTimeout(()=>resolve(pickMove(Rules.clone(s), level)), 60));
  }

  return { think, pickMove, evalState };
})();
