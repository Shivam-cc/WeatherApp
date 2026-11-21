#version 300 es
precision highp float;

uniform vec2 uRes;
uniform vec2 uDrift;     // cloud offset, integrated on the CPU so wind changes never jump
uniform vec2 uParallax;  // mouse, -1..1
uniform vec3 uBolt;      // x position, shape seed, visibility
uniform float uTime;
uniform float uSeed;
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
// Quality tier
uniform float uOctaves;
uniform float uLayers;
uniform float uPost;     // 0 off, 1 bloom only, 2 bloom + grain + vignette

out vec4 outColor;

const float HORIZON = 0.30;

// smoothstep that also accepts reversed edges (plain smoothstep is undefined for a > b)
float ss(float a, float b, float x) {
  return a < b ? smoothstep(a, b, x) : 1.0 - smoothstep(b, a, x);
}

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
  float a = 0.5, s = 0.0, total = 0.0;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uOctaves) break;
    s += a * vnoise(p);
    total += a;
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s / total * 0.97;
}

// Night navy below -6 deg, blue hour to 0, golden hour to ~10, then day azure.
void palette(float e, out vec3 top, out vec3 hor) {
  vec3 nT = vec3(0.015, 0.03, 0.10), nH = vec3(0.05, 0.08, 0.20);
  vec3 bT = vec3(0.08, 0.12, 0.32),  bH = vec3(0.55, 0.38, 0.58);
  vec3 gT = vec3(0.22, 0.34, 0.62),  gH = vec3(1.00, 0.58, 0.38);
  vec3 dT = vec3(0.14, 0.40, 0.82),  dH = vec3(0.62, 0.80, 0.95);
  float t1 = ss(-9.0, -3.0, e);
  float t2 = ss(-3.0, 3.0, e);
  float t3 = ss(6.0, 14.0, e);
  top = mix(mix(mix(nT, bT, t1), gT, t2), dT, t3);
  hor = mix(mix(mix(nH, bH, t1), gH, t2), dH, t3);
}

vec2 bodyPos(float elev, float x) {
  return vec2(x, HORIZON + clamp(elev, -15.0, 65.0) / 65.0 * 0.58);
}

// ---- precipitation -------------------------------------------------------------------------

// Motion-blurred streaks in sheared columns; the shear is the wind slant.
float rainLayer(vec2 uv, float asp, float scale, float speed, float seed, float slant, float dens) {
  vec2 p = vec2(uv.x * asp + uv.y * slant, uv.y);
  float cx = p.x * scale;
  float id = floor(cx);
  float r = hash11(id * 1.7 + seed + uSeed);
  float on = step(1.0 - dens, r);
  float v = p.y * 2.2 + uTime * speed * (0.8 + 0.4 * hash11(id + seed * 3.1)) + r * 9.0;
  float seg = fract(v);
  float lx = abs(fract(cx) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.04 + 0.03 * hash11(id + 7.0), lx);
  return on * line * smoothstep(0.0, 0.015, seg) * exp(-seg * 22.0);
}

// Expanding ellipse rings on the ground plane.
float ripple(vec2 uv, float asp) {
  float gy = (HORIZON - uv.y) / HORIZON;
  if (gy <= 0.0) return 0.0;
  vec2 g = vec2(uv.x * asp * 14.0, gy * 5.0);
  vec2 id = floor(g);
  float r = hash21(id + uSeed);
  float ph = fract(uTime * 0.7 + r);
  vec2 q = (fract(g) - 0.5) * vec2(1.0, 2.6);
  float ring = 1.0 - smoothstep(0.0, 0.05, abs(length(q) - ph * 0.55));
  return ring * (1.0 - ph) * step(0.5, r);
}

