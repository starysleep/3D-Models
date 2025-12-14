import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

// Camera dengan proyeksi perspektif
const aspect = window.innerWidth / window.innerHeight;
const fov = 75; // Field of view (derajat)
const near = 0.1; // Near clipping plane
const far = 1000; // Far clipping plane

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ===== IMPLEMENTASI MATRIKS PROYEKSI PERSPEKTIF =====
// Fungsi untuk membuat matriks proyeksi perspektif manual
function createPerspectiveMatrix(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov * Math.PI / 360.0); // fov dalam radian
    const range = far - near;
    
    const matrix = new THREE.Matrix4();
    matrix.set(
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, -(far + near) / range, -1,
        0, 0, -2 * far * near / range, 0
    );
    
    return matrix;
}

// Membuat matriks proyeksi perspektif
const perspectiveMatrix = createPerspectiveMatrix(fov, aspect, near, far);
console.log('Matriks Proyeksi Perspektif:', perspectiveMatrix);

// ===== PLANAR SHADOW IMPLEMENTATION =====
// Fungsi untuk membuat shadow matrix (proyeksi shadow ke plane)
function createShadowMatrix(lightPosition, planeNormal, planePoint) {
    const d = -planeNormal.dot(planePoint);
    const dot = planeNormal.dot(lightPosition) + d;
    
    const shadowMatrix = new THREE.Matrix4();
    shadowMatrix.set(
        dot - lightPosition.x * planeNormal.x,
        -lightPosition.x * planeNormal.y,
        -lightPosition.x * planeNormal.z,
        -lightPosition.x * d,
        
        -lightPosition.y * planeNormal.x,
        dot - lightPosition.y * planeNormal.y,
        -lightPosition.y * planeNormal.z,
        -lightPosition.y * d,
        
        -lightPosition.z * planeNormal.x,
        -lightPosition.z * planeNormal.y,
        dot - lightPosition.z * planeNormal.z,
        -lightPosition.z * d,
        
        -planeNormal.x,
        -planeNormal.y,
        -planeNormal.z,
        dot - d
    );
    
    return shadowMatrix;
}

// ===== LIGHTING =====
// Directional light untuk shadow
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// ===== BOX (CUBE) =====
const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
const boxMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4a90e2,
    roughness: 0.5,
    metalness: 0.3
});
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.position.set(0, 1, 0);
box.castShadow = true;
box.receiveShadow = false;
scene.add(box);

// ===== PLANAR SHADOW (Manual Implementation) =====
// Membuat shadow plane (ground plane)
const planeGeometry = new THREE.PlaneGeometry(20, 20);
const planeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x90EE90,
    roughness: 0.8
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = 0;
plane.receiveShadow = true;
scene.add(plane);

// Membuat shadow box menggunakan shadow matrix
const shadowGeometry = new THREE.BoxGeometry(2, 2, 2);
const shadowMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000,
    transparent: true,
    opacity: 0.3
});

// Normal plane (y = 0, normal ke atas)
const planeNormal = new THREE.Vector3(0, 1, 0);
const planePoint = new THREE.Vector3(0, 0, 0);
const lightPos = new THREE.Vector3().copy(directionalLight.position);

// Membuat shadow matrix
const shadowMatrix = createShadowMatrix(lightPos, planeNormal, planePoint);

// Shadow box
const shadowBox = new THREE.Mesh(shadowGeometry, shadowMaterial);
shadowBox.matrixAutoUpdate = false;
shadowBox.matrix.copy(shadowMatrix);
shadowBox.matrix.multiply(box.matrix);
scene.add(shadowBox);

// ===== GRID HELPER =====
const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x888888);
scene.add(gridHelper);

// ===== AXES HELPER =====
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// ===== ANIMATION LOOP =====
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01;
    
    // Rotasi box
    box.rotation.x += 0.005;
    box.rotation.y += 0.01;
    
    // Update shadow matrix saat box berputar
    shadowBox.matrix.identity();
    shadowBox.matrix.copy(shadowMatrix);
    shadowBox.matrix.multiply(box.matrix);
    
    // Update controls
    controls.update();
    
    // Render
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();
