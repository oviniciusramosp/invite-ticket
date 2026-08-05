/**
 * Holographic invite ticket — tilt + holo + flip
 * Interaction model inspired by simeydotme/pokemon-cards-css
 */

const ticket = document.getElementById("ticket");
const flipHint = document.getElementById("flipHint");

const clamp = (n, min = 0, max = 100) => Math.min(Math.max(n, min), max);
const round = (n, d = 2) => {
  const p = 10 ** d;
  return Math.round((n + Number.EPSILON) * p) / p;
};
const adjust = (v, fromMin, fromMax, toMin, toMax) =>
  toMin + ((toMax - toMin) * (v - fromMin)) / (fromMax - fromMin);

/** Smooth state (lerped toward targets) */
const state = {
  rx: 0,
  ry: 0,
  gx: 50,
  gy: 50,
  bx: 50,
  by: 50,
  o: 0,
  scale: 1,
};

const target = { ...state };

let flipped = false;
let interacting = false;
let flipping = false;
let rafId = null;
let snapTimeout = null;
let idleRaf = null;
let idleT = Math.random() * Math.PI * 2;
let lastTs = 0;

function setCss() {
  const fromCenter = clamp(
    Math.sqrt((state.gy - 50) ** 2 + (state.gx - 50) ** 2) / 50,
    0,
    1
  );

  // Pointer vars drive radial gradients — must stay in sync with the cursor
  ticket.style.setProperty("--pointer-x", `${round(state.gx, 2)}%`);
  ticket.style.setProperty("--pointer-y", `${round(state.gy, 2)}%`);
  ticket.style.setProperty("--pointer-from-center", String(round(fromCenter, 3)));
  ticket.style.setProperty("--pointer-from-top", String(round(state.gy / 100, 3)));
  ticket.style.setProperty("--pointer-from-left", String(round(state.gx / 100, 3)));
  ticket.style.setProperty("--background-x", `${round(state.bx, 2)}%`);
  ticket.style.setProperty("--background-y", `${round(state.by, 2)}%`);
  ticket.style.setProperty("--rotate-x", `${round(state.rx, 2)}deg`);
  ticket.style.setProperty("--rotate-y", `${round(state.ry, 2)}deg`);
  ticket.style.setProperty("--card-opacity", String(round(state.o, 3)));
  ticket.style.setProperty("--card-scale", String(round(state.scale, 3)));
  ticket.style.setProperty("--flip", flipped ? "180deg" : "0deg");
}

/** Write pointer immediately (no lerp lag) so shine sticks to the cursor */
function setPointerCss(gx, gy, bx, by) {
  const fromCenter = clamp(
    Math.sqrt((gy - 50) ** 2 + (gx - 50) ** 2) / 50,
    0,
    1
  );
  ticket.style.setProperty("--pointer-x", `${round(gx, 2)}%`);
  ticket.style.setProperty("--pointer-y", `${round(gy, 2)}%`);
  ticket.style.setProperty("--pointer-from-center", String(round(fromCenter, 3)));
  ticket.style.setProperty("--pointer-from-top", String(round(gy / 100, 3)));
  ticket.style.setProperty("--pointer-from-left", String(round(gx / 100, 3)));
  ticket.style.setProperty("--background-x", `${round(bx, 2)}%`);
  ticket.style.setProperty("--background-y", `${round(by, 2)}%`);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function tick(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 16.67, 2.5);
  lastTs = ts;

  // Tilt/opacity ease; pointer snaps hard while interacting (see setPointerCss)
  const k = interacting ? 0.22 : 0.08;
  const t = 1 - Math.pow(1 - k, dt);
  const pk = interacting ? 0.55 : 0.1;
  const pt = 1 - Math.pow(1 - pk, dt);

  state.rx = lerp(state.rx, target.rx, t);
  state.ry = lerp(state.ry, target.ry, t);
  state.gx = lerp(state.gx, target.gx, pt);
  state.gy = lerp(state.gy, target.gy, pt);
  state.bx = lerp(state.bx, target.bx, pt);
  state.by = lerp(state.by, target.by, pt);
  state.o = lerp(state.o, target.o, t);
  state.scale = lerp(state.scale, target.scale, t);

  setCss();

  const settled =
    !interacting &&
    Math.abs(state.rx - target.rx) < 0.05 &&
    Math.abs(state.o - target.o) < 0.01 &&
    Math.abs(state.scale - target.scale) < 0.002;

  if (settled && !flipping) {
    rafId = null;
    lastTs = 0;
    startIdle();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  stopIdle();
  if (rafId == null) {
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
  }
}

/** Soft idle orbit so the holo is visible without hover */
function idleStep(ts) {
  idleT += 0.012;
  const sx = Math.sin(idleT);
  const cy = Math.cos(idleT * 0.85);

  target.rx = sx * 8;
  target.ry = cy * 5;
  target.gx = 50 + sx * 28;
  target.gy = 50 + cy * 22;
  target.bx = 50 + sx * 10;
  target.by = 50 + cy * 8;
  target.o = 0.45 + Math.abs(sx) * 0.2;
  target.scale = 1;

  // Direct-ish write for idle (cheaper)
  state.rx = lerp(state.rx, target.rx, 0.06);
  state.ry = lerp(state.ry, target.ry, 0.06);
  state.gx = lerp(state.gx, target.gx, 0.06);
  state.gy = lerp(state.gy, target.gy, 0.06);
  state.bx = lerp(state.bx, target.bx, 0.06);
  state.by = lerp(state.by, target.by, 0.06);
  state.o = lerp(state.o, target.o, 0.06);
  setCss();

  idleRaf = requestAnimationFrame(idleStep);
}

function startIdle() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    target.rx = 0;
    target.ry = 0;
    target.gx = 50;
    target.gy = 50;
    target.bx = 50;
    target.by = 50;
    target.o = 0.35;
    target.scale = 1;
    Object.assign(state, target);
    setCss();
    return;
  }
  if (idleRaf == null && !interacting && !flipping) {
    idleRaf = requestAnimationFrame(idleStep);
  }
}

