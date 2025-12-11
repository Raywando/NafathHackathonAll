import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// --- GLSL Shaders ---

const NebulaShaderMaterial = shaderMaterial(
    {
        uTime: 0,
        uColorCore: new THREE.Color(0.2, 0.6, 1.0), // Core: Cyan-ish
        uColorAura: new THREE.Color(0.5, 0.0, 0.5), // Aura: Purple-ish
        uSyncPulse: 0, // 0 to 1
        uOpacity: 0.8
    },
    // Vertex Shader
    `
    uniform float uTime;
    uniform float uSyncPulse;
    attribute float aScale;
    attribute vec3 aRandom;
    
    varying vec3 vColor;
    varying float vAlpha;
    varying float vRadius; // Distance from center (0.0 to 1.0+)

    // Simplex Noise (simplified for performance)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        
        // Corrected Simplex implementation details omitted for brevity, 
        // using the standard one provided previously but ensuring it works.
        // Re-using the previous working noise function body...
        
        // ... (Previous noise function body was fine, just ensuring context) ...
        // To save tokens, I will assume the previous noise function is preserved 
        // if I don't touch it, but since I am replacing the whole block, 
        // I must include it. I'll use a standard fast snoise.
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        // Permutations
        i = mod289(i); 
        vec4 p = permute( permute( permute( 
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
        //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        //Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        // Base position
        vec3 pos = position;
        
        // Calculate normalized radius for Core/Aura logic (assuming sphere radius ~2.0)
        vRadius = length(pos) / 2.0;

        // Add curl-like noise movement
        float noiseFreq = 0.5;
        float noiseAmp = 0.4;
        vec3 noisePos = vec3(pos.x * noiseFreq + uTime * 0.2, pos.y * noiseFreq, pos.z * noiseFreq);
        
        float n1 = snoise(noisePos);
        float n2 = snoise(noisePos + vec3(100.0));
        float n3 = snoise(noisePos + vec3(200.0));
        
        // Swirling effect
        pos.x += n1 * noiseAmp;
        pos.y += n2 * noiseAmp;
        pos.z += n3 * noiseAmp;
        
        // Rotate entire cloud slowly
        float angle = uTime * 0.1;
        float s = sin(angle);
        float c = cos(angle);
        mat2 rot = mat2(c, -s, s, c);
        pos.xz = rot * pos.xz;

        // Sync Pulse Explosion effect
        pos *= 1.0 + uSyncPulse * 0.5;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Size attenuation
        gl_PointSize = aScale * (300.0 / -mvPosition.z);
        
        // Pass to fragment
        vColor = aRandom; // Use random for subtle variation
        vAlpha = 1.0;
    }
    `,
    // Fragment Shader
    `
    uniform vec3 uColorCore;
    uniform vec3 uColorAura;
    uniform float uSyncPulse;
    uniform float uOpacity;
    
    varying vec3 vColor;
    varying float vAlpha;
    varying float vRadius;

    void main() {
        // Circular particle
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;

        // Soft glow
        float glow = 1.0 - (dist * 2.0);
        glow = pow(glow, 1.5);

        // DUAL LAYER COLOR MIXING
        // Core is < 0.5 radius, Aura is > 0.5 radius
        // Smoothstep for soft transition between Core and Aura
        float layerMix = smoothstep(0.4, 0.6, vRadius); 
        vec3 baseColor = mix(uColorCore, uColorAura, layerMix);

        // Mix base color with white for sync pulse
        vec3 finalColor = mix(baseColor, vec3(1.0), uSyncPulse);
        
        // Add subtle variation based on particle randomness
        finalColor += vColor * 0.1; 

        gl_FragColor = vec4(finalColor, uOpacity * glow);
    }
    `
);

extend({ NebulaShaderMaterial });

