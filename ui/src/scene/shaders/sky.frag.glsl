#version 300 es
precision highp float;

uniform vec2 uRes;
uniform vec2 uDrift;     // cloud offset, integrated on the CPU so wind changes never jump
uniform vec2 uParallax;  // mouse, -1..1
uniform float uTime;
uniform float uSunElevation;
uniform float uIsDay;
uniform float uCloudCover;
uniform float uPrecip;
uniform float uSnow;
uniform float uWindSpeed;
uniform float uWindDir;
uniform float uFog;
uniform float uLightning;
uniform float uMoonPhase;

out vec4 outColor;

const float HORIZON = 0.30;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}

float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s;
}

// Night navy below -6 deg, blue hour to 0, golden hour to ~10, then day azure.
void palette(float e, out vec3 top, out vec3 hor) {
  vec3 nT = vec3(0.015, 0.03, 0.10), nH = vec3(0.05, 0.08, 0.20);
  vec3 bT = vec3(0.08, 0.12, 0.32),  bH = vec3(0.55, 0.38, 0.58);
  vec3 gT = vec3(0.22, 0.34, 0.62),  gH = vec3(1.00, 0.58, 0.38);
  vec3 dT = vec3(0.14, 0.40, 0.82),  dH = vec3(0.62, 0.80, 0.95);
  float t1 = smoothstep(-9.0, -3.0, e);
  float t2 = smoothstep(-3.0, 3.0, e);
  float t3 = smoothstep(6.0, 14.0, e);
  top = mix(mix(mix(nT, bT, t1), gT, t2), dT, t3);
  hor = mix(mix(mix(nH, bH, t1), gH, t2), dH, t3);
}

