import * as THREE from "three";

const PARALLAX_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const PARALLAX_FRAGMENT = `
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uDepthMap;
uniform vec2 uOffset;
uniform float uDepthScale;
uniform float uZoom;
uniform vec2 uFocus;
uniform float uRotation;
uniform float uTiltX;
uniform float uTiltY;
uniform vec2 uResolution;
varying vec2 vUv;

float sampleDepthBlurred(vec2 uv) {
  vec2 texel = 1.0 / uResolution;
  float d = 0.0;
  float total = 0.0;
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      float w = 1.0 / (1.0 + abs(x) + abs(y));
      d += texture2D(uDepthMap, clamp(uv + vec2(x, y) * texel * 3.0, 0.0, 1.0)).r * w;
      total += w;
    }
  }
  return d / total;
}

void main() {
  vec2 centeredUv = vUv - 0.5;

  float cosR = cos(uRotation);
  float sinR = sin(uRotation);
  centeredUv = vec2(
    centeredUv.x * cosR - centeredUv.y * sinR,
    centeredUv.x * sinR + centeredUv.y * cosR
  );

  centeredUv.x += centeredUv.y * uTiltX * 0.15;
  centeredUv.y += centeredUv.x * uTiltY * 0.15;

  vec2 baseUv = centeredUv / uZoom + 0.5 + uFocus;

  float depth = sampleDepthBlurred(baseUv);

  float nearFar = smoothstep(0.0, 1.0, depth);
  float displacement = (nearFar - 0.5) * uDepthScale;

  vec2 displaced = baseUv + uOffset * displacement;

  float depth2 = sampleDepthBlurred(displaced);
  float displacement2 = (smoothstep(0.0, 1.0, depth2) - 0.5) * uDepthScale;
  displaced = baseUv + uOffset * displacement2;

  vec2 edgeDist = abs(displaced - 0.5) * 2.0;
  float edgeFade = 1.0 - smoothstep(0.85, 1.0, max(edgeDist.x, edgeDist.y));

  float borderDist = min(min(displaced.x, 1.0 - displaced.x), min(displaced.y, 1.0 - displaced.y));
  float borderFade = smoothstep(0.0, 0.03, borderDist);

  vec4 color = texture2D(uTexture, clamp(displaced, 0.002, 0.998));

  color.rgb *= edgeFade * borderFade;

  gl_FragColor = color;
}
`;

