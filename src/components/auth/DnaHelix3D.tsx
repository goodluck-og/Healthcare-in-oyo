import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Pause, Play, RotateCcw } from 'lucide-react';

interface DnaHelix3DProps {
  className?: string;
}

function detectSoftwareWebGL(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    return /swiftshader|llvmpipe|softpipe|mesa offscreen|basic render/i.test(rendererStr);
  } catch {
    return false;
  }
}

export function DnaHelix3D({ className = '' }: DnaHelix3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const pausedRef = useRef(false);
  const resetSignalRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const isSoftwareGl = detectSoftwareWebGL(renderer);
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 360);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 0.25, 11.4);

    // Studio IBL environment for metallic & glass specular highlights
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Key, rim & warm amber accent lighting tuned to Blue Eclipse
    const ambientLight = new THREE.AmbientLight('#8686AC', 0.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#DCE0FF', 1.85);
    keyLight.position.set(5, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight('#6E72E8', 2.4, 24);
    rimLight.position.set(-5.5, 2, -4);
    scene.add(rimLight);

    const warmLight = new THREE.PointLight('#E8702A', 1.9, 20);
    warmLight.position.set(4.5, -3.5, 4);
    scene.add(warmLight);

    const helixPivot = new THREE.Group();
    helixPivot.rotation.z = -0.26;
    scene.add(helixPivot);

    const helixGroup = new THREE.Group();
    helixPivot.add(helixGroup);

    // Helix parameters
    const turns = 2.65;
    const totalHeight = 9.2;
    const radius = 1.52;
    const curveSamples = isSoftwareGl ? 72 : 120;
    const basePairs = 26;

    const strandAPoints: THREE.Vector3[] = [];
    const strandBPoints: THREE.Vector3[] = [];

    for (let i = 0; i <= curveSamples; i++) {
      const t = i / curveSamples;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * totalHeight;
      strandAPoints.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      strandBPoints.push(
        new THREE.Vector3(
          Math.cos(angle + Math.PI) * radius,
          y,
          Math.sin(angle + Math.PI) * radius
        )
      );
    }

    const curveA = new THREE.CatmullRomCurve3(strandAPoints);
    const curveB = new THREE.CatmullRomCurve3(strandBPoints);

    const tubeSegments = isSoftwareGl ? 64 : 112;
    const radialSegments = isSoftwareGl ? 10 : 16;

    const strandAGeo = new THREE.TubeGeometry(curveA, tubeSegments, 0.135, radialSegments, false);
    const strandBGeo = new THREE.TubeGeometry(curveB, tubeSegments, 0.135, radialSegments, false);

    const strandAMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#6C71EC'),
      emissive: new THREE.Color('#272757'),
      emissiveIntensity: 0.45,
      roughness: 0.22,
      metalness: 0.55,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
    });

    const strandBMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#E8702A'),
      emissive: new THREE.Color('#5A2208'),
      emissiveIntensity: 0.42,
      roughness: 0.26,
      metalness: 0.45,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    });

    const strandAMesh = new THREE.Mesh(strandAGeo, strandAMat);
    const strandBMesh = new THREE.Mesh(strandBGeo, strandBMat);
    helixGroup.add(strandAMesh, strandBMesh);

    // Instanced base-pair rungs (split into left & right nucleotides for biochemical realism)
    const halfRungGeo = new THREE.CylinderGeometry(
      0.055,
      0.055,
      radius * 0.92,
      isSoftwareGl ? 8 : 12
    );
    const halfRungMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.28,
      metalness: 0.35,
    });
    const halfRungs = new THREE.InstancedMesh(halfRungGeo, halfRungMat, basePairs * 2);

    // Instanced backbone phosphate nodes + center hydrogen bond beads
    const nodeGeo = new THREE.SphereGeometry(0.19, isSoftwareGl ? 10 : 16, isSoftwareGl ? 10 : 16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.2,
      metalness: 0.55,
    });
    const backboneNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, basePairs * 2);

    const bondGeo = new THREE.SphereGeometry(0.085, isSoftwareGl ? 8 : 12, isSoftwareGl ? 8 : 12);
    const bondMat = new THREE.MeshStandardMaterial({
      color: '#E6E8FF',
      emissive: '#505081',
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.2,
    });
    const bondNodes = new THREE.InstancedMesh(bondGeo, bondMat, basePairs);

    const dummy = new THREE.Object3D();
    const upVec = new THREE.Vector3(0, 1, 0);
    const colorIndigo = new THREE.Color('#8A8EF5');
    const colorLavender = new THREE.Color('#B5B8E8');
    const colorAmber = new THREE.Color('#FF9F5A');
    const colorTeal = new THREE.Color('#4FD1C5');

    for (let i = 0; i < basePairs; i++) {
      const t = (i + 0.5) / basePairs;
      const pA = curveA.getPoint(t);
      const pB = curveB.getPoint(t);
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);

      // Left half rung (pA -> mid)
      const dirA = new THREE.Vector3().subVectors(mid, pA).normalize();
      const midA = new THREE.Vector3().addVectors(pA, mid).multiplyScalar(0.5);
      dummy.position.copy(midA);
      dummy.quaternion.setFromUnitVectors(upVec, dirA);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      halfRungs.setMatrixAt(i * 2, dummy.matrix);
      halfRungs.setColorAt(i * 2, i % 2 === 0 ? colorIndigo : colorTeal);

      // Right half rung (mid -> pB)
      const dirB = new THREE.Vector3().subVectors(pB, mid).normalize();
      const midB = new THREE.Vector3().addVectors(mid, pB).multiplyScalar(0.5);
      dummy.position.copy(midB);
      dummy.quaternion.setFromUnitVectors(upVec, dirB);
      dummy.updateMatrix();
      halfRungs.setMatrixAt(i * 2 + 1, dummy.matrix);
      halfRungs.setColorAt(i * 2 + 1, i % 2 === 0 ? colorAmber : colorLavender);

      // Phosphate nodes on strands A and B
      dummy.quaternion.identity();
      dummy.position.copy(pA);
      dummy.updateMatrix();
      backboneNodes.setMatrixAt(i * 2, dummy.matrix);
      backboneNodes.setColorAt(i * 2, colorIndigo);

      dummy.position.copy(pB);
      dummy.updateMatrix();
      backboneNodes.setMatrixAt(i * 2 + 1, dummy.matrix);
      backboneNodes.setColorAt(i * 2 + 1, colorAmber);

      // Center bond bead
      dummy.position.copy(mid);
      dummy.updateMatrix();
      bondNodes.setMatrixAt(i, dummy.matrix);
    }

    halfRungs.instanceMatrix.needsUpdate = true;
    if (halfRungs.instanceColor) halfRungs.instanceColor.needsUpdate = true;
    backboneNodes.instanceMatrix.needsUpdate = true;
    if (backboneNodes.instanceColor) backboneNodes.instanceColor.needsUpdate = true;
    bondNodes.instanceMatrix.needsUpdate = true;

    helixGroup.add(halfRungs, backboneNodes, bondNodes);

    // Bioluminescent DNA-Tree Canopy & Root Branches (organic medical technology tree silhouette)
    const branchGeos: THREE.BufferGeometry[] = [];
    const branchMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#8A8EF5'),
      emissive: new THREE.Color('#4FD1C5'),
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    const canopyCount = isSoftwareGl ? 6 : 10;
    const canopyTipGeo = new THREE.SphereGeometry(0.11, isSoftwareGl ? 6 : 10, isSoftwareGl ? 6 : 10);
    const canopyTipMat = new THREE.MeshStandardMaterial({
      color: '#FFB585',
      emissive: '#E8702A',
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const canopyTips = new THREE.InstancedMesh(canopyTipGeo, canopyTipMat, canopyCount * 2);

    for (let i = 0; i < canopyCount; i++) {
      const angle = (i / canopyCount) * Math.PI * 2;
      const spread = 2.1 + (i % 3) * 0.45;
      const topY = totalHeight * 0.5;
      const startTop = new THREE.Vector3(
        Math.cos(angle) * (radius * 0.55),
        topY - 0.55,
        Math.sin(angle) * (radius * 0.55)
      );
      const midTop = new THREE.Vector3(
        Math.cos(angle + 0.25) * (spread * 0.65),
        topY + 0.55,
        Math.sin(angle + 0.25) * (spread * 0.65)
      );
      const endTop = new THREE.Vector3(
        Math.cos(angle + 0.12) * spread,
        topY + 1.35 + (i % 2) * 0.35,
        Math.sin(angle + 0.12) * spread
      );
      const branchCurve = new THREE.CatmullRomCurve3([startTop, midTop, endTop]);
      const branchGeo = new THREE.TubeGeometry(branchCurve, isSoftwareGl ? 10 : 18, 0.036, 6, false);
      branchGeos.push(branchGeo);
      helixGroup.add(new THREE.Mesh(branchGeo, branchMat));

      dummy.position.copy(endTop);
      dummy.quaternion.identity();
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      canopyTips.setMatrixAt(i, dummy.matrix);

      // Gentle grounding root filaments at the lower helix base
      const botY = -totalHeight * 0.5;
      const rootSpread = 1.85 + (i % 2) * 0.35;
      const startBot = new THREE.Vector3(
        Math.cos(angle + 0.4) * (radius * 0.55),
        botY + 0.45,
        Math.sin(angle + 0.4) * (radius * 0.55)
      );
      const midBot = new THREE.Vector3(
        Math.cos(angle + 0.2) * (rootSpread * 0.68),
        botY - 0.45,
        Math.sin(angle + 0.2) * (rootSpread * 0.68)
      );
      const endBot = new THREE.Vector3(
        Math.cos(angle + 0.1) * rootSpread,
        botY - 1.05,
        Math.sin(angle + 0.1) * rootSpread
      );
      const rootCurve = new THREE.CatmullRomCurve3([startBot, midBot, endBot]);
      const rootGeo = new THREE.TubeGeometry(rootCurve, isSoftwareGl ? 8 : 14, 0.03, 6, false);
      branchGeos.push(rootGeo);
      helixGroup.add(new THREE.Mesh(rootGeo, branchMat));

      dummy.position.copy(endBot);
      dummy.scale.setScalar(0.75);
      dummy.updateMatrix();
      canopyTips.setMatrixAt(canopyCount + i, dummy.matrix);
    }
    canopyTips.instanceMatrix.needsUpdate = true;
    helixGroup.add(canopyTips);

    // Subtle orbital holographic rings around base for depth framing
    const ringGeo = new THREE.TorusGeometry(2.55, 0.015, 8, isSoftwareGl ? 48 : 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#6E72E8',
      transparent: true,
      opacity: 0.28,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2.25;
    ring1.position.y = -2.2;
    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = Math.PI / 2.25;
    ring2.scale.setScalar(0.76);
    ring2.position.y = 2.4;
    helixPivot.add(ring1, ring2);

    // Ambient floating bio-particles
    const particleCount = isSoftwareGl ? 45 : 95;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.6 + ((i * 37) % 100) / 38;
      const theta = (i * 2.39996) % (Math.PI * 2);
      const y = (((i * 19) % 100) / 100 - 0.5) * 10.5;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#B8BCFF',
      size: 0.065,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Pointer drag & hover interaction state
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let targetRotY = 0;
    let targetRotX = 0;
    let currentRotY = 0;
    let currentRotX = 0;
    let lastResetSeen = resetSignalRef.current;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer?.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        targetRotY += dx * 0.011;
        targetRotX = THREE.MathUtils.clamp(targetRotX + dy * 0.008, -0.75, 0.75);
      } else {
        const rect = container.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
        targetRotX = THREE.MathUtils.clamp(ny * 0.18, -0.35, 0.35);
        helixPivot.rotation.z = -0.26 + nx * 0.06;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      try {
        renderer?.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('pointercancel', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!renderer) return;
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 280);
        const h = Math.max(entry.contentRect.height, 300);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let prevTime = performance.now();

    const renderFrame = () => {
      if (disposed || !renderer) return;
      const now = performance.now();
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;

      if (resetSignalRef.current !== lastResetSeen) {
        lastResetSeen = resetSignalRef.current;
        targetRotY = 0;
        targetRotX = 0;
        helixPivot.rotation.z = -0.26;
      }

      if (!pausedRef.current && !dragging) {
        targetRotY += dt * 0.55;
      }

      currentRotY = THREE.MathUtils.damp(currentRotY, targetRotY, 6, dt);
      currentRotX = THREE.MathUtils.damp(currentRotX, targetRotX, 6, dt);

      helixGroup.rotation.y = currentRotY;
      helixPivot.rotation.x = currentRotX;
      helixPivot.position.y = Math.sin(now * 0.0014) * 0.18;
      particles.rotation.y = now * 0.00012;
      ring1.rotation.z = now * 0.00035;
      ring2.rotation.z = -now * 0.00028;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        timeoutId = setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(renderFrame);
        }, 28);
      } else {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointercancel', onPointerUp);
      strandAGeo.dispose();
      strandBGeo.dispose();
      strandAMat.dispose();
      strandBMat.dispose();
      halfRungGeo.dispose();
      halfRungMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      bondGeo.dispose();
      bondMat.dispose();
      branchGeos.forEach((g) => g.dispose());
      branchMat.dispose();
      canopyTipGeo.dispose();
      canopyTipMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      envTarget.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B0A33] via-[#13124A] to-[#211F63] border border-white/10 ${className}`}
    >
      {/* Subtle radial glow behind helix */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_45%,rgba(108,113,236,0.28),transparent_58%),radial-gradient(circle_at_78%_75%,rgba(232,112,42,0.18),transparent_48%)]"
      />

      {webglFailed ? (
        <div className="relative z-10 flex h-full min-h-[380px] flex-col items-center justify-center p-8 text-center text-[#D7D8EE]">
          <svg viewBox="0 0 180 260" className="w-40 h-56 mb-4" aria-hidden="true">
            <path
              d="M45 15 C 135 55, 135 95, 45 135 C 135 175, 135 215, 45 245"
              fill="none"
              stroke="#6C71EC"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M135 15 C 45 55, 45 95, 135 135 C 45 175, 45 215, 135 245"
              fill="none"
              stroke="#E8702A"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-sm font-semibold text-white">Interactive Genomic &amp; Care Ecosystem</p>
          <p className="text-xs text-[#B8BADB] mt-1 max-w-xs">
            Unified clinical history, genotype awareness, and family health records.
          </p>
        </div>
      ) : (
        <div
          ref={mountRef}
          aria-label="Interactive 3D DNA double helix model — drag to rotate"
          className="relative z-10 h-full w-full min-h-[420px] cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Top caption — clean, no backdrop blur over WebGL */}
      <div className="pointer-events-none absolute top-6 left-6 right-6 z-20 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFB585]">
            HealthConnect Oyo State · Connected Care Network
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 leading-tight">
            Connected Care, Genotype &amp; Family Precision
          </h2>
        </div>
      </div>

      {/* Bottom interactive controls (solid surface, zero backdrop-blur) */}
      <div className="absolute bottom-5 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#C7C8E6]">
          Drag to rotate 3D DNA-Tree · Ibadan, Ogbomoso &amp; Oyo clinical care
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1B58] hover:bg-[#272757] border border-white/15 text-xs font-semibold text-white cursor-pointer"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={() => {
              resetSignalRef.current += 1;
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1B58] hover:bg-[#272757] border border-white/15 text-xs font-semibold text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
