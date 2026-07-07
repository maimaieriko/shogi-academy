/* puzzles.js — puzzle database + validation + answer evaluation.
   Every puzzle is verified by the rules engine at load time; any puzzle
   that fails verification is excluded, so broken puzzles can never appear. */
const Puzzles = (() => {
  const P = Rules.pos;

  /* accept spec kinds:
     mate1   — any move that checkmates
     mate3   — stored solution move, then any mating move (3 plies)
     target  — move the src piece to target square
     capture — capture the piece on target square
     exact   — one exact move  / exactSet — list of exact moves
     anyLegal— any legal move counts (escape/defense lessons)
     pieceType — any move of given piece type
     dropLine — drop given type on column col at row >= minRow */

  const defs = [];
  let idc = 0;
  function add(cat, diff, tokens, sHand, gHand, accept, hint, ja, en, concept){
    defs.push({ id:'', cat, diff, tokens, sHand:sHand||'', gHand:gHand||'',
      accept, hint: hint||{}, ja, en, concept: concept||'' });
  }

  /* ============ MOVEMENT LESSONS (how each piece moves) ============ */
  const MV = [
    ['P', 'P44', [3,4], '歩は前に1マスだけ進めるよ。', 'The pawn moves one square straight forward.'],
    ['L', 'L64', [3,4], '香車はまっすぐ前へ、何マスでも走れる！', 'The lance slides any distance straight forward.'],
    ['N', 'N44', [2,3], '桂馬はななめ前へジャンプ！駒を飛びこえられる唯一の駒だよ。', 'The knight jumps two forward and one sideways — the only piece that can leap!'],
    ['S', 'S44', [3,3], '銀は前とななめに進めるよ。横と真後ろには行けないんだ。', 'The silver moves forward and diagonally, but never sideways or straight back.'],
    ['G', 'G44', [3,4], '金は前・ななめ前・横・後ろに1マス。ななめ後ろだけ行けないよ。', 'The gold moves one square any direction except diagonally backward.'],
    ['K', 'K44', [4,5], '王様はどの方向にも1マス動けるよ。', 'The king moves one square in any direction.'],
    ['B', 'B44', [1,1], '角はななめに何マスでも走れる！', 'The bishop slides any distance diagonally.'],
    ['R', 'R44', [4,0], '飛車はたて・よこに何マスでも走れる！最強の駒のひとつだよ。', 'The rook slides any distance vertically or horizontally.'],
    ['+P','+P44',[4,3], '「と金」は金と同じ動きになるよ。歩が成るとパワーアップ！', 'A promoted pawn (tokin) moves exactly like a gold!'],
    ['+S','+S44',[4,5], '成銀も金と同じ動きだよ。', 'A promoted silver moves like a gold.'],
    ['+N','+N44',[3,3], '成桂も金と同じ動き。ジャンプはできなくなるよ。', 'A promoted knight moves like a gold (no more jumping).'],
    ['+L','+L44',[4,5], '成香も金と同じ動きだよ。', 'A promoted lance moves like a gold.'],
    ['+R','+R44',[3,3], '龍は飛車の動きに、ななめ1マスが加わるよ。最強！', 'The dragon moves like a rook plus one square diagonally. The strongest piece!'],
    ['+B','+B44',[3,4], '馬は角の動きに、たて・よこ1マスが加わるよ。', 'The horse moves like a bishop plus one square orthogonally.'],
  ];
  for (const [name, tok, tgt, ja, en] of MV){
    add('move', 1, tok, '', '', {kind:'target', src:[+tok.slice(-2)[0], +tok.slice(-1)], target:tgt},
      {piece:[+tok.slice(-2)[0], +tok.slice(-1)], dests:[tgt]},
      ja + ' ★のマスへ動かそう！', en + ' Move it to the ★ square!', 'movement');
  }

  /* ============ CAPTURE LESSONS ============ */
  const CP = [
    ['R44 p47', [4,4],[4,7], '飛車で歩を取ろう！取った駒は自分の持ち駒になるよ。', 'Capture the pawn with your rook! Captured pieces join your hand.'],
    ['B44 p11', [4,4],[1,1], '角のななめの力で歩をキャッチ！', 'Catch the pawn on the long diagonal!'],
    ['G44 p34', [4,4],[3,4], '金で前の歩を取ろう。', 'Take the pawn in front with your gold.'],
    ['S44 p33', [4,4],[3,3], '銀のななめ攻撃で歩を取ろう。', 'Use the silver\u2019s diagonal to capture the pawn.'],
    ['N44 p25', [4,4],[2,5], '桂馬ジャンプで歩を取ろう！', 'Jump with the knight and capture the pawn!'],
    ['L64 p34', [6,4],[3,4], '香車でまっすぐ突撃！', 'Charge straight ahead with the lance!'],
    ['P34 p24', [3,4],[2,4], '歩でも駒は取れるよ。前の歩をパクリ！', 'Even a pawn can capture! Take the enemy pawn.'],
    ['+R44 p55', [4,4],[5,5], '龍はななめ1マスにも動ける。歩を取ろう！', 'The dragon can step diagonally too. Capture the pawn!'],
    ['K44 p35', [4,4],[3,5], '王様も駒を取れるよ。でも危ないときはやめようね。', 'The king can capture too — but only when it\u2019s safe!'],
  ];
  for (const [tok, src, tgt, ja, en] of CP){
    add('capture', 1, tok, '', '', {kind:'capture', target:tgt},
      {piece:src, dests:[tgt]}, ja, en, 'capture');
  }

  /* ============ MATE IN 1 (verified by engine) ============ */
  const M1 = [
    ['k04 S23', 'G', 'まわりを金でぴったり包む「頭金」！銀が金を守っているから王様は取れないよ。',
      'The classic "gold on the head" mate! The silver guards the gold, so the king can\u2019t take it.', {piece:null, hand:'G', dests:[[1,4]]}],
    ['k08 +R12 S26', '', '龍を王様のとなりへ！銀が龍を守っているから逃げ場なし。',
      'Slide the dragon next to the king! The silver protects it — no escape.', {piece:[1,2], dests:[[1,7]]}],
    ['k04 +P24 R54', '', 'と金は金と同じ。飛車がうしろから支えているよ。',
      'The tokin works like a gold, backed up by your rook.', {piece:[2,4], dests:[[1,4]]}],
    ['k08 G28', 'S', '銀を打って、すみっこの王様をつかまえよう！',
      'Drop the silver and trap the king in the corner!', {piece:null, hand:'S', dests:[[1,7]]}],
    ['k00 p10 N32', 'R', '飛車を打てば、横一列がぜんぶ攻撃ライン！桂馬が逃げ道をふさいでいるよ。',
      'Drop the rook — the whole rank becomes an attack line! The knight blocks the escape.', {piece:null, hand:'R', dests:[[0,4],[0,3],[0,2]]}],
    ['k04 n13 n14 n15 l03 l05', 'N', '桂馬の王手は合駒ができない！ジャンプ攻撃で詰み。',
      'A knight check can\u2019t be blocked! Jump in for mate.', {piece:null, hand:'N', dests:[[2,5],[2,3]]}],
    ['k03 G23 R53', '', '金をすっと前へ。飛車のサポートで完璧な詰み！',
      'Push the gold forward — with rook support it\u2019s a perfect mate!', {piece:[2,3], dests:[[1,3]]}],
    ['k00 p10 p22 +B33 L41', '', '馬で歩を取りながら王手！香車が逃げ道を見張っているよ。',
      'Capture the pawn with your horse — check! The lance watches the escape route.', {piece:[3,3], dests:[[2,2]]}],
    ['k08 R13 G28', '', '飛車を成って龍に！横のラインで王様をつかまえよう。',
      'Promote your rook to a dragon and catch the king along the rank!', {piece:[1,3], dests:[[0,3],[1,8]]}],
  ];
  let m1diff = 1;
  for (const [tok, hand, ja, en, hint] of M1){
    add('mate1', Math.min(3, 1+Math.floor(m1diff/4)), tok, hand, '',
      {kind:'mate1'}, hint, ja, en, 'mate');
    m1diff++;
  }

  /* ============ MATE IN 3 (verified by tsume solver) ============ */
  const M3 = [
    ['k14 P34', 'GG', '金を打って王手→王様が逃げたら、もう一枚の金でフィニッシュ！',
      'Drop a gold — check! When the king runs, finish with the second gold!'],
    ['k13 P33', 'GG', '2枚の金の連続攻撃。1枚目はどこに打つ？',
      'A two-gold combination. Where does the first gold go?'],
    ['k15 P35', 'GG', '同じ形でも自分で読んでみよう。3手先までイメージ！',
      'Read it out yourself — picture all three moves!'],
    ['k12 P32', 'GG', '端に近い王様も、2枚の金でしっかり捕まえよう。',
      'Even near the edge, two golds can pin the king down.'],
  ];
  for (const [tok, hand, ja, en] of M3){
    add('mate3', 3, tok, hand, '', {kind:'mate3'}, {}, ja, en, 'mate');
  }

  /* ============ TACTICS (best move) ============ */
  add('best', 2, 'k04 r06', 'N', '',
    {kind:'exactSet', moves:[{drop:'N', tr:2, tc:5}]},
    {piece:null, hand:'N', dests:[[2,5]]},
    '桂馬を打つと…王様と飛車を同時に攻撃！これが「両取り（フォーク）」だよ。',
    'Drop the knight — it attacks the king AND the rook at once! This is a fork.', 'fork');
  add('best', 2, 'k04 g24 R84', 'P', '',
    {kind:'exactSet', moves:[{drop:'P', tr:3, tc:4}]},
    {piece:null, hand:'P', dests:[[3,4]]},
    '金は飛車のせいで横に動けない「ピン（釘づけ）」状態。歩を打って攻めよう！',
    'The gold is pinned by your rook — it can\u2019t leave the file. Attack it with a pawn!', 'pin');
  add('best', 2, 'k24 r04', 'L', '',
    {kind:'dropLine', drop:'L', col:4, minRow:4},
    {piece:null, hand:'L', dests:[[5,4],[6,4]]},
    '香車を打てば王手！王様がどいたら、うしろの飛車が取れる。「串刺し（スキュア）」だ！',
    'Drop the lance — check! When the king moves, the rook behind falls. A skewer!', 'skewer');
  add('best', 3, 'k04 g24 N44 L54', '', '',
    {kind:'exactSet', moves:[{fr:4,fc:4,tr:2,tc:3},{fr:4,fc:4,tr:2,tc:5}]},
    {piece:[4,4], dests:[[2,3],[2,5]]},
    '桂馬がどくと香車の道が開く！王手をかけながら金もねらう「開き攻撃」！',
    'When the knight jumps away, the lance\u2019s path opens! Check the king while eyeing the gold — a discovered attack!', 'discovered');

  /* ============ ESCAPE / DEFENSE ============ */
  add('escape', 1, 'K84 r44', '', '',
    {kind:'anyLegal'}, {piece:[8,4]},
    '王手だ！飛車のたてのラインから王様を逃がそう。',
    'Check! Move your king off the rook\u2019s file to safety.', 'defense');
  add('escape', 1, 'K80 b35', '', '',
    {kind:'anyLegal'}, {piece:[8,0]},
    '角のななめ攻撃！ラインの外へ逃げよう。',
    'The bishop attacks on the diagonal! Step off the line.', 'defense');
  add('escape', 2, 'K84 r04', 'G', '',
    {kind:'anyLegal'}, {piece:[8,4], hand:'G'},
    '逃げてもいいし、あいだに金を打つ「合駒」もできるよ！',
    'You can run — or drop your gold in between. That\u2019s called a blocking piece!', 'defense');

  /* ============ OPENING LESSONS (from the real starting position) ============ */
  add('opening', 1, 'INITIAL', '', '',
    {kind:'exact', move:{fr:6,fc:7,tr:5,tc:7}},
    {piece:[6,7], dests:[[5,7]]},
    '飛車の前の歩を突こう！飛車の力を前へ伸ばす第一歩だよ。',
    'Push the pawn in front of your rook — the first step to unleash its power!', 'opening');
  add('opening', 1, 'INITIAL', '', '',
    {kind:'exact', move:{fr:6,fc:2,tr:5,tc:2}},
    {piece:[6,2], dests:[[5,2]]},
    '角の道を開けよう！ななめのラインが盤のむこうまで通るよ。',
    'Open the bishop\u2019s diagonal! Its line now reaches across the board.', 'opening');
  add('opening', 1, 'INITIAL', '', '',
    {kind:'pieceType', piece:'K'},
    {piece:[8,4]},
    '王様を安全な場所へ動かし始めよう。「囲い」づくりの第一歩！',
    'Start moving your king toward safety — the first step of building a castle!', 'castle');
  add('opening', 1, 'INITIAL', '', '',
    {kind:'pieceType', piece:'G'},
    {piece:[8,5]},
    '金は王様のボディーガード。王様のそばに寄せていこう！',
    'Golds are the king\u2019s bodyguards. Bring one closer to the king!', 'castle');

  /* ============ VARIANT GENERATION (mirror & shift, engine re-verified) ============ */
  function mirrorTok(tokens){
    if (tokens==='INITIAL') return null;
    return tokens.trim().split(/\s+/).map(tk=>{
      const c = 8 - (+tk.slice(-1));
      return tk.slice(0, -1) + c;
    }).join(' ');
  }
  const mC = c => 8 - c;
  function mirrorAccept(a){
    const b = JSON.parse(JSON.stringify(a));
    if (b.target) b.target = [b.target[0], mC(b.target[1])];
    if (b.src) b.src = [b.src[0], mC(b.src[1])];
    if (b.move){ if (b.move.fc!==undefined){b.move.fc=mC(b.move.fc);} b.move.tc=mC(b.move.tc); }
    if (b.moves) b.moves = b.moves.map(m=>{ const n={...m}; if(n.fc!==undefined)n.fc=mC(n.fc); n.tc=mC(n.tc); return n; });
    if (b.col!==undefined) b.col = mC(b.col);
    return b;
  }
  function mirrorHint(h){
    const b = JSON.parse(JSON.stringify(h||{}));
    if (b.piece) b.piece = [b.piece[0], mC(b.piece[1])];
    if (b.dests) b.dests = b.dests.map(d=>[d[0], mC(d[1])]);
    return b;
  }
  function shiftTok(tokens, dc){
    if (tokens==='INITIAL') return null;
    let ok = true;
    const out = tokens.trim().split(/\s+/).map(tk=>{
      const c = (+tk.slice(-1)) + dc;
      if (c<0||c>8) ok = false;
      return tk.slice(0,-1)+c;
    }).join(' ');
    return ok ? out : null;
  }
  function shiftAccept(a, dc){
    const b = JSON.parse(JSON.stringify(a));
    const s = c => c + dc;
    if (b.target) b.target=[b.target[0], s(b.target[1])];
    if (b.src) b.src=[b.src[0], s(b.src[1])];
    if (b.move){ if(b.move.fc!==undefined)b.move.fc=s(b.move.fc); b.move.tc=s(b.move.tc); }
    if (b.moves) b.moves=b.moves.map(m=>{const n={...m}; if(n.fc!==undefined)n.fc=s(n.fc); n.tc=s(n.tc); return n;});
    if (b.col!==undefined) b.col=s(b.col);
    return b;
  }
  function shiftHint(h, dc){
    const b = JSON.parse(JSON.stringify(h||{}));
    if (b.piece) b.piece=[b.piece[0], b.piece[1]+dc];
    if (b.dests) b.dests=b.dests.map(d=>[d[0], d[1]+dc]);
    return b;
  }

  const baseCount = defs.length;
  for (let i=0;i<baseCount;i++){
    const d = defs[i];
    // mirror all board-based puzzles
    const mt = mirrorTok(d.tokens);
    if (mt && mt !== d.tokens){
      defs.push({...d, tokens:mt, accept:mirrorAccept(d.accept), hint:mirrorHint(d.hint)});
    }
    // shifted variants for lessons (extra practice at slightly higher difficulty)
    if (d.cat==='move' || d.cat==='capture'){
      for (const dc of [-2, 2]){
        const st = shiftTok(d.tokens, dc);
        if (st) defs.push({...d, diff:d.diff, tokens:st, accept:shiftAccept(d.accept, dc), hint:shiftHint(d.hint, dc)});
      }
    }
  }

  /* ============ BUILD + VALIDATE ============ */
  function makeState(d){
    if (d.tokens==='INITIAL') return Rules.initialState();
    return P(d.tokens, d.sHand, d.gHand, 0);
  }

  const list = [];
  const seen = new Set();
  let n = 0;
  for (const d of defs){
    const key = d.cat + '|' + d.tokens + '|' + d.sHand + '|' + JSON.stringify(d.accept);
    if (seen.has(key)) continue;
    seen.add(key);
    let s;
    try { s = makeState(d); } catch(e){ continue; }
    const legal = Rules.legalMoves(s);
    if (legal.length===0) continue;
    let ok = true, solution = null;
    if (Rules.inCheck(s, 1)) ok = false; // opponent must not already be in check
    if (d.cat!=='escape' && Rules.inCheck(s, 0)) ok = false;
    if (ok) switch (d.accept.kind){
      case 'mate1': ok = Rules.findAllMatesIn1(s).length>0; break;
      case 'mate3': {
        if (Rules.findAllMatesIn1(s).length>0){ ok=false; break; }
        solution = Rules.findMateIn3(s);
        ok = !!solution; break;
      }
      case 'target': ok = legal.some(m=>!m.drop && m.fr===d.accept.src[0] && m.fc===d.accept.src[1] && m.tr===d.accept.target[0] && m.tc===d.accept.target[1]); break;
      case 'capture': ok = !!s.b[d.accept.target[0]][d.accept.target[1]] && legal.some(m=>m.tr===d.accept.target[0] && m.tc===d.accept.target[1] && !m.drop); break;
      case 'exact': { const e=d.accept.move; ok = legal.some(m=> e.drop ? (m.drop===e.drop&&m.tr===e.tr&&m.tc===e.tc) : (!m.drop&&m.fr===e.fr&&m.fc===e.fc&&m.tr===e.tr&&m.tc===e.tc)); break; }
      case 'exactSet': ok = d.accept.moves.some(e=> legal.some(m=> e.drop ? (m.drop===e.drop&&m.tr===e.tr&&m.tc===e.tc) : (!m.drop&&m.fr===e.fr&&m.fc===e.fc&&m.tr===e.tr&&m.tc===e.tc))); break;
      case 'dropLine': ok = legal.some(m=> m.drop===d.accept.drop && m.tc===d.accept.col && m.tr>=d.accept.minRow); break;
      case 'pieceType': ok = legal.some(m=> !m.drop && s.b[m.fr][m.fc].t===d.accept.piece); break;
      case 'anyLegal': ok = d.cat!=='escape' || Rules.inCheck(s,0); break;
    }
    if (!ok){ console.warn('puzzle excluded by validator:', d.tokens, d.cat); continue; }
    n++;
    list.push({
      id: d.cat + '-' + n, cat: d.cat, diff: d.diff, tokens: d.tokens,
      sHand: d.sHand, gHand: d.gHand, accept: d.accept, hint: d.hint,
      ja: d.ja, en: d.en, concept: d.concept, solution,
      reward: { xp: 10 + d.diff*10, coins: 5 + d.diff*5 }
    });
  }

  function state(pz){ return makeState(pz); }

  function checkMove(pz, before, move, after){
    const a = pz.accept;
    switch (a.kind){
      case 'mate1': return Rules.isMate(after);
      case 'mate3': {
        if (Rules.isMate(after)) return true;
        const sol = pz.solution;
        if (!sol) return false;
        return sol.drop ? (move.drop===sol.drop && move.tr===sol.tr && move.tc===sol.tc)
                        : (!move.drop && move.fr===sol.fr && move.fc===sol.fc && move.tr===sol.tr && move.tc===sol.tc);
      }
      case 'target': return !move.drop && move.fr===a.src[0] && move.fc===a.src[1] && move.tr===a.target[0] && move.tc===a.target[1];
      case 'capture': return move.tr===a.target[0] && move.tc===a.target[1];
      case 'exact': { const e=a.move; return e.drop ? (move.drop===e.drop&&move.tr===e.tr&&move.tc===e.tc) : (!move.drop&&move.fr===e.fr&&move.fc===e.fc&&move.tr===e.tr&&move.tc===e.tc); }
      case 'exactSet': return a.moves.some(e=> e.drop ? (move.drop===e.drop&&move.tr===e.tr&&move.tc===e.tc) : (!move.drop&&move.fr===e.fr&&move.fc===e.fc&&move.tr===e.tr&&move.tc===e.tc));
      case 'dropLine': return move.drop===a.drop && move.tc===a.col && move.tr>=a.minRow;
      case 'pieceType': return !move.drop && before.b[move.fr][move.fc].t===a.piece;
      case 'anyLegal': return true;
    }
    return false;
  }

  const CATS = ['move','capture','escape','opening','best','mate1','mate3'];

  function byCat(cat){ return list.filter(p=>p.cat===cat); }
  function byId(id){ return list.find(p=>p.id===id); }

  // never repeat solved puzzles until all in category attempted
  function pick(cat, solvedMap, diffMax){
    let pool = byCat(cat);
    if (diffMax) pool = pool.filter(p=>p.diff<=diffMax);
    const fresh = pool.filter(p=>!solvedMap[p.id]);
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random()*from.length)];
  }

  function daily(dateStr, solvedMap){
    // deterministic per-day puzzle
    let h = 0;
    for (const ch of dateStr) h = (h*31 + ch.charCodeAt(0)) >>> 0;
    const pool = list.filter(p=>p.cat==='mate1'||p.cat==='best'||p.cat==='mate3');
    return pool[h % pool.length];
  }

  return { list, CATS, byCat, byId, pick, daily, state, checkMove };
})();
