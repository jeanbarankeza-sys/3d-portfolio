
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// =====================================================
// 1. CONFIGURATION
// =====================================================

const CONFIG = {
  fogDensity: 0.018,
  starCount: 2800,
  particleCount: 400,
  satelliteCount: 6,
  pixelRatio: 1.5,
  cameraSmoothing: 0.055,
  pointerSmoothing: 0.045,
  reducedMotion: window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
};

// =====================================================
// 2. SCENE
// =====================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x03030a);

scene.fog = new THREE.FogExp2(
  0x03030a,
  CONFIG.fogDensity
);

const clock = new THREE.Clock();

const canvas = document.querySelector('#webgl');

if (!canvas) {
  throw new Error('Canvas #webgl was not found in index.html');
}

// =====================================================
// 3. CAMERA
// =====================================================

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 1.5, 8);

const cameraTarget = new THREE.Vector3(0, 0, 0);
const currentLookAt = new THREE.Vector3(0, 0, 0);

const pointer = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  velocity: 0,
  previousX: 0,
  previousY: 0
};

// =====================================================
// 4. RENDERER
// =====================================================

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    CONFIG.pixelRatio
  )
);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = false;

// =====================================================
// 5. INTERACTIVE BACKGROUND SHADER
// =====================================================

const backgroundUniforms = {
  uTime: { value: 0 },
  uPointer: { value: new THREE.Vector2(0.5, 0.5) },
  uPointerVelocity: { value: 0 },
  uAccent: { value: new THREE.Color(0x8b5cf6) },
  uIntensity: { value: 1 }
};

const backgroundGeometry = new THREE.PlaneGeometry(2, 2);

