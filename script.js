import * as THREE from 'https://esm.sh/three@0.154.0';
import { OrbitControls } from 'https://esm.sh/three@0.154.0/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('container');
if (!container) {
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#100010;color:#ffd6ea;font-size:16px;padding:20px;text-align:center;';
  msg.innerText = '未找到容器元素 #container — 请确认在项目根目录打开页面或使用静态服务器运行。';
  document.body.appendChild(msg);
  throw new Error('Container element #container not found');
}
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 18);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (err) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,2,8,0.95);color:#ffd6ea;font-size:16px;padding:20px;text-align:center;';
  overlay.innerText = '无法创建 WebGL 渲染器 — 你的浏览器或环境可能不支持 WebGL。请在支持 WebGL 的浏览器中打开（Chrome/Edge/Firefox 最新版），或启用硬件加速。\n查看控制台获取更多信息。';
  document.body.appendChild(overlay);
  console.error('WebGLRenderer creation failed', err);
  throw err;
}
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 8;
controls.maxDistance = 40;

// 主树粒子参数
const PARTICLE_COUNT = 9000;
const TREE_HEIGHT = 12;
const BASE_RADIUS = 6.5;

// 缓存初始位置用于波动动画
const initialPositions = new Float32Array(PARTICLE_COUNT * 3);
const positions = new Float32Array(PARTICLE_COUNT * 3);
const seeds = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const t = Math.pow(Math.random(), 1.2); // 越接近底部密度越高
  const y = t * TREE_HEIGHT;
  const radius = (1 - t) * BASE_RADIUS * (0.4 + Math.random() * 0.9);
  const angle = Math.random() * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  initialPositions[i * 3 + 0] = x;
  initialPositions[i * 3 + 1] = y - TREE_HEIGHT / 2; // 中心向上
  initialPositions[i * 3 + 2] = z;

  positions[i * 3 + 0] = initialPositions[i * 3 + 0];
  positions[i * 3 + 1] = initialPositions[i * 3 + 1];
  positions[i * 3 + 2] = initialPositions[i * 3 + 2];

  seeds[i] = Math.random() * 1000;
}

const treeGeo = new THREE.BufferGeometry();
treeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const pink1 = new THREE.Color(0xff8fbf);
const pink2 = new THREE.Color(0xff4da6);

let basePointSize = 0.16 * window.innerWidth / 1200 + 0.9;
const treeMat = new THREE.PointsMaterial({
  size: basePointSize,
  sizeAttenuation: true,
  color: pink1,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const treePoints = new THREE.Points(treeGeo, treeMat);
treePoints.position.y = 0;
scene.add(treePoints);

// 闪烁光点层（小而明亮）
const sparkleCount = 600;
const sparklePos = new Float32Array(sparkleCount * 3);
const sparkleSeeds = new Float32Array(sparkleCount);
for (let i = 0; i < sparkleCount; i++) {
  const t = Math.random();
  const y = t * TREE_HEIGHT;
  const r = (1 - t) * BASE_RADIUS * (0.3 + Math.random() * 0.9);
  const a = Math.random() * Math.PI * 2;
  sparklePos[i * 3 + 0] = Math.cos(a) * r;
  sparklePos[i * 3 + 1] = y - TREE_HEIGHT / 2;
  sparklePos[i * 3 + 2] = Math.sin(a) * r;
  sparkleSeeds[i] = Math.random() * 1000;
}

const sparkleGeo = new THREE.BufferGeometry();
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
const sparkleMat = new THREE.PointsMaterial({
  size: 0.6,
  color: pink2,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
scene.add(sparklePoints);

// 顶部五角星（使用 ExtrudeGeometry）
function createStarShape(innerR, outerR, points = 5) {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  let rot = -Math.PI / 2; // 从顶端开始
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? outerR : innerR;
    const x = Math.cos(rot) * r;
    const y = Math.sin(rot) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
    rot += step;
  }
  shape.closePath();
  return shape;
}

const starShape = createStarShape(0.35, 0.75, 5);
const extrudeSettings = { depth: 0.18, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 2 };
const starGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
starGeo.computeVertexNormals();
const starMat = new THREE.MeshStandardMaterial({
  color: 0xfff2f8,
  emissive: 0xffcce6,
  emissiveIntensity: 0.9,
  metalness: 0.2,
  roughness: 0.25,
  transparent: true,
  opacity: 0.98,
  side: THREE.DoubleSide
});
const star = new THREE.Mesh(starGeo, starMat);
// 调整朝向与位置：使五角星正面朝向摄像机（XY 平面面向 +Z）
star.rotation.x = 0;
star.position.set(0, TREE_HEIGHT / 2 + 0.9, 0);
star.scale.set(1.0, 1.0, 1.0);
scene.add(star);

// 轻微环境光和点光源以提升立体感
const amb = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(amb);
const pt = new THREE.PointLight(0xff9fcf, 0.6, 40);
pt.position.set(0, 6, 6);
scene.add(pt);

// 小雪球效果（缓慢下落）
const snowCount = 400;
const snowPos = new Float32Array(snowCount * 3);
const snowSpeed = new Float32Array(snowCount);
for (let i = 0; i < snowCount; i++) {
  snowPos[i * 3 + 0] = (Math.random() - 0.5) * 40;
  snowPos[i * 3 + 1] = Math.random() * 30 - 5;
  snowPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  snowSpeed[i] = 0.01 + Math.random() * 0.03;
}
const snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowMat = new THREE.PointsMaterial({ size: 0.3, color: 0xffffff, opacity: 0.9, transparent: true });
const snowPoints = new THREE.Points(snowGeo, snowMat);
scene.add(snowPoints);

// 动画
const clock = new THREE.Clock();
let rotationSpeed = 0.15;
let sparkleIntensity = 1.0;

// UI elements
const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const sparkleInput = document.getElementById('sparkle');
const rotInput = document.getElementById('rot');
const snowInput = document.getElementById('snow');

colorInput.addEventListener('input', (e) => {
  const c = new THREE.Color(e.target.value);
  treeMat.color.copy(c);
  sparkleMat.color.copy(c).offsetHSL(0, -0.02, 0.06);
  treeMat.needsUpdate = true;
  sparkleMat.needsUpdate = true;
});
sizeInput.addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  treeMat.size = v * basePointSize;
  sparkleMat.size = Math.max(0.2, v * 0.7);
});
sparkleInput.addEventListener('input', (e) => {
  sparkleIntensity = parseFloat(e.target.value);
});
rotInput.addEventListener('input', (e) => { rotationSpeed = parseFloat(e.target.value); });
snowInput.addEventListener('change', (e) => {
  snowPoints.visible = e.target.checked;
});

// 截图与录屏逻辑
const btnScreenshot = document.getElementById('btnScreenshot');
const btnRecord = document.getElementById('btnRecord');
let mediaRecorder = null;
let recordedChunks = [];

btnScreenshot.addEventListener('click', () => {
  // 使用 toBlob 更友好地处理大图
  try {
    renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pink_christmas_tree.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (err) {
    // 退回到 dataURL
    const data = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = data;
    a.download = 'pink_christmas_tree.png';
    a.click();
  }
});

btnRecord.addEventListener('click', () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    startRecording();
  } else if (mediaRecorder.state === 'recording') {
    stopRecording();
  }
});