const ParticleField = ({ count = 3000, visualOTP = null }) => {
    const points = useRef();
    const materialRef = useRef();

    // Generate particles
    const [positions, scales, randoms] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const sc = new Float32Array(count);
        const rnd = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            // Spherical distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 1.5 + Math.random() * 0.5; // Radius 1.5 to 2.0

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);

            sc[i] = Math.random();

            rnd[i * 3] = Math.random();
            rnd[i * 3 + 1] = Math.random();
            rnd[i * 3 + 2] = Math.random();
        }
        return [pos, sc, rnd];
    }, [count]);

    // Animation Loop
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (!materialRef.current) return;

        materialRef.current.uTime = time;

        // Visual OTP Logic
        if (visualOTP && visualOTP.length > 0) {
            // Longer frames for reliable camera detection: 0.5s per frame
            const frameDuration = 0.5;
            const cycleTime = time % (visualOTP.length * frameDuration);
            const charIndex = Math.floor(cycleTime / frameDuration);
            const isStartOfCycle = cycleTime < 0.1; // Sync pulse window

            if (isStartOfCycle) {
                // SYNC PULSE
                materialRef.current.uSyncPulse = THREE.MathUtils.lerp(materialRef.current.uSyncPulse, 1.0, 0.2);
            } else {
                // NORMAL ENCODING
                materialRef.current.uSyncPulse = THREE.MathUtils.lerp(materialRef.current.uSyncPulse, 0.0, 0.1);

                const data = visualOTP[charIndex];

                // Handle both old format (string char) and new format (object {core, aura})
                let coreHue, auraHue;

                // SIMPLIFIED Color Mapping - Only 3 primary colors for reliable detection
                // Using pure RGB primaries that cameras can reliably distinguish
                const colorMap = {
                    'R': 0.0,   // Pure Red (0°)
                    'G': 0.33,  // Pure Green (120°)
                    'B': 0.67,  // Pure Blue (240°)
                    // Legacy mappings (fallback to nearest primary)
                    'Y': 0.15,  // Yellow → Orange-ish
                    'C': 0.5,   // Cyan → Teal
                    'M': 0.85   // Magenta → Purple
                };

                if (typeof data === 'string') {
                    // Legacy/Fallback: Single color for both
                    const hexValue = parseInt(data, 16);
                    coreHue = (hexValue / 15);
                    auraHue = coreHue;
                } else if (data.core && data.aura) {
                    // New Dual-Layer Format (Character Codes)
                    coreHue = colorMap[data.core] !== undefined ? colorMap[data.core] : 0.6;
                    auraHue = colorMap[data.aura] !== undefined ? colorMap[data.aura] : 0.8;
                } else {
                    // Fallback or Direct Hue
                    coreHue = data.coreHue || 0.6;
                    auraHue = data.auraHue || 0.8;
                }

                // Maximum saturation and brightness for reliable camera detection
                const targetCore = new THREE.Color().setHSL(coreHue, 1.0, 0.5);
                const targetAura = new THREE.Color().setHSL(auraHue, 1.0, 0.5);

                // FAST color transition for reliable detection
                materialRef.current.uColorCore.lerp(targetCore, 0.6);
                materialRef.current.uColorAura.lerp(targetAura, 0.6);
            }
        } else {
            // Idle State - Show off the dual layers
            materialRef.current.uSyncPulse = 0;
            const idleCore = new THREE.Color('#4f46e5'); // Indigo
            const idleAura = new THREE.Color('#ec4899'); // Pink

            materialRef.current.uColorCore.lerp(idleCore, 0.05);
            materialRef.current.uColorAura.lerp(idleAura, 0.05);
        }
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aScale"
                    count={count}
                    array={scales}
                    itemSize={1}
                />
                <bufferAttribute
                    attach="attributes-aRandom"
                    count={count}
                    array={randoms}
                    itemSize={3}
                />
            </bufferGeometry>
            {/* @ts-ignore */}
            <nebulaShaderMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export default ParticleField;