// Flakes in jittered grid cells. Near layers are larger and blurrier (depth of field), and flutter sideways.
float snowLayer(vec2 uv, float asp, float scale, float speed, float size, float blur, float seed) {
  vec2 p = vec2(uv.x * asp, uv.y) * scale;
  p.y += uTime * speed;
  p.x -= uTime * uWindSpeed * 0.004 * speed;
  vec2 id = floor(p) + seed;
  float r = hash21(id + uSeed);
  vec2 c = vec2(0.5 + (hash21(id + 3.3) - 0.5) * 0.5 + sin(uTime * (0.6 + r) + r * 6.28) * 0.15,
                0.5 + (hash21(id + 7.7) - 0.5) * 0.5);
  float d = length(fract(p) - c);
  float sz = size * (0.4 + 0.6 * hash21(id + 9.1));
  return (1.0 - smoothstep(sz * (1.0 - blur), sz, d)) * step(1.0 - uSnow * 0.3, r) * (1.0 - 0.45 * blur);
}

// Soft wind ribbons crossing the sky.
float gust() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float a = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float per = 3.0 + 2.0 * hash11(fi + 1.0);
    float c = uTime / per + hash11(fi * 3.1);
    float ph = fract(c);
    float y0 = 0.35 + 0.55 * hash11(fi * 7.7 + floor(c) * 13.0 + uSeed);
    float len = 0.25 + 0.2 * hash11(fi + 9.0);
    float head = -len + ph * (1.0 + 2.0 * len);
    float t = (head - uv.x) / len;
    float y = y0 + sin((uv.x * 6.0 + uTime) + fi) * 0.008;
    a += step(0.0, t) * step(t, 1.0) * (1.0 - t) * sin(ph * 3.14159) * exp(-abs(uv.y - y) * 420.0);
  }
  return a;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

float shootingStar(vec2 uv, float asp) {
  float slot = floor(uTime / 40.0);
  float local = uTime - slot * 40.0 - hash11(slot + uSeed) * 34.0 - 2.0;
  if (local < 0.0 || local > 1.2) return 0.0;
  vec2 dir = normalize(vec2(1.0, -0.35));
  vec2 head = vec2(0.15 + 0.5 * hash11(slot * 3.3 + uSeed), 0.7 + 0.2 * hash11(slot * 5.1)) + dir * local * 0.8;
  float d = sdSegment(uv * vec2(asp, 1.0), (head - dir * 0.18) * vec2(asp, 1.0), head * vec2(asp, 1.0));
  return exp(-d * 500.0) * (1.0 - local / 1.2);
}

