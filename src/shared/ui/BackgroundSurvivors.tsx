import SurvivorCharacter from './SurvivorCharacter';  

export type SurvivorPlacement = {
  bottom: string;
  left: string;
  width: number;
  height: number;
  opacity: number;
  scale: number;
  rotationOffset: number;
};

interface BackgroundSurvivorsProps {
  instances: readonly SurvivorPlacement[];
}

export default function BackgroundSurvivors({ instances }: BackgroundSurvivorsProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const visible = isMobile ? instances.slice(0, 2) : instances;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {visible.map((character, index) => (
        <div
          key={`${character.left}-${index}`}
          style={{
            position: 'absolute',
            left: character.left,
            bottom: character.bottom,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <SurvivorCharacter
            width={character.width}
            height={character.height}
            opacity={character.opacity}
            scale={character.scale}
            rotationOffset={character.rotationOffset}
            autoRotate={true}
            interactive={false}
          />
        </div>
      ))}
    </div>
  );
}
