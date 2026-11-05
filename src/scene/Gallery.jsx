import { useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { galleryImages, characters } from '../data/assets';
import { sceneState } from './sceneState';

const layouts = [
  { x: -0.16, y: 0.02, w: 0.30, h: 0.54, r: -0.045, z: 0.12 },
  { x: 0.12, y: 0.19, w: 0.26, h: 0.44, r: 0.035, z: 0.02 },
  { x: 0.15, y: -0.25, w: 0.27, h: 0.45, r: -0.03, z: 0.04 },
  { x: 0.34, y: 0.03, w: 0.24, h: 0.40, r: 0.05, z: -0.05 },
  { x: -0.05, y: -0.34, w: 0.21, h: 0.33, r: 0.03, z: -0.08 },
];

function Portrait({ texture, imageUrl, character, imageIndex, position, size, rotation, characterIndex, index, onImageSelect, selectedImage }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const backingRef = useRef();
  const revealRef = useRef(0);
  const hoverRef = useRef(false);
  const base = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame((state, delta) => {
    const active = sceneState.activeIndex === characterIndex;
    const selected = selectedImage?.url === imageUrl;
    const target = active && !selected && !sceneState.runMode ? 1 : 0;
    revealRef.current = THREE.MathUtils.damp(revealRef.current, target, 4.2, delta);
    const reveal = revealRef.current;
    if (meshRef.current) {
      meshRef.current.visible = reveal > 0.004;
      meshRef.current.material.opacity = reveal;
      meshRef.current.raycast = active && !sceneState.runMode ? THREE.Mesh.prototype.raycast : () => {};
    }
    if (backingRef.current) {
      backingRef.current.visible = reveal > 0.01;
      backingRef.current.material.opacity = reveal * 0.34;
    }
    if (groupRef.current) {
      const elapsed = state.clock.elapsedTime;
      const floating = Math.sin(elapsed * 0.55 + index * 1.4) * 0.035;
      const orbitX = Math.sin(elapsed * 0.34 + index * 0.9) * 0.022;
      const orbitZ = Math.cos(elapsed * 0.29 + index * 1.2) * 0.05;
      const entranceRoll = (1 - reveal) * (index % 2 ? -0.42 : 0.42);
      const tiltX = Math.sin(elapsed * 0.31 + index * 1.1) * 0.055 + sceneState.pointerY * 0.045;
      const tiltY = Math.cos(elapsed * 0.27 + index * 0.8) * 0.075 + sceneState.pointerX * 0.055;
      const hovered = hoverRef.current && active && !sceneState.runMode;
      const restRotation = (active ? rotation : rotation + (index % 2 ? 0.12 : -0.12)) + entranceRoll + orbitZ * (hovered ? 0.25 : 1);
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, base.x + sceneState.pointerX * 0.04 + orbitX, 2.8, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, base.y + floating + sceneState.pointerY * 0.035, 2.6, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, hovered ? 0 : tiltX, 2.6, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, hovered ? 0 : tiltY, 2.6, delta);
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, hovered ? rotation : restRotation, 3, delta);
      const scale = (0.94 + reveal * 0.06) * (hovered ? 1.045 : 1);
      groupRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, 0, rotation]}>
      <mesh
        ref={meshRef}
        renderOrder={2}
        visible={false}
        onClick={(event) => {
          event.stopPropagation();
          onImageSelect({
            url: imageUrl,
            alt: `${character.name} — portrait ${imageIndex + 1}`,
            characterId: character.id,
            characterName: character.name,
            characterNumber: character.number,
            characterLabel: character.label,
            characterAccent: character.accent,
            biographyUrl: character.biographyUrl,
            imageIndex,
          });
        }}
        onPointerOver={(event) => {
          if (sceneState.activeIndex === characterIndex) {
            event.stopPropagation();
            hoverRef.current = true;
          }
        }}
        onPointerOut={() => { hoverRef.current = false; }}
      >
        <planeGeometry args={[size[0], size[1]]} />
        <meshBasicMaterial map={texture} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={backingRef} position={[0, 0, -0.015]} visible={false} renderOrder={1}>
        <planeGeometry args={[size[0] + 0.018, size[1] + 0.018]} />
        <meshBasicMaterial color="#e9e6df" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Gallery({ onImageSelect, selectedImage }) {
  const textures = useLoader(THREE.TextureLoader, galleryImages.map((image) => image.url));
  const { viewport } = useThree();

  textures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = 1;
  });

  let flatIndex = 0;
  return characters.map((character, characterIndex) => (
    <group key={character.id}>
      {character.imageUrls.map((_, imageIndex) => {
        const currentTexture = textures[flatIndex++];
        const layout = layouts[imageIndex] ?? layouts[imageIndex % layouts.length];
        const scale = viewport.height;

        // Contain-fit: the artwork is scaled to fit entirely inside its frame so
        // faces and silhouettes are never cropped, regardless of aspect ratio.
        const imageWidth = currentTexture?.image?.width || 1;
        const imageHeight = currentTexture?.image?.height || 1;
        const textureAspect = imageWidth / imageHeight;
        const fit = Math.min(1, (viewport.width * 0.46) / (layout.w * scale), (viewport.height * 0.76) / (layout.h * scale));
        const boxWidth = layout.w * scale * fit;
        const boxHeight = layout.h * scale * fit;
        let portraitWidth = boxWidth;
        let portraitHeight = portraitWidth / textureAspect;
        if (portraitHeight > boxHeight) {
          portraitHeight = boxHeight;
          portraitWidth = portraitHeight * textureAspect;
        }
        const leftEdge = -viewport.width / 2 + portraitWidth * 0.55;
        const rightEdge = viewport.width / 2 - portraitWidth * 0.55;
        const layoutX = (0.63 + layout.x * 0.72 - 0.5) * viewport.width;
        const alternatingX = characterIndex % 2 === 0 ? layoutX : -layoutX;
        const position = [
          THREE.MathUtils.clamp(alternatingX, leftEdge, rightEdge),
          THREE.MathUtils.clamp(layout.y * viewport.height, -viewport.height / 2 + portraitHeight * 0.55, viewport.height / 2 - portraitHeight * 0.55),
          layout.z,
        ];
        const size = [portraitWidth, portraitHeight];
        return <Portrait key={`${character.id}-${imageIndex}`} texture={currentTexture} imageUrl={character.imageUrls[imageIndex]} character={character} imageIndex={imageIndex} position={position} size={size} rotation={layout.r} characterIndex={characterIndex} index={imageIndex + characterIndex * 4} onImageSelect={onImageSelect} selectedImage={selectedImage} />;
      })}
    </group>
  ));
}