const backgroundMaterial = new THREE.ShaderMaterial({
  uniforms: backgroundUniforms,

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;

      gl_Position = projectionMatrix *
        modelViewMatrix *
        vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform vec2 uPointer;
    uniform float uPointerVelocity;
    uniform vec3 uAccent;
    uniform float uIntensity;

    varying vec2 vUv;

    float random(vec2 st) {
      return fract(
        sin(dot(st.xy, vec2(12.9898, 78.233))) *
        43758.5453123
      );
    }

    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(
        a,
        b,
        u.x
      ) +
      (c - a) * u.y * (1.0 - u.x) +
      (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = vUv;

      float time = uTime * 0.08;

      // Slow atmospheric movement
      float n = noise(
        uv * 3.0 + vec2(time, -time * 0.7)
      );

      float wave = sin(
        uv.x * 5.0 +
        uv.y * 3.0 +
        uTime * 0.12
      ) * 0.5 + 0.5;

      // Base colors
      vec3 baseColor = vec3(0.008, 0.008, 0.025);
      vec3 purple = vec3(0.20, 0.035, 0.42);
      vec3 blue = vec3(0.025, 0.08, 0.35);
      vec3 cyan = vec3(0.0, 0.30, 0.38);

      // Cursor position
      vec2 cursor = uPointer;

      float distanceToCursor = distance(
        uv,
        cursor
      );

      // Main cursor glow
      float cursorGlow = exp(
        -distanceToCursor * 5.0
      );

      // Outer cursor atmosphere
      float outerGlow = exp(
        -distanceToCursor * 2.2
      );

      // Energy ring
      float ringDistance = abs(
        distanceToCursor - 0.16
      );

      float energyRing = exp(
        -ringDistance * 35.0
      );

      // Background atmospheric gradients
      float purpleGlow = exp(
        -distance(uv, vec2(0.18, 0.78)) * 2.8
      );

      float blueGlow = exp(
        -distance(uv, vec2(0.85, 0.2)) * 2.5
      );

      // Moving color field
      vec3 color = baseColor;

      color += purple * purpleGlow * 0.65;
      color += blue * blueGlow * 0.6;

      color += uAccent *
        cursorGlow *
        (0.8 + uPointerVelocity * 0.5);

      color += mix(
        purple,
        cyan,
        wave
      ) * outerGlow * 0.18;

      color += uAccent *
        energyRing *
        uPointerVelocity *
        0.18;

      // Atmospheric noise
      color += vec3(0.025, 0.018, 0.045) * n;

      // Gentle cinematic waves
      color += purple *
        wave *
        0.035 *
        sin(uTime * 0.2 + uv.y * 8.0);

      // Edge darkness
      float vignette = smoothstep(
        0.95,
        0.15,
        distance(uv, vec2(0.5))
      );

      color *= vignette * 0.8 + 0.2;

      color *= uIntensity;

      gl_FragColor = vec4(color, 1.0);
    }
  `,

  depthWrite: false,
  depthTest: false
});

// Keep the shader in front of the scene background,
// but behind the 3D objects.
const backgroundMesh = new THREE.Mesh(
  backgroundGeometry,
  backgroundMaterial
);

backgroundMesh.renderOrder = -100;

camera.add(backgroundMesh);
scene.add(camera);

const backgroundDistance = 80;

function resizeBackground() {
  const height = 2 * Math.tan(
    THREE.MathUtils.degToRad(camera.fov * 0.5)
  ) * backgroundDistance;

  const width = height * camera.aspect;

  backgroundMesh.position.set(
    0,
    0,
    -backgroundDistance
  );

  backgroundMesh.scale.set(
    width / 2,
    height / 2,
    1
  );
}

resizeBackground();

// =====================================================
// 6. LIGHTING SYSTEM
// =====================================================

const ambientLight = new THREE.AmbientLight(
  0xffffff,
  0.45
);

scene.add(ambientLight);

const mainLight = new THREE.PointLight(
  0x8b5cf6,
  140,
  45
);

mainLight.position.set(3, 5, 4);
scene.add(mainLight);

const blueLight = new THREE.PointLight(
  0x2563eb,
  110,
  40
);

blueLight.position.set(-5, 1, -4);
scene.add(blueLight);

const pinkLight = new THREE.PointLight(
  0xec4899,
  90,
  35
);

pinkLight.position.set(0, 4, -8);
scene.add(pinkLight);

const cyanLight = new THREE.PointLight(
  0x22d3ee,
  55,
  30
);

cyanLight.position.set(5, -2, 2);
scene.add(cyanLight);

// =====================================================
// 7. MAIN 3D WORLD
// =====================================================

const world = new THREE.Group();

scene.add(world);

world.position.set(0, 0, 0);

// =====================================================
// 8. MAIN ENERGY CORE
// =====================================================

const coreGeometry = new THREE.IcosahedronGeometry(
  1.45,
  3
);

const coreMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x32106b,
  emissive: 0x6d28d9,
  emissiveIntensity: 1.6,
  metalness: 0.8,
  roughness: 0.16,
  clearcoat: 1,
  clearcoatRoughness: 0.08
});

const core = new THREE.Mesh(
  coreGeometry,
  coreMaterial
);

world.add(core);

// =====================================================
// 9. INNER ENERGY STRUCTURE
// =====================================================

const innerGeometry = new THREE.IcosahedronGeometry(
  0.88,
  2
);

const innerMaterial = new THREE.MeshBasicMaterial({
  color: 0xa78bfa,
  wireframe: true,
  transparent: true,
  opacity: 0.28
});

const innerCore = new THREE.Mesh(
  innerGeometry,
  innerMaterial
);

world.add(innerCore);

// =====================================================
// 10. OUTER WIREFRAME
// =====================================================

const wireGeometry = new THREE.IcosahedronGeometry(
  1.65,
  2
);

const wireMaterial = new THREE.MeshBasicMaterial({
  color: 0xc4b5fd,
  wireframe: true,
  transparent: true,
  opacity: 0.2
});

const wireframe = new THREE.Mesh(
  wireGeometry,
  wireMaterial
);

world.add(wireframe);

// =====================================================
// 11. ATMOSPHERIC ENERGY GLOW
// =====================================================

const glowGeometry = new THREE.SphereGeometry(
  2.15,
  32,
  32
);

const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0x6d28d9,
  transparent: true,
  opacity: 0.07,
  side: THREE.BackSide,
  depthWrite: false
});

const glow = new THREE.Mesh(
  glowGeometry,
  glowMaterial
);

world.add(glow);

const secondaryGlowGeometry = new THREE.SphereGeometry(
  2.7,
  24,
  24
);

const secondaryGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0x2563eb,
  transparent: true,
  opacity: 0.025,
  side: THREE.BackSide,
  depthWrite: false
});

const secondaryGlow = new THREE.Mesh(
  secondaryGlowGeometry,
  secondaryGlowMaterial
);

world.add(secondaryGlow);

// =====================================================
// 12. ORBITAL RING SYSTEM
// =====================================================

const rings = [];

for (let i = 0; i < 4; i++) {
  const geometry = new THREE.TorusGeometry(
    2.1 + i * 0.23,
    0.012,
    8,
    160
  );

  const material = new THREE.MeshBasicMaterial({
    color: i % 2 === 0
      ? 0x8b5cf6
      : 0x3b82f6,
    transparent: true,
    opacity: 0.65
  });

  const ring = new THREE.Mesh(
    geometry,
    material
  );

  ring.rotation.x = Math.PI / 2 + i * 0.28;
  ring.rotation.y = i * 0.45;

  world.add(ring);
  rings.push(ring);
}

// =====================================================
// 13. ORBITING SATELLITES
// =====================================================

const satellites = [];

for (let i = 0; i < CONFIG.satelliteCount; i++) {
  const geometry = new THREE.SphereGeometry(
    0.07 + Math.random() * 0.05,
    16,
    16
  );

  const material = new THREE.MeshStandardMaterial({
    color: i % 2 === 0
      ? 0xa78bfa
      : 0x60a5fa,
    emissive: i % 2 === 0
      ? 0x7c3aed
      : 0x2563eb,
    emissiveIntensity: 2,
    metalness: 0.5,
    roughness: 0.2
  });

  const satellite = new THREE.Mesh(
    geometry,
    material
  );

  const angle =
    (i / CONFIG.satelliteCount) * Math.PI * 2;

  satellite.userData = {
    angle,
    radius: 2.8 + Math.random() * 0.6,
    speed: 0.2 + Math.random() * 0.2,
    height: (Math.random() - 0.5) * 1.5
  };

  world.add(satellite);
  satellites.push(satellite);
}

// =====================================================
// 14. ENVIRONMENT GRID
// =====================================================

const grid = new THREE.GridHelper(
  120,
  120,
  0x5930a8,
  0x17102b
);

grid.position.y = -3.5;

scene.add(grid);

// =====================================================
// 15. STAR FIELD
// =====================================================

const starGeometry = new THREE.BufferGeometry();
const starPositions = [];

for (let i = 0; i < CONFIG.starCount; i++) {
  starPositions.push(
    (Math.random() - 0.5) * 150,
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 150
  );
}

starGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(
    starPositions,
    3
  )
);

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.045,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true
});

const stars = new THREE.Points(
  starGeometry,
  starMaterial
);

scene.add(stars);

// =====================================================
// 16. FLOATING PARTICLES
// =====================================================

const particleGeometry = new THREE.BufferGeometry();
const particlePositions = [];

for (let i = 0; i < CONFIG.particleCount; i++) {
  particlePositions.push(
    (Math.random() - 0.5) * 35,
    (Math.random() - 0.5) * 25,
    (Math.random() - 0.5) * 35
  );
}

particleGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(
    particlePositions,
    3
  )
);

const particleMaterial = new THREE.PointsMaterial({
  color: 0xa78bfa,
  size: 0.035,
  transparent: true,
  opacity: 0.65,
  sizeAttenuation: true
});

const particles = new THREE.Points(
  particleGeometry,
  particleMaterial
);

scene.add(particles);

// =====================================================
// 17. CINEMATIC CAMERA SCROLL SYSTEM
// =====================================================

const experience = document.querySelector('#experience');

if (experience) {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: experience,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
      invalidateOnRefresh: true
    }
  });

  // HOME

  timeline.to(camera.position, {
    x: 0,
    y: 1.5,
    z: 7,
    duration: 1,
    ease: 'none'
  }, 0);

  timeline.to(cameraTarget, {
    x: 0,
    y: 0,
    z: 0,
    duration: 1,
    ease: 'none'
  }, 0);

  // ABOUT

  timeline.to(camera.position, {
    x: 4.5,
    y: 1.8,
    z: 5,
    duration: 1,
    ease: 'none'
  });

  timeline.to(cameraTarget, {
    x: 0.3,
    y: 0,
    z: 0,
    duration: 1,
    ease: 'none'
  }, '<');

  timeline.to(world.rotation, {
    y: Math.PI * 0.5,
    duration: 1,
    ease: 'none'
  }, '<');

  // SKILLS

  timeline.to(camera.position, {
    x: -4.5,
    y: 3.5,
    z: 6,
    duration: 1,
    ease: 'none'
  });

  timeline.to(cameraTarget, {
    x: 0,
    y: 0.2,
    z: 0,
    duration: 1,
    ease: 'none'
  }, '<');

  timeline.to(world.rotation, {
    y: Math.PI * 1.5,
    x: 0.2,
    duration: 1,
    ease: 'none'
  }, '<');

  timeline.to(core.scale, {
    x: 1.2,
    y: 1.2,
    z: 1.2,
    duration: 1,
    ease: 'none'
  }, '<');

  // CONTACT

  timeline.to(camera.position, {
    x: 0,
    y: 5,
    z: 10,
    duration: 1,
    ease: 'none'
  });

  timeline.to(cameraTarget, {
    x: 0,
    y: 0,
    z: 0,
    duration: 1,
    ease: 'none'
  }, '<');

  timeline.to(world.rotation, {
    x: 0,
    y: Math.PI * 2,
    duration: 1,
    ease: 'none'
  }, '<');

  timeline.to(core.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: 1,
    ease: 'none'
  }, '<');
}

// =====================================================
// 18. ACTIVE NAVIGATION
// =====================================================

const sections = document.querySelectorAll(
  '#home, #about, #skills, #contact'
);

const navLinks = document.querySelectorAll(
  '.nav-links a'
);

function setActiveLink(sectionId) {
  navLinks.forEach((link) => {
    const target = link.getAttribute('href');

    link.classList.toggle(
      'active',
      target === `#${sectionId}`
    );
  });
}

