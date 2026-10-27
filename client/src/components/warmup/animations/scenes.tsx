import type { CSSProperties } from 'react';

/**
 * Escenas esquemáticas (figuras de palos) de los ejercicios de calentamiento.
 * Todas se dibujan en un viewBox de 200x140 y se animan con las keyframes de
 * `animationStyles`. Cada elemento animado lleva la clase `wu-anim`, que es la
 * que apaga la animación con `prefers-reduced-motion`.
 */

type AnimatedStyle = CSSProperties & Record<`--${string}`, string>;

const FIGURE = {
  stroke: 'var(--mantine-color-text)',
  strokeWidth: 4,
  strokeLinecap: 'round' as const,
  fill: 'none',
};
const BALL_COLOR = 'var(--mantine-color-orange-5)';
const TABLE_COLOR = 'var(--mantine-primary-color-filled)';
const WOOD_COLOR = 'var(--mantine-color-yellow-8)';
// Como en la raqueta real: derecha con la goma roja y revés con la negra.
const FOREHAND_FACE = 'var(--mantine-color-red-7)';
const BACKHAND_FACE = 'var(--mantine-color-dark-9)';

const PaddleFace = ({ cx, cy, rx = 9, ry = 9, face }: { cx: number; cy: number; rx?: number; ry?: number; face: string }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={face} stroke="var(--mantine-color-text)" strokeWidth={1.5} />
);

export const StretchScene = () => (
  <g {...FIGURE}>
    <line x1="100" y1="80" x2="86" y2="124" />
    <line x1="100" y1="80" x2="114" y2="124" />
    <g
      className="wu-anim"
      style={{ transformOrigin: '100px 80px', animation: 'wu-sway 2.4s ease-in-out infinite alternate' }}
    >
      <line x1="100" y1="80" x2="100" y2="40" />
      <circle cx="100" cy="30" r="8" />
      <line x1="100" y1="48" x2="84" y2="14" />
      <line x1="100" y1="48" x2="116" y2="14" />
    </g>
  </g>
);

export const MobilityScene = () => {
  const limb = (originY: number, endY: number, swing: string, delay: string) => (
    <g
      className="wu-anim"
      style={{ transformOrigin: `100px ${originY}px`, animation: `${swing} 0.5s ease-in-out ${delay} infinite alternate` }}
    >
      <line x1="100" y1={originY} x2="100" y2={endY} />
    </g>
  );

  return (
    <g {...FIGURE}>
      <g className="wu-anim" style={{ animation: 'wu-bob 0.25s ease-in-out infinite alternate' }}>
        <circle cx="100" cy="30" r="8" />
        <line x1="100" y1="40" x2="100" y2="80" />
        {limb(48, 74, 'wu-swing', '0s')}
        {limb(48, 74, 'wu-swing', '-0.5s')}
        {limb(80, 122, 'wu-swing', '-0.5s')}
        {limb(80, 122, 'wu-swing', '0s')}
      </g>
    </g>
  );
};

/**
 * Peloteo visto desde arriba. Con la derecha la bola va en diagonal entre los
 * carriles de derecha de los dos jugadores; con el revés, entre los de revés.
 */
export const RallyScene = ({ hand }: { hand: 'forehand' | 'backhand' }) => {
  const isForehand = hand === 'forehand';
  const face = isForehand ? FOREHAND_FACE : BACKHAND_FACE;
  const laneStartY = isForehand ? 90 : 50;
  const laneEndY = isForehand ? 50 : 90;
  const ballStyle: AnimatedStyle = {
    '--dx': '110px',
    '--dy': `${laneEndY - laneStartY}px`,
    animation: 'wu-travel 0.8s linear infinite alternate',
  };

  return (
    <g>
      <rect x="30" y="35" width="140" height="70" rx="3" fill="none" stroke={TABLE_COLOR} strokeWidth="3" />
      <line x1="100" y1="30" x2="100" y2="110" stroke="var(--mantine-color-text)" strokeWidth="1.5" />
      <line
        x1="45"
        y1={laneStartY}
        x2="155"
        y2={laneEndY}
        stroke="var(--mantine-color-dimmed)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <g {...FIGURE} strokeWidth={3}>
        <circle cx="14" cy="70" r="7" />
        <circle cx="186" cy="70" r="7" />
      </g>
      <PaddleFace cx={27} cy={isForehand ? 88 : 52} rx={6} ry={6} face={face} />
      <PaddleFace cx={173} cy={isForehand ? 52 : 88} rx={6} ry={6} face={face} />
      <circle className="wu-anim" cx="45" cy={laneStartY} r="4.5" fill={BALL_COLOR} style={ballStyle} />
    </g>
  );
};

