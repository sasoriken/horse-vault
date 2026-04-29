/**
 * threescene.js — Three.js 装飾（ダッシュボード中央の回転ワイヤーフレーム）
 */

export function initThreeScene(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const state = { frameId: null, ro: null, renderer: null, disposed: false };

  const _init = (attempt = 0) => {
    if (state.disposed) return;

    const _THREE = window.THREE;
    if (!_THREE) {
      console.warn('[threescene] THREE is not loaded');
      return;
    }

    // getBoundingClientRect() で強制レイアウト — 0 なら最大10回リトライ
    const rect = container.getBoundingClientRect();
    const w    = rect.width;
    if (w < 10 && attempt < 10) {
      setTimeout(() => _init(attempt + 1), 100);
      return;
    }

    const finalW = w > 10 ? w : 400;
    const finalH = 280;

    let renderer;
    try {
      renderer = new _THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn('[threescene] WebGL unavailable:', e);
      return;
    }
    renderer.setSize(finalW, finalH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    state.renderer = renderer;

    const scene  = new _THREE.Scene();
    const camera = new _THREE.PerspectiveCamera(45, finalW / finalH, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    const geo1 = new _THREE.IcosahedronGeometry(1.2, 1);
    const mat1 = new _THREE.MeshBasicMaterial({ color: 0x00F0FF, wireframe: true, transparent: true, opacity: 0.35 });
    const mesh1 = new _THREE.Mesh(geo1, mat1);
    scene.add(mesh1);

    const geo2 = new _THREE.OctahedronGeometry(0.65, 0);
    const mat2 = new _THREE.MeshBasicMaterial({ color: 0xFF003C, wireframe: true, transparent: true, opacity: 0.5 });
    const mesh2 = new _THREE.Mesh(geo2, mat2);
    scene.add(mesh2);

    const geo3 = new _THREE.DodecahedronGeometry(1.9, 0);
    const mat3 = new _THREE.MeshBasicMaterial({ color: 0x00F0FF, wireframe: true, transparent: true, opacity: 0.06 });
    const mesh3 = new _THREE.Mesh(geo3, mat3);
    scene.add(mesh3);

    const ptGeo = new _THREE.BufferGeometry();
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 6;
    ptGeo.setAttribute('position', new _THREE.BufferAttribute(positions, 3));
    const ptMat = new _THREE.PointsMaterial({ color: 0x00F0FF, size: 0.02, transparent: true, opacity: 0.4 });
    scene.add(new _THREE.Points(ptGeo, ptMat));

    const animate = () => {
      state.frameId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      mesh1.rotation.x = t * 0.22;
      mesh1.rotation.y = t * 0.31;
      mesh2.rotation.x = -t * 0.45;
      mesh2.rotation.z = t * 0.27;
      mesh3.rotation.y = t * 0.08;
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      if (state.disposed) return;
      const nw = container.getBoundingClientRect().width || finalW;
      renderer.setSize(nw, finalH);
      camera.aspect = nw / finalH;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);
    state.ro = ro;
  };

  // 初回は 150ms 待ってからリトライ付きで起動
  setTimeout(() => _init(0), 150);

  return () => {
    state.disposed = true;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    if (state.ro)       state.ro.disconnect();
    if (state.renderer) state.renderer.dispose();
  };
}