export class ParallaxRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private photoTexture: THREE.Texture | null = null;
  private depthTexture: THREE.Texture | null = null;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setPhoto(imageDataUrl: string, depthDataUrl: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.photoTexture) this.photoTexture.dispose();
      if (this.depthTexture) this.depthTexture.dispose();
      if (this.mesh) {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh = null;
      }
      if (this.material) {
        this.material.dispose();
        this.material = null;
      }

      const loader = new THREE.TextureLoader();

      const loadTexture = (url: string): Promise<THREE.Texture> =>
        new Promise((res, rej) => {
          loader.load(url, (tex) => {
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            res(tex);
          }, undefined, rej);
        });

      loadTexture(imageDataUrl)
        .then((photoTex) => {
          photoTex.colorSpace = THREE.SRGBColorSpace;
          this.photoTexture = photoTex;

          if (depthDataUrl) {
            return loadTexture(depthDataUrl).then((depthTex) => {
              this.depthTexture = depthTex;
            }).catch(() => {
              this.depthTexture = null;
            });
          }
          this.depthTexture = null;
        })
        .then(() => {
          const fallbackDepth = this.depthTexture || this.createFlatDepthTexture();

          this.material = new THREE.ShaderMaterial({
            uniforms: {
              uTexture: { value: this.photoTexture },
              uDepthMap: { value: fallbackDepth },
              uOffset: { value: new THREE.Vector2(0, 0) },
              uDepthScale: { value: 0.8 },
              uZoom: { value: 1.06 },
              uFocus: { value: new THREE.Vector2(0, 0) },
              uRotation: { value: 0.0 },
              uTiltX: { value: 0.0 },
              uTiltY: { value: 0.0 },
              uResolution: { value: new THREE.Vector2(this.width, this.height) },
            },
            vertexShader: PARALLAX_VERTEX,
            fragmentShader: PARALLAX_FRAGMENT,
          });

          const geometry = new THREE.PlaneGeometry(2, 2);
          this.mesh = new THREE.Mesh(geometry, this.material);
          this.scene.add(this.mesh);

          resolve();
        })
        .catch((err) => {
          reject(err || new Error("Failed to load photo texture"));
        });
    });
  }

  private createFlatDepthTexture(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, 2, 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  setCameraForMotion(motionType: string, progress: number, focusPoint?: { x: number; y: number }) {
    if (!this.material) return;

    const ease = progress * progress * (3 - 2 * progress);
    const fp = focusPoint || { x: 50, y: 50 };
    const fpX = (fp.x - 50) / 100;
    const fpY = (50 - fp.y) / 100;

    let offsetX = 0, offsetY = 0;
    let zoom = 1.06;
    let focusX = 0, focusY = 0;
    let rotation = 0;
    let tiltX = 0, tiltY = 0;

    switch (motionType) {
      case "walk-forward":
        zoom = 1.06 + ease * 0.18;
        offsetX = fpX * ease * 0.06;
        offsetY = fpY * ease * 0.06;
        focusX = fpX * ease * 0.04;
        focusY = -fpY * ease * 0.04;
        tiltX = fpX * ease * 0.06;
        tiltY = fpY * ease * 0.06;
        break;

      case "walk-right":
        offsetX = ease * 0.08;
        zoom = 1.06 + ease * 0.08;
        focusX = ease * 0.03;
        tiltX = ease * 0.08;
        rotation = -ease * 0.006;
        break;

      case "walk-left":
        offsetX = -ease * 0.08;
        zoom = 1.06 + ease * 0.08;
        focusX = -ease * 0.03;
        tiltX = -ease * 0.08;
        rotation = ease * 0.006;
        break;

      case "reveal":
        zoom = 1.2 - ease * 0.12;
        offsetX = fpX * (1 - ease) * 0.08;
        offsetY = fpY * (1 - ease) * 0.06;
        focusX = fpX * (1 - ease) * 0.04;
        focusY = -fpY * (1 - ease) * 0.04;
        tiltX = fpX * (1 - ease) * 0.06;
        tiltY = fpY * (1 - ease) * 0.06;
        break;

      case "drift-right":
        offsetX = ease * 0.06;
        offsetY = Math.sin(ease * Math.PI) * 0.02;
        zoom = 1.08 + Math.sin(ease * Math.PI) * 0.04;
        focusX = ease * 0.02;
        tiltX = ease * 0.05;
        break;

      case "drift-left":
        offsetX = -ease * 0.06;
        offsetY = Math.sin(ease * Math.PI) * 0.02;
        zoom = 1.08 + Math.sin(ease * Math.PI) * 0.04;
        focusX = -ease * 0.02;
        tiltX = -ease * 0.05;
        break;

      case "push-in":
        zoom = 1.06 + ease * 0.25;
        offsetX = fpX * ease * 0.1;
        offsetY = fpY * ease * 0.08;
        focusX = fpX * ease * 0.06;
        focusY = -fpY * ease * 0.06;
        tiltX = fpX * ease * 0.08;
        tiltY = fpY * ease * 0.08;
        break;

      case "pull-out":
        zoom = 1.25 - ease * 0.16;
        offsetX = -fpX * ease * 0.04;
        offsetY = -fpY * ease * 0.03;
        tiltY = -ease * 0.04;
        break;

      case "rise-up":
        offsetY = ease * 0.06;
        zoom = 1.06 + ease * 0.06;
        focusY = -ease * 0.03;
        tiltY = ease * 0.06;
        break;

      case "pan-right":
        offsetX = ease * 0.1;
        focusX = ease * 0.04;
        zoom = 1.08;
        tiltX = ease * 0.06;
        break;

      case "pan-left":
        offsetX = -ease * 0.1;
        focusX = -ease * 0.04;
        zoom = 1.08;
        tiltX = -ease * 0.06;
        break;

      case "pan-up":
        offsetY = ease * 0.08;
        focusY = -ease * 0.03;
        zoom = 1.08;
        tiltY = ease * 0.06;
        break;

      case "pan-down":
        offsetY = -ease * 0.08;
        focusY = ease * 0.03;
        zoom = 1.08;
        tiltY = -ease * 0.06;
        break;

      case "zoom-in":
        zoom = 1.06 + ease * 0.3;
        offsetX = fpX * ease * 0.08;
        offsetY = fpY * ease * 0.06;
        focusX = fpX * ease * 0.05;
        focusY = -fpY * ease * 0.05;
        break;

      case "zoom-out":
        zoom = 1.3 - ease * 0.2;
        break;

      default:
        offsetX = ease * 0.05;
        zoom = 1.06 + ease * 0.1;
        tiltX = ease * 0.04;
        break;
    }

    this.material.uniforms.uOffset.value.set(offsetX, offsetY);
    this.material.uniforms.uDepthScale.value = 0.8;
    this.material.uniforms.uZoom.value = zoom;
    this.material.uniforms.uFocus.value.set(focusX, focusY);
    this.material.uniforms.uRotation.value = rotation;
    this.material.uniforms.uTiltX.value = tiltX;
    this.material.uniforms.uTiltY.value = tiltY;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    if (this.material) {
      this.material.uniforms.uResolution.value.set(width, height);
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  dispose() {
    if (this.photoTexture) this.photoTexture.dispose();
    if (this.depthTexture) this.depthTexture.dispose();
    if (this.material) this.material.dispose();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
    }
    this.renderer.dispose();
  }
}
