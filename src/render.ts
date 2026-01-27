import { DEFAULTS, createState, step, clamp } from "./physics";

const canvas = document.getElementById("sim-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const $ = (id: string) => document.getElementById(id)!;

const params = { ...DEFAULTS };
const state = createState();

// Slider bindings: [inputId, valueId, paramKey, formatter]
const sliders: [string, string, keyof typeof params, (v: number) => string][] = [
  ["disturbance", "disturbance-value", "disturbance", (v) => v.toFixed(2)],
  ["max-torque", "max-torque-value", "tauMax", (v) => `${v} Nm`],
  ["kp", "kp-value", "kP", (v) => v.toString()],
  ["kd", "kd-value", "kD", (v) => v.toFixed(1)],
  ["control-period", "control-period-value", "controlPeriod", (v) => `${Math.round(v)}/60 s`],
];

for (const [inputId, valueId, key, fmt] of sliders) {
  const input = $(inputId) as HTMLInputElement;
  const display = $(valueId);
  const update = () => {
    const v = key === "controlPeriod" ? Math.round(Number(input.value)) : Number(input.value);
    (params as Record<string, number>)[key] = v;
    display.textContent = fmt(v);
  };
  input.addEventListener("input", update);
  update();
}

// Canvas resize
let viewWidth = 0, viewHeight = 0;
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  [viewWidth, viewHeight] = [rect.width, rect.height];
}
new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();

// Drawing
const colors = { gravity: "#f59e0b", drag: "#6b7280", control: "#22c55e", disturbance: "#d946ef" };

function worldToCanvas(x: number, y: number) {
  const padding = 44, size = Math.min(viewWidth, viewHeight) - padding * 2;
  const left = (viewWidth - size) / 2, top = (viewHeight - size) / 2;
  return { x: left + ((x + 1.5) / 3) * size, y: top + ((1.5 - y) / 3) * size, left, top, size };
}

function drawArrow(fx: number, fy: number, tx: number, ty: number, color: string) {
  const angle = Math.atan2(ty - fy, tx - fx), h = 10;
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx, ty);
  ctx.lineTo(tx - h * Math.cos(angle - Math.PI / 6), ty - h * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tx - h * Math.cos(angle + Math.PI / 6), ty - h * Math.sin(angle + Math.PI / 6));
  ctx.closePath(); ctx.fill();
}

function drawGrid() {
  const padding = 44, size = Math.min(viewWidth, viewHeight) - padding * 2;
  const l = (viewWidth - size) / 2, t = (viewHeight - size) / 2;

  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const off = (i / 6) * size;
    ctx.beginPath(); ctx.moveTo(l + off, t); ctx.lineTo(l + off, t + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l, t + off); ctx.lineTo(l + size, t + off); ctx.stroke();
  }

  ctx.strokeStyle = "#374151"; ctx.lineWidth = 1.2;
  ctx.strokeRect(l, t, size, size);

  ctx.fillStyle = "#374151"; ctx.font = "12px Space Grotesk";
  for (let i = 0; i <= 6; i++) {
    const val = (-1.5 + i * 0.5).toFixed(1), off = (i / 6) * size;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(val, l + off, t + size + 8);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText((1.5 - i * 0.5).toFixed(1), l - 8, t + off);
  }
}

function render() {
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.fillStyle = "#fbfcfe"; ctx.fillRect(0, 0, viewWidth, viewHeight);
  drawGrid();

  const [pendX, pendY] = [Math.sin(state.theta), -Math.cos(state.theta)];
  const origin = worldToCanvas(0, 0), bob = worldToCanvas(pendX, pendY);

  // Rod
  ctx.strokeStyle = "#111827"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(bob.x, bob.y); ctx.stroke();

  // Bob
  ctx.fillStyle = "#111827";
  ctx.beginPath(); ctx.arc(bob.x, bob.y, (0.1 / 3) * bob.size, 0, Math.PI * 2); ctx.fill();

  // Motor
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111827"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(origin.x, origin.y, (0.09 / 3) * bob.size, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#111827"; ctx.font = "bold 12px Space Grotesk";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("M", origin.x, origin.y + 1);

  // Force arrows
  const s = 0.03, cos = Math.cos(state.theta), sin = Math.sin(state.theta);
  const forces: [number, number, string][] = [
    [0, -params.m * params.l * params.g * s, colors.gravity],
    [-cos * s * params.b * state.omega, -sin * s * params.b * state.omega, colors.drag],
    [-cos * s * state.u, -sin * s * state.u, colors.control],
    [cos * s * state.w, sin * s * state.w, colors.disturbance],
  ];
  for (const [dx, dy, color] of forces) {
    const end = worldToCanvas(pendX + dx, pendY + dy);
    drawArrow(bob.x, bob.y, end.x, end.y, color);
  }
}

// Gamepad
const joystickStatus = $("joystick-status"), joystickValue = $("joystick-value");
function pollGamepad() {
  const pad = navigator.getGamepads?.().find((p) => p?.connected);
  if (!pad) { joystickStatus.textContent = "Disconnected"; joystickValue.textContent = "0.00"; return; }
  joystickStatus.textContent = "Connected";
  const axis = pad.axes[0] ?? 0;
  joystickValue.textContent = axis.toFixed(2);
  if (Math.abs(axis) > 0.05) {
    params.disturbance = clamp(axis, -1, 1);
    ($("disturbance") as HTMLInputElement).value = params.disturbance.toFixed(2);
    $("disturbance-value").textContent = params.disturbance.toFixed(2);
  }
}

// Animation loop
let lastTime = performance.now(), accumulator = 0;
const dt = 1 / 60;

(function animate(now: number) {
  accumulator += Math.min(100, now - lastTime) / 1000;
  lastTime = now;
  pollGamepad();
  while (accumulator >= dt) { step(state, params, dt); accumulator -= dt; }
  render();
  requestAnimationFrame(animate);
})(performance.now());
