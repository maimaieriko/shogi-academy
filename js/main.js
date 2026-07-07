/* main.js — Shogi Adventure Academy application.
   Screens, world exploration, quests, bosses, puzzles, vs-AI play,
   daily content, achievements, stats, parent dashboard, settings.
   Part 1: core state, helpers, navigation, title, home. */
const App = (() => {

  /* ================= state ================= */
  let S = Save.load();
  let board = null;                 // ShogiBoard instance (play screen)
  let currentScreen = 'title';
  let currentArea = null;
  let play = null;                  // active play session (puzzle / boss / vsai)

  /* ================= tiny helpers ================= */
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function h(tag, cls, html){
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const P = obj => I18N.pick(obj);
  function todayStr(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function dateOffset(days){
    const d = new Date(); d.setDate(d.getDate()+days);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function save(){ Save.saveSoon(S); }

  /* ================= level / rank ================= */
  function xpNeed(l){ return 50 + (l-1)*30; }           // xp to go from level l to l+1
  function levelInfo(){
    let xp = S.xp, l = 1;
    while (xp >= xpNeed(l) && l < 99){ xp -= xpNeed(l); l++; }
    return { level:l, into:xp, need:xpNeed(l) };
  }
  function rankName(level){
    const ranks = [
      [1,  {ja:'みならい', en:'Apprentice'}],
      [3,  {ja:'初級生', en:'Junior student'}],
      [6,  {ja:'中級生', en:'Student'}],
      [10, {ja:'上級生', en:'Senior student'}],
      [15, {ja:'師範代', en:'Assistant master'}],
      [20, {ja:'アカデミーマスター', en:'Academy master'}],
    ];
    let name = ranks[0][1];
    for (const [lv, nm] of ranks) if (level >= lv) name = nm;
    return P(name);
  }

  /* ================= rewards ================= */
  function gainXP(n, x, y){
    const before = levelInfo().level;
    S.xp += n;
    if (x !== undefined) FX.floatText(x, y, '+' + n + ' XP', '#3FB8A8');
    const after = levelInfo().level;
    if (after > before){
      Sound.sfx('levelup');
      FX.confetti(60);
      toast('⭐ ' + t('levelUp') + '  Lv.' + after);
      checkAchievements();
    }
    save();
  }
  function gainCoins(n, x, y){
    S.coins += n;
    Sound.sfx('coin');
    if (x !== undefined) FX.floatText(x, y, '+' + n + ' 🪙', '#E9A73B');
    save();
  }

  /* ================= toasts ================= */
  const toastQ = [];
  let toastBusy = false;
  function toast(msg){
    toastQ.push(msg);
    pumpToast();
  }
  function pumpToast(){
    if (toastBusy || !toastQ.length) return;
    toastBusy = true;
    const el = h('div', 'toast', esc(toastQ.shift()));
    $('#toast-root').appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=>{ el.remove(); toastBusy = false; pumpToast(); }, 350);
    }, 2200);
  }

  /* ================= modal ================= */
  function modal(html, opts){
    const back = h('div', 'modal-backdrop');
    const card = h('div', 'modal-card' + (opts && opts.cls ? ' ' + opts.cls : ''), html);
    back.appendChild(card);
    $('#modal-root').appendChild(back);
    if (!opts || !opts.sticky){
      back.addEventListener('click', e => { if (e.target === back) close(); });
    }
    function close(){ back.remove(); if (opts && opts.onClose) opts.onClose(); }
    return { el: card, back, close };
  }
  function confirmModal(msg, onYes){
    const m = modal(
      '<div class="modal-title">' + esc(msg) + '</div>' +
      '<div class="row gap">' +
        '<button class="btn btn-danger" id="cf-yes">' + t('yes') + '</button>' +
        '<button class="btn" id="cf-no">' + t('no') + '</button>' +
      '</div>', { sticky:true });
    m.el.querySelector('#cf-yes').onclick = () => { m.close(); onYes(); };
    m.el.querySelector('#cf-no').onclick = () => m.close();
  }

  /* ================= screens ================= */
  const SCREENS = ['title','home','training','area','play','collection','stats','settings'];
  function show(id){
    currentScreen = id;
    for (const s of SCREENS){
      $('#scr-' + s).classList.toggle('hidden', s !== id);
    }
    $('#nav').classList.toggle('hidden', id === 'title' || id === 'play' || id === 'area');
    $$('#nav .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.go === id));
  }

  function goHome(){ renderHome(); show('home'); Sound.playMusic('title'); }

  /* ================= title & onboarding ================= */
  const AVATARS = ['🧒','👧','🧑','👦','🦊','🐰','🐱','🤖'];
  const HATS = [
    { id:'',   emoji:'', price:0,   name:{ja:'なし', en:'None'} },
    { id:'cap',emoji:'🧢', price:60,  name:{ja:'キャップ', en:'Cap'} },
    { id:'top',emoji:'🎩', price:80,  name:{ja:'シルクハット', en:'Top hat'} },
    { id:'rib',emoji:'🎀', price:80,  name:{ja:'リボン', en:'Ribbon'} },
    { id:'flw',emoji:'🌸', price:100, name:{ja:'花かざり', en:'Flower'} },
    { id:'crn',emoji:'👑', price:0,   name:{ja:'王冠', en:'Crown'}, needsBoss:'headmaster' },
  ];
  function hatEmoji(id){ const hh = HATS.find(x=>x.id===id); return hh ? hh.emoji : ''; }
  function avatarHTML(cls){
    return '<span class="avatar ' + (cls||'') + '">' + S.avatar +
           (S.hat ? '<span class="avatar-hat">' + hatEmoji(S.hat) + '</span>' : '') + '</span>';
  }

  function renderTitle(){
    const el = $('#scr-title');
    el.innerHTML =
      '<div class="title-inner">' +
        '<div class="title-board">' +
          '<span class="tp t1">歩</span><span class="tp t2">金</span><span class="tp t3">飛</span>' +
          '<span class="tp t4">角</span><span class="tp t5">王</span>' +
        '</div>' +
        '<h1 class="game-title">' + t('title') + '</h1>' +
        '<p class="game-sub">' + t('subtitle') + '</p>' +
        '<button class="btn btn-primary btn-big" id="btn-start">' +
          (S.name ? t('continue_') : t('start')) + '</button>' +
      '</div>';
    $('#btn-start').onclick = () => {
      Sound.unlock();
      Sound.sfx('correct');
      if (!S.name) onboarding();
      else goHome();
    };
  }

  function onboarding(){
    const m = modal(
      '<div class="modal-title">' + t('nameAsk') + '</div>' +
      '<input id="ob-name" class="input" maxlength="10" placeholder="' + t('namePh') + '">' +
      '<div class="modal-title" style="margin-top:14px">' + t('avatarAsk') + '</div>' +
      '<div class="avatar-grid" id="ob-av">' +
        AVATARS.map((a,i)=>'<button class="av-btn' + (i===0?' sel':'') + '" data-a="' + a + '">' + a + '</button>').join('') +
      '</div>' +
      '<button class="btn btn-primary btn-big" id="ob-go" style="margin-top:14px">' + t('letsgo') + '</button>',
      { sticky:true });
    let av = AVATARS[0];
    m.el.querySelectorAll('.av-btn').forEach(b => b.onclick = () => {
      m.el.querySelectorAll('.av-btn').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      av = b.dataset.a;
    });
    m.el.querySelector('#ob-go').onclick = () => {
      const name = m.el.querySelector('#ob-name').value.trim() || (I18N.lang==='en'?'Player':'見習いさん');
      S.name = name; S.avatar = av;
      save();
      m.close();
      Sound.sfx('win');
      FX.confetti(80);
      goHome();
    };
  }

  /* ================= home ================= */
  function headerHTML(){
    const li = levelInfo();
    return '<header class="hud">' +
      '<div class="hud-id">' + avatarHTML('') +
        '<div class="hud-name"><b>' + esc(S.name) + '</b>' +
        '<span class="hud-rank">' + esc(rankName(li.level)) + '</span></div></div>' +
      '<div class="hud-right">' +
        '<div class="hud-stat">Lv.' + li.level +
          '<div class="bar"><i style="width:' + Math.round(li.into/li.need*100) + '%"></i></div></div>' +
        '<div class="hud-stat">🪙 ' + S.coins + '</div>' +
      '</div></header>';
  }

  function totalRestore(){
    let sum = 0, max = World.AREAS.length * 100;
    for (const a of World.AREAS) sum += (S.restored[a.id] || 0);
    return Math.round(sum / max * 100);
  }

  function weakestCat(){
    let worst = null, worstAcc = 2;
    for (const c of Puzzles.CATS){
      const st = S.stats.byCat[c];
      if (st && st.a >= 3){
        const acc = st.c / st.a;
        if (acc < worstAcc){ worstAcc = acc; worst = c; }
      }
    }
    if (worst) return worst;
    for (const c of Puzzles.CATS){
      const st = S.stats.byCat[c];
      if (!st || st.c === 0) return c;
    }
    return 'mate1';
  }

  function renderHome(){
    const el = $('#scr-home');
    const today = todayStr();
    const dailyPz = Puzzles.daily(today);
    const dailyDone = S.daily.puzzleDone === today;
    const rec = weakestCat();
    const total = totalRestore();

    let mapHTML = '';
    World.AREAS.forEach((a, i) => {
      const unlocked = S.areasUnlocked.includes(a.id);
      const restored = S.restored[a.id] || 0;
      mapHTML +=
        (i>0 ? '<div class="map-link' + (unlocked?' on':'') + '"></div>' : '') +
        '<button class="map-card' + (unlocked?'':' locked') + '" data-area="' + a.id + '">' +
          '<span class="map-emoji">' + a.emoji + '</span>' +
          '<span class="map-info"><b>' + esc(P(a.name)) + '</b>' +
            (unlocked
              ? '<span class="map-sub">' + t('restored') + ' ' + restored + '%</span>' +
                '<span class="bar mini"><i style="width:' + restored + '%"></i></span>'
              : '<span class="map-sub">🔒 ' + t('lockedHint') + '</span>') +
          '</span>' +
          (S.bossBeaten[a.boss.id] ? '<span class="map-clear">👑</span>' : '') +
        '</button>';
    });

    el.innerHTML = headerHTML() +
      '<div class="page">' +
        '<div class="card glow-card">' +
          '<div class="row spread"><b>🏫 ' + t('map') + '</b><span>' + t('restored') + ' ' + total + '%</span></div>' +
          '<div class="bar big"><i style="width:' + total + '%"></i></div>' +
        '</div>' +

        '<div class="card daily-card' + (dailyDone ? ' done' : '') + '" id="daily-card">' +
          '<div class="row spread">' +
            '<div><b>📅 ' + t('daily') + '</b>' +
              '<div class="small">' + esc(P({ja:t('cat_'+dailyPz.cat), en:t('cat_'+dailyPz.cat)})) + '</div></div>' +
            '<div class="daily-badge">' + (dailyDone ? '✅' : '▶') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card rec-card" id="rec-card">' +
          '<b>💡 ' + t('recommend') + '</b>' +
          '<div class="small">' + t('cat_' + rec) + ' — ' + t('recommendWhy') + '</div>' +
        '</div>' +

        '<div class="map">' + mapHTML + '</div>' +
      '</div>';

    $$('#scr-home .map-card').forEach(b => b.onclick = () => {
      const id = b.dataset.area;
      if (!S.areasUnlocked.includes(id)){
        Sound.sfx('wrong');
        toast('🔒 ' + t('lockedHint'));
        return;
      }
      Sound.sfx('door');
      enterArea(id);
    });
    $('#daily-card').onclick = () => {
      if (S.daily.puzzleDone === today){ toast('✅ ' + t('dailyDone')); return; }
      startPuzzle(dailyPz, { context:'daily' });
    };
    $('#rec-card').onclick = () => {
      const pz = Puzzles.pick(rec, S.solved);
      if (pz) startPuzzle(pz, { context:'free' });
    };

    maybeLoginBonus();
  }

  /* ================= login bonus ================= */
  const LOGIN_REWARDS = [
    {coins:20}, {coins:30}, {coins:40}, {xp:60}, {coins:60}, {coins:80}, {coins:150, xp:100}
  ];
  function maybeLoginBonus(){
    const today = todayStr();
    if (S.daily.lastLogin === today) return;
    const yesterday = dateOffset(-1);
    S.daily.loginStreak = (S.daily.lastLogin === yesterday) ? S.daily.loginStreak + 1 : 1;
    S.daily.lastLogin = today;
    save();
    const idx = (S.daily.loginStreak - 1) % 7;
    const rw = LOGIN_REWARDS[idx];
    const days = Array.from({length:7}, (_,i) =>
      '<span class="lg-day' + (i < ((S.daily.loginStreak-1)%7)+1 ? ' got' : '') + (i===idx?' now':'') + '">' + (i+1) + '</span>'
    ).join('');
    const m = modal(
      '<div class="modal-title">🎁 ' + t('loginBonus') + '</div>' +
      '<div class="small center">' + t('streakDays') + ' ' + S.daily.loginStreak + t('day') + '</div>' +
      '<div class="lg-days">' + days + '</div>' +
      '<div class="lg-reward">' +
        (rw.coins ? '🪙 +' + rw.coins + ' ' : '') + (rw.xp ? '⭐ +' + rw.xp + ' XP' : '') +
      '</div>' +
      '<button class="btn btn-primary btn-big" id="lg-claim">' + t('claim') + '</button>',
      { sticky:true });
    m.el.querySelector('#lg-claim').onclick = () => {
      if (rw.coins) gainCoins(rw.coins);
      if (rw.xp) gainXP(rw.xp);
      Sound.sfx('chest');
      FX.confetti(50);
      m.close();
      checkAchievements();
      renderHome();
    };
  }

  /* ================= area exploration ================= */
  function enterArea(id){
    currentArea = id;
    renderArea();
    show('area');
    Sound.playMusic(id);
  }

  function questState(qid){
    const q = S.quests[qid];
    if (!q) return { st:'new', n:0 };
    if (q.st === 'done') return { st:'done', n:0 };
    return { st:'active', n:q.n || 0 };
  }

  function renderArea(){
    const a = World.area(currentArea);
    const restored = S.restored[a.id] || 0;
    const el = $('#scr-area');
    const questsDone = a.quests.every(q => questState(q.id).st === 'done');
    const bossDown = !!S.bossBeaten[a.boss.id];

    let questHTML = '';
    for (const q of a.quests){
      const qs = questState(q.id);
      questHTML += '<div class="q-line ' + qs.st + '">' +
        (qs.st==='done' ? '✅' : qs.st==='active' ? '▶' : '▫') + ' ' + esc(P(q.name)) +
        (qs.st==='active' ? ' <b>' + qs.n + '/' + q.count + '</b>' : '') + '</div>';
    }

    const star1Got = S.collect.stars.includes(a.id + '-1');
    const star2Got = S.collect.stars.includes(a.id + '-2');
    const chestGot = S.collect.gears.includes(a.id);
    const decoChars = Array.from(a.deco);
    const decoHTML = decoChars.map((d,i) =>
      '<span class="deco" style="left:' + (18 + i*28) + '%; opacity:' + (restored >= (i+1)*33 ? 1 : 0) + '">' + d + '</span>'
    ).join('');

    el.innerHTML =
      '<div class="area-top">' +
        '<button class="btn btn-ghost" id="area-back">← ' + t('back') + '</button>' +
        '<div class="area-title">' + a.emoji + ' ' + esc(P(a.name)) + '</div>' +
        '<div class="area-restore">' + restored + '%</div>' +
      '</div>' +
      '<div class="scene" id="scene" style="background:linear-gradient(' + a.skyLit[0] + ',' + a.skyLit[1] + ' 60%,' + a.floor + ' 60%)">' +
        '<div class="scene-dark" style="opacity:' + (1 - restored/100) * 0.82 + '"></div>' +
        decoHTML +
        '<button class="hs hs-npc" style="left:16%" data-hs="npc">' +
          '<span class="hs-emoji">' + a.npc.emoji + '</span><span class="hs-label">' + esc(P(a.npc.name)) + '</span></button>' +
        '<button class="hs hs-chest' + (chestGot?' opened':'') + '" style="left:46%" data-hs="chest">' +
          '<span class="hs-emoji">' + (chestGot?'📭':'🎁') + '</span><span class="hs-label">' + t('chest') + '</span></button>' +
        (restored>=35 && !star1Got ? '<button class="hs hs-star" style="left:64%; top:34%" data-hs="star1"><span class="hs-emoji tw">✨</span></button>' : '') +
        (restored>=70 && !star2Got ? '<button class="hs hs-star" style="left:30%; top:22%" data-hs="star2"><span class="hs-emoji tw">✨</span></button>' : '') +
        '<button class="hs hs-boss' + (questsDone?'':' locked') + (bossDown?' beaten':'') + '" style="right:4%" data-hs="boss">' +
          '<span class="hs-emoji">' + (bossDown ? '👑' : questsDone ? '🚪' : '🔒') + '</span>' +
          '<span class="hs-label">' + t('bossDoor') + '</span></button>' +
        '<div class="player" id="player" style="left:6%">' + avatarHTML('walker') + '</div>' +
      '</div>' +
      '<div class="area-quests card">' +
        '<b>📜 ' + t('quest') + '</b>' + questHTML +
        '<div class="small">' + esc(P(a.desc)) + '</div>' +
      '</div>';

    $('#area-back').onclick = () => { Sound.sfx('move'); goHome(); };
    $$('#scr-area .hs').forEach(b => b.onclick = () => {
      const rect = b.getBoundingClientRect();
      const scene = $('#scene').getBoundingClientRect();
      const pct = Math.max(2, Math.min(86, (rect.left + rect.width/2 - scene.left) / scene.width * 100 - 5));
      walkTo(pct, () => hotspot(b.dataset.hs, rect));
    });
  }

  function walkTo(pct, cb){
    const pl = $('#player');
    if (!pl){ cb(); return; }
    if (S.settings.reducedMotion){
      pl.style.left = pct + '%'; cb(); return;
    }
    pl.classList.add('walking');
    pl.style.left = pct + '%';
    setTimeout(() => { pl.classList.remove('walking'); cb(); }, 620);
  }

  function hotspot(kind, rect){
    const a = World.area(currentArea);
    if (kind === 'npc') return npcTalk(a);
    if (kind === 'chest'){
      if (S.collect.gears.includes(a.id)){ toast('📭 ' + t('chestEmpty')); return; }
      S.collect.gears.push(a.id);
      Sound.sfx('chest');
      FX.burst(rect.left + rect.width/2, rect.top, 24);
      gainCoins(30, rect.left + rect.width/2, rect.top);
      toast('⚙️ ' + t('chestGot'));
      save(); checkAchievements(); renderArea();
      return;
    }
    if (kind === 'star1' || kind === 'star2'){
      const sid = a.id + '-' + kind.slice(-1);
      if (!S.collect.stars.includes(sid)){
        S.collect.stars.push(sid);
        Sound.sfx('sparkle');
        FX.burst(rect.left + rect.width/2, rect.top, 20);
        gainCoins(15, rect.left + rect.width/2, rect.top);
        toast('🌟 ' + t('starFound'));
        save(); checkAchievements(); renderArea();
      }
      return;
    }
    if (kind === 'boss'){
      const questsDone = a.quests.every(q => questState(q.id).st === 'done');
      if (!questsDone){ Sound.sfx('wrong'); toast('🔒 ' + t('bossLocked')); return; }
      startBoss(a);
    }
  }

  /* ================= dialogue ================= */
  let dlg = null;
  function showDialogue(lines, cb){
    const root = $('#dialogue');
    dlg = { lines, i:0, cb, typing:false };
    root.classList.remove('hidden');
    nextLine();
  }
  function nextLine(){
    const root = $('#dialogue');
    if (dlg.i >= dlg.lines.length){
      root.classList.add('hidden');
      const cb = dlg.cb; dlg = null;
      if (cb) cb();
      return;
    }
    const line = dlg.lines[dlg.i++];
    root.innerHTML =
      '<div class="dlg-card">' +
        '<span class="dlg-face">' + line.who.emoji + '</span>' +
        '<div class="dlg-body"><b>' + esc(line.who.name) + '</b>' +
          '<p id="dlg-text"></p></div>' +
        '<span class="dlg-next">▼</span>' +
      '</div>';
    const textEl = root.querySelector('#dlg-text');
    const full = line.text;
    if (S.settings.reducedMotion){
      textEl.textContent = full;
      dlg.typing = false;
    } else {
      dlg.typing = true;
      let i = 0;
      dlg.timer = setInterval(() => {
        i++;
        textEl.textContent = full.slice(0, i);
        if (i % 3 === 0) Sound.sfx('talk');
        if (i >= full.length){ clearInterval(dlg.timer); dlg.typing = false; }
      }, 26);
    }
    root.onclick = () => {
      if (!dlg) return;
      if (dlg.typing){
        clearInterval(dlg.timer);
        textEl.textContent = full;
        dlg.typing = false;
      } else nextLine();
    };
  }

  function npcTalk(a){
    const npc = a.npc;
    S.met[npc.id] = (S.met[npc.id] || 0) + 1;
    S.stats.talks = (S.stats.talks || 0) + 1;
    save();
    const who = { emoji: npc.emoji, name: P(npc.name) };
    const lines = [];
    const firstMeet = S.met[npc.id] === 1;
    if (firstMeet) lines.push({ who, text: P(npc.lines.greet) });

    const newQuest = a.quests.find(q => questState(q.id).st === 'new');
    const activeQuest = a.quests.find(q => questState(q.id).st === 'active');
    const bossDown = !!S.bossBeaten[a.boss.id];

    if (activeQuest){
      const qs = questState(activeQuest.id);
      lines.push({ who, text: P(npc.lines.questActive) });
      lines.push({ who, text: '📜 ' + P(activeQuest.name) + '：' + P(activeQuest.desc) + '（' + qs.n + '/' + activeQuest.count + '）' });
    } else if (newQuest){
      lines.push({ who, text: P(npc.lines.questOffer) });
      lines.push({ who, text: '📜 ' + P(newQuest.name) + '：' + P(newQuest.desc) });
      S.quests[newQuest.id] = { st:'active', n:0 };
      save();
    } else if (!bossDown){
      lines.push({ who, text: P(npc.lines.questComplete) });
      lines.push({ who, text: P({ja:'ボスの扉が開いているよ。じゅんびができたら挑戦してみて！', en:'The boss door is open. Challenge it when you\u2019re ready!'}) });
    } else {
      lines.push({ who, text: P(npc.lines.allDone) });
      lines.push({ who, text: P(npc.lines.daily) });
    }
    Sound.sfx('talk');
    showDialogue(lines, () => { checkAchievements(); renderArea(); });
  }

  /* ================= quest engine ================= */
  function onSolvedForQuests(cat){
    for (const a of World.AREAS){
      for (const q of a.quests){
        const cur = S.quests[q.id];
        if (!cur || cur.st !== 'active' || q.cat !== cat) continue;
        cur.n = (cur.n || 0) + 1;
        if (cur.n >= q.count){
          S.quests[q.id] = { st:'done' };
          gainXP(q.reward.xp);
          gainCoins(q.reward.coins);
          S.restored[a.id] = Math.min(100, (S.restored[a.id] || 0) + q.restore);
          Sound.sfx('win');
          FX.confetti(45);
          toast('🎉 ' + t('questDone') + ' ' + P(q.name));
          toast('✨ ' + t('areaRestored'));
        }
        save();
      }
    }
  }

  /* ================= boss battles ================= */
  function startBoss(a){
    const boss = a.boss;
    Sound.sfx('boss');
    const who = { emoji: boss.emoji, name: P(boss.name) };
    showDialogue([{ who, text: P(boss.intro) }], () => {
      play = { mode:'boss', area:a, specs: boss.puzzles, idx:0, from:'area' };
      nextBossPuzzle();
    });
  }
  function nextBossPuzzle(){
    const spec = play.specs[play.idx];
    const pz = Puzzles.pick(spec.cat, S.solved, spec.diff) || Puzzles.pick(spec.cat, S.solved);
    startPuzzle(pz, { context:'boss', keepSession:true });
  }
  function bossAdvance(){
    play.idx++;
    const a = play.area, boss = a.boss;
    Sound.sfx('boss');
    if (play.idx < play.specs.length){
      toast('💥 ' + t('bossHurt'));
      setTimeout(nextBossPuzzle, 700);
      return;
    }
    // victory
    const refight = !!S.bossBeaten[boss.id];
    const who = { emoji: boss.emoji, name: P(boss.name) };
    showDialogue([{ who, text: P(boss.win) }], () => {
      if (!refight){
        S.bossBeaten[boss.id] = true;
        S.restored[a.id] = Math.min(100, (S.restored[a.id] || 0) + a.restoreBoss);
        if (!S.collect.scrolls.includes(a.id)){
          S.collect.scrolls.push(a.id);
          toast('📜 ' + t('scrollGot'));
        }
        const idx = World.ORDER.indexOf(a.id);
        gainXP(120 + idx * 30);
        gainCoins(80 + idx * 20);
        const nxt = World.next(a.id);
        if (nxt && !S.areasUnlocked.includes(nxt)){
          S.areasUnlocked.push(nxt);
          Sound.sfx('door');
          toast('🗺️ ' + t('newArea') + ' ' + World.area(nxt).emoji + ' ' + P(World.area(nxt).name));
        }
      } else {
        gainCoins(25);
      }
      Sound.sfx('win');
      FX.confetti(120);
      save();
      checkAchievements();
      play = null;
      enterArea(a.id);
    });
  }

  /* ================= play screen (puzzles) ================= */
  function ensureBoard(){
    if (!board){
      board = new ShogiBoard($('#board-holder'));
    }
    board.setTheme(S.settings.boardTheme, S.settings.pieceTheme);
  }

  function playHeader(){
    if (play.mode === 'boss'){
      const boss = play.area.boss;
      const total = play.specs.length;
      let hearts = '';
      for (let i=0;i<total;i++) hearts += i < play.idx ? '🤍' : '❤️';
      return '<span class="boss-face">' + boss.emoji + '</span> ' + esc(P(boss.name)) +
             ' <span class="boss-hp">' + hearts + '</span>';
    }
    if (play.mode === 'vsai'){
      return '⚔️ ' + t('vsAI') + '（' + t('ai' + play.level) + '）';
    }
    if (play.context === 'daily') return '📅 ' + t('daily');
    return '🧩 ' + t('cat_' + play.pz.cat);
  }

  function startPuzzle(pz, opts){
    opts = opts || {};
    if (!opts.keepSession || !play){
      play = { from: currentScreen === 'area' ? 'area' : (currentScreen === 'training' ? 'training' : 'home') };
    }
    play.mode = play.mode === 'boss' && opts.keepSession ? 'boss' : (opts.context === 'boss' ? 'boss' : 'puzzle');
    play.pz = pz;
    play.context = opts.context || 'free';
    play.tries = 0; play.hints = 0; play.phase = 0;
    play.t0 = Date.now();
    play.state = Puzzles.state(pz);
    play.checkpoint = Rules.clone(play.state);

    ensureBoard();
    show('play');
    board.setLastMove(null);
    board.clearHints();
    board.setState(play.state, { interactive:true, playerOwner:0, onMove: puzzleMove });

    $('#play-prompt').innerHTML = playHeader();
    $('#play-sub').textContent = t('puzzlePrompt_' + pz.cat);
    $('#btn-resign').classList.add('hidden');
    $('#btn-hint').classList.remove('hidden');
    const teachCats = { move:1, capture:1, opening:1, escape:1 };
    setMsg(teachCats[pz.cat] ? P({ja:pz.ja, en:pz.en}) : '');

    // teaching categories highlight the goal up front
    if (pz.cat === 'move' && pz.accept.kind === 'target'){
      board.highlightHint({ dests:[pz.accept.target] });
      board.cells[pz.accept.target[0]][pz.accept.target[1]].classList.add('goal');
    }
    if (pz.cat === 'capture' && pz.accept.kind === 'capture'){
      board.cells[pz.accept.target[0]][pz.accept.target[1]].classList.add('goal');
    }
  }

  function setMsg(msg){ $('#play-msg').textContent = msg || ''; }

  /* ---- hint system (4 stages) ---- */
  function hintData(){
    const pz = play.pz, st = play.state;
    // phase 1 of mate3: hint is "find the mate now"
    if (pz.accept.kind === 'mate3' && play.phase === 1){
      const m = Rules.findAllMatesIn1(st)[0];
      return m ? fromMove(m) : {};
    }
    if (pz.hint && (pz.hint.piece || pz.hint.hand || pz.hint.dests)) return pz.hint;
    const a = pz.accept;
    if (a.kind === 'mate1'){ const m = Rules.findAllMatesIn1(st)[0]; return m ? fromMove(m) : {}; }
    if (a.kind === 'mate3'){ return pz.solution ? fromMove(pz.solution) : {}; }
    if (a.kind === 'exact') return fromMove(a.move);
    if (a.kind === 'exactSet') return fromMove(a.moves[0]);
    if (a.kind === 'target') return { piece:a.src, dests:[a.target] };
    if (a.kind === 'capture'){
      const m = Rules.legalMoves(st).find(x => x.tr===a.target[0] && x.tc===a.target[1] && !x.drop);
      return m ? fromMove(m) : { dests:[a.target] };
    }
    if (a.kind === 'dropLine') return { hand:a.drop, dests:[[a.minRow, a.col],[a.minRow+1, a.col]] };
    if (a.kind === 'pieceType'){
      const m = Rules.legalMoves(st).find(x => !x.drop && st.b[x.fr][x.fc].t === a.piece);
      return m ? fromMove(m) : {};
    }
    if (a.kind === 'anyLegal'){
      const k = Rules.findKing(st, 0);
      return k ? { piece:k } : {};
    }
    return {};
    function fromMove(m){
      if (m.drop) return { hand:m.drop, dests:[[m.tr, m.tc]] };
      return { piece:[m.fr, m.fc], dests:[[m.tr, m.tc]] };
    }
  }

  function useHint(){
    if (!play || !play.pz) return;
    play.hints++;
    S.stats.hints++;
    save();
    const hd = hintData();
    const stage = Math.min(play.hints, 4);
    Sound.sfx('sparkle');
    if (stage === 1){
      board.highlightHint({ piece: hd.piece, hand: hd.hand });
      setMsg('💡 ' + t('hint1used'));
    } else if (stage === 2){
      board.highlightHint(hd);
      setMsg('💡 ' + t('hint2used'));
    } else if (stage === 3){
      board.highlightHint(hd);
      if (hd.dests && hd.dests.length){
        board.showArrow(hd.piece ? hd.piece : { hand: hd.hand }, hd.dests[0]);
      }
      setMsg('💡 ' + t('hint3used'));
    } else {
      setMsg('💡 ' + t('hint4prefix') + P({ja:play.pz.ja, en:play.pz.en}));
    }
  }

  /* ---- answering ---- */
  function puzzleMove(move){
    const pz = play.pz;
    board.lock();
    board.clearHints();
    const before = Rules.clone(play.state);
    Rules.applyMove(play.state, move);
    board.setLastMove(move);
    board.render();
    Sound.sfx(!move.drop && before.b[move.tr][move.tc] ? 'capture' : 'move');

    let ok;
    if (pz.accept.kind === 'mate3' && play.phase === 1){
      ok = Rules.isMate(play.state);
    } else {
      ok = Puzzles.checkMove(pz, before, move, play.state);
    }

    if (ok && pz.accept.kind === 'mate3' && play.phase === 0 && !Rules.isMate(play.state)){
      // correct first move of a mate-in-3: opponent defends, then find the mate
      setMsg('⚡ ' + t('keepGoing'));
      setTimeout(() => {
        const replies = Rules.legalMoves(play.state);
        const reply = replies[Math.floor(Math.random() * replies.length)];
        Rules.applyMove(play.state, reply);
        board.setLastMove(reply);
        board.render();
        Sound.sfx('move');
        setMsg('⚡ ' + t('defenseMoved') + ' ' + t('keepGoing'));
        play.phase = 1;
        play.checkpoint = Rules.clone(play.state);
        board.unlock();
      }, 700);
      return;
    }

    if (ok){ finishPuzzle(move); return; }

    /* ---- wrong answer: never just "wrong" — show why, then retry ---- */
    play.tries++;
    S.stats.attempts++;
    bumpCat(pz.cat, false);
    S.stats.mistakes[pz.id] = (S.stats.mistakes[pz.id] || 0) + 1;
    S.stats.streak = 0;
    save();
    Sound.sfx('wrong');
    if (play.mode === 'boss') toast(t('bossTaunt'));

    const kindMsg = {
      mate1: t('wrongMate'), mate3: t('wrongMate'),
      target: t('wrongTarget'), capture: t('wrongCapture'),
      exact: t('wrongBest'), exactSet: t('wrongBest'),
      dropLine: t('wrongBest'), pieceType: t('wrongBest'), anyLegal: t('wrongBest')
    };
    const isMateKind = pz.accept.kind === 'mate1' || pz.accept.kind === 'mate3';

    if (isMateKind && !Rules.isMate(play.state) && Rules.legalMoves(play.state).length){
      // show the refutation: the opponent escapes or captures
      setMsg('😮 ' + t('wrongMove'));
      setTimeout(() => {
        const replies = Rules.legalMoves(play.state);
        let reply = replies.find(r => !r.drop && play.state.b[r.fr] && play.state.b[r.fr][r.fc] && play.state.b[r.fr][r.fc].t === 'K');
        if (!reply) reply = replies.find(r => !r.drop && r.tr === move.tr && r.tc === move.tc);
        if (!reply) reply = replies[0];
        Rules.applyMove(play.state, reply);
        board.setLastMove(reply);
        board.render();
        board.pulseSquare(reply.tr, reply.tc);
        Sound.sfx('move');
        setMsg('😮 ' + kindMsg[pz.accept.kind]);
        setTimeout(resetToCheckpoint, 1250);
      }, 550);
    } else {
      setMsg('😮 ' + (kindMsg[pz.accept.kind] || t('wrongBest')));
      board.pulseSquare(move.tr, move.tc);
      setTimeout(resetToCheckpoint, 850);
    }
  }

  function resetToCheckpoint(){
    play.state = Rules.clone(play.checkpoint);
    board.setLastMove(null);
    board.setState(play.state, { interactive:true, playerOwner:0, onMove: puzzleMove });
    board.unlock();
    // restore goal markers for teaching categories
    const pz = play.pz;
    if (pz.cat === 'move' && pz.accept.kind === 'target')
      board.cells[pz.accept.target[0]][pz.accept.target[1]].classList.add('goal');
    if (pz.cat === 'capture' && pz.accept.kind === 'capture' && play.state.b[pz.accept.target[0]][pz.accept.target[1]])
      board.cells[pz.accept.target[0]][pz.accept.target[1]].classList.add('goal');
  }

  function bumpCat(cat, correct){
    const st = S.stats.byCat[cat] || (S.stats.byCat[cat] = { a:0, c:0, t:0, n:0 });
    st.a++;
    if (correct) st.c++;
  }

  function finishPuzzle(move){
    const pz = play.pz;
    const sec = Math.round((Date.now() - play.t0) / 1000);
    play.tries++;
    S.stats.attempts++;
    S.stats.correct++;
    bumpCat(pz.cat, true);
    const cst = S.stats.byCat[pz.cat];
    cst.t += sec; cst.n++;
    S.stats.timeSum += sec; S.stats.timeN++;
    S.stats.streak++;
    S.stats.bestStreak = Math.max(S.stats.bestStreak, S.stats.streak);
    const today = todayStr();
    S.stats.days[today] = (S.stats.days[today] || 0) + 1;

    const firstTry = play.tries === 1;
    const noHint = play.hints === 0;
    const fast = sec < 15;
    if (firstTry) S.stats.firstTry = (S.stats.firstTry || 0) + 1;
    if (noHint) S.stats.noHint = (S.stats.noHint || 0) + 1;

    const stars = (firstTry && noHint) ? 3 : (play.tries <= 2 && play.hints <= 1) ? 2 : 1;
    const prev = S.solved[pz.id];
    if (!prev || prev.stars < stars) S.solved[pz.id] = { stars, tries: play.tries, best: sec };

    let xp = pz.reward.xp, coins = pz.reward.coins;
    const bonuses = [];
    if (firstTry){ xp += 5; bonuses.push('🎯 ' + t('firstTry')); }
    if (fast){ xp += 5; bonuses.push('⚡ ' + t('fastSolve')); }
    if (noHint){ xp += 5; bonuses.push('🧠 ' + t('noHint')); }
    if (S.stats.streak > 0 && S.stats.streak % 3 === 0){ coins += 10; bonuses.push('🔥 ' + t('streakBonus') + ' ×' + S.stats.streak); }
    if (play.context === 'daily'){
      S.daily.puzzleDone = today;
      S.stats.dailyCount = (S.stats.dailyCount || 0) + 1;
      xp += 30; coins += 20;
    }

    const holder = $('#board-holder').getBoundingClientRect();
    Sound.sfx('correct');
    FX.burst(holder.left + holder.width/2, holder.top + holder.height/2, 26);
    gainXP(xp, holder.left + holder.width/2, holder.top + 30);
    gainCoins(coins, holder.left + holder.width/2, holder.top + 60);

    onSolvedForQuests(pz.cat);
    save();
    checkAchievements();

    if (play.mode === 'boss'){
      setMsg('⭕ ' + t('correct'));
      setTimeout(bossAdvance, 500);
      return;
    }

    const starStr = '★'.repeat(stars) + '<span class="dim">' + '★'.repeat(3 - stars) + '</span>';
    const m = modal(
      '<div class="result-stars">' + starStr + '</div>' +
      '<div class="modal-title">🎉 ' + t('excellent') + '</div>' +
      '<div class="result-rewards">＋' + xp + ' XP　＋' + coins + ' 🪙</div>' +
      (bonuses.length ? '<div class="result-bonus">' + bonuses.map(esc).join('　') + '</div>' : '') +
      '<div class="concept-chip">📖 ' + t('learned') + '：' + t('concept_' + (pz.concept || 'movement')) + '</div>' +
      '<p class="explain">' + esc(P({ja:pz.ja, en:pz.en})) + '</p>' +
      '<div class="row gap">' +
        '<button class="btn btn-primary" id="res-next">▶ ' + P({ja:'つぎの問題', en:'Next puzzle'}) + '</button>' +
        '<button class="btn" id="res-back">' + t('back') + '</button>' +
      '</div>', { sticky:true });
    m.el.querySelector('#res-next').onclick = () => {
      m.close();
      const nxt = Puzzles.pick(pz.cat, S.solved);
      if (nxt) startPuzzle(nxt, { context: play.context === 'daily' ? 'free' : play.context });
      else leavePlay();
    };
    m.el.querySelector('#res-back').onclick = () => { m.close(); leavePlay(); };
  }

  function leavePlay(){
    const from = play && play.from;
    play = null;
    if (from === 'area' && currentArea){ enterArea(currentArea); }
    else if (from === 'training'){ renderTraining(); show('training'); }
    else goHome();
  }

  /* ================= vs AI ================= */
  function startVsAI(level){
    play = {
      mode:'vsai', level,
      from: currentScreen === 'training' ? 'training' : 'home',
      state: Rules.initialState(),
      hashCounts: {}, over:false, aiBusy:false
    };
    ensureBoard();
    show('play');
    Sound.playMusic('shrine');
    board.setLastMove(null);
    board.clearHints();
    board.setState(play.state, { interactive:true, playerOwner:0, onMove: vsMove });
    $('#play-prompt').innerHTML = playHeader();
    $('#play-sub').textContent = t('yourTurn');
    $('#btn-hint').classList.add('hidden');
    $('#btn-resign').classList.remove('hidden');
    setMsg('');
    recordHash();
  }

  function recordHash(){
    const hsh = Rules.hash(play.state);
    play.hashCounts[hsh] = (play.hashCounts[hsh] || 0) + 1;
    return play.hashCounts[hsh];
  }

  function vsMove(move){
    if (play.over || play.aiBusy) return;
    board.lock();
    const captured = !!(!move.drop && play.state.b[move.tr][move.tc]);
    Rules.applyMove(play.state, move);
    Sound.sfx(captured ? 'capture' : 'move');
    board.setLastMove(move);
    board.render();
    if (checkGameEnd()) return;
    aiTurn();
  }

  async function aiTurn(){
    play.aiBusy = true;
    $('#play-sub').textContent = t('thinking');
    const m = await AI.think(play.state, play.level);
    if (!play || play.mode !== 'vsai' || play.over){ return; }
    if (!m){ endVsAI('win'); return; }
    const captured = !!(!m.drop && play.state.b[m.tr][m.tc]);
    Rules.applyMove(play.state, m);
    Sound.sfx(captured ? 'capture' : 'move');
    board.setLastMove(m);
    board.render();
    play.aiBusy = false;
    if (checkGameEnd()) return;
    if (Rules.inCheck(play.state, 0)){
      board.flashCheck();
      setMsg('⚠️ ' + t('check'));
    } else setMsg('');
    $('#play-sub').textContent = t('yourTurn');
    board.unlock();
  }

  function checkGameEnd(){
    const s = play.state;
    if (Rules.noMoves(s)){
      endVsAI(s.turn === 0 ? 'lose' : 'win');
      return true;
    }
    if (recordHash() >= 4){ endVsAI('draw'); return true; }
    return false;
  }

  function endVsAI(result){
    play.over = true;
    board.lock();
    let title, body = '';
    if (result === 'win'){
      title = '🏆 ' + t('youWin');
      const xp = 40 * play.level, coins = 20 * play.level;
      S.stats.aiWins[play.level] = (S.stats.aiWins[play.level] || 0) + 1;
      gainXP(xp); gainCoins(coins);
      body = '＋' + xp + ' XP　＋' + coins + ' 🪙';
      Sound.sfx('win');
      FX.confetti(100);
    } else if (result === 'lose'){
      title = '💧 ' + t('youLose');
      const xp = 8 * play.level;
      gainXP(xp);
      body = '＋' + xp + ' XP';
      Sound.sfx('wrong');
    } else {
      title = '🤝 ' + t('draw');
      gainXP(15);
      body = '＋15 XP';
    }
    save();
    checkAchievements();
    const lvl = play.level;
    const m = modal(
      '<div class="modal-title">' + title + '</div>' +
      '<div class="result-rewards">' + body + '</div>' +
      '<div class="row gap">' +
        '<button class="btn btn-primary" id="vs-again">🔁 ' + P({ja:'もう一局', en:'Rematch'}) + '</button>' +
        '<button class="btn" id="vs-back">' + t('back') + '</button>' +
      '</div>', { sticky:true });
    m.el.querySelector('#vs-again').onclick = () => { m.close(); startVsAI(lvl); };
    m.el.querySelector('#vs-back').onclick = () => { m.close(); leavePlay(); };
  }

  /* ================= training menu ================= */
  function reviewPool(){
    const ids = Object.keys(S.stats.mistakes || {}).filter(id => S.stats.mistakes[id] > 0);
    return ids.map(id => Puzzles.byId(id)).filter(Boolean);
  }

  function renderTraining(){
    const el = $('#scr-training');
    const catBtn = cat => {
      const pool = Puzzles.byCat(cat);
      const solved = pool.filter(p => S.solved[p.id]).length;
      return '<button class="list-btn" data-cat="' + cat + '">' +
        '<span class="list-emoji">' + CAT_ICON[cat] + '</span>' +
        '<span class="list-info"><b>' + t('cat_' + cat) + '</b>' +
          '<span class="small">' + solved + ' / ' + pool.length + '</span></span>' +
        '<span class="list-go">▶</span></button>';
    };
    const rp = reviewPool();
    el.innerHTML = headerHTML() +
      '<div class="page">' +
        '<div class="card"><b>🧩 ' + t('training') + '</b></div>' +
        Puzzles.CATS.map(catBtn).join('') +
        '<button class="list-btn" id="btn-review"' + (rp.length ? '' : ' disabled') + '>' +
          '<span class="list-emoji">🔁</span>' +
          '<span class="list-info"><b>' + t('cat_review') + '</b>' +
            '<span class="small">' + rp.length + P({ja:'問', en:' puzzles'}) + '</span></span>' +
          '<span class="list-go">▶</span></button>' +
        '<div class="card" style="margin-top:14px"><b>⚔️ ' + t('vsAI') + '</b>' +
          '<div class="small">' + t('aiLevel') + '</div>' +
          '<div class="ai-grid">' +
            [1,2,3,4,5,6,7].map(l =>
              '<button class="ai-btn" data-lv="' + l + '"><b>Lv.' + l + '</b><span>' + t('ai' + l) + '</span>' +
              (S.stats.aiWins[l] ? '<span class="ai-win">🏆×' + S.stats.aiWins[l] + '</span>' : '') +
              '</button>').join('') +
          '</div></div>' +
      '</div>';
    $$('#scr-training .list-btn[data-cat]').forEach(b => b.onclick = () => {
      const pz = Puzzles.pick(b.dataset.cat, S.solved);
      if (pz) startPuzzle(pz, { context:'free' });
    });
    $('#btn-review').onclick = () => {
      const pool = reviewPool();
      if (!pool.length) return;
      const pz = pool[Math.floor(Math.random() * pool.length)];
      S.stats.mistakes[pz.id] = 0;
      startPuzzle(pz, { context:'free' });
    };
    $$('#scr-training .ai-btn').forEach(b => b.onclick = () => startVsAI(+b.dataset.lv));
  }
  const CAT_ICON = { move:'🚶', capture:'🎯', escape:'🛡️', opening:'📖', best:'💎', mate1:'⚔️', mate3:'🐉' };

  /* ================= achievements ================= */
  const ACH = [];
  (function buildAch(){
    const solveTiers = [[1,'🌱'],[10,'🌿'],[25,'🌳'],[50,'🏵️'],[100,'🌟']];
    for (const [n, ic] of solveTiers) ACH.push({
      id:'solve'+n, icon:ic,
      name:{ja:'パズル'+n+'問クリア', en:'Solve '+n+' puzzles'},
      cond:()=>S.stats.correct>=n });
    for (const [n, ic] of [[5,'⚔️'],[15,'🗡️']]) ACH.push({
      id:'mate1_'+n, icon:ic,
      name:{ja:'1手詰め'+n+'問', en:n+' mates in one'},
      cond:()=>catCount('mate1')>=n });
    ACH.push({ id:'mate3_3', icon:'🐲', name:{ja:'3手詰め3問', en:'3 mates in three'}, cond:()=>catCount('mate3')>=3 });
    ACH.push({ id:'cap10', icon:'🎯', name:{ja:'駒取り10問', en:'10 capture drills'}, cond:()=>catCount('capture')>=10 });
    ACH.push({ id:'move10', icon:'🚶', name:{ja:'動きレッスン10問', en:'10 movement lessons'}, cond:()=>catCount('move')>=10 });
    for (const [n, ic] of [[10,'🧠'],[30,'🎓']]) ACH.push({
      id:'nohint'+n, icon:ic,
      name:{ja:'ノーヒント'+n+'回', en:n+' no-hint solves'},
      cond:()=>(S.stats.noHint||0)>=n });
    ACH.push({ id:'ft10', icon:'🎯', name:{ja:'一発クリア10回', en:'10 first-try solves'}, cond:()=>(S.stats.firstTry||0)>=10 });
    for (const [n, ic] of [[5,'🔥'],[10,'🌋'],[20,'☄️']]) ACH.push({
      id:'streak'+n, icon:ic,
      name:{ja:n+'連続正解', en:n+'-solve streak'},
      cond:()=>S.stats.bestStreak>=n });
    for (const [n, ic] of [[3,'📅'],[7,'🗓️'],[14,'⏳'],[30,'🏆']]) ACH.push({
      id:'login'+n, icon:ic,
      name:{ja:'連続ログイン'+n+'日', en:n+'-day login streak'},
      cond:()=>S.daily.loginStreak>=n });
    for (const a of World.AREAS) ACH.push({
      id:'boss_'+a.boss.id, icon:a.boss.emoji,
      name:{ja:a.boss.name.ja+'をたおした', en:'Defeated '+a.boss.name.en},
      cond:()=>!!S.bossBeaten[a.boss.id] });
    ACH.push({ id:'allboss', icon:'👑', name:{ja:'すべてのボスをたおした', en:'Defeated every boss'},
      cond:()=>World.AREAS.every(a=>S.bossBeaten[a.boss.id]) });
    for (const [n, ic] of [[4,'✨'],[8,'💫'],[16,'🌠']]) ACH.push({
      id:'stars'+n, icon:ic,
      name:{ja:'かくれスター'+n+'個', en:n+' hidden stars'},
      cond:()=>S.collect.stars.length>=n });
    for (const [n, ic] of [[4,'⚙️'],[8,'🔩']]) ACH.push({
      id:'gears'+n, icon:ic,
      name:{ja:'歯車'+n+'個', en:n+' gears'},
      cond:()=>S.collect.gears.length>=n });
    for (const [n, ic] of [[4,'📜'],[8,'🏛️']]) ACH.push({
      id:'scrolls'+n, icon:ic,
      name:{ja:'巻物'+n+'本', en:n+' scrolls'},
      cond:()=>S.collect.scrolls.length>=n });
    for (const [n, ic] of [[5,'🎈'],[10,'🎖️'],[20,'💎']]) ACH.push({
      id:'lv'+n, icon:ic,
      name:{ja:'レベル'+n+'到達', en:'Reach level '+n},
      cond:()=>levelInfo().level>=n });
    for (const l of [1,3,5,7]) ACH.push({
      id:'aiwin'+l, icon:'⚔️',
      name:{ja:'AI Lv.'+l+'に勝利', en:'Beat AI level '+l},
      cond:()=>(S.stats.aiWins[l]||0)>=1 });
    ACH.push({ id:'talk10', icon:'💬', name:{ja:'なかまと10回お話', en:'Chat with friends 10 times'}, cond:()=>(S.stats.talks||0)>=10 });
    for (const [n, ic] of [[5,'📆'],[20,'🌞']]) ACH.push({
      id:'daily'+n, icon:ic,
      name:{ja:'デイリー'+n+'回達成', en:n+' daily challenges'},
      cond:()=>(S.stats.dailyCount||0)>=n });
    function catCount(cat){
      let n = 0;
      for (const id in S.solved) if (id.startsWith(cat+'-')) n++;
      return n;
    }
  })();

  function checkAchievements(){
    for (const a of ACH){
      if (S.ach[a.id]) continue;
      let ok = false;
      try { ok = a.cond(); } catch(e){}
      if (ok){
        S.ach[a.id] = Date.now();
        Sound.sfx('levelup');
        toast(a.icon + ' ' + t('achGot') + ' ' + P(a.name));
        gainCoins(10);
      }
    }
    save();
  }

  /* ================= collection ================= */
  let colTab = 'friends';
  function renderCollection(){
    const el = $('#scr-collection');
    const tabs = [
      ['friends', '🧸 ' + t('friends')],
      ['treasures', '💎 ' + t('treasures')],
      ['themes', '🎨 ' + t('themes')],
      ['bosses', '👑 ' + t('bossesTab')],
      ['ach', '🏅 ' + t('achievements')],
    ];
    let body = '';

    if (colTab === 'friends'){
      body = '<div class="col-grid">' + World.AREAS.map(a => {
        const met = !!S.met[a.npc.id];
        return '<div class="col-item' + (met?'':' unknown') + '">' +
          '<span class="col-emoji">' + (met ? a.npc.emoji : '❓') + '</span>' +
          '<span class="col-name">' + (met ? esc(P(a.npc.name)) : '???') + '</span>' +
          (met ? '<span class="small">💛×' + S.met[a.npc.id] + '</span>' : '') +
          '</div>';
      }).join('') + '</div>';
    }

    if (colTab === 'treasures'){
      body = '<div class="col-grid">' + World.AREAS.map(a => {
        const s1 = S.collect.stars.includes(a.id+'-1'), s2 = S.collect.stars.includes(a.id+'-2');
        const g = S.collect.gears.includes(a.id), sc = S.collect.scrolls.includes(a.id);
        return '<div class="col-item">' +
          '<span class="col-emoji">' + a.emoji + '</span>' +
          '<span class="col-name">' + esc(P(a.name)) + '</span>' +
          '<span class="tr-row">' +
            '<i class="' + (s1?'':'dim') + '">🌟</i><i class="' + (s2?'':'dim') + '">🌟</i>' +
            '<i class="' + (g?'':'dim') + '">⚙️</i><i class="' + (sc?'':'dim') + '">📜</i></span>' +
          '</div>';
      }).join('') + '</div>';
    }

    if (colTab === 'themes'){
      const boards = [
        { id:'wood',    price:0,   name:{ja:'ひのき盤', en:'Cypress'} },
        { id:'sakura',  price:120, name:{ja:'さくら', en:'Sakura'} },
        { id:'night',   price:150, name:{ja:'よぞら', en:'Night sky'} },
        { id:'crystal', price:200, name:{ja:'クリスタル', en:'Crystal'} },
        { id:'autumn',  price:150, name:{ja:'もみじ', en:'Autumn'} },
        { id:'festival',price:250, name:{ja:'おまつり', en:'Festival'} },
      ];
      const pieces = [
        { id:'classic', price:0,   name:{ja:'ていばん', en:'Classic'} },
        { id:'sakura',  price:100, name:{ja:'さくら駒', en:'Sakura'} },
        { id:'crystal', price:150, name:{ja:'クリスタル駒', en:'Crystal'} },
        { id:'ink',     price:120, name:{ja:'すみ駒', en:'Ink'} },
      ];
      const themeBtn = (item, kind) => {
        const ownedArr = kind==='board' ? S.owned.boards : S.owned.pieces;
        const inUse = kind==='board' ? S.settings.boardTheme===item.id : S.settings.pieceTheme===item.id;
        const owned = ownedArr.includes(item.id);
        return '<button class="theme-btn ' + (kind==='board'?'bt-':'pt-') + item.id + (inUse?' inuse':'') + '"' +
          ' data-kind="' + kind + '" data-id="' + item.id + '" data-price="' + item.price + '">' +
          '<span class="theme-swatch"></span><b>' + esc(P(item.name)) + '</b>' +
          '<span class="small">' + (inUse ? t('inUse') : owned ? t('ownedUse') : '🪙' + item.price + ' ' + t('buy')) + '</span>' +
          '</button>';
      };
      body = '<div class="card"><b>' + t('boardTheme') + '</b><div class="theme-grid">' +
        boards.map(x=>themeBtn(x,'board')).join('') + '</div></div>' +
        '<div class="card"><b>' + t('pieceTheme') + '</b><div class="theme-grid">' +
        pieces.map(x=>themeBtn(x,'piece')).join('') + '</div></div>';
    }

    if (colTab === 'bosses'){
      body = '<div class="col-grid">' + World.AREAS.map(a => {
        const won = !!S.bossBeaten[a.boss.id];
        return '<div class="col-item' + (won?'':' unknown') + '">' +
          '<span class="col-emoji">' + (won ? a.boss.emoji : '❓') + '</span>' +
          '<span class="col-name">' + (won ? esc(P(a.boss.name)) : '???') + '</span>' +
          '</div>';
      }).join('') + '</div>';
    }

    if (colTab === 'ach'){
      body = '<div class="ach-list">' + ACH.map(a => {
        const got = !!S.ach[a.id];
        return '<div class="ach-item' + (got?' got':'') + '">' +
          '<span class="ach-icon">' + (got ? a.icon : '🔒') + '</span>' +
          '<span>' + esc(P(a.name)) + '</span>' + (got ? '<span class="ach-ok">✓</span>' : '') +
          '</div>';
      }).join('') + '</div>';
    }

    // completion %
    const totals = World.AREAS.length /*friends*/ + World.AREAS.length*4 /*treasures incl scroll+2stars+gear*/ +
                   10 /*themes*/ + World.AREAS.length /*bosses*/ + ACH.length;
    let got = Object.keys(S.met).length + S.collect.stars.length + S.collect.gears.length + S.collect.scrolls.length +
              S.owned.boards.length + S.owned.pieces.length + Object.keys(S.bossBeaten).length + Object.keys(S.ach).length;
    const pct = Math.min(100, Math.round(got / totals * 100));

    el.innerHTML = headerHTML() +
      '<div class="page">' +
        '<div class="card"><div class="row spread"><b>📔 ' + t('collection') + '</b>' +
          '<span>' + t('completion') + ' ' + pct + '%</span></div>' +
          '<div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
        '<div class="tabs">' + tabs.map(([id, label]) =>
          '<button class="tab' + (colTab===id?' active':'') + '" data-tab="' + id + '">' + label + '</button>').join('') +
        '</div>' + body +
      '</div>';

    $$('#scr-collection .tab').forEach(b => b.onclick = () => { colTab = b.dataset.tab; renderCollection(); });
    $$('#scr-collection .theme-btn').forEach(b => b.onclick = () => {
      const kind = b.dataset.kind, id = b.dataset.id, price = +b.dataset.price;
      const ownedArr = kind==='board' ? S.owned.boards : S.owned.pieces;
      if (!ownedArr.includes(id)){
        if (S.coins < price){ Sound.sfx('wrong'); toast('🪙 ' + t('notEnough')); return; }
        S.coins -= price;
        ownedArr.push(id);
        Sound.sfx('chest');
        FX.confetti(30);
        toast('🎨 ' + t('unlocked'));
      }
      if (kind==='board') S.settings.boardTheme = id; else S.settings.pieceTheme = id;
      if (board) board.setTheme(S.settings.boardTheme, S.settings.pieceTheme);
      save();
      checkAchievements();
      renderCollection();
    });
  }

  /* ================= stats & parent dashboard ================= */
  function renderStats(){
    const el = $('#scr-stats');
    const acc = S.stats.attempts ? Math.round(S.stats.correct / S.stats.attempts * 100) : 0;
    const avgT = S.stats.timeN ? Math.round(S.stats.timeSum / S.stats.timeN) : 0;
    const weak = weakestCat();
    let fav = null, favAcc = -1;
    for (const c of Puzzles.CATS){
      const st = S.stats.byCat[c];
      if (st && st.a >= 3 && st.c / st.a > favAcc){ favAcc = st.c / st.a; fav = c; }
    }
    const recentAch = Object.entries(S.ach).sort((a,b)=>b[1]-a[1]).slice(0,3)
      .map(([id])=>{ const a = ACH.find(x=>x.id===id); return a ? a.icon + ' ' + esc(P(a.name)) : ''; })
      .filter(Boolean);

    el.innerHTML = headerHTML() +
      '<div class="page">' +
        '<div class="card"><b>📊 ' + t('stats') + '</b>' +
          '<div class="stat-grid">' +
            '<div class="stat"><span>' + t('solvedCount') + '</span><b>' + S.stats.correct + '</b></div>' +
            '<div class="stat"><span>' + t('accuracy') + '</span><b>' + acc + '%</b></div>' +
            '<div class="stat"><span>' + t('avgTime') + '</span><b>' + avgT + P({ja:'秒', en:'s'}) + '</b></div>' +
            '<div class="stat"><span>' + t('curStreak') + '</span><b>🔥' + S.stats.streak + '</b></div>' +
            '<div class="stat"><span>' + t('bestStreak') + '</span><b>' + S.stats.bestStreak + '</b></div>' +
            '<div class="stat"><span>' + t('bosses') + '</span><b>' + Object.keys(S.bossBeaten).length + '/8</b></div>' +
          '</div></div>' +
        '<div class="card"><b>📈 ' + t('catAccuracy') + '</b><canvas id="chart-cat" height="150"></canvas></div>' +
        '<div class="card"><b>🗓️ ' + t('weekActivity') + '</b><canvas id="chart-week" height="130"></canvas></div>' +
        '<div class="card"><b>💪 ' + t('weakest') + '</b>：' + t('cat_' + weak) +
          (fav ? '<br><b>💖 ' + t('favorite') + '</b>：' + t('cat_' + fav) : '') + '</div>' +
        '<div class="card parent-card"><b>👨‍👩‍👧 ' + t('parentMode') + '</b>' +
          '<div class="small">' + t('parentInfo') + '</div>' +
          '<div class="stat-grid">' +
            '<div class="stat"><span>' + t('playTime') + '</span><b>' + Math.round(S.stats.playSec/60) + t('playtimeMin') + '</b></div>' +
            '<div class="stat"><span>' + t('lessonsDone') + '</span><b>' + Object.keys(S.solved).length + '</b></div>' +
            '<div class="stat"><span>' + t('accuracy') + '</span><b>' + acc + '%</b></div>' +
            '<div class="stat"><span>' + t('streakDays') + '</span><b>' + S.daily.loginStreak + t('day') + '</b></div>' +
          '</div>' +
          '<div class="small"><b>' + t('recentAch') + '</b>：' + (recentAch.length ? recentAch.join('　') : '—') + '</div>' +
          '<div class="small"><b>' + t('nextLesson') + '</b>：' + t('cat_' + weak) + '</div>' +
        '</div>' +
      '</div>';

    drawCatChart();
    drawWeekChart();
  }

  function chartCtx(id){
    const cv = $(id);
    const w = cv.parentElement.clientWidth - 8;
    cv.width = w * devicePixelRatio;
    cv.height = cv.getAttribute('height') * devicePixelRatio;
    cv.style.width = w + 'px';
    cv.style.height = cv.getAttribute('height') + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(devicePixelRatio, devicePixelRatio);
    return { ctx, w, h: +cv.getAttribute('height') };
  }

  function drawCatChart(){
    const { ctx, w, h } = chartCtx('#chart-cat');
    const cats = Puzzles.CATS;
    const bw = w / cats.length;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    cats.forEach((c, i) => {
      const st = S.stats.byCat[c];
      const acc = st && st.a ? st.c / st.a : 0;
      const bh = Math.max(3, acc * (h - 36));
      const x = i * bw + bw * 0.18;
      ctx.fillStyle = acc >= 0.7 ? '#3FB8A8' : acc >= 0.4 ? '#E9A73B' : '#E4645C';
      ctx.beginPath();
      ctx.roundRect(x, h - 24 - bh, bw * 0.64, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#4A2E17';
      ctx.fillText(CAT_ICON[c], i * bw + bw/2, h - 10);
      if (st && st.a) ctx.fillText(Math.round(acc*100) + '%', i * bw + bw/2, h - 28 - bh);
    });
  }

  function drawWeekChart(){
    const { ctx, w, h } = chartCtx('#chart-week');
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(dateOffset(-i));
    const vals = days.map(d => S.stats.days[d] || 0);
    const mx = Math.max(3, ...vals);
    const bw = w / 7;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    days.forEach((d, i) => {
      const bh = Math.max(2, vals[i] / mx * (h - 34));
      ctx.fillStyle = i === 6 ? '#E9A73B' : '#3FB8A8';
      ctx.beginPath();
      ctx.roundRect(i * bw + bw*0.2, h - 22 - bh, bw * 0.6, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#4A2E17';
      ctx.fillText(d.slice(5).replace('-','/'), i * bw + bw/2, h - 8);
      if (vals[i]) ctx.fillText(vals[i], i * bw + bw/2, h - 26 - bh);
    });
  }

  /* ================= settings & customization ================= */
  function renderSettings(){
    const el = $('#scr-settings');
    const tgl = (key, label) =>
      '<label class="tgl-row"><span>' + label + '</span>' +
      '<input type="checkbox" class="tgl" data-k="' + key + '"' + (S.settings[key] ? ' checked' : '') + '></label>';
    el.innerHTML = headerHTML() +
      '<div class="page">' +
        '<div class="card"><b>🎨 ' + t('customize') + '</b>' +
          '<div class="small">' + t('avatar') + '</div>' +
          '<div class="avatar-grid">' + AVATARS.map(a =>
            '<button class="av-btn' + (S.avatar===a?' sel':'') + '" data-av="' + a + '">' + a + '</button>').join('') + '</div>' +
          '<div class="small" style="margin-top:8px">' + t('hat') + '</div>' +
          '<div class="avatar-grid">' + HATS.map(hh => {
            const owned = S.owned.hats.includes(hh.id);
            const lockedBoss = hh.needsBoss && !S.bossBeaten[hh.needsBoss];
            return '<button class="av-btn hat-btn' + (S.hat===hh.id?' sel':'') + '" data-hat="' + hh.id + '"' +
              (lockedBoss ? ' disabled' : '') + '>' +
              (hh.emoji || '🚫') +
              '<span class="hat-tag">' + (lockedBoss ? '👑?' : owned ? '' : '🪙' + hh.price) + '</span></button>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="card"><b>⚙️ ' + t('settings') + '</b>' +
          tgl('sound', '🔊 ' + t('sound')) +
          tgl('music', '🎵 ' + t('music')) +
          tgl('largeText', '🔤 ' + t('largeText')) +
          tgl('highContrast', '🌓 ' + t('highContrast')) +
          tgl('reducedMotion', '🐢 ' + t('reducedMotion')) +
          '<label class="tgl-row"><span>🌏 ' + t('language') + '</span>' +
            '<select id="sel-lang" class="input" style="width:auto">' +
              '<option value="ja"' + (S.settings.lang==='ja'?' selected':'') + '>日本語</option>' +
              '<option value="en"' + (S.settings.lang==='en'?' selected':'') + '>English</option>' +
            '</select></label>' +
        '</div>' +
        '<div class="card"><b>💾 ' + t('saveData') + '</b>' +
          '<div class="row gap" style="margin-top:8px">' +
            '<button class="btn" id="btn-export">📤 ' + t('exportSave') + '</button>' +
            '<button class="btn" id="btn-import">📥 ' + t('importSave') + '</button>' +
            '<input type="file" id="file-import" accept=".json,application/json" class="hidden">' +
          '</div>' +
          '<button class="btn btn-danger" id="btn-reset" style="margin-top:10px">🗑️ ' + t('resetAll') + '</button>' +
        '</div>' +
      '</div>';

    $$('#scr-settings .tgl').forEach(cb => cb.onchange = () => {
      S.settings[cb.dataset.k] = cb.checked;
      applySettings();
      save();
      if (cb.dataset.k === 'music') Sound.setMusic(cb.checked);
    });
    $('#sel-lang').onchange = e => {
      S.settings.lang = e.target.value;
      I18N.setLang(S.settings.lang);
      save();
      renderSettings();
    };
    $$('#scr-settings .av-btn[data-av]').forEach(b => b.onclick = () => {
      S.avatar = b.dataset.av; save(); Sound.sfx('sparkle'); renderSettings();
    });
    $$('#scr-settings .hat-btn').forEach(b => b.onclick = () => {
      const id = b.dataset.hat;
      const hh = HATS.find(x => x.id === id);
      if (hh.needsBoss && !S.bossBeaten[hh.needsBoss]) return;
      if (!S.owned.hats.includes(id)){
        if (S.coins < hh.price){ Sound.sfx('wrong'); toast('🪙 ' + t('notEnough')); return; }
        S.coins -= hh.price;
        S.owned.hats.push(id);
        Sound.sfx('chest');
        toast('🎩 ' + t('unlocked'));
      }
      S.hat = id;
      save();
      Sound.sfx('sparkle');
      renderSettings();
    });
    $('#btn-export').onclick = () => Save.exportJSON(S);
    $('#btn-import').onclick = () => $('#file-import').click();
    $('#file-import').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        S = await Save.importJSON(f);
        Save.save(S);
        applySettings();
        I18N.setLang(S.settings.lang);
        toast('✅ ' + t('importOk'));
        renderSettings();
      } catch(err){
        Sound.sfx('wrong');
        toast('⚠️ ' + t('importBad'));
      }
      e.target.value = '';
    };
    $('#btn-reset').onclick = () => confirmModal(t('resetConfirm'), () => {
      Save.reset();
      S = Save.load();
      applySettings();
      I18N.setLang(S.settings.lang);
      renderTitle();
      show('title');
    });
  }

  function applySettings(){
    document.body.classList.toggle('large-text', S.settings.largeText);
    document.body.classList.toggle('high-contrast', S.settings.highContrast);
    document.body.classList.toggle('reduced-motion', S.settings.reducedMotion);
    FX.setReduced(S.settings.reducedMotion);
    Sound.setSfx(S.settings.sound);
    Sound.setMusic(S.settings.music);
    if (board) board.setTheme(S.settings.boardTheme, S.settings.pieceTheme);
  }

  /* ================= playtime & init ================= */
  setInterval(() => {
    if (document.visibilityState === 'visible' && currentScreen !== 'title'){
      S.stats.playSec++;
      if (S.stats.playSec % 15 === 0) Save.save(S);
    }
  }, 1000);

  function bindNav(){
    $$('#nav .nav-btn').forEach(b => b.onclick = () => {
      Sound.sfx('move');
      const go = b.dataset.go;
      if (go === 'home') goHome();
      else if (go === 'training'){ renderTraining(); show('training'); }
      else if (go === 'collection'){ renderCollection(); show('collection'); }
      else if (go === 'stats'){ renderStats(); show('stats'); }
      else if (go === 'settings'){ renderSettings(); show('settings'); }
    });
    $('#btn-quit').onclick = () => {
      Sound.sfx('move');
      if (play && play.mode === 'vsai' && !play.over){
        confirmModal(t('resign') + '？', () => endVsAI('lose'));
      } else leavePlay();
    };
    $('#btn-hint').onclick = useHint;
    $('#btn-resign').onclick = () => {
      if (play && play.mode === 'vsai' && !play.over) confirmModal(t('resign') + '？', () => endVsAI('lose'));
    };
  }

  function init(){
    I18N.setLang(S.settings.lang);
    FX.init();
    applySettings();
    bindNav();
    renderTitle();
    show('title');
    document.addEventListener('pointerdown', () => Sound.unlock(), { once:true });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { get state(){ return S; } };
})();
