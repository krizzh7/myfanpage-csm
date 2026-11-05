import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneState } from './sceneState';

const COUNT = 10000;

export function Particles() {
  const points = useRef();
  const { viewport } = useThree();
  const positions = useMemo(() => {
    const values = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i += 1) {
      values[i * 3] = (Math.random() - 0.5) * 15;
      values[i * 3 + 1] = (Math.random() - 0.5) * 10;
      values[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return values;
  }, []);

  useFrame((state, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * (0.008 + Math.abs(sceneState.scrollVelocity) * 0.000012);
    points.current.rotation.x = THREE.MathUtils.damp(points.current.rotation.x, sceneState.pointerY * 0.025, 1.6, delta);
    points.current.position.x = THREE.MathUtils.damp(points.current.position.x, sceneState.pointerX * -0.08, 1.4, delta);
    points.current.material.size = 0.012 + Math.min(Math.abs(sceneState.scrollVelocity) * 0.000035, 0.018);
  });

  return (
    <points ref={points} position={[0, 0, -1]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#f3e6d8" size={0.012} transparent opacity={0.42} sizeAttenuation depthWrite={false} />
    </points>
  );
}