float bolt(vec2 uv, float asp) {
  if (uBolt.z <= 0.0) return 0.0;
  float s = uBolt.y;
  float off = (vnoise(vec2(uv.y * 9.0, s)) - 0.5) * 0.16 + (vnoise(vec2(uv.y * 30.0, s + 4.0)) - 0.5) * 0.04;
  float d = abs((uv.x - (uBolt.x + off)) * asp);
  float yEnd = 0.38 + 0.2 * hash11(s);
  return (exp(-d * 600.0) + 0.25 * exp(-d * 60.0)) * uBolt.z * ss(yEnd, yEnd + 0.05, uv.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float e = uSunElevation;
  float night = ss(-2.0, -10.0, e);
  float dayLight = ss(-8.0, 6.0, e);
  float bl = step(0.5, uPost);

  vec3 top, hor;
  palette(e, top, hor);

  // Layer 0: gradient, plus the glow around the sun.
  float h = clamp((uv.y - HORIZON) / (1.0 - HORIZON), 0.0, 1.0);
  vec3 col = mix(hor, top, pow(h, 0.55));
  vec2 sp = bodyPos(e, 0.62);
  float sd = length((uv - sp) * vec2(asp, 1.0));
  float sunVis = ss(-8.0, 1.0, e);
  vec3 warm = mix(vec3(1.0, 0.55, 0.3), vec3(1.0, 0.95, 0.8), ss(0.0, 25.0, e));
  col += warm * (0.5 * exp(-sd * 3.5) + 0.3 * exp(-sd * 10.0) + 0.18 * bl * exp(-sd * 1.8)) * sunVis;

  // Weather grading: cloud cover and rain desaturate and darken the sky.
  float grey = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, vec3(grey) * (1.0 - 0.3 * uPrecip), uCloudCover * 0.55);
  col *= 1.0 - 0.2 * uCloudCover;

  // Layer 1: stars (twinkling), shooting star, sun disk, moon with phase.
  float clear = (1.0 - uCloudCover * 0.9) * ss(HORIZON, HORIZON + 0.2, uv.y);
  vec2 sg = uv * vec2(asp, 1.0) * 90.0;
  vec2 cell = floor(sg);
  float r = hash21(cell + uSeed);
  vec2 jitter = vec2(hash21(cell + 1.7), hash21(cell + 3.1));
  float star = (1.0 - smoothstep(0.0, 0.05 + 0.1 * hash21(cell + 9.0), length(fract(sg) - jitter)));
  star *= step(0.97, r) * (0.6 + 0.4 * sin(uTime * (1.0 + 3.0 * hash21(cell + 5.0)) + r * 40.0));
  col += vec3(1.0) * (star + shootingStar(uv, asp)) * night * clear;

  col = mix(col, vec3(1.0, 0.96, 0.85), ss(0.03, 0.026, sd) * sunVis * (1.0 - uCloudCover * 0.6));

  vec2 mp = bodyPos(-e, 0.46);
  vec2 mq = (uv - mp) * vec2(asp, 1.0) / 0.034;
  float ml = length(mq);
  float moonVis = ss(-2.0, 4.0, -e);
  col += vec3(0.55, 0.65, 1.0) * 0.10 * exp(-ml * 0.35) * moonVis * (1.0 - uCloudCover * 0.7);
  if (ml < 1.0) {
    vec3 n = vec3(mq, sqrt(1.0 - ml * ml));
    float a = 6.28318 * uMoonPhase;
    float lit = ss(-0.02, 0.06, dot(n, vec3(sin(a), 0.0, -cos(a))));
    vec3 moon = vec3(0.93, 0.92, 0.85) * (0.88 + 0.12 * vnoise(mq * 5.0)) * lit + vec3(0.03, 0.04, 0.07);
    col = mix(col, moon, ss(1.0, 0.94, ml) * moonVis * (1.0 - uCloudCover * 0.75));
  }

  // Layer 2: clouds at two depths (far = smaller, slower, fainter). Wind shears them; lightning lights them.
  float cloudLight = mix(0.1, 1.0, dayLight);
  vec3 cloudBase = mix(vec3(0.12, 0.14, 0.22), vec3(1.0), dayLight);
  cloudBase = mix(cloudBase, normalize(hor + 0.25) * 1.25, 0.35) * (1.0 - 0.45 * uPrecip);
  vec2 toSun = normalize(sp - uv + 1e-4);
  float thr = mix(0.78, 0.36, uCloudCover);
  float shear = ss(15.0, 35.0, uWindSpeed) * 0.5;
  for (int k = 0; k < 2; k++) {
    float depth = k == 0 ? 0.55 : 1.0;
    vec2 q = vec2(uv.x * asp * 1.3, (uv.y - HORIZON) * 2.6) * (1.3 + 1.6 * depth)
           + uDrift * depth + uParallax * 0.15 * depth;
    q.x += q.y * shear;
    float n = fbm(q);
    float dens = ss(thr, thr + 0.22, n);
    float light = clamp((n - fbm(q + toSun * 0.12)) * 4.0 + 0.55, 0.0, 1.0);
    vec3 cc = mix(cloudBase * 0.4, cloudBase, light) * (0.35 + 0.65 * cloudLight);
    cc += vec3(0.55, 0.6, 1.0) * uLightning * (0.35 + 0.6 * light);
    dens *= ss(HORIZON, HORIZON + 0.12, uv.y) * mix(0.55, 0.92, depth);
    col = mix(col, cc, dens);
  }

  // Foreground fog banks drift slowly and hug the horizon.
  vec2 fq = vec2(uv.x * asp * 0.9 + uDrift.x * 0.4, uv.y * 3.5);
  float bank = ss(0.35, 0.75, fbm(fq + 4.0)) * (1.0 - ss(0.1, 0.7, uv.y));
  col = mix(col, mix(hor, vec3(grey), 0.4) * 0.95 + 0.05, bank * uFog * 0.9);

  // Layers 3-4: hazy far skyline, dark near skyline with warm windows at night.
  vec3 deep = vec3(0.12, 0.16, 0.26) * (0.4 + 0.6 * dayLight);
  float fx = uv.x + uParallax.x * 0.004;
  float fid = floor(fx * 38.0);
  float fh = HORIZON + 0.05 + 0.10 * hash11(fid * 1.3) + 0.06 * step(0.8, hash11(fid * 7.1));
  vec3 farCol = mix(mix(hor * 0.7, deep, 0.55), hor, uFog * 0.7);
  col = mix(col, farCol, step(uv.y, fh));

  float nx = uv.x + uParallax.x * 0.012;
  float nid = floor(nx * 22.0);
  float nh = HORIZON + 0.02 + 0.12 * hash11(nid * 2.7 + 11.0) + 0.05 * step(0.85, hash11(nid * 5.3));
  float inNear = step(uv.y, nh);
  vec3 nearCol = mix(vec3(0.025, 0.03, 0.045) + hor * 0.05 * dayLight, hor * 0.5, uFog * 0.5);
  vec2 wg = vec2(nx * 22.0 * 5.0, uv.y * 60.0);
  vec2 wc = floor(wg);
  vec2 wf = fract(wg);
  float win = step(0.2, wf.x) * step(wf.x, 0.7) * step(0.3, wf.y) * step(wf.y, 0.75);
  float on = step(0.55, hash21(wc + nid));
  float flick = 0.85 + 0.15 * sin(uTime * (0.5 + hash21(wc)) + hash21(wc + 4.0) * 6.28);
  float lit = on * flick * night * step(HORIZON + 0.01, uv.y) * inNear;
  col = mix(col, nearCol, inNear);
  col += vec3(1.0, 0.78, 0.45) * win * lit;
  col += vec3(1.0, 0.7, 0.4) * lit * exp(-length(wf - 0.5) * 2.5) * 0.22 * bl; // bloom around lights

  // Layer 5-6: rain, ripples, snow, gusts, bolt.
  float slant = clamp(uWindSpeed / 45.0, 0.0, 0.9);
  float rain = 0.0;
  if (uPrecip > 0.01) {
    float dens = 0.25 + 0.6 * uPrecip;
    for (int i = 0; i < 4; i++) {
      if (float(i) >= uLayers) break;
      float fi = float(i);
      rain += rainLayer(uv, asp, 28.0 + 26.0 * fi, 2.6 + 0.5 * fi, fi * 5.3, slant, dens) * (0.55 - 0.1 * fi);
    }
    col += vec3(0.78, 0.84, 0.95) * rain * (0.5 + 0.5 * uPrecip);
    col += vec3(0.7, 0.78, 0.9) * ripple(uv, asp) * 0.45 * uPrecip;
  }
  if (uSnow > 0.01) {
    float flakes = 0.0;
    for (int i = 0; i < 4; i++) {
      if (float(i) >= uLayers) break;
      float fi = float(i);
      // i = 0 is the nearest layer: big, soft, slow on screen. Later layers are small and crisp.
      flakes += snowLayer(uv, asp, 7.0 + 9.0 * fi + 2.0 * fi * fi, 1.4 + 0.5 * fi, 0.22 + 0.04 * fi, 0.9 - 0.28 * fi, fi * 11.0);
    }
    col = mix(col, vec3(1.0), clamp(flakes, 0.0, 1.0) * 0.9);
  }
  col += vec3(0.85, 0.9, 1.0) * gust() * ss(25.0, 45.0, uWindSpeed) * 0.35;
  float b = bolt(uv, asp);
  col += vec3(0.8, 0.85, 1.0) * b;

  // Fog washes everything toward the horizon colour; lightning flashes the whole frame.
  col = mix(col, mix(hor, vec3(grey), 0.4) * 0.95 + 0.05, uFog * 0.6 * mix(1.0, 0.45, inNear));
  col += vec3(0.75, 0.8, 1.0) * uLightning * 0.32;

  // Post: vignette and film grain on the full tier.
  if (uPost > 1.5) {
    col *= 1.0 - 0.35 * smoothstep(0.5, 1.1, length((uv - 0.5) * vec2(asp, 1.0) * 1.1));
    col += (hash21(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.035;
  }

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
