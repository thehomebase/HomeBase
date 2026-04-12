import * as THREE from "three";

const NUM_LAYERS = 8;
const DEPTH_SPREAD = 3.0;
const DILATION_RADIUS = 18;
const CAM_Z = 5;
const FOV = 45;

export class ParallaxRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private layerMeshes: THREE.Mesh[] = [];
  private layerTextures: THREE.Texture[] = [];
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private aspect: number;

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

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, this.aspect, 0.1, 100);
    this.camera.position.set(0, 0, CAM_Z);
    this.camera.lookAt(0, 0, 0);
  }

  private clearLayers() {
    for (const mesh of this.layerMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.scene.remove(mesh);
    }
    for (const tex of this.layerTextures) {
      tex.dispose();
    }
    this.layerMeshes = [];
    this.layerTextures = [];
  }

  setPhoto(imageDataUrl: string, depthDataUrl: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      this.clearLayers();

      const img = new Image();
      img.onload = () => {
        if (!depthDataUrl) {
          this.createSingleLayer(img);
          resolve();
          return;
        }

        const depthImg = new Image();
        depthImg.onload = () => {
          try {
            this.createMultiLayers(img, depthImg);
            resolve();
          } catch (e) {
            this.createSingleLayer(img);
            resolve();
          }
        };
        depthImg.onerror = () => {
          this.createSingleLayer(img);
          resolve();
        };
        depthImg.src = depthDataUrl;
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageDataUrl;
    });
  }

  private getWorkingSize(img: HTMLImageElement): { w: number; h: number } {
    const maxDim = 1024;
    let w = img.width;
    let h = img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    return { w, h };
  }

  private createSingleLayer(img: HTMLImageElement) {
    const { w, h } = this.getWorkingSize(img);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    this.layerTextures.push(tex);

    const dist = CAM_Z;
    const planeH = 2 * dist * Math.tan((FOV * Math.PI / 180) / 2);
    const planeW = planeH * this.aspect;
    const geom = new THREE.PlaneGeometry(planeW, planeH);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.z = 0;
    this.scene.add(mesh);
    this.layerMeshes.push(mesh);
  }

  private createMultiLayers(img: HTMLImageElement, depthImg: HTMLImageElement) {
    const { w, h } = this.getWorkingSize(img);

    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = w;
    imgCanvas.height = h;
    const imgCtx = imgCanvas.getContext("2d")!;
    imgCtx.drawImage(img, 0, 0, w, h);
    const imgData = imgCtx.getImageData(0, 0, w, h);

    const depthCanvas = document.createElement("canvas");
    depthCanvas.width = w;
    depthCanvas.height = h;
    const depthCtx = depthCanvas.getContext("2d")!;
    depthCtx.drawImage(depthImg, 0, 0, w, h);
    const depthData = depthCtx.getImageData(0, 0, w, h);

    const bgZ = -DEPTH_SPREAD / 2;
    const bgDist = CAM_Z - bgZ;
    const bgH = 2 * bgDist * Math.tan((FOV * Math.PI / 180) / 2);
    const bgW = bgH * this.aspect;

    const bgTex = new THREE.CanvasTexture(imgCanvas);
    bgTex.colorSpace = THREE.SRGBColorSpace;
    bgTex.minFilter = THREE.LinearFilter;
    bgTex.magFilter = THREE.LinearFilter;
    this.layerTextures.push(bgTex);

    const bgGeom = new THREE.PlaneGeometry(bgW, bgH);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex });
    const bgMesh = new THREE.Mesh(bgGeom, bgMat);
    bgMesh.position.z = bgZ;
    bgMesh.renderOrder = 0;
    this.scene.add(bgMesh);
    this.layerMeshes.push(bgMesh);

    const fgLayers = NUM_LAYERS - 1;
    for (let i = 1; i <= fgLayers; i++) {
      const depthMin = i / NUM_LAYERS;
      const depthMax = (i + 1) / NUM_LAYERS;
      const overlap = 0.03;
      const dMin = Math.max(0, depthMin - overlap);

      const layerCanvas = document.createElement("canvas");
      layerCanvas.width = w;
      layerCanvas.height = h;
      const layerCtx = layerCanvas.getContext("2d")!;
      const layerImgData = layerCtx.createImageData(w, h);
      const mask = new Uint8Array(w * h);

      for (let p = 0; p < w * h; p++) {
        const depth = depthData.data[p * 4] / 255;
        if (depth >= dMin && depth <= depthMax) {
          layerImgData.data[p * 4] = imgData.data[p * 4];
          layerImgData.data[p * 4 + 1] = imgData.data[p * 4 + 1];
          layerImgData.data[p * 4 + 2] = imgData.data[p * 4 + 2];
          layerImgData.data[p * 4 + 3] = 255;
          mask[p] = 1;
        }
      }

      this.dilateEdges(layerImgData.data, mask, w, h, DILATION_RADIUS);

      layerCtx.putImageData(layerImgData, 0, 0);

      const tex = new THREE.CanvasTexture(layerCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.layerTextures.push(tex);

      const zPos = bgZ + (i / fgLayers) * DEPTH_SPREAD;
      const dist = CAM_Z - zPos;
      const planeH = 2 * dist * Math.tan((FOV * Math.PI / 180) / 2);
      const planeW = planeH * this.aspect;

      const geom = new THREE.PlaneGeometry(planeW, planeH);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.5,
        depthWrite: true,
        depthTest: true,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = zPos;
      mesh.renderOrder = i;
      this.scene.add(mesh);
      this.layerMeshes.push(mesh);
    }
  }

  private dilateEdges(data: Uint8ClampedArray, mask: Uint8Array, w: number, h: number, radius: number) {
    let currentMask = mask;

    for (let iter = 0; iter < radius; iter++) {
      const newMask = new Uint8Array(currentMask);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (currentMask[idx]) continue;

          let r = 0, g = 0, b = 0, count = 0;
          if (x > 0 && currentMask[idx - 1]) {
            const si = (idx - 1) * 4;
            r += data[si]; g += data[si + 1]; b += data[si + 2]; count++;
          }
          if (x < w - 1 && currentMask[idx + 1]) {
            const si = (idx + 1) * 4;
            r += data[si]; g += data[si + 1]; b += data[si + 2]; count++;
          }
          if (y > 0 && currentMask[idx - w]) {
            const si = (idx - w) * 4;
            r += data[si]; g += data[si + 1]; b += data[si + 2]; count++;
          }
          if (y < h - 1 && currentMask[idx + w]) {
            const si = (idx + w) * 4;
            r += data[si]; g += data[si + 1]; b += data[si + 2]; count++;
          }

          if (count > 0) {
            const pi = idx * 4;
            data[pi] = Math.round(r / count);
            data[pi + 1] = Math.round(g / count);
            data[pi + 2] = Math.round(b / count);
            data[pi + 3] = 255;
            newMask[idx] = 1;
          }
        }
      }

      currentMask = newMask;
    }
  }

  setCameraForMotion(motionType: string, progress: number, focusPoint?: { x: number; y: number }) {
    const ease = progress * progress * (3 - 2 * progress);
    const fp = focusPoint || { x: 50, y: 50 };
    const fpX = (fp.x - 50) / 100;
    const fpY = (50 - fp.y) / 100;

    let camX = 0, camY = 0, camZ = CAM_Z;
    let lookX = 0, lookY = 0;

    switch (motionType) {
      case "walk-forward":
        camZ = CAM_Z - ease * 0.5;
        camX = fpX * ease * 0.15;
        camY = fpY * ease * 0.12;
        lookX = fpX * ease * 0.08;
        lookY = fpY * ease * 0.06;
        break;

      case "walk-right":
        camX = ease * 0.3;
        camZ = CAM_Z - ease * 0.12;
        lookX = ease * 0.12;
        break;

      case "walk-left":
        camX = -ease * 0.3;
        camZ = CAM_Z - ease * 0.12;
        lookX = -ease * 0.12;
        break;

      case "reveal":
        camZ = CAM_Z - (1 - ease) * 0.35;
        camX = fpX * (1 - ease) * 0.2;
        camY = fpY * (1 - ease) * 0.15;
        break;

      case "drift-right":
        camX = ease * 0.2;
        camY = Math.sin(ease * Math.PI) * 0.06;
        camZ = CAM_Z - Math.sin(ease * Math.PI) * 0.12;
        break;

      case "drift-left":
        camX = -ease * 0.2;
        camY = Math.sin(ease * Math.PI) * 0.06;
        camZ = CAM_Z - Math.sin(ease * Math.PI) * 0.12;
        break;

      case "push-in":
        camZ = CAM_Z - ease * 0.6;
        camX = fpX * ease * 0.2;
        camY = fpY * ease * 0.15;
        lookX = fpX * ease * 0.1;
        lookY = fpY * ease * 0.08;
        break;

      case "pull-out":
        camZ = CAM_Z + ease * 0.35;
        break;

      case "rise-up":
        camY = ease * 0.2;
        camZ = CAM_Z - ease * 0.08;
        lookY = ease * 0.08;
        break;

      case "pan-right":
        camX = ease * 0.25;
        lookX = ease * 0.15;
        break;

      case "pan-left":
        camX = -ease * 0.25;
        lookX = -ease * 0.15;
        break;

      case "pan-up":
        camY = ease * 0.2;
        lookY = ease * 0.1;
        break;

      case "pan-down":
        camY = -ease * 0.2;
        lookY = -ease * 0.1;
        break;

      case "zoom-in":
        camZ = CAM_Z - ease * 0.7;
        camX = fpX * ease * 0.15;
        camY = fpY * ease * 0.12;
        lookX = fpX * ease * 0.08;
        lookY = fpY * ease * 0.06;
        break;

      case "zoom-out":
        camZ = CAM_Z + ease * 0.4;
        break;

      default:
        camX = ease * 0.12;
        camZ = CAM_Z - ease * 0.2;
        break;
    }

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(lookX, lookY, 0);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.aspect = width / height;
    this.renderer.setSize(width, height);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  dispose() {
    this.clearLayers();
    this.renderer.dispose();
  }
}
