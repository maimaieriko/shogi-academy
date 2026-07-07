/* effects.js — confetti, sparkles and floating text on a fixed canvas overlay. */
const FX = (() => {
  let canvas, ctx, parts = [], texts = [], raf = null, reduced = false;

  function init(){
    canvas = document.getElementById('fx-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize(){
    if (!canvas) return;
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
  }
  function setReduced(v){ reduced = v; }

  const COLORS = ['#E9A73B','#3FB8A8','#E4645C','#7C6BD6','#F2CC5B','#67B7E8'];

  function confetti(n){
    if (reduced){ return; }
    for (let i=0;i<(n||80);i++){
      parts.push({
        x: Math.random()*canvas.width, y: -20*devicePixelRatio,
        vx: (Math.random()-0.5)*3*devicePixelRatio,
        vy: (2+Math.random()*3)*devicePixelRatio,
        rot: Math.random()*Math.PI, vr: (Math.random()-0.5)*0.2,
        w: (5+Math.random()*6)*devicePixelRatio, h:(8+Math.random()*8)*devicePixelRatio,
        color: COLORS[i % COLORS.length], life: 220
      });
    }
    run();
  }

  function burst(clientX, clientY, n){
    if (reduced) return;
    const x = clientX*devicePixelRatio, y = clientY*devicePixelRatio;
    for (let i=0;i<(n||18);i++){
      const a = Math.random()*Math.PI*2, sp = (1+Math.random()*4)*devicePixelRatio;
      parts.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 2*devicePixelRatio,
        rot: 0, vr: 0.3, w: 4*devicePixelRatio, h: 4*devicePixelRatio,
        color: COLORS[Math.floor(Math.random()*COLORS.length)], life: 60, spark: true });
    }
    run();
  }

  function floatText(clientX, clientY, str, color){
    texts.push({ x: clientX*devicePixelRatio, y: clientY*devicePixelRatio,
      str, color: color || '#E9A73B', life: 90 });
    run();
  }

  function run(){
    if (raf) return;
    const loop = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      parts = parts.filter(p => p.life > 0 && p.y < canvas.height + 40);
      for (const p of parts){
        p.x += p.vx; p.y += p.vy; p.vy += 0.06*devicePixelRatio;
        p.rot += p.vr; p.life--;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, p.life/40);
        if (p.spark){ ctx.beginPath(); ctx.arc(0,0,p.w/2,0,7); ctx.fill(); }
        else ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      }
      texts = texts.filter(tx => tx.life > 0);
      for (const tx of texts){
        tx.y -= 0.8*devicePixelRatio; tx.life--;
        ctx.save();
        ctx.globalAlpha = Math.min(1, tx.life/30);
        ctx.font = `bold ${18*devicePixelRatio}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4*devicePixelRatio; ctx.strokeStyle = 'rgba(74,46,23,0.85)';
        ctx.strokeText(tx.str, tx.x, tx.y);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.str, tx.x, tx.y);
        ctx.restore();
      }
      if (parts.length || texts.length) raf = requestAnimationFrame(loop);
      else { raf = null; ctx.clearRect(0,0,canvas.width,canvas.height); }
    };
    raf = requestAnimationFrame(loop);
  }

  return { init, confetti, burst, floatText, setReduced };
})();
