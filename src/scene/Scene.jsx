import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Background } from './Background';
import { Gallery } from './Gallery';
import { Particles } from './Particles';
import { sceneState } from './sceneState';

function SceneFrame({ onImageSelect, selectedImage }) {
  return (
    <Canvas
      className="webgl-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => selectedImage && onImageSelect(null)}
      onPointerMove={(event) => {
        sceneState.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
        sceneState.pointerY = 1 - (event.clientY / window.innerHeight) * 2;
      }}
    >
      <Suspense fallback={null}>
        <Background />
        <Gallery onImageSelect={onImageSelect} selectedImage={selectedImage} />
        <Particles />
      </Suspense>
    </Canvas>
  );
}

export default function Scene({ onImageSelect, selectedImage }) {
  return <div className="scene-fixed" aria-hidden="true"><SceneFrame onImageSelect={onImageSelect} selectedImage={selectedImage} /></div>;
}
