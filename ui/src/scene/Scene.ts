import vertSrc from './shaders/sky.vert.glsl?raw';
import fragSrc from './shaders/sky.frag.glsl?raw';
import { DEFAULTS, TWEEN_KEYS, UniformTween, type TweenKey } from './uniforms';
import { QualityController, TIERS, type Tier, type TierName } from './quality';
import { Lightning } from './lightning';
import { introProgress } from './intro';

type Targets = Partial<Record<TweenKey, number>>;
export type QualitySetting = 'auto' | 'high' | 'battery';

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader compile failed');
  return s;
}

const NAMES = ['uTime', 'uSeed', 'uParallax', 'uDrift', 'uRes', 'uBolt', 'uOctaves', 'uLayers', 'uPost', 'uFade', 'uRise'];

/** Full-screen WebGL2 sky. Renders only while something is moving and the window is visible. */
export class Scene {
  readonly tween = new UniformTween(DEFAULTS);
  /** Smoothed frames per second, for SceneLab. */
  fps = 0;
  /** Storm mode: lightning flashes on a seeded schedule. */
  thunder = false;
  /** Current quality tier (changes by itself in auto mode). */
  tier: Tier = TIERS.high;
  private gl: WebGL2RenderingContext;
  private loc = new Map<string, WebGLUniformLocation | null>();
  private raf = 0;
  private lastRaf = 0;
  private lastRender = 0;
  private time = 0;
  private drift = [0, 0];
  private par = [0, 0];
  private parTarget = [0, 0];
  private ro: ResizeObserver;
  private _animate = true;
  private paused = false; // set when the native window is minimized
  private auto: QualityController | null = new QualityController('high');
  private lightning: Lightning;
  // Launch intro: -1 = not started, -2 = finished or skipped.
  private introStart = -1;
  private fade = 1;
  private rise = 1;

  /**
   * @param seed all randomness (lightning schedule, particle hashes) derives from it
   * @param fixedClock when set, scene time starts here and lightning stays on even if frozen (tests, screenshots)
   */
  constructor(
    private canvas: HTMLCanvasElement,
    private seed = 1,
    private fixedClock?: number,
  ) {
    this.time = fixedClock ?? 0;
    if (fixedClock !== undefined) this.introStart = -2; // reproducible frames skip the intro
    this.lightning = new Lightning(seed);
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
    gl.useProgram(prog);
    gl.bindVertexArray(gl.createVertexArray()); // attribute-less draw still needs a VAO bound
    for (const n of [...TWEEN_KEYS, ...NAMES]) this.loc.set(n, gl.getUniformLocation(prog, n));

    this.ro = new ResizeObserver(() => {
      this.resize();
      this.run();
    });
    this.ro.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    this.run();
  }

  /** false = static frame: time and parallax freeze, tweens still play. */
  get animate() {
    return this._animate;
  }
  set animate(v: boolean) {
    this._animate = v;
    if (!v) this.parTarget = [0, 0];
    this.run();
  }

  /** 'auto' adapts to frame rate; the others pin a tier. */
  setQuality(q: QualitySetting) {
    this.auto = q === 'auto' ? new QualityController(this.tier.name) : null;
    if (q !== 'auto') this.applyTier(q === 'high' ? 'high' : 'low');
  }

  setTarget(t: Targets) {
    this.tween.set(t, performance.now());
    this.run();
  }

  /** Jump straight to values (first paint, SceneLab). */
  snap(t: Targets) {
    this.tween.snap(t);
    this.run();
  }

  setParallax(x: number, y: number) {
    if (!this._animate) return;
    this.parTarget = [x, y];
    this.run();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private applyTier(name: TierName) {
    this.tier = TIERS[name];
    this.resize();
    this.run();
  }

  /** WebView2 does not report a minimized window as hidden, so the shell tells us. */
  setPaused(v: boolean) {
    this.paused = v;
    if (v) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else this.run();
  }

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else this.run();
  };

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.tier.maxDpr);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  private run() {
    if (this.raf || document.hidden || this.paused) return;
    this.lastRaf = this.lastRender = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    const gap = now - this.lastRaf;
    this.lastRaf = now;
    // Quality is judged on the gap between animation frames, whether or not we drew this one.
    if (this.auto && this._animate) {
      const next = this.auto.sample(gap, now);
      if (next) this.applyTier(next);
    }
    // Frame-rate cap: skip drawing, keep the loop alive.
    if (this._animate && now - this.lastRender < 1000 / this.tier.fps - 2) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const dt = Math.min((now - this.lastRender) / 1000, 0.1);
    this.lastRender = now;

    let moving = this.tween.update(now);
    if (this.introStart !== -2) {
      if (!this._animate) this.introStart = -2;
      else {
        if (this.introStart === -1) this.introStart = now;
        const p = introProgress(now - this.introStart);
        this.fade = p.fade;
        this.rise = p.rise;
        if (p.done) this.introStart = -2;
        else moving = true;
      }
      if (this.introStart === -2) this.fade = this.rise = 1;
    }
    const u = this.tween.current;
    let parMoving = false;
    if (this._animate) {
      this.time += dt;
      // Wind pushes clouds mostly rightwards; a westerly (270 deg) is fastest.
      const speed = 0.004 + u.uWindSpeed * 0.0006;
      this.drift[0] += dt * speed * Math.min(1, Math.max(-0.3, 0.4 - Math.sin(u.uWindDir) * 0.6));
      this.drift[1] += dt * speed * 0.05;
      for (let i = 0; i < 2; i++) {
        this.par[i] += (this.parTarget[i] - this.par[i]) * Math.min(1, dt * 4);
        parMoving ||= Math.abs(this.parTarget[i] - this.par[i]) > 0.001;
      }
      if (dt > 0) this.fps = this.fps * 0.9 + (1 / dt) * 0.1;
    }
    this.draw();
    if (this._animate || moving || parMoving) this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    const { gl, loc, tier } = this;
    for (const k of TWEEN_KEYS) gl.uniform1f(loc.get(k)!, this.tween.current[k]);
    // Storms flash while animating, or on a fixed clock for reproducible frames; frozen scenes stay calm.
    const flash = this.thunder && (this._animate || this.fixedClock !== undefined) ? this.lightning.at(this.time) : null;
    gl.uniform1f(loc.get('uLightning')!, Math.max(this.tween.current.uLightning, flash?.env ?? 0));
    gl.uniform3f(loc.get('uBolt')!, flash?.x ?? 0, flash?.seed ?? 0, flash?.bolt ?? 0);
    gl.uniform1f(loc.get('uTime')!, this.time);
    gl.uniform1f(loc.get('uSeed')!, this.seed % 997);
    gl.uniform2f(loc.get('uParallax')!, this.par[0], this.par[1]);
    gl.uniform2f(loc.get('uDrift')!, this.drift[0], this.drift[1]);
    gl.uniform2f(loc.get('uRes')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(loc.get('uOctaves')!, tier.octaves);
    gl.uniform1f(loc.get('uLayers')!, tier.layers);
    gl.uniform1f(loc.get('uPost')!, tier.post);
    gl.uniform1f(loc.get('uFade')!, this.fade);
    gl.uniform1f(loc.get('uRise')!, this.rise);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
