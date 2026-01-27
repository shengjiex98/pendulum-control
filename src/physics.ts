export type Params = {
  m: number;
  l: number;
  g: number;
  b: number;
  tauMax: number;
  kP: number;
  kD: number;
  controlPeriod: number;
  disturbance: number;
};

export type State = {
  theta: number;
  omega: number;
  u: number;
  w: number;
  frame: number;
};

export const DEFAULTS: Params = {
  m: 3,
  l: 1,
  g: 9.81,
  b: 0.5,
  tauMax: 10,
  kP: 60,
  kD: 5,
  controlPeriod: 6,
  disturbance: 0,
};

export function createState(): State {
  return {
    theta: Math.PI - 0.1,
    omega: 0,
    u: 0,
    w: 0,
    frame: 0,
  };
}

export function step(state: State, params: Params, dt: number): void {
  if (state.frame % params.controlPeriod === 0) {
    const error = wrapAngle(state.theta - Math.PI);
    const control = params.kP * error + params.kD * state.omega;
    state.u = clamp(control, -params.tauMax, params.tauMax);
  }

  state.w = -10 * params.disturbance;

  const theta = state.theta;
  const omega = state.omega;
  const m = params.m;
  const l = params.l;
  const g = params.g;
  const b = params.b;

  const omegaDot = (state.w - state.u - m * g * l * Math.sin(theta) - b * omega) / (m * l * l);

  state.theta = theta + omega * dt;
  state.omega = omega + omegaDot * dt;
  state.frame = (state.frame + 1) % 1_000_000;
}

export function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