sections.forEach((section) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top center',
    end: 'bottom center',
    onEnter: () => setActiveLink(section.id),
    onEnterBack: () => setActiveLink(section.id)
  });
});

// =====================================================
// 19. CINEMATIC SECTION REVEALS
// =====================================================

sections.forEach((section) => {
  const elements = section.querySelectorAll(
    'h1, h2, h3, p, a, button'
  );

  if (!elements.length) return;

  gsap.fromTo(
    elements,
    {
      opacity: 0,
      y: 45,
      filter: 'blur(8px)'
    },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.1,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        toggleActions: 'play none none reverse'
      }
    }
  );
});

// =====================================================
// 20. ADVANCED MOUSE INTERACTION
// =====================================================

function pointerHandler(event) {
  const normalizedX =
    (event.clientX / window.innerWidth) * 2 - 1;

  const normalizedY =
    -(event.clientY / window.innerHeight) * 2 + 1;

  pointer.targetX = normalizedX;
  pointer.targetY = normalizedY;

  const movementX =
    normalizedX - pointer.previousX;

  const movementY =
    normalizedY - pointer.previousY;

  pointer.velocity = Math.min(
    Math.sqrt(
      movementX * movementX +
      movementY * movementY
    ) * 8,
    1
  );

  pointer.previousX = normalizedX;
  pointer.previousY = normalizedY;
}