function stopIdle() {
  if (idleRaf != null) {
    cancelAnimationFrame(idleRaf);
    idleRaf = null;
  }
}

function interactFromEvent(e) {
  const point = e.touches ? e.touches[0] : e;
  // Ticket AABB (same approach as poke-holo); works with mild 3D tilt
  const rect = ticket.getBoundingClientRect();
  const absX = point.clientX - rect.left;
  const absY = point.clientY - rect.top;
  const pct = {
    x: clamp(round((100 / Math.max(rect.width, 1)) * absX, 2)),
    y: clamp(round((100 / Math.max(rect.height, 1)) * absY, 2)),
  };
  const center = { x: pct.x - 50, y: pct.y - 50 };

  const bx = adjust(pct.x, 0, 100, 30, 70);
  const by = adjust(pct.y, 0, 100, 30, 70);

  // Landscape ticket: slightly stronger horizontal tilt feels better
  target.rx = round(-(center.x / 3.2), 2);
  target.ry = round(center.y / 4, 2);
  target.gx = pct.x;
  target.gy = pct.y;
  target.bx = bx;
  target.by = by;
  target.o = 1;
  target.scale = 1.04;

  // Instant pointer for shine (tilt still eases via RAF)
  state.gx = pct.x;
  state.gy = pct.y;
  state.bx = bx;
  state.by = by;
  state.o = Math.max(state.o, 0.85);
  setPointerCss(pct.x, pct.y, bx, by);
  ticket.style.setProperty("--card-opacity", String(round(state.o, 3)));

  ensureLoop();
}

function onPointerMove(e) {
  if (flipping) return;
  interacting = true;
  ticket.classList.add("is-interacting");
  interactFromEvent(e);
}

function onPointerLeave() {
  interacting = false;
  ticket.classList.remove("is-interacting");

  clearTimeout(snapTimeout);
  snapTimeout = setTimeout(() => {
    target.rx = 0;
    target.ry = 0;
    target.gx = 50;
    target.gy = 50;
    target.bx = 50;
    target.by = 50;
    target.o = 0.4;
    target.scale = 1;
    ensureLoop();
  }, 120);
}

function flip() {
  if (flipping) return;
  flipping = true;
  interacting = false;
  ticket.classList.add("is-flipping");
  ticket.classList.remove("is-interacting");
  stopIdle();

  // Flatten tilt during flip so the 180° reads cleanly
  target.rx = 0;
  target.ry = 0;
  target.scale = 1.02;
  target.o = 0.7;
  ensureLoop();

  flipped = !flipped;
  ticket.classList.toggle("is-flipped", flipped);
  ticket.setAttribute("aria-pressed", String(flipped));
  flipHint.textContent = flipped
    ? "Clique novamente para ver a frente"
    : "Clique no ticket para revelar o verso";
  flipHint.classList.toggle("is-flipped", flipped);

  window.setTimeout(() => {
    flipping = false;
    ticket.classList.remove("is-flipping");
    target.scale = 1;
    target.o = 0.45;
    ensureLoop();
  }, 720);
}

// Pointer / mouse
ticket.addEventListener("pointermove", onPointerMove);
ticket.addEventListener("pointerenter", onPointerMove);
ticket.addEventListener("pointerleave", onPointerLeave);
ticket.addEventListener("pointerdown", (e) => {
  // Capture for smooth drag-tilt on touch
  ticket.setPointerCapture?.(e.pointerId);
});

ticket.addEventListener("click", (e) => {
  // Ignore pure drag-end as flip if pointer moved a lot — keep simple: always flip on click
  e.preventDefault();
  flip();
});

ticket.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    flip();
  }
});

// Touch: prevent page scroll while dragging on ticket
ticket.addEventListener(
  "touchmove",
  (e) => {
    if (interacting) e.preventDefault();
  },
  { passive: false }
);

/* ─── Golden ↔ Orange mode ───────────────────────────────── */
const ART = {
  golden: {
    front: "assets/frente.svg?v=5",
    back: "assets/verso.svg?v=5",
    label: "Golden ticket",
    nextHint: "Trocar para orange",
  },
  orange: {
    front: "assets/orange-frente.svg?v=5",
    back: "assets/orange-verso.svg?v=5",
    label: "Orange ticket",
    nextHint: "Trocar para golden",
  },
};

const artFront = document.getElementById("artFront");
const artBack = document.getElementById("artBack");
const modeToggle = document.getElementById("modeToggle");
const modeToggleLabel = document.getElementById("modeToggleLabel");

let ticketMode = "golden";

function setTicketMode(mode) {
  if (!ART[mode]) return;
  ticketMode = mode;

  const pack = ART[mode];
  artFront.src = pack.front;
  artBack.src = pack.back;

  ticket.dataset.mode = mode;
  modeToggle.dataset.mode = mode;
  modeToggle.setAttribute("aria-pressed", String(mode === "orange"));
  modeToggleLabel.textContent = pack.label;
  modeToggle.setAttribute(
    "aria-label",
    `${pack.label}. ${pack.nextHint}.`
  );
  document.body.dataset.ticketMode = mode;
}

modeToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  setTicketMode(ticketMode === "golden" ? "orange" : "golden");
});

// Boot
setTicketMode("golden");
setCss();
startIdle();