function startRecording() {
  recordedChunks = [];
  const fps = 30;
  const stream = renderer.domElement.captureStream(fps);
  let options = { mimeType: 'video/webm;codecs=vp9' };
  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e) {
    try { mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' }); }
    catch (e2) { mediaRecorder = new MediaRecorder(stream); }
  }

  mediaRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'pink_christmas_tree.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    btnRecord.textContent = '开始录制';
  };

  mediaRecorder.start();
  btnRecord.textContent = '停止并下载';
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
}
function animate() {
  const t = clock.getElapsedTime();

  // 更新树粒子：小幅摆动，模拟风
  const posAttr = treeGeo.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const seed = seeds[i];
    const ox = initialPositions[i3 + 0];
    const oy = initialPositions[i3 + 1];
    const oz = initialPositions[i3 + 2];

    const sway = 0.08 * Math.sin(t * 0.8 + seed * 0.01) * (0.6 + 0.4 * sparkleIntensity);
    const bob = 0.06 * Math.sin(t * 1.2 + seed * 0.02) * (0.6 + 0.4 * sparkleIntensity);

    posAttr[i3 + 0] = ox + sway * (1 + oy / TREE_HEIGHT);
    posAttr[i3 + 1] = oy + bob * (1 - Math.abs(oy) / TREE_HEIGHT);
    posAttr[i3 + 2] = oz + 0.06 * Math.cos(t * 0.9 + seed * 0.015);
  }
  treeGeo.attributes.position.needsUpdate = true;

  // 闪烁点亮/变暗
  const sAttr = sparkleGeo.attributes.position.array;
  for (let i = 0; i < sparkleCount; i++) {
    const i3 = i * 3;
    const seed = sparkleSeeds[i];
    sAttr[i3 + 1] += Math.sin(t * 3 * sparkleIntensity + seed * 0.1) * 0.002 * sparkleIntensity;
  }
  sparkleGeo.attributes.position.needsUpdate = true;

  // 下落雪花
  const snowAttr = snowGeo.attributes.position.array;
  for (let i = 0; i < snowCount; i++) {
    const i3 = i * 3;
    snowAttr[i3 + 1] -= snowSpeed[i];
    if (snowAttr[i3 + 1] < -8) snowAttr[i3 + 1] = 18 + Math.random() * 6;
  }
  snowGeo.attributes.position.needsUpdate = true;

  // 整体慢速旋转展示
  treePoints.rotation.y = Math.sin(t * rotationSpeed) * 0.08;
  sparklePoints.rotation.y = treePoints.rotation.y;
  star.rotation.y = 0.2 * Math.sin(t * 0.9);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
