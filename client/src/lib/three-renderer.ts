import * as THREE from "three";

const MESH_SEGMENTS = 200;
const DEPTH_DISPLACEMENT = 0.8;
const CAM_Z = 5;
const FOV = 45;

export class ParallaxRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mesh: THREE.Mesh | null = null;
  private texture: THREE.Texture | null = null;
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

  private clearScene() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }

  setPhoto(imageDataUrl: string, depthDataUrl: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      this.clearScene();

      const img = new Image();
      img.onload = () => {
        if (!depthDataUrl) {
          this.createFlatPlane(img);
          resolve();
          return;
        }

        const depthImg = new Image();
        depthImg.onload = () => {
          try {
            this.createDisplacedMesh(img, depthImg);
            resolve();
          } catch (e) {
            this.createFlatPlane(img);
            resolve();
          }
        };
        depthImg.onerror = () => {
          this.createFlatPlane(img);
          resolve();
        };
        depthImg.src = depthDataUrl;
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageDataUrl;
    });
  }

  private createFlatPlane(img: HTMLImageElement) {
    const dist = CAM_Z;
    const planeH = 2 * dist * Math.tan((FOV * Math.PI / 180) / 2);
    const planeW = planeH * this.aspect;

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const geom = new THREE.PlaneGeometry(planeW, planeH);
    const mat = new THREE.MeshBasicMaterial({ map: this.texture });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.z = 0;
    this.scene.add(this.mesh);
  }

  private createDisplacedMesh(img: HTMLImageElement, depthImg: HTMLImageElement) {
    const maxDim = 1024;
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

    this.texture = new THREE.CanvasTexture(imgCanvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const depthCanvas = document.createElement("canvas");
    depthCanvas.width = w;
    depthCanvas.height = h;
    const depthCtx = depthCanvas.getContext("2d")!;
    depthCtx.drawImage(depthImg, 0, 0, w, h);
    const depthData = depthCtx.getImageData(0, 0, w, h);

    const dist = CAM_Z;
    const planeH = 2 * dist * Math.tan((FOV * Math.PI / 180) / 2);
    const planeW = planeH * this.aspect;

    const segX = Math.round(MESH_SEGMENTS * (w / Math.max(w, h)));
    const segY = Math.round(MESH_SEGMENTS * (h / Math.max(w, h)));

    const geom = new THREE.PlaneGeometry(planeW, planeH, segX, segY);
    const positions = geom.attributes.position;
    const uvs = geom.attributes.uv;

    for (let i = 0; i < positions.count; i++) {
      const u = uvs.getX(i);
      const v = uvs.getY(i);

      const px = Math.min(Math.floor(u * w), w - 1);
      const py = Math.min(Math.floor((1 - v) * h), h - 1);
      const depthIdx = (py * w + px) * 4;
      const depthValue = depthData.data[depthIdx] / 255;

      const displacement = depthValue * DEPTH_DISPLACEMENT;
      positions.setZ(i, displacement);
    }

    positions.needsUpdate = true;
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.z = -DEPTH_DISPLACEMENT / 2;
    this.scene.add(this.mesh);
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
    this.clearScene();
    this.renderer.dispose();
  }
}