if (!CONFIG.reducedMotion) {
  window.addEventListener(
    'pointermove',
    pointerHandler,
    { passive: true }
  );
}

// =====================================================
// 21. DYNAMIC COLOR SYSTEM
// =====================================================

const colorPurple = new THREE.Color(0x8b5cf6);
const colorBlue = new THREE.Color(0x2563eb);
const colorCyan = new THREE.Color(0x22d3ee);
const colorPink = new THREE.Color(0xec4899);

const activeAccent = new THREE.Color(0x8b5cf6);
const targetAccent = new THREE.Color(0x8b5cf6);

function updateDynamicColors() {
  const horizontal = (pointer.x + 1) * 0.5;

  if (horizontal < 0.33) {
    targetAccent.copy(colorPurple).lerp(
      colorPink,
      1 - horizontal / 0.33
    );
  } else if (horizontal < 0.66) {
    targetAccent.copy(colorPurple).lerp(
      colorBlue,
      (horizontal - 0.33) / 0.33
    );
  } else {
    targetAccent.copy(colorBlue).lerp(
      colorCyan,
      (horizontal - 0.66) / 0.34
    );
  }

  activeAccent.lerp(targetAccent, 0.035);

  backgroundUniforms.uAccent.value.copy(
    activeAccent
  );

  coreMaterial.emissive.lerp(
    activeAccent,
    0.025
  );

  glowMaterial.color.lerp(
    activeAccent,
    0.025
  );

  innerMaterial.color.lerp(
    activeAccent,
    0.025
  );

  ringMaterialUpdate();
}

