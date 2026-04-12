import * as THREE from "three";

export interface CameraMotion {
  type: string;
  focusPoint?: { x: number; y: number };
}

export class ParallaxRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mesh: THREE.Mesh | null = null;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;

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
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 2.8);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(ambientLight);
  }

  setPhoto(imageDataUrl: string, depthDataUrl: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.mesh) {
        const oldMat = this.mesh.material as THREE.MeshStandardMaterial;
        if (oldMat.map) oldMat.map.dispose();
        if (oldMat.displacementMap) oldMat.displacementMap.dispose();
        oldMat.dispose();
        this.mesh.geometry.dispose();
        this.scene.remove(this.mesh);
        this.mesh = null;
      }

      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        imageDataUrl,
        (photoTexture) => {
          photoTexture.colorSpace = THREE.SRGBColorSpace;

          const imgAspect = photoTexture.image.width / photoTexture.image.height;
          const canvasAspect = this.width / this.height;
          let planeW: number, planeH: number;

          if (imgAspect > canvasAspect) {
            planeH = 3.5;
            planeW = planeH * imgAspect;
          } else {
            planeW = 3.5 * canvasAspect;
            planeH = planeW / imgAspect;
          }

          const geometry = new THREE.PlaneGeometry(planeW, planeH, 128, 128);

          const material = new THREE.MeshStandardMaterial({
            map: photoTexture,
            side: THREE.FrontSide,
          });

          this.mesh = new THREE.Mesh(geometry, material);
          this.mesh.position.set(0, 0, 0);
          this.scene.add(this.mesh);

          if (depthDataUrl) {
            textureLoader.load(
              depthDataUrl,
              (depthTexture) => {
                material.displacementMap = depthTexture;
                material.displacementScale = 0.6;
                material.displacementBias = -0.3;
                material.needsUpdate = true;
                resolve();
              },
              undefined,
              () => { resolve(); }
            );
          } else {
            resolve();
          }
        },
        undefined,
        (err) => { reject(err || new Error("Failed to load photo texture")); }
      );
    });
  }

  setCameraForMotion(motionType: string, progress: number, focusPoint?: { x: number; y: number }) {
    const ease = progress * progress * (3 - 2 * progress);
    const fp = focusPoint || { x: 50, y: 50 };
    const fpX = (fp.x - 50) / 50;
    const fpY = (50 - fp.y) / 50;

    const baseZ = 2.8;

    switch (motionType) {
      case "walk-forward":
        this.camera.position.set(
          fpX * ease * 0.3,
          fpY * ease * 0.2,
          baseZ - ease * 1.2
        );
        this.camera.rotation.set(
          ease * fpY * 0.08,
          -ease * fpX * 0.08,
          0
        );
        break;

      case "walk-right":
        this.camera.position.set(
          ease * 0.6,
          ease * 0.05,
          baseZ - ease * 0.5
        );
        this.camera.rotation.set(0, -ease * 0.12, 0);
        break;

      case "walk-left":
        this.camera.position.set(
          -ease * 0.6,
          ease * 0.05,
          baseZ - ease * 0.5
        );
        this.camera.rotation.set(0, ease * 0.12, 0);
        break;

      case "reveal":
        this.camera.position.set(
          fpX * (1 - ease) * 0.3,
          fpY * (1 - ease) * 0.2,
          baseZ - 1.0 + ease * 0.8
        );
        this.camera.rotation.set(
          (1 - ease) * fpY * 0.06,
          -(1 - ease) * fpX * 0.06,
          0
        );
        break;

      case "drift-right":
        this.camera.position.set(
          ease * 0.4,
          Math.sin(ease * Math.PI) * 0.08,
          baseZ - ease * 0.3
        );
        this.camera.rotation.set(
          Math.sin(ease * Math.PI) * 0.03,
          -ease * 0.08,
          0
        );
        break;

      case "drift-left":
        this.camera.position.set(
          -ease * 0.4,
          Math.sin(ease * Math.PI) * 0.08,
          baseZ - ease * 0.3
        );
        this.camera.rotation.set(
          Math.sin(ease * Math.PI) * 0.03,
          ease * 0.08,
          0
        );
        break;

      case "push-in":
        this.camera.position.set(
          fpX * ease * 0.4,
          fpY * ease * 0.3,
          baseZ - ease * 1.5
        );
        this.camera.rotation.set(
          ease * fpY * 0.1,
          -ease * fpX * 0.1,
          0
        );
        break;

      case "pull-out":
        this.camera.position.set(
          0,
          -ease * 0.1,
          baseZ - 0.8 + ease * 0.8
        );
        this.camera.rotation.set(-ease * 0.06, 0, 0);
        break;

      case "rise-up":
        this.camera.position.set(
          0,
          ease * 0.4,
          baseZ - ease * 0.3
        );
        this.camera.rotation.set(ease * 0.08, 0, 0);
        break;

      case "pan-right":
        this.camera.position.set(ease * 0.7, 0, baseZ);
        this.camera.rotation.set(0, -ease * 0.1, 0);
        break;

      case "pan-left":
        this.camera.position.set(-ease * 0.7, 0, baseZ);
        this.camera.rotation.set(0, ease * 0.1, 0);
        break;

      case "zoom-in":
        this.camera.position.set(
          fpX * ease * 0.2,
          fpY * ease * 0.15,
          baseZ - ease * 1.4
        );
        this.camera.rotation.set(
          ease * fpY * 0.05,
          -ease * fpX * 0.05,
          0
        );
        break;

      default:
        this.camera.position.set(
          ease * 0.3,
          ease * 0.05,
          baseZ - ease * 0.8
        );
        this.camera.rotation.set(0, -ease * 0.06, 0);
        break;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.dispose();
      if (mat.displacementMap) mat.displacementMap.dispose();
      mat.dispose();
    }
    this.renderer.dispose();
  }
}
