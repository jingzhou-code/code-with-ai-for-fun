import * as THREE from 'three';

export const WEIR_Z_POSITIONS = [-102.0, -64.0, -26.0, 12.0, 48.0, 86.0];

export function createRiverMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.75, 0.35).normalize() },
      uSkyColor: { value: new THREE.Color(0x8ab6d6) },
      uDeepColor: { value: new THREE.Color(0x164244) },
      uShallowColor: { value: new THREE.Color(0x2f756e) },
      uLanternWarmth: { value: 0.35 },
      uSnowFactor: { value: 0.0 }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      varying float vEdgeFoam;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float flow = wp.z * 0.65 - uTime * 3.4;
        float wave1 = sin(flow + wp.x * 1.9) * 0.032;
        float wave2 = cos(wp.z * 1.7 - uTime * 5.1 - wp.x * 2.6) * 0.018;
        wp.y += wave1 + wave2;

        // Bank proximity from UV.x (0 = west bank, 1 = east bank)
        float edgeDist = min(uv.x, 1.0 - uv.x);
        vEdgeFoam = smoothstep(0.16, 0.01, edgeDist);

        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSkyColor;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform float uLanternWarmth;
      uniform float uSnowFactor;

      varying vec3 vWorldPos;
      varying vec2 vUv;
      varying float vEdgeFoam;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p = p * 2.07 + vec2(13.1, 7.7);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 flowUv = vec2(vWorldPos.x * 0.85, vWorldPos.z * 0.55 - uTime * 1.85);
        vec2 flowUv2 = vec2(vWorldPos.x * 1.45 + 4.2, vWorldPos.z * 0.95 - uTime * 2.75);

        float n1 = fbm(flowUv);
        float n2 = fbm(flowUv2);
        float ripple = (n1 * 0.6 + n2 * 0.4);

        // Approximate surface normal perturbation
        vec3 normal = normalize(vec3(
          (n1 - n2) * 0.55,
          1.0,
          (ripple - 0.5) * 0.65
        ));

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);

        float centerFactor = smoothstep(0.0, 0.42, min(vUv.x, 1.0 - vUv.x));
        vec3 waterCol = mix(uShallowColor, uDeepColor, centerFactor);
        waterCol = mix(waterCol, uSkyColor, clamp(fresnel * 0.65, 0.0, 0.68));

        // Sun / Moon specular sparkle
        vec3 halfVec = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), 72.0);
        waterCol += vec3(1.0, 0.97, 0.9) * spec * 0.75;

        // WarmKawadoko & lantern shimmer along surface at dusk/night
        float warmShimmer = pow(max(0.0, sin(vWorldPos.z * 1.4 - uTime * 4.2 + n1 * 5.0)), 6.0);
        waterCol += vec3(1.0, 0.52, 0.18) * warmShimmer * uLanternWarmth * 0.42;

        // Weir cascade white-water foam bands
        float weirFoam = 0.0;
        float weirs[6];
        weirs[0] = -102.0;
        weirs[1] = -64.0;
        weirs[2] = -26.0;
        weirs[3] = 12.0;
        weirs[4] = 48.0;
        weirs[5] = 86.0;
        for (int i = 0; i < 6; i++) {
          float dz = vWorldPos.z - weirs[i];
          // Upstream lip + downstream splash pool
          float band = exp(-dz * dz * 0.35) + smoothstep(3.8, 0.0, dz) * step(0.0, dz) * 0.85;
          weirFoam = max(weirFoam, band);
        }

        float streakFoam = smoothstep(0.64, 0.82, ripple) * 0.38;
        float totalFoam = clamp(weirFoam * (0.55 + 0.55 * n2) + vEdgeFoam * n1 * 0.75 + streakFoam, 0.0, 1.0);

        vec3 foamColor = mix(vec3(0.9, 0.95, 0.97), vec3(0.97, 0.98, 1.0), uSnowFactor);
        vec3 finalColor = mix(waterCol, foamColor, totalFoam);

        float alpha = mix(0.84, 0.97, totalFoam);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  });
}

export function createWaterfallMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uBrightness: { value: 0.92 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBrightness;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(91.7, 241.3))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 uv = vec2(vUv.x * 8.0, vUv.y * 2.5 + uTime * 3.8);
        float n1 = noise(uv);
        float n2 = noise(uv * 2.3 + vec2(3.1, uTime * 2.2));
        float streak = smoothstep(0.25, 0.85, n1 * 0.65 + n2 * 0.45);
        float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float topBottom = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        vec3 col = mix(vec3(0.45, 0.68, 0.72), vec3(0.95, 0.98, 1.0), streak) * uBrightness;
        gl_FragColor = vec4(col, (0.48 + streak * 0.46) * edgeFade * (0.65 + 0.35 * topBottom));
      }
    `
  });
}

export function createSacredSpringMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uRippleTime: { value: -10.0 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uRippleTime;
      varying vec2 vUv;

      void main() {
        vec2 center1 = vec2(0.25, 0.5);
        vec2 center2 = vec2(0.65, 0.45);
        float d1 = length(vUv - center1);
        float d2 = length(vUv - center2);

        float r1 = sin(d1 * 48.0 - uTime * 5.0) * exp(-d1 * 4.5);
        float r2 = sin(d2 * 42.0 - uTime * 4.3 + 1.4) * exp(-d2 * 4.2);

        // Interactive Mizuura-mikuji drop ripple
        float dt = max(0.0, uTime - uRippleTime);
        float dDrop = length(vUv - vec2(0.5, 0.52));
        float dropRing = sin((dDrop - dt * 0.35) * 55.0) * exp(-abs(dDrop - dt * 0.35) * 18.0) * exp(-dt * 1.1);

        float rings = (r1 + r2) * 0.5 + dropRing * 1.2;
        vec3 base = mix(vec3(0.16, 0.38, 0.39), vec3(0.34, 0.62, 0.60), 1.0 - d1);
        vec3 col = base + vec3(0.75, 0.9, 0.92) * max(0.0, rings) * 0.28;
        gl_FragColor = vec4(col, 0.84);
      }
    `
  });
}