vec2 bodyPos(float elev, float x) {
  return vec2(x, HORIZON + clamp(elev, -15.0, 65.0) / 65.0 * 0.58);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float e = uSunElevation;
  float night = smoothstep(-2.0, -10.0, e);
  float dayLight = smoothstep(-8.0, 6.0, e);

  vec3 top, hor;
  palette(e, top, hor);

  // Layer 0: gradient, plus the glow around the sun.
  float h = clamp((uv.y - HORIZON) / (1.0 - HORIZON), 0.0, 1.0);
  vec3 col = mix(hor, top, pow(h, 0.55));
  vec2 sp = bodyPos(e, 0.62);
  float sd = length((uv - sp) * vec2(asp, 1.0));
  float sunVis = smoothstep(-8.0, 1.0, e);
  vec3 warm = mix(vec3(1.0, 0.55, 0.3), vec3(1.0, 0.95, 0.8), smoothstep(0.0, 25.0, e));
  col += warm * (0.5 * exp(-sd * 3.5) + 0.3 * exp(-sd * 10.0)) * sunVis;

  // Weather grading: cloud cover and rain desaturate and darken the sky.
  float grey = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, vec3(grey) * (1.0 - 0.3 * uPrecip), uCloudCover * 0.55);
  col *= 1.0 - 0.2 * uCloudCover;

  // Layer 1: stars (twinkling), sun disk, moon with phase.
  vec2 sg = uv * vec2(asp, 1.0) * 90.0;
  vec2 cell = floor(sg);
  float r = hash21(cell);
  vec2 jitter = vec2(hash21(cell + 1.7), hash21(cell + 3.1));
  float star = smoothstep(0.05 + 0.1 * hash21(cell + 9.0), 0.0, length(fract(sg) - jitter));
  star *= step(0.97, r) * (0.6 + 0.4 * sin(uTime * (1.0 + 3.0 * hash21(cell + 5.0)) + r * 40.0));
  col += vec3(1.0) * star * night * (1.0 - uCloudCover * 0.9) * smoothstep(HORIZON, HORIZON + 0.2, uv.y);

  float disk = smoothstep(0.03, 0.026, sd);
  col = mix(col, vec3(1.0, 0.96, 0.85), disk * sunVis * (1.0 - uCloudCover * 0.6));

  vec2 mp = bodyPos(-e, 0.46);
  vec2 mq = (uv - mp) * vec2(asp, 1.0) / 0.034;
  float ml = length(mq);
  float moonVis = smoothstep(-2.0, 4.0, -e);
  col += vec3(0.55, 0.65, 1.0) * 0.10 * exp(-ml * 0.35) * moonVis * (1.0 - uCloudCover * 0.7);
  if (ml < 1.0) {
    vec3 n = vec3(mq, sqrt(1.0 - ml * ml));
    float a = 6.28318 * uMoonPhase;
    float lit = smoothstep(-0.02, 0.06, dot(n, vec3(sin(a), 0.0, -cos(a))));
    float crater = 0.88 + 0.12 * vnoise(mq * 5.0);
    vec3 moon = vec3(0.93, 0.92, 0.85) * crater * lit + vec3(0.03, 0.04, 0.07);
    col = mix(col, moon, smoothstep(1.0, 0.94, ml) * moonVis * (1.0 - uCloudCover * 0.75));
  }

  // Layer 2: clouds at two depths (far = smaller, slower, fainter).
  float cloudLight = mix(0.1, 1.0, dayLight);
  vec3 cloudBase = mix(vec3(0.12, 0.14, 0.22), vec3(1.0), dayLight);
  cloudBase = mix(cloudBase, normalize(hor + 0.25) * 1.25, 0.35) * (1.0 - 0.45 * uPrecip);
  vec2 toSun = normalize(sp - uv + 1e-4);
  float thr = mix(0.78, 0.36, uCloudCover);
  for (int k = 0; k < 2; k++) {
    float depth = k == 0 ? 0.55 : 1.0;
    vec2 q = vec2(uv.x * asp * 1.3, (uv.y - HORIZON) * 2.6) * (1.3 + 1.6 * depth)
           + uDrift * depth + uParallax * 0.15 * depth;
    float n = fbm(q);
    float dens = smoothstep(thr, thr + 0.22, n);
    float light = clamp((n - fbm(q + toSun * 0.12)) * 4.0 + 0.55, 0.0, 1.0);
    vec3 cc = mix(cloudBase * 0.4, cloudBase, light) * (0.35 + 0.65 * cloudLight);
    dens *= smoothstep(HORIZON, HORIZON + 0.12, uv.y) * mix(0.55, 0.92, depth);
    col = mix(col, cc, dens);
  }

  // Layers 3-4: hazy far skyline, dark near skyline with warm windows at night.
  vec3 deep = vec3(0.12, 0.16, 0.26) * (0.4 + 0.6 * dayLight);
  float fx = uv.x + uParallax.x * 0.004;
  float fid = floor(fx * 38.0);
  float fh = HORIZON + 0.05 + 0.10 * hash11(fid * 1.3) + 0.06 * step(0.8, hash11(fid * 7.1));
  vec3 farCol = mix(hor * 0.7, deep, 0.55);
  farCol = mix(farCol, hor, uFog * 0.7);
  col = mix(col, farCol, step(uv.y, fh));

  float nx = uv.x + uParallax.x * 0.012;
  float nid = floor(nx * 22.0);
  float nh = HORIZON + 0.02 + 0.12 * hash11(nid * 2.7 + 11.0) + 0.05 * step(0.85, hash11(nid * 5.3));
  bool inNear = uv.y < nh;
  vec3 nearCol = vec3(0.025, 0.03, 0.045) + hor * 0.05 * dayLight;
  nearCol = mix(nearCol, hor * 0.5, uFog * 0.5);
  vec2 wg = vec2(nx * 22.0 * 5.0, uv.y * 60.0);
  vec2 wc = floor(wg);
  vec2 wf = fract(wg);
  float win = step(0.2, wf.x) * step(wf.x, 0.7) * step(0.3, wf.y) * step(wf.y, 0.75);
  float on = step(0.55, hash21(wc + nid));
  float flick = 0.85 + 0.15 * sin(uTime * (0.5 + hash21(wc)) + hash21(wc + 4.0) * 6.28);
  vec3 windows = vec3(1.0, 0.78, 0.45) * win * on * flick * night * step(HORIZON + 0.01, uv.y);
  col = mix(col, nearCol, inNear ? 1.0 : 0.0);
  col += windows * (inNear ? 1.0 : 0.0);

  // Fog washes everything toward the horizon colour.
  col = mix(col, mix(hor, vec3(grey), 0.4) * 0.95 + 0.05, uFog * 0.5 * (inNear ? 0.4 : 1.0));

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