function ringMaterialUpdate() {
  rings.forEach((ring, index) => {
    const variation = index % 2 === 0
      ? activeAccent
      : colorBlue;

    ring.material.color.lerp(
      variation,
      0.02
    );
  });
}

// =====================================================
// 22. ANIMATION LOOP
// =====================================================

let animationFrameId;
let isPageVisible = !document.hidden;

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  if (!isPageVisible) return;

  const elapsed = clock.getElapsedTime();

  // Smooth cursor follow

  pointer.x +=
    (pointer.targetX - pointer.x) *
    CONFIG.pointerSmoothing;

  pointer.y +=
    (pointer.targetY - pointer.y) *
    CONFIG.pointerSmoothing;

  pointer.velocity *= 0.94;

  // Update background shader

  backgroundUniforms.uTime.value = elapsed;

  backgroundUniforms.uPointer.value.set(
    (pointer.x + 1) * 0.5,
    (pointer.y + 1) * 0.5
  );

  backgroundUniforms.uPointerVelocity.value =
    pointer.velocity;

  // Change background color with cursor position

  updateDynamicColors();

  // Main energy core

  core.rotation.y = elapsed * 0.16;
  core.rotation.x =
    Math.sin(elapsed * 0.3) * 0.15 +
    pointer.y * 0.12;

  core.position.y =
    Math.sin(elapsed * 0.7) * 0.2;

  // Cursor interaction with core

  core.rotation.x += pointer.y * 0.08;
  core.rotation.z = pointer.x * 0.08;

  const energyScale =
    1 + Math.abs(pointer.velocity) * 0.045;

  core.scale.setScalar(energyScale);

  // Inner structure

  innerCore.rotation.y = -elapsed * 0.2;
  innerCore.rotation.x = elapsed * 0.12;

  innerCore.rotation.z = pointer.x * 0.15;

  // Outer wireframe

  wireframe.rotation.y = -elapsed * 0.12;
  wireframe.rotation.x = elapsed * 0.08;

  wireframe.rotation.z = -pointer.x * 0.1;

  // Energy glow

  const glowScale =
    1 +
    Math.sin(elapsed * 1.2) * 0.035 +
    Math.abs(pointer.velocity) * 0.08;

  glow.scale.setScalar(glowScale);

  secondaryGlow.scale.setScalar(
    1 + Math.sin(elapsed * 0.8) * 0.05
  );

  // Orbital rings

  rings.forEach((ring, index) => {
    ring.rotation.z =
      elapsed * (0.08 + index * 0.025) +
      pointer.x * 0.12;

    ring.rotation.x += pointer.y * 0.0008;
  });

  // Orbiting satellites

  satellites.forEach((satellite) => {
    const data = satellite.userData;

    const angle =
      data.angle + elapsed * data.speed;

    satellite.position.x =
      Math.cos(angle) * data.radius +
      pointer.x * 0.12;

    satellite.position.z =
      Math.sin(angle) * data.radius;

    satellite.position.y =
      data.height +
      Math.sin(elapsed + data.angle) * 0.3 +
      pointer.y * 0.12;
  });

  // Atmospheric movement

  stars.rotation.y =
    elapsed * 0.004 + pointer.x * 0.025;

  stars.rotation.x = pointer.y * 0.018;

  particles.rotation.y =
    elapsed * 0.009 + pointer.x * 0.045;

  particles.rotation.x = pointer.y * 0.035;

  // Move the environment grid gently

  grid.position.x +=
    (pointer.x * 0.25 - grid.position.x) * 0.008;

  // Smooth camera parallax

  const targetX =
    cameraTarget.x + pointer.x * 0.38;

  const targetY =
    cameraTarget.y + pointer.y * 0.25;

  currentLookAt.x +=
    (targetX - currentLookAt.x) *
    CONFIG.cameraSmoothing;

  currentLookAt.y +=
    (targetY - currentLookAt.y) *
    CONFIG.cameraSmoothing;

  currentLookAt.z +=
    (cameraTarget.z - currentLookAt.z) *
    CONFIG.cameraSmoothing;

  camera.lookAt(currentLookAt);

  // Camera subtle movement

  camera.position.x +=
    (cameraTarget.x + pointer.x * 0.08 -
      camera.position.x) * 0.002;

  // Moving cinematic lights

  mainLight.position.x =
    3 +
    Math.sin(elapsed * 0.4) * 2 +
    pointer.x * 3;

  mainLight.position.y =
    5 + pointer.y * 2;

  blueLight.position.x =
    -5 + pointer.x * 2;

  blueLight.position.z =
    -4 + Math.cos(elapsed * 0.3) * 2;

  pinkLight.position.x =
    pointer.x * -3;

  pinkLight.intensity =
    90 + Math.sin(elapsed * 0.6) * 15 +
    pointer.velocity * 25;

  cyanLight.position.y =
    -2 + pointer.y * 3;

  // Render

  renderer.render(scene, camera);
}

