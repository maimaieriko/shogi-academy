/* audio.js — all sound is synthesized with WebAudio (no files, fully offline). */
const Sound = (() => {
  let ctx = null, musicGain = null, sfxGain = null;
  let musicOn = true, sfxOn = true;
  let loopTimer = null, curTrack = null, step = 0;

  function ensure(){
    if (!ctx){
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(ctx.destination);
      } catch(e){ return false; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, dur, type, gainV, when, dest){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const t0 = ctx.currentTime + (when||0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gainV || 0.4, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, gainV, when){
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = gainV || 0.25;
    const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value = 2200;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(ctx.currentTime + (when||0));
  }

  const N = { C4:262, D4:294, E4:330, F4:349, G4:392, A4:440, B4:494,
              C5:523, D5:587, E5:659, F5:698, G5:784, A5:880, C6:1047,
              A3:220, G3:196, E3:165, C3:131, D3:147, F3:175 };

  const SFX = {
    move(){ noise(0.06, 0.35); tone(180, 0.08, 'triangle', 0.3); },
    capture(){ noise(0.05, 0.4); tone(160, 0.07, 'triangle', 0.35); tone(120, 0.1, 'triangle', 0.3, 0.06); },
    promote(){ [N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f, 0.14, 'triangle', 0.25, i*0.07)); },
    correct(){ [N.C5,N.E5,N.G5].forEach((f,i)=>tone(f, 0.18, 'sine', 0.3, i*0.08)); },
    wrong(){ tone(196, 0.25, 'sine', 0.2); tone(185, 0.3, 'sine', 0.15, 0.12); },
    coin(){ tone(N.B4*2, 0.06, 'square', 0.12); tone(N.E5*2, 0.16, 'square', 0.12, 0.06); },
    chest(){ tone(N.G4, 0.1, 'triangle', 0.25); [N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,0.12,'triangle',0.2,0.12+i*0.06)); },
    door(){ tone(N.C3, 0.4, 'sawtooth', 0.12); tone(N.G3, 0.4, 'sawtooth', 0.1, 0.15); },
    levelup(){ [N.C5,N.D5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,0.15,'triangle',0.25,i*0.09)); },
    boss(){ tone(N.C3, 0.5, 'sawtooth', 0.2); tone(N.C3*1.06, 0.5, 'sawtooth', 0.15, 0.05); },
    win(){ [N.C5,N.C5,N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f, i<3?0.12:0.3, 'triangle', 0.28, i*0.13)); },
    talk(){ tone(500+Math.random()*300, 0.05, 'square', 0.06); },
    sparkle(){ [N.C6,N.E5*2].forEach((f,i)=>tone(f,0.1,'sine',0.15,i*0.05)); },
  };

  function sfx(name){
    if (!sfxOn) return;
    if (!ensure()) return;
    (SFX[name] || SFX.move)();
  }

  /* Music: gentle pentatonic loops per area, defined as note sequences. */
  const TRACKS = {
    entrance:  { tempo: 300, seq: ['C4','E4','G4','A4','G4','E4','C4', null] },
    classroom: { tempo: 260, seq: ['G4','A4','C5','A4','G4','E4','G4', null] },
    workshop:  { tempo: 220, seq: ['C4','C4','G3','C4','D4','E4','D4','C4'] },
    library:   { tempo: 360, seq: ['E4','G4','A4', null, 'C5','A4','G4', null] },
    clocktower:{ tempo: 280, seq: ['A3','E4','A4','E4','A3','D4','A4','D4'] },
    garden:    { tempo: 320, seq: ['C5','A4','G4','E4','G4','A4','C5', null] },
    musichall: { tempo: 240, seq: ['C4','E4','G4','C5','E5','C5','G4','E4'] },
    shrine:    { tempo: 340, seq: ['A3','C4','E4','A4', null, 'G4','E4','C4'] },
    title:     { tempo: 300, seq: ['C4','G4','E4','C5','A4','G4','E4','G4'] },
  };

  function playMusic(track){
    curTrack = track;
    stopLoop();
    if (!musicOn || !track || !TRACKS[track]) return;
    if (!ensure()) return;
    const tr = TRACKS[track];
    step = 0;
    loopTimer = setInterval(() => {
      if (!musicOn) return;
      const noteName = tr.seq[step % tr.seq.length];
      if (noteName){
        tone(N[noteName], tr.tempo/1000*1.6, 'triangle', 0.5, 0, musicGain);
        if (step % 4 === 0) tone(N[noteName]/2, tr.tempo/1000*2, 'sine', 0.35, 0, musicGain);
      }
      step++;
    }, tr.tempo);
  }
  function stopLoop(){ if (loopTimer){ clearInterval(loopTimer); loopTimer = null; } }

  function setSfx(on){ sfxOn = on; }
  function setMusic(on){
    musicOn = on;
    if (!on) stopLoop(); else playMusic(curTrack);
  }
  function unlock(){ ensure(); } // call on first user gesture

  return { sfx, playMusic, setSfx, setMusic, unlock };
})();
