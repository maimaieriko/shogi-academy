/* save.js — resilient localStorage persistence + backup export/import. */
const Save = (() => {
  const KEY = 'shogi-academy-save-v1';

  function defaults(){
    return {
      ver: 1,
      name: '', avatar: '🧒', hat: '',
      created: Date.now(),
      xp: 0, coins: 0,
      solved: {},            // puzzleId -> {stars, tries, best:sec}
      quests: {},            // questId -> 'active' | 'done'
      areasUnlocked: ['entrance'],
      restored: {},          // areaId -> 0..100
      met: {},               // npcId -> friendship count
      collect: { stars: [], gears: [], scrolls: [] },
      ach: {},               // achievementId -> timestamp
      bossBeaten: {},        // bossId -> true
      daily: { lastLogin: '', loginStreak: 0, claimed: '', puzzleDone: '' },
      stats: {
        attempts: 0, correct: 0, hints: 0, playSec: 0,
        byCat: {}, days: {},  // days: 'YYYY-MM-DD' -> solved count
        streak: 0, bestStreak: 0, aiWins: {}, timeSum: 0, timeN: 0,
        mistakes: {}, firstTry: 0, noHint: 0, dailyCount: 0, talks: 0
      },
      settings: {
        lang: 'ja', sound: true, music: true,
        largeText: false, highContrast: false, reducedMotion: false,
        boardTheme: 'wood', pieceTheme: 'classic'
      },
      owned: { boards: ['wood'], pieces: ['classic'], hats: [''] },
      tutorialDone: false
    };
  }

  function merge(base, data){
    for (const k in base){
      if (data[k] === undefined) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof data[k] === 'object' && !Array.isArray(data[k])){
        merge(base[k], data[k]);
      } else base[k] = data[k];
    }
    return base;
  }

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('bad save');
      return merge(defaults(), data); // corrupted/missing fields recover to defaults
    } catch (e){
      console.warn('save recovery:', e);
      return defaults();
    }
  }

  let timer = null;
  function save(S){
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ /* storage full/blocked: keep playing */ }
  }
  function saveSoon(S){
    clearTimeout(timer);
    timer = setTimeout(()=>save(S), 400);
  }

  function exportJSON(S){
    const blob = new Blob([JSON.stringify(S, null, 1)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shogi-academy-save.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  }

  function importJSON(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (!data || typeof data !== 'object' || data.ver === undefined) throw new Error('not a save');
          resolve(merge(defaults(), data));
        } catch(e){ reject(e); }
      };
      r.onerror = () => reject(new Error('read failed'));
      r.readAsText(file);
    });
  }

  function reset(){ try{ localStorage.removeItem(KEY); }catch(e){} }

  return { load, save, saveSoon, exportJSON, importJSON, reset, defaults };
})();
