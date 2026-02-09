import React, { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WebcamController } from './components/Inputs/WebcamController';
import { HUD } from './components/UI/HUD';
import { Effects } from './components/World/Effects';
import { Environment } from './components/World/Environment';
import { LevelManager } from './components/World/LevelManager';
import { Player } from './components/World/Player';
import { useStore } from './store';

const CameraController: React.FC = () => {
  const { camera, size } = useThree();
  const laneCount = useStore((state) => state.laneCount);

  useFrame((_, delta) => {
    const aspect = size.width / size.height;
    const isNarrow = aspect < 1.2;

    const extraLanes = Math.max(0, laneCount - 3);
    const heightFactor = isNarrow ? 2 : 0.5;
    const depthFactor = isNarrow ? 4.5 : 1;

    const targetPosition = new THREE.Vector3(
      0,
      5.5 + extraLanes * heightFactor,
      8 + extraLanes * depthFactor,
    );

    camera.position.lerp(targetPosition, Math.min(1, delta * 2));
    camera.lookAt(0, 0, -30);
  });

  return null;
};

const Scene: React.FC = () => {
  return (
    <>
      <Environment />
      <group>
        <group userData={{ isPlayer: true }} name="PlayerGroup">
          <Player />
        </group>
        <LevelManager />
      </group>
      <Effects />
    </>
  );
};

function App() {
  return (
    <main className="app-shell">
      <div className="atmo-layer" aria-hidden="true" />
      <HUD />
      <WebcamController />

      <Canvas
        className="game-canvas"
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: false, stencil: false, depth: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 5.5, 8], fov: 60 }}
      >
        <CameraController />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </main>
  );
}

export default App;
