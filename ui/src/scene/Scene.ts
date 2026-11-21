import vertSrc from './shaders/sky.vert.glsl?raw';
import fragSrc from './shaders/sky.frag.glsl?raw';
import { DEFAULTS, TWEEN_KEYS, UniformTween, type TweenKey } from './uniforms';

type Targets = Partial<Record<TweenKey, number>>;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader compile failed');
  return s;
}

/** Full-screen WebGL2 sky. Renders only while something is moving and the window is visible. */
export class Scene {
  readonly tween = new UniformTween(DEFAULTS);
  /** Smoothed frames per second, for SceneLab. */
  fps = 0;
  private gl: WebGL2RenderingContext;
  private loc = new Map<string, WebGLUniformLocation | null>();
  private raf = 0;
  private last = 0;
  private time = 0;
  private drift = [0, 0];
  private par = [0, 0];
  private parTarget = [0, 0];
  private ro: ResizeObserver;
  private _animate = true;

  constructor(private canvas: HTMLCanvasElement) {
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
    for (const n of [...TWEEN_KEYS, 'uTime', 'uParallax', 'uDrift', 'uRes']) this.loc.set(n, gl.getUniformLocation(prog, n));

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

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else this.run();
  };

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  private run() {
    if (this.raf || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const moving = this.tween.update(now);
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
    const { gl, loc } = this;
    for (const k of TWEEN_KEYS) gl.uniform1f(loc.get(k)!, this.tween.current[k]);
    gl.uniform1f(loc.get('uTime')!, this.time);
    gl.uniform2f(loc.get('uParallax')!, this.par[0], this.par[1]);
    gl.uniform2f(loc.get('uDrift')!, this.drift[0], this.drift[1]);
    gl.uniform2f(loc.get('uRes')!, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