animate();

// =====================================================
// 23. PAGE VISIBILITY OPTIMIZATION
// =====================================================

document.addEventListener(
  'visibilitychange',
  () => {
    isPageVisible = !document.hidden;

    if (isPageVisible) {
      clock.start();
    }
  }
);

// =====================================================
// 24. RESPONSIVE RESIZE
// =====================================================

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      CONFIG.pixelRatio
    )
  );

  resizeBackground();

  ScrollTrigger.refresh();
}

window.addEventListener(
  'resize',
  handleResize,
  { passive: true }
);

// =====================================================
// 25. REDUCED MOTION SUPPORT
// =====================================================

if (CONFIG.reducedMotion) {
  gsap.globalTimeline.timeScale(0.65);

  pointer.x = 0;
  pointer.y = 0;
  pointer.targetX = 0;
  pointer.targetY = 0;
}

// =====================================================
// 26. CLEANUP
// =====================================================

window.addEventListener(
  'beforeunload',
  () => {
    cancelAnimationFrame(animationFrameId);

    window.removeEventListener(
      'pointermove',
      pointerHandler
    );

    window.removeEventListener(
      'resize',
      handleResize
    );

    document.removeEventListener(
      'visibilitychange',
      () => {}
    );

    ScrollTrigger.getAll().forEach((trigger) => {
      trigger.kill();
    });

    renderer.dispose();

    backgroundGeometry.dispose();
    backgroundMaterial.dispose();

    coreGeometry.dispose();
    coreMaterial.dispose();

    innerGeometry.dispose();
    innerMaterial.dispose();

    wireGeometry.dispose();
    wireMaterial.dispose();

    glowGeometry.dispose();
    glowMaterial.dispose();

    secondaryGlowGeometry.dispose();
    secondaryGlowMaterial.dispose();

    starGeometry.dispose();
    starMaterial.dispose();

    particleGeometry.dispose();
    particleMaterial.dispose();

    rings.forEach((ring) => {
      ring.geometry.dispose();
      ring.material.dispose();
    });

    satellites.forEach((satellite) => {
      satellite.geometry.dispose();
      satellite.material.dispose();
    });
  }
);

console.log(
  'BJD Cinematic Interactive 3D Background — Initialized'
);
