import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Building2, Pill, Stethoscope } from 'lucide-react';
import {
  AFRICA_HUBS,
  AfricaGlobeFallback,
  type GlobeHub,
} from './AfricaGlobeFallback';

const GLOBE_RADIUS = 1.56;
// Orient globe so Africa (~16°E, 4°N) faces directly toward the viewer (+Z)
const AFRICA_BASE_ROT_Y = -((16 + 90) * Math.PI) / 180;
const AFRICA_BASE_ROT_X = 0.14;

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

/**
 * Exact spherical projection matching Three.js SphereGeometry UV mapping:
 * u = (lon + 180) / 360 -> phi = u * 2π
 * v = (lat + 90) / 180  -> theta = (1 - v) * π
 */
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = ((lon + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  const x = -radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// Accurate equirectangular polygons [lon, lat] for Africa, Madagascar, Nigeria, and surrounding continents
const AFRICA_COASTLINE: Array<[number, number]> = [
  [-5.8, 35.8], [3.0, 36.8], [10.8, 37.1], [11.5, 33.2], [15.5, 32.2],
  [20.2, 32.7], [25.2, 31.6], [32.5, 31.3], [34.0, 28.0], [37.0, 22.0],
  [39.5, 16.0], [43.2, 12.6], [49.0, 11.4], [51.3, 11.9], [49.2, 7.5],
  [45.3, 2.0], [41.5, -1.6], [39.6, -4.5], [39.3, -8.5], [40.5, -11.5],
  [40.6, -15.2], [35.0, -19.8], [35.4, -24.0], [32.6, -26.5], [31.0, -29.8],
  [27.8, -33.0], [22.5, -34.2], [18.4, -34.3], [17.8, -30.0], [15.0, -26.0],
  [14.2, -21.0], [11.8, -17.0], [13.2, -12.0], [12.2, -6.0], [9.4, -1.0],
  [9.2, 4.0], [6.5, 4.4], [3.4, 6.4], [-0.2, 5.5], [-4.0, 5.2],
  [-7.6, 4.4], [-11.5, 7.0], [-13.7, 9.5], [-16.6, 12.4], [-17.4, 14.7],
  [-16.2, 19.5], [-16.8, 22.8], [-13.2, 27.6], [-9.8, 30.4], [-7.6, 33.6],
];

const MADAGASCAR_COASTLINE: Array<[number, number]> = [
  [49.3, -12.0], [50.4, -15.4], [49.2, -18.8], [47.0, -25.0],
  [44.1, -25.1], [43.5, -21.5], [44.6, -16.8], [47.8, -13.5],
];

const NIGERIA_POLYGON: Array<[number, number]> = [
  [2.7, 6.4], [4.5, 6.1], [6.1, 4.3], [8.5, 4.5], [9.6, 6.6],
  [11.8, 7.2], [13.6, 10.6], [14.1, 13.1], [11.4, 13.4], [8.4, 13.2],
  [5.4, 13.8], [3.6, 11.7], [2.7, 9.1],
];

const SURROUNDING_CONTINENTS: Array<Array<[number, number]>> = [
  // Europe
  [
    [-9.2, 37.0], [-9.0, 43.2], [-1.8, 43.4], [-4.5, 48.2], [2.0, 51.0],
    [8.5, 54.0], [10.5, 57.5], [5.5, 61.5], [16.0, 69.0], [28.0, 71.0],
    [40.0, 66.0], [42.0, 52.0], [38.0, 45.0], [29.0, 41.0], [23.0, 37.0],
    [18.0, 40.2], [12.5, 42.0], [5.0, 43.3], [0.0, 39.0], [-5.5, 36.1],
  ],
  // Arabian Peninsula & Asia
  [
    [35.0, 31.5], [34.5, 28.2], [43.4, 12.7], [52.0, 16.0], [59.8, 22.5],
    [56.2, 26.2], [49.0, 29.8], [56.0, 27.0], [67.0, 25.0], [77.5, 8.2],
    [88.0, 22.0], [100.0, 14.0], [109.0, 12.0], [121.0, 31.0], [131.0, 43.0],
    [142.0, 54.0], [165.0, 62.0], [140.0, 72.0], [95.0, 74.0], [60.0, 68.0],
    [42.0, 52.0], [40.0, 42.0], [36.0, 36.5],
  ],
  // South America
  [
    [-81.0, 9.0], [-72.0, 11.5], [-60.0, 8.5], [-50.0, 1.0], [-35.0, -6.0],
    [-38.5, -14.0], [-43.0, -23.0], [-53.0, -34.0], [-65.0, -45.0], [-69.0, -55.0],
    [-75.0, -48.0], [-71.5, -30.0], [-71.0, -18.0], [-81.2, -5.0], [-79.5, 2.0],
  ],
  // North America
  [
    [-165.0, 62.0], [-140.0, 70.0], [-95.0, 70.0], [-62.0, 62.0], [-55.0, 48.0],
    [-70.0, 42.0], [-81.0, 25.0], [-90.0, 29.0], [-97.0, 22.0], [-84.0, 10.0],
    [-92.0, 14.5], [-106.0, 20.0], [-117.0, 32.5], [-125.0, 48.0], [-138.0, 58.0],
  ],
  // Australia
  [
    [114.0, -22.0], [129.0, -14.0], [142.0, -11.0], [153.5, -27.5],
    [149.0, -37.5], [137.0, -35.5], [129.0, -31.8], [115.0, -34.0],
  ],
];

function buildGlobeTextures(maxAnisotropy: number): {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;

  const toCanvas = (lon: number, lat: number): [number, number] => [
    ((lon + 180) / 360) * width,
    ((90 - lat) / 180) * height,
  ];

  const drawPoly = (
    targetCtx: CanvasRenderingContext2D,
    pts: Array<[number, number]>,
    fill: string,
    stroke?: string,
    lineWidth = 2
  ) => {
    targetCtx.beginPath();
    pts.forEach(([lon, lat], idx) => {
      const [px, py] = toCanvas(lon, lat);
      if (idx === 0) targetCtx.moveTo(px, py);
      else targetCtx.lineTo(px, py);
    });
    targetCtx.closePath();
    targetCtx.fillStyle = fill;
    targetCtx.fill();
    if (stroke) {
      targetCtx.strokeStyle = stroke;
      targetCtx.lineWidth = lineWidth;
      targetCtx.stroke();
    }
  };

  // Deep HealthConnect indigo ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0E0D3A');
  oceanGrad.addColorStop(0.5, '#161654');
  oceanGrad.addColorStop(1, '#0C0B34');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Smooth ocean roughness (~0.35 -> value ~90)
  rCtx.fillStyle = '#5A5A5A';
  rCtx.fillRect(0, 0, width, height);

  // Graticule grid lines every 15 degrees
  ctx.strokeStyle = 'rgba(134, 134, 172, 0.16)';
  ctx.lineWidth = 1.2;
  for (let lon = -165; lon <= 180; lon += 15) {
    const [x] = toCanvas(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const [, y] = toCanvas(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Surrounding world continents (subtle indigo silhouettes for 360° orbit context)
  for (const continent of SURROUNDING_CONTINENTS) {
    drawPoly(ctx, continent, '#232366', 'rgba(159, 160, 204, 0.32)', 2);
    drawPoly(rCtx, continent, '#B8B8B8');
  }

  // Africa & Madagascar (prominent sculpted lavender-indigo with crisp illuminated coastline)
  drawPoly(ctx, AFRICA_COASTLINE, '#3C3C82', '#C7C8E6', 3.4);
  drawPoly(rCtx, AFRICA_COASTLINE, '#C8C8C8');

  drawPoly(ctx, MADAGASCAR_COASTLINE, '#3C3C82', '#C7C8E6', 2.8);
  drawPoly(rCtx, MADAGASCAR_COASTLINE, '#C8C8C8');

  // Subtle regional clinical corridor grid over Africa
  ctx.save();
  ctx.beginPath();
  AFRICA_COASTLINE.forEach(([lon, lat], idx) => {
    const [px, py] = toCanvas(lon, lat);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(199, 200, 230, 0.2)';
  ctx.lineWidth = 1.2;
  for (let lon = -18; lon <= 52; lon += 6) {
    const [x] = toCanvas(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -36; lat <= 38; lat += 6) {
    const [, y] = toCanvas(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Nigeria Launch Network Region Highlight
  drawPoly(ctx, NIGERIA_POLYGON, '#E8702A', '#FFD3B5', 3.2);
  drawPoly(rCtx, NIGERIA_POLYGON, '#9A9A9A');

  // Crisp subtle region labels directly on the Africa globe texture
  const labels: Array<{ name: string; lon: number; lat: number; highlight?: boolean }> = [
    { name: 'NIGERIA', lon: 8.1, lat: 9.2, highlight: true },
    { name: 'GHANA', lon: -1.4, lat: 7.9 },
    { name: 'KENYA', lon: 37.8, lat: 0.4 },
    { name: 'SOUTH AFRICA', lon: 24.0, lat: -29.0 },
    { name: 'EGYPT', lon: 29.8, lat: 26.8 },
    { name: 'MOROCCO', lon: -6.5, lat: 31.8 },
    { name: 'ETHIOPIA', lon: 39.5, lat: 8.8 },
    { name: 'DR CONGO', lon: 23.4, lat: -2.8 },
  ];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const label of labels) {
    const [lx, ly] = toCanvas(label.lon, label.lat);
    ctx.font = label.highlight
      ? '700 18px "DM Sans", sans-serif'
      : '600 13px "DM Sans", sans-serif';
    ctx.fillStyle = label.highlight ? '#FFFFFF' : 'rgba(226, 228, 250, 0.78)';
    ctx.fillText(label.name, lx, ly);
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = Math.min(8, maxAnisotropy);
  colorMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = Math.min(4, maxAnisotropy);
  roughnessMap.needsUpdate = true;

  return { colorMap, roughnessMap };
}

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(vViewPos);
    float rim = pow(1.0 - max(0.0, dot(normalize(vNormal), viewDir)), 2.8);
    vec3 col = mix(vec3(0.45, 0.52, 0.98), vec3(0.91, 0.44, 0.16), 0.16);
    gl_FragColor = vec4(col, rim * 0.55);
  }
`;

function GlobeConnectionArc({
  from,
  to,
  color,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}) {
  const geometry = useMemo(() => {
    const dist = from.distanceTo(to);
    const mid = from
      .clone()
      .add(to)
      .normalize()
      .multiplyScalar(GLOBE_RADIUS + 0.14 + dist * 0.18);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return new THREE.TubeGeometry(curve, 36, 0.0085, 6, false);
  }, [from, to]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.85}
        transparent
        opacity={0.9}
        roughness={0.25}
        metalness={0.15}
      />
    </mesh>
  );
}

function InteractiveAfricaGlobeScene({
  selectedHubId,
  onSelectHub,
  pointerOffset,
}: {
  selectedHubId: string;
  onSelectHub: (hub: GlobeHub) => void;
  pointerOffset: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const globeGroupRef = useRef<THREE.Group>(null);
  const orbitRingRef = useRef<THREE.Mesh>(null);
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();
    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene]);

  const { colorMap, roughnessMap } = useMemo(
    () => buildGlobeTextures(gl.capabilities.getMaxAnisotropy()),
    [gl]
  );

  useEffect(() => {
    return () => {
      colorMap.dispose();
      roughnessMap.dispose();
    };
  }, [colorMap, roughnessMap]);

  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
  }, []);

  useEffect(() => {
    return () => atmosphereMaterial.dispose();
  }, [atmosphereMaterial]);

  const hubPositions = useMemo(() => {
    return AFRICA_HUBS.map((hub) => {
      const surfacePos = latLonToVector3(hub.lat, hub.lon, GLOBE_RADIUS + 0.012);
      const normal = surfacePos.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal
      );
      return { hub, surfacePos, normal, quat };
    });
  }, []);

  const lagosPos = hubPositions[0].surfacePos;
  const abujaPos = hubPositions[1].surfacePos;

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (globeGroupRef.current) {
      const targetRotY =
        AFRICA_BASE_ROT_Y + pointerOffset.current.x * 0.24 + Math.sin(t * 0.35) * 0.08;
      const targetRotX =
        AFRICA_BASE_ROT_X - pointerOffset.current.y * 0.14 + Math.cos(t * 0.28) * 0.025;

      globeGroupRef.current.rotation.y = THREE.MathUtils.damp(
        globeGroupRef.current.rotation.y,
        targetRotY,
        3.0,
        delta
      );
      globeGroupRef.current.rotation.x = THREE.MathUtils.damp(
        globeGroupRef.current.rotation.x,
        targetRotX,
        3.0,
        delta
      );
    }
    if (orbitRingRef.current) {
      orbitRingRef.current.rotation.z += delta * 0.12;
    }
  });

  return (
    <>
      <hemisphereLight args={['#C7D2FE', '#0B0A33', 0.85]} />
      <directionalLight position={[4.5, 4, 5]} intensity={1.55} color="#FFF4EA" />
      <directionalLight position={[-4.5, -2.5, 3]} intensity={0.75} color="#7C83FF" />
      <pointLight position={[0, 1.4, 3.2]} intensity={0.85} distance={7} color="#E8702A" />

      {/* Outer Subtle Orbital Ring */}
      <mesh ref={orbitRingRef} rotation={[Math.PI / 2.25, 0.22, 0]}>
        <torusGeometry args={[GLOBE_RADIUS + 0.36, 0.006, 10, 96]} />
        <meshStandardMaterial
          color="#A5B4FC"
          emissive="#6366F1"
          emissiveIntensity={0.65}
          transparent
          opacity={0.42}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* Main 3D Africa Globe Group */}
      <group
        ref={globeGroupRef}
        rotation={[AFRICA_BASE_ROT_X, AFRICA_BASE_ROT_Y, 0]}
      >
        {/* Sculpted Earth Sphere */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial
            map={colorMap}
            roughnessMap={roughnessMap}
            roughness={0.78}
            metalness={0.14}
          />
        </mesh>

        {/* Atmospheric Fresnel Halo */}
        <mesh material={atmosphereMaterial}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.045, 48, 48]} />
        </mesh>

        {/* Pan-African Healthcare Connection Arcs */}
        {hubPositions.slice(2).map(({ hub, surfacePos }) => (
          <GlobeConnectionArc
            key={`arc-${hub.id}`}
            from={hub.country === 'Nigeria' ? abujaPos : lagosPos}
            to={surfacePos}
            color={hub.highlight ? '#E8702A' : '#A5B4FC'}
          />
        ))}

        {/* Interactive 3D Hub Beacons Anchored by Exact Lat/Lon */}
        {hubPositions.map(({ hub, surfacePos, quat }) => {
          const isSelected = hub.id === selectedHubId;
          const pinHeight = isSelected ? 0.22 : 0.13;
          return (
            <group key={hub.id} position={surfacePos} quaternion={quat}>
              {/* Surface Ring */}
              <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.028, isSelected ? 0.062 : 0.044, 24]} />
                <meshBasicMaterial
                  color={hub.highlight ? '#E8702A' : '#C7C8E6'}
                  transparent
                  opacity={isSelected ? 0.95 : 0.6}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              {/* Radial Beacon Stalk */}
              <mesh position={[0, pinHeight * 0.5, 0]}>
                <cylinderGeometry args={[0.006, 0.006, pinHeight, 8]} />
                <meshStandardMaterial
                  color={hub.highlight ? '#FFB585' : '#E0E7FF'}
                  emissive={hub.highlight ? '#E8702A' : '#818CF8'}
                  emissiveIntensity={1.1}
                  roughness={0.25}
                />
              </mesh>

              {/* Clickable Beacon Node */}
              <mesh
                position={[0, pinHeight, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHub(hub);
                }}
              >
                <octahedronGeometry args={[isSelected ? 0.052 : 0.036, 0]} />
                <meshStandardMaterial
                  color={hub.highlight ? '#E8702A' : '#FFFFFF'}
                  emissive={hub.highlight ? '#E8702A' : '#818CF8'}
                  emissiveIntensity={isSelected ? 1.6 : 0.85}
                  roughness={0.2}
                  metalness={0.35}
                />
              </mesh>

              {(isSelected || hub.id === 'hub-lagos' || hub.id === 'hub-nairobi') && (
                <Html
                  distanceFactor={5.2}
                  position={[0, pinHeight + 0.09, 0]}
                  style={{ pointerEvents: 'auto' }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectHub(hub)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap border transition-colors cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#0F0E47] text-white border-[#E8702A]'
                        : 'bg-[#0F0E47]/90 text-[#E6E7F8] border-white/25 hover:border-[#E8702A]'
                    }`}
                  >
                    {hub.type === 'Hospital' && <Building2 className="w-3 h-3 text-[#E8702A]" />}
                    {hub.type === 'Pharmacy' && <Pill className="w-3 h-3 text-[#E8702A]" />}
                    {hub.type === 'Clinic' && <Stethoscope className="w-3 h-3 text-[#E8702A]" />}
                    <span>{hub.city}</span>
                  </button>
                </Html>
              )}
            </group>
          );
        })}
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping={!isSoftwareGl}
        dampingFactor={0.06}
        rotateSpeed={0.55}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(Math.PI * 3) / 4}
      />
    </>
  );
}

