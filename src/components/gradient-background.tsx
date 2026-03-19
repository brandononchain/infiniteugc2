"use client";

import { useEffect, useRef, useCallback } from "react";

/* ─── GLSL Shaders ─── */
const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Ice-themed cinematic gradient with fluid distortion, blending, and grain
const FRAGMENT_SHADER = `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  float grain(vec2 uv, float t) {
    return fract(sin(dot(uv + t, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = uv;
    p.x *= aspect;

    float t = u_time * 0.08;

    // Distortion field
    float warpStrength = 0.35;
    vec2 warp = vec2(
      fbm(p * 1.8 + vec2(t * 0.7, t * 0.3)),
      fbm(p * 1.8 + vec2(t * -0.4, t * 0.6))
    );
    vec2 distorted = p + warp * warpStrength;

    // Layered noise
    float n1 = fbm(distorted * 1.2 + vec2(t * 0.3, 0.0));
    float n2 = fbm(distorted * 0.8 + vec2(0.0, t * 0.25));
    float n3 = snoise(distorted * 2.5 + vec2(t * 0.15, t * -0.2));

    // Ice color palette
    vec3 colWhite    = vec3(0.94, 0.97, 1.00);
    vec3 colPaleCyan = vec3(0.78, 0.92, 0.98);
    vec3 colSkyBlue  = vec3(0.55, 0.81, 0.96);
    vec3 colMidBlue  = vec3(0.35, 0.62, 0.88);
    vec3 colDeepIce  = vec3(0.22, 0.45, 0.72);
    vec3 colLavender = vec3(0.68, 0.72, 0.92);

    // Blending
    vec3 color = colWhite;
    color = mix(color, colPaleCyan, smoothstep(-0.3, 0.4, n1));
    color = mix(color, colSkyBlue, smoothstep(-0.1, 0.6, n2) * 0.7);
    color = mix(color, colMidBlue, smoothstep(0.1, 0.7, n1 + n2 * 0.5) * 0.45);
    color = mix(color, colDeepIce, smoothstep(0.3, 0.9, n1 * n2) * 0.3);
    color = mix(color, colLavender, smoothstep(-0.2, 0.5, n3) * 0.2);

    // Soft radial vignette
    vec2 center = vec2(0.5 * aspect, 0.5);
    float dist = length(p - center) / (0.7 * aspect);
    color = mix(color, colWhite, smoothstep(0.3, 1.2, dist) * 0.5);

    // Contrast + saturation
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.12);
    color = (color - 0.5) * 1.05 + 0.5;

    // Film grain
    float g = grain(uv * u_resolution.xy * 0.5, u_time * 0.1);
    color += (g - 0.5) * 0.025;

    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ─── Component ─── */
export default function GradientBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeLocRef = useRef<WebGLUniformLocation | null>(null);
  const resLocRef = useRef<WebGLUniformLocation | null>(null);
  const startTimeRef = useRef<number>(0);

  const compileShader = useCallback(
    (gl: WebGLRenderingContext, source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    const vs = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fs = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    timeLocRef.current = gl.getUniformLocation(program, "u_time");
    resLocRef.current = gl.getUniformLocation(program, "u_resolution");
    startTimeRef.current = performance.now() / 1000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = () => {
      const elapsed = performance.now() / 1000 - startTimeRef.current;
      gl.uniform1f(timeLocRef.current, elapsed);
      gl.uniform2f(resLocRef.current, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [compileShader]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #f0f7ff 0%, #c7e0f4 30%, #8ec5e8 60%, #5ba3d9 100%)",
      }}
    />
  );
}
