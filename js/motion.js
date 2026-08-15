const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function runReveal(root = document) {
  const items = [...root.querySelectorAll(".reveal")];
  items.forEach((el, i) => {
    el.style.setProperty("--delay", `${Math.min(i * 70, 560)}ms`);
    requestAnimationFrame(() => el.classList.add("is-in"));
  });
}

export function startAmbient() {
  if (reduced) return;
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let raf = 0;

  const particles = Array.from({ length: 64 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.7 + Math.random() * 2.2,
    s: 0.1 + Math.random() * 0.35,
    a: 0.18 + Math.random() * 0.4,
    hue: Math.random() > 0.5 ? "61,214,198" : Math.random() > 0.5 ? "240,163,94" : "58,160,255",
  }));

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function frame(t) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      const y = ((p.y * window.innerHeight) - (t * p.s * 0.02)) % window.innerHeight;
      const yy = y < 0 ? y + window.innerHeight : y;
      const x = p.x * window.innerWidth + Math.sin(t * 0.0004 + p.x * 8) * 12;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.hue},${p.a})`;
      ctx.arc(x, yy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}

export function pulseRingNodes(svg) {
  if (!svg || reduced) return;
  svg.querySelectorAll(".cycle-node").forEach((node, i) => {
    node.style.animationDelay = `${i * 40}ms`;
    node.classList.add("node-enter");
  });
}