/** Golpe de top visto de lado: el brazo sube de abajo arriba rozando la bola. */
export const TopspinScene = ({ hand }: { hand: 'forehand' | 'backhand' }) => {
  const isForehand = hand === 'forehand';
  const armStyle: AnimatedStyle = {
    transformOrigin: '80px 52px',
    animation: 'wu-topspin 2.2s ease-in-out infinite',
    '--a0': isForehand ? '25deg' : '10deg',
    '--a1': isForehand ? '-60deg' : '-45deg',
    '--a2': isForehand ? '-110deg' : '-90deg',
  };
  // Punto de contacto = punta del brazo en el ángulo de impacto (a1).
  const ball = isForehand ? { cx: 112, cy: 71 } : { cx: 106, cy: 78 };
  const ballStyle: AnimatedStyle = {
    '--dx': isForehand ? '46px' : '50px',
    '--dy': isForehand ? '-30px' : '-26px',
    animation: 'wu-topspin-ball 2.2s linear infinite',
  };

  return (
    <g>
      <line x1="20" y1="126" x2="180" y2="126" stroke="var(--mantine-color-dimmed)" strokeWidth="1.5" />
      <g {...FIGURE}>
        <line x1="80" y1="85" x2="64" y2="124" />
        <line x1="80" y1="85" x2="100" y2="124" />
        <line x1="80" y1="85" x2="80" y2="46" />
        <circle cx="84" cy="34" r="8" />
        <line x1="80" y1="52" x2="66" y2="68" />
        <g className="wu-anim" style={armStyle}>
          <line x1="80" y1="52" x2="80" y2="80" />
          <PaddleFace cx={80} cy={89} face={isForehand ? FOREHAND_FACE : BACKHAND_FACE} />
        </g>
      </g>
      <circle className="wu-anim" cx={ball.cx} cy={ball.cy} r="4.5" fill={BALL_COLOR} style={ballStyle} />
    </g>
  );
};

export const TouchScene = () => (
  <g>
    <g className="wu-anim" style={{ transformOrigin: '100px 104px', animation: 'wu-tilt 1s ease-in-out infinite alternate' }}>
      <line x1="100" y1="110" x2="100" y2="130" stroke={WOOD_COLOR} strokeWidth="6" strokeLinecap="round" />
      <PaddleFace cx={100} cy={104} rx={34} ry={6} face={FOREHAND_FACE} />
    </g>
    <circle className="wu-anim" cx="100" cy="90" r="7" fill={BALL_COLOR} style={{ animation: 'wu-bounce 1s infinite' }} />
  </g>
);

// El `translate` da margen al saque por la izquierda: la raqueta retrocede al preparar el golpe.
export const ServeScene = () => (
  <g transform="translate(10 0)">
    <line x1="20" y1="110" x2="180" y2="110" stroke={TABLE_COLOR} strokeWidth="5" strokeLinecap="round" />
    <line x1="30" y1="112" x2="30" y2="130" stroke={TABLE_COLOR} strokeWidth="4" strokeLinecap="round" />
    <line x1="170" y1="112" x2="170" y2="130" stroke={TABLE_COLOR} strokeWidth="4" strokeLinecap="round" />
    <line x1="100" y1="108" x2="100" y2="86" stroke="var(--mantine-color-text)" strokeWidth="2" />
    <line x1="28" y1="99" x2="52" y2="99" stroke="var(--mantine-color-text)" strokeWidth="3" strokeLinecap="round" />
    <g className="wu-anim" style={{ animation: 'wu-serve-paddle 3s infinite' }}>
      <line x1="26" y1="94" x2="14" y2="112" stroke={WOOD_COLOR} strokeWidth="5" strokeLinecap="round" />
      <PaddleFace cx={26} cy={94} face={FOREHAND_FACE} />
    </g>
    <circle className="wu-anim" cx="40" cy="92" r="4.5" fill={BALL_COLOR} style={{ animation: 'wu-serve-ball 3s infinite' }} />
  </g>
);

/** Ejercicio libre: una raqueta con la bola girando alrededor, sin gesto concreto. */
export const FreeDrillScene = () => (
  <g>
    <circle cx="100" cy="62" r="44" fill="none" stroke="var(--mantine-color-dimmed)" strokeWidth="1.5" strokeDasharray="3 5" />
    <g className="wu-anim" style={{ transformOrigin: '100px 112px', animation: 'wu-wobble 1.4s ease-in-out infinite alternate' }}>
      <line x1="100" y1="88" x2="100" y2="112" stroke={WOOD_COLOR} strokeWidth="8" strokeLinecap="round" />
      <PaddleFace cx={100} cy={62} rx={26} ry={26} face={FOREHAND_FACE} />
    </g>
    <g className="wu-anim" style={{ transformOrigin: '100px 62px', animation: 'wu-orbit 4s linear infinite' }}>
      <circle cx="144" cy="62" r="5" fill={BALL_COLOR} />
    </g>
  </g>
);
