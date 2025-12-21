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

// ===== SMOOTHNESS INDICATOR =====
let lastTime = performance.now();
let fps = 60;
let frameTime = 16.67;
let frameTimes = [];
const maxFrameTimeHistory = 60;
let smoothness = 100;

// ===== FPS LIMIT CONTROL =====
let fpsLimitEnabled = false;
let lastFrameTime = 0;
const targetFrameTime = 1000 / 60; // 60 FPS = 16.67ms per frame

// Update FPS indicator
function updateFPSIndicator() {
    const fpsElement = document.getElementById('fps-value');
    const fpsDisplay = document.getElementById('fps-display');
    const fpsIndicator = document.getElementById('fps-indicator');
    
    if (fpsElement && fpsDisplay) {
        const roundedFPS = Math.round(fps);
        fpsElement.textContent = String(roundedFPS);
        fpsDisplay.textContent = String(roundedFPS);
        
        // Update color based on FPS
        if (fpsIndicator) {
            fpsIndicator.className = '';
            if (fps >= 55) {
                fpsIndicator.classList.add('fps-good');
            } else if (fps >= 30) {
                fpsIndicator.classList.add('fps-medium');
            } else {
                fpsIndicator.classList.add('fps-bad');
            }
        }
    }
}

// Update frame time indicator
function updateFrameTimeIndicator() {
    const frameTimeElement = document.getElementById('frame-time');
    if (frameTimeElement) {
        const frameTimeStr = (Math.round(frameTime * 100) / 100).toFixed(2) + 'ms';
        frameTimeElement.textContent = frameTimeStr;
    }
}

// Update smoothness indicator
function updateSmoothnessIndicator() {
    const smoothnessValueElement = document.getElementById('smoothness-value');
    const smoothnessFillElement = document.getElementById('smoothness-fill');
    const statusBadge = document.getElementById('status-badge');
    
    // Calculate smoothness even with limited data
    if (frameTimes.length > 1) {
        // Calculate variance in frame times (lower variance = smoother)
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const variance = frameTimes.reduce((sum, ft) => sum + Math.pow(ft - avgFrameTime, 2), 0) / frameTimes.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate smoothness (0-100%, based on consistency)
        // Lower stdDev = higher smoothness
        // Ideal frame time is ~16.67ms (60fps), variance should be minimal
        // Adjust multiplier based on sample size for better responsiveness
        const multiplier = frameTimes.length < 10 ? 10 : 15;
        smoothness = Math.max(0, Math.min(100, 100 - (stdDev * multiplier)));
    } else if (frameTimes.length === 1) {
        // Initial smoothness estimate based on first frame
        const idealFrameTime = 16.67; // 60 FPS target
        const deviation = Math.abs(frameTimes[0] - idealFrameTime);
        smoothness = Math.max(0, Math.min(100, 100 - (deviation * 2)));
    } else {
        // Default smoothness for initial state
        smoothness = 100;
    }
    
    // Always update UI elements if they exist
    if (smoothnessValueElement) {
        smoothnessValueElement.textContent = String(Math.round(smoothness)) + '%';
    }
    
    if (smoothnessFillElement) {
        smoothnessFillElement.style.width = smoothness + '%';
        
        // Update color based on smoothness
        smoothnessFillElement.className = 'smoothness-fill';
        if (smoothness >= 80) {
            // Good - green (default)
        } else if (smoothness >= 50) {
            smoothnessFillElement.classList.add('medium');
        } else {
            smoothnessFillElement.classList.add('low');
        }
    }
    
    // Update status badge
    if (statusBadge) {
        statusBadge.className = 'status-badge';
        if (smoothness >= 80) {
            statusBadge.classList.add('status-smooth');
            statusBadge.textContent = 'Smooth';
        } else if (smoothness >= 50) {
            statusBadge.classList.add('status-moderate');
            statusBadge.textContent = 'Moderate';
        } else {
            statusBadge.classList.add('status-lagging');
            statusBadge.textContent = 'Lagging';
        }
    }
}

// ===== ANIMATION LOOP =====
let time = 0;
let isFirstFrame = true;
function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    let deltaTime = currentTime - lastTime;
    
    // FPS Limiting: Skip rendering if limit is enabled and frame came too soon
    let shouldRender = true;
    if (fpsLimitEnabled) {
        const elapsed = currentTime - lastFrameTime;
        if (elapsed < targetFrameTime) {
            shouldRender = false; // Skip rendering but continue updating indicators
            deltaTime = targetFrameTime; // Use target frame time for calculations
        } else {
            lastFrameTime = currentTime - (elapsed % targetFrameTime);
            deltaTime = targetFrameTime; // Use target frame time when limiting
        }
    } else {
        lastFrameTime = currentTime;
    }
    
    lastTime = currentTime;
    
    // Skip first frame or very large deltas (e.g., tab was inactive)
    if (isFirstFrame || deltaTime > 1000) {
        isFirstFrame = false;
        deltaTime = 16.67; // Use target frame time for first frame
    }
    
    // Calculate frame time and FPS
    frameTime = deltaTime;
    frameTimes.push(frameTime);
    if (frameTimes.length > maxFrameTimeHistory) {
        frameTimes.shift();
    }
    
    // Calculate FPS (instant FPS for real-time feedback)
    if (deltaTime > 0 && deltaTime < 1000) {
        // Use instant FPS for maximum responsiveness
        fps = 1000 / deltaTime;
        
        // Clamp FPS to reasonable range
        if (fps > 144) fps = 144; // Cap at 144 FPS for display
        if (fps < 0) fps = 0;
    }
    
    // Update indicators real-time (every frame, even when rendering is skipped)
    updateFPSIndicator();
    updateFrameTimeIndicator();
    updateSmoothnessIndicator();
    
    // Only render and update scene if frame should be rendered
    if (shouldRender) {
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
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Setup FPS limit toggle
function setupFPSLimitToggle() {
    const toggle = document.getElementById('fps-limit-toggle');
    if (toggle) {
        toggle.addEventListener('change', function() {
            fpsLimitEnabled = this.checked;
            lastFrameTime = performance.now(); // Reset frame timing
            console.log('FPS Limit 60:', fpsLimitEnabled ? 'Enabled' : 'Disabled');
        });
    }
}

// Wait for DOM to be ready before starting animation and updating indicators
function init() {
    // Setup FPS limit toggle
    setupFPSLimitToggle();
    
    // Initialize indicators once DOM is ready
    updateFPSIndicator();
    updateFrameTimeIndicator();
    updateSmoothnessIndicator();
    
    // Start animation
    animate();
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM is already ready
    init();
}
