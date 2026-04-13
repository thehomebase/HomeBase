import * as THREE from "three";

const POM_LAYERS = 64;
const DEPTH_STRENGTH = 0.04;
const FOCUS_DEPTH = 0.5;
const CAM_Z = 5;
const FOV = 45;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uColorTex;
uniform sampler2D uDepthMap;
uniform vec2 uOffset;
uniform float uStrength;
uniform float uFocus;
uniform float uZoom;
uniform int uLayers;
uniform float uDofAmount;
uniform float uVignette;

vec4 sampleColor(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    vec2 clamped = clamp(uv, vec2(0.001), vec2(0.999));
    return texture2D(uColorTex, clamped);
  }
  return texture2D(uColorTex, uv);
}

void main() {
  float centerX = 0.5 + uOffset.x * 0.5;
  float centerY = 0.5 + uOffset.y * 0.5;
  vec2 zoomedUv = (vUv - vec2(centerX, centerY)) / uZoom + vec2(centerX, centerY);

  vec2 uv = zoomedUv;
  vec2 direction = uOffset * uStrength;

  float layerDepth = 1.0 / float(uLayers);
  float currentLayerDepth = 0.0;
  vec2 deltaUv = direction / float(uLayers);

  vec2 currentUv = uv + direction * (1.0 - uFocus);
  float currentDepth = 1.0 - texture2D(uDepthMap, currentUv).r;

  for (int i = 0; i < 128; i++) {
    if (i >= uLayers) break;
    if (currentLayerDepth >= currentDepth) break;
    currentUv -= deltaUv;
    currentDepth = 1.0 - texture2D(uDepthMap, currentUv).r;
    currentLayerDepth += layerDepth;
  }

  vec2 prevUv = currentUv + deltaUv;
  float afterDepth = currentDepth - currentLayerDepth;
  float beforeDepth = (1.0 - texture2D(uDepthMap, prevUv).r) - currentLayerDepth + layerDepth;
  float weight = afterDepth / (afterDepth - beforeDepth);
  vec2 finalUv = mix(currentUv, prevUv, weight);

  vec4 color = sampleColor(finalUv);

  if (uDofAmount > 0.0) {
    float depth = texture2D(uDepthMap, finalUv).r;
    float blur = abs(depth - uFocus) * uDofAmount * 3.0;
    if (blur > 0.001) {
      vec4 blurred = vec4(0.0);
      float total = 0.0;
      float radius = blur * 0.004;
      for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
          vec2 sampleUv = finalUv + vec2(float(x), float(y)) * radius;
          float w = 1.0 / (1.0 + float(x*x + y*y));
          blurred += sampleColor(sampleUv) * w;
          total += w;
        }
      }
      color = mix(color, blurred / total, min(blur * 2.0, 0.8));
    }
  }

  if (uVignette > 0.0) {
    vec2 vig = vUv - 0.5;
    float vigAmount = 1.0 - dot(vig, vig) * uVignette * 2.0;
    color.rgb *= clamp(vigAmount, 0.0, 1.0);
  }

  color.rgb = pow(color.rgb, vec3(1.0 / 1.0));
  gl_FragColor = color;
}
`;

export class ParallaxRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private colorTexture: THREE.Texture | null = null;
  private depthTexture: THREE.Texture | null = null;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private aspect: number;
  private hasDepth: boolean = false;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.aspect = width / height;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
  }

  private clearScene() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.colorTexture) {
      this.colorTexture.dispose();
      this.colorTexture = null;
    }
    if (this.depthTexture) {
      this.depthTexture.dispose();
      this.depthTexture = null;
    }
    this.hasDepth = false;
  }

  setPhoto(imageDataUrl: string, depthDataUrl: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      this.clearScene();

      const img = new Image();
      img.onload = () => {
        const loadDepthAndCreate = (depthImg: HTMLImageElement | null) => {
          try {
            this.createParallaxPlane(img, depthImg);
            resolve();
          } catch (e) {
            this.createParallaxPlane(img, null);
            resolve();
          }
        };

        if (!depthDataUrl) {
          loadDepthAndCreate(null);
          return;
        }

        const depthImg = new Image();
        depthImg.onload = () => loadDepthAndCreate(depthImg);
        depthImg.onerror = () => loadDepthAndCreate(null);
        depthImg.src = depthDataUrl;
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageDataUrl;
    });
  }

  private createParallaxPlane(img: HTMLImageElement, depthImg: HTMLImageElement | null) {
    const maxDim = 2048;
    let w = img.width;
    let h = img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = w;
    imgCanvas.height = h;
    const imgCtx = imgCanvas.getContext("2d")!;
    imgCtx.drawImage(img, 0, 0, w, h);

    this.colorTexture = new THREE.CanvasTexture(imgCanvas);
    this.colorTexture.colorSpace = THREE.SRGBColorSpace;
    this.colorTexture.minFilter = THREE.LinearFilter;
    this.colorTexture.magFilter = THREE.LinearFilter;
    this.colorTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.colorTexture.wrapT = THREE.ClampToEdgeWrapping;

    if (depthImg) {
      const depthCanvas = document.createElement("canvas");
      depthCanvas.width = w;
      depthCanvas.height = h;
      const depthCtx = depthCanvas.getContext("2d")!;
      depthCtx.drawImage(depthImg, 0, 0, w, h);

      this.depthTexture = new THREE.CanvasTexture(depthCanvas);
      this.depthTexture.minFilter = THREE.LinearFilter;
      this.depthTexture.magFilter = THREE.LinearFilter;
      this.depthTexture.wrapS = THREE.ClampToEdgeWrapping;
      this.depthTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.hasDepth = true;
    } else {
      const depthCanvas = document.createElement("canvas");
      depthCanvas.width = 1;
      depthCanvas.height = 1;
      const depthCtx = depthCanvas.getContext("2d")!;
      depthCtx.fillStyle = "#808080";
      depthCtx.fillRect(0, 0, 1, 1);
      this.depthTexture = new THREE.CanvasTexture(depthCanvas);
      this.hasDepth = false;
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColorTex: { value: this.colorTexture },
        uDepthMap: { value: this.depthTexture },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uStrength: { value: DEPTH_STRENGTH },
        uFocus: { value: FOCUS_DEPTH },
        uZoom: { value: 1.0 },
        uLayers: { value: POM_LAYERS },
        uDofAmount: { value: 0.0 },
        uVignette: { value: 0.3 },
      },
    });

    const geom = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geom, this.material);
    this.scene.add(this.mesh);
  }

  setCameraForMotion(motionType: string, progress: number, focusPoint?: { x: number; y: number }) {
    if (!this.material) return;

    const ease = progress * progress * (3 - 2 * progress);
    const fp = focusPoint || { x: 50, y: 50 };
    const fpX = (fp.x - 50) / 50;
    const fpY = (50 - fp.y) / 50;

    let offsetX = 0, offsetY = 0;
    let zoom = 1.0;
    let strength = DEPTH_STRENGTH;
    let dof = 0.0;

    if (!this.hasDepth) {
      strength = 0;
    }

    switch (motionType) {
      case "walk-forward":
        zoom = 1.0 + ease * 0.08;
        offsetX = fpX * ease * 0.15;
        offsetY = fpY * ease * 0.12;
        strength = DEPTH_STRENGTH * (1.0 + ease * 0.5);
        dof = ease * 0.15;
        break;

      case "walk-right":
        offsetX = ease * 0.6;
        offsetY = ease * 0.05;
        zoom = 1.0 + ease * 0.03;
        break;

      case "walk-left":
        offsetX = -ease * 0.6;
        offsetY = ease * 0.05;
        zoom = 1.0 + ease * 0.03;
        break;

      case "reveal":
        zoom = 1.0 + (1 - ease) * 0.06;
        offsetX = fpX * (1 - ease) * 0.4;
        offsetY = fpY * (1 - ease) * 0.3;
        break;

      case "drift-right":
        offsetX = ease * 0.4;
        offsetY = Math.sin(ease * Math.PI) * 0.1;
        zoom = 1.0 + Math.sin(ease * Math.PI) * 0.03;
        break;

      case "drift-left":
        offsetX = -ease * 0.4;
        offsetY = Math.sin(ease * Math.PI) * 0.1;
        zoom = 1.0 + Math.sin(ease * Math.PI) * 0.03;
        break;

      case "push-in":
        zoom = 1.0 + ease * 0.12;
        offsetX = fpX * ease * 0.3;
        offsetY = fpY * ease * 0.25;
        dof = ease * 0.2;
        strength = DEPTH_STRENGTH * (1.0 + ease * 0.8);
        break;

      case "pull-out":
        zoom = 1.0 + (1 - ease) * 0.1;
        offsetX = fpX * (1 - ease) * 0.1;
        offsetY = fpY * (1 - ease) * 0.08;
        break;

      case "rise-up":
        offsetY = ease * 0.5;
        offsetX = ease * 0.05;
        zoom = 1.0 + ease * 0.03;
        break;

      case "pan-right":
        offsetX = ease * 0.5;
        zoom = 1.0 + Math.sin(ease * Math.PI) * 0.02;
        break;

      case "pan-left":
        offsetX = -ease * 0.5;
        zoom = 1.0 + Math.sin(ease * Math.PI) * 0.02;
        break;

      case "pan-up":
        offsetY = ease * 0.4;
        zoom = 1.0 + Math.sin(ease * Math.PI) * 0.02;
        break;

      case "pan-down":
        offsetY = -ease * 0.4;
        zoom = 1.0 + Math.sin(ease * Math.PI) * 0.02;
        break;

      case "zoom-in":
        zoom = 1.0 + ease * 0.15;
        offsetX = fpX * ease * 0.2;
        offsetY = fpY * ease * 0.15;
        dof = ease * 0.25;
        strength = DEPTH_STRENGTH * (1.0 + ease);
        break;

      case "zoom-out":
        zoom = 1.0 + (1 - ease) * 0.12;
        break;

      default:
        offsetX = ease * 0.2;
        zoom = 1.0 + ease * 0.04;
        break;
    }

    this.material.uniforms.uOffset.value.set(offsetX, offsetY);
    this.material.uniforms.uZoom.value = zoom;
    this.material.uniforms.uStrength.value = strength;
    this.material.uniforms.uDofAmount.value = dof;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.aspect = width / height;
    this.renderer.setSize(width, height);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  dispose() {
    this.clearScene();
    this.renderer.dispose();
  }
}
