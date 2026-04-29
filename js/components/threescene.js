/**
 * threescene.js — Three.js 装飾（ダッシュボード中央の回転ワイヤーフレーム）
 */

export function initThreeScene(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;

  const state = { frameId: null, ro: null, renderer: null, disposed: false };

  // 1フレーム待ってレイアウト確定後に初期化（clientWidth が 0 のままになるのを防ぐ）
  requestAnimationFrame(() => {
    if (state.disposed) return;

    const w = container.clientWidth || container.offsetWidth || 400;
    const h = container.clientHeight || 280;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    state.renderer = renderer;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    const geo1 = new THREE.IcosahedronGeometry(1.2, 1);
    const mat1 = new THREE.MeshBasicMaterial({
      color: 0x00F0FF, wireframe: true, transparent: true, opacity: 0.35,
    });
    const mesh1 = new THREE.Mesh(geo1, mat1);
    scene.add(mesh1);

    const geo2 = new THREE.OctahedronGeometry(0.65, 0);
    const mat2 = new THREE.MeshBasicMaterial({
      color: 0xFF003C, wireframe: true, transparent: true, opacity: 0.5,
    });
    const mesh2 = new THREE.Mesh(geo2, mat2);
    scene.add(mesh2);

    const geo3 = new THREE.DodecahedronGeometry(1.9, 0);
    const mat3 = new THREE.MeshBasicMaterial({
      color: 0x00F0FF, wireframe: true, transparent: true, opacity: 0.06,
    });
    const mesh3 = new THREE.Mesh(geo3, mat3);
    scene.add(mesh3);

    const ptGeo = new THREE.BufferGeometry();
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 6;
    ptGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const ptMat = new THREE.PointsMaterial({ color: 0x00F0FF, size: 0.02, transparent: true, opacity: 0.4 });
    scene.add(new THREE.Points(ptGeo, ptMat));

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
      const nw = container.clientWidth || container.offsetWidth || 400;
      const nh = container.clientHeight || 280;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);
    state.ro = ro;
  });

  return () => {
    state.disposed = true;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    if (state.ro) state.ro.disconnect();
    if (state.renderer) state.renderer.dispose();
  };
}