export function AfricaGlobe3D({
  selectedHubId,
  onSelectHub,
}: {
  selectedHubId: string;
  onSelectHub: (hub: GlobeHub) => void;
}) {
  const [useLightweight, setUseLightweight] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const pointerOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const check = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const smallViewport = window.innerWidth < 768;
      setUseLightweight(reduced || smallViewport);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (useLightweight || contextLost) {
    return <AfricaGlobeFallback selectedHubId={selectedHubId} onSelectHub={onSelectHub} />;
  }

  return (
    <div
      className="relative w-full h-[430px] lg:h-[510px] select-none bg-[radial-gradient(ellipse_at_center,_#212162_0%,_#121148_58%,_#0B0A35_100%)]"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointerOffset.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerOffset.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      }}
      onMouseLeave={() => {
        pointerOffset.current.x = 0;
        pointerOffset.current.y = 0;
      }}
    >
      <Canvas
        dpr={isSoftwareGl ? 1 : [1, 2]}
        gl={{
          antialias: !isSoftwareGl,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0.25, 4.35], fov: 42 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          const canvasEl = gl.domElement;
          canvasEl.addEventListener('webglcontextlost', (ev) => {
            ev.preventDefault();
            setContextLost(true);
          });
          canvasEl.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <InteractiveAfricaGlobeScene
          selectedHubId={selectedHubId}
          onSelectHub={onSelectHub}
          pointerOffset={pointerOffset}
        />
      </Canvas>
    </div>
  );
}
