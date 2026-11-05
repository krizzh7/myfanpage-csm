import { useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { characters, series } from '../data/assets';
import { sceneState } from './sceneState';

const characterColors = characters.map(({ accent }) => new THREE.Color(accent));
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uPlaneAspect;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uAccent;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv, float textureAspect, float planeAspect) {
    vec2 scale = textureAspect > planeAspect
      ? vec2(planeAspect / textureAspect, 1.0)
      : vec2(1.0, textureAspect / planeAspect);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    float textureAspect = uResolution.x / uResolution.y;
    vec2 uv = coverUv(vUv, textureAspect, uPlaneAspect);
    float distanceFromPointer = distance(vUv, uPointer);
    float ripple = sin(distanceFromPointer * 34.0 - uTime * 1.7) * 0.0025;
    uv += normalize(vUv - uPointer + 0.0001) * ripple * (1.0 - uScroll * 0.45);

    vec2 blur = (1.0 / uResolution) * uScroll * 12.0;
    vec4 color = texture2D(uTexture, uv) * 0.24;
    color += texture2D(uTexture, uv + vec2(blur.x, 0.0)) * 0.12;
    color += texture2D(uTexture, uv - vec2(blur.x, 0.0)) * 0.12;
    color += texture2D(uTexture, uv + vec2(0.0, blur.y)) * 0.12;
    color += texture2D(uTexture, uv - vec2(0.0, blur.y)) * 0.12;
    color += texture2D(uTexture, uv + blur) * 0.07;
    color += texture2D(uTexture, uv - blur) * 0.07;
    color += texture2D(uTexture, uv + vec2(blur.x, -blur.y)) * 0.07;
    color += texture2D(uTexture, uv + vec2(-blur.x, blur.y)) * 0.07;

    float aberration = 0.001 + uScroll * 0.007 + distanceFromPointer * 0.0015;
    float red = texture2D(uTexture, uv + vec2(aberration, 0.0)).r;
    float blue = texture2D(uTexture, uv - vec2(aberration, 0.0)).b;
    vec3 rgb = vec3(red, color.g, blue);
    float vignette = smoothstep(0.92, 0.18, distance(vUv, vec2(0.5)));
    rgb *= mix(0.92, 0.48, uScroll) * mix(0.58, 1.0, vignette);
    rgb = mix(rgb, vec3(dot(rgb, vec3(0.299, 0.587, 0.114))), uScroll * 0.16);
    rgb = mix(rgb, mix(rgb, uAccent, 0.18), uScroll * 0.45);
    gl_FragColor = vec4(rgb, 1.0);
  }
`;

export function Background() {
  const texture = useLoader(THREE.TextureLoader, series.image);
  const plane = useRef();
  const { viewport } = useThree();
  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uResolution: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
    uPlaneAspect: { value: viewport.width / viewport.height },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uAccent: { value: characterColors[0].clone() },
  }), [texture, viewport.width, viewport.height]);

  useFrame((state, delta) => {
    uniforms.uTime.value += delta;
    uniforms.uScroll.value = THREE.MathUtils.damp(uniforms.uScroll.value, sceneState.scrollProgress, 2.8, delta);
    uniforms.uPointer.value.x = THREE.MathUtils.damp(uniforms.uPointer.value.x, (sceneState.pointerX + 1) / 2, 3, delta);
    uniforms.uPointer.value.y = THREE.MathUtils.damp(uniforms.uPointer.value.y, (1 - sceneState.pointerY) / 2, 3, delta);
    const color = characterColors[sceneState.activeIndex] ?? characterColors[0];
    uniforms.uAccent.value.lerp(color, 1 - Math.exp(-delta * 2.5));
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, 5.2 + uniforms.uScroll.value * 0.6, 2, delta);

    if (plane.current) {
      const depth = state.camera.position.z + 4;
      const scale = depth / state.camera.position.z;
      plane.current.scale.set(viewport.width * scale, viewport.height * scale, 1);
      uniforms.uPlaneAspect.value = viewport.width / viewport.height;
    }
  });

  return (
    <mesh ref={plane} position={[0, 0, -4]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
}
