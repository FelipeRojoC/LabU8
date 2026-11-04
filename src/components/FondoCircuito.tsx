/**
 * Fondo de la aplicación: una placa de circuito con corriente recorriendo las
 * pistas. Es un SVG fijo detrás de todo, sin estado ni interacción, así que va
 * como componente de servidor y no cuesta nada en el cliente.
 *
 * Las pistas van en ángulos de 45° y 90°, como se rutea de verdad. Cada pulso
 * es un trazo discontinuo muy largo cuyo desfase se anima: se ve un destello
 * corto viajando por la pista.
 */

interface Pista {
  d: string;
  /** Segundos que tarda un pulso en recorrerla. */
  dur: number;
  /** Retardo, para que no salgan todos a la vez. */
  retardo: number;
}

const PISTAS: Pista[] = [
  { d: "M-40 120 H180 L260 200 H520 L600 120 H900 L980 200 H1480", dur: 14, retardo: 0 },
  { d: "M-40 320 H240 L300 260 H640 L700 320 H1040 L1120 400 H1480", dur: 19, retardo: 3.5 },
  { d: "M-40 520 H160 L240 600 H560 L640 520 H960 L1040 600 H1480", dur: 16, retardo: 7 },
  { d: "M-40 760 H340 L420 680 H760 L840 760 H1180 L1260 680 H1480", dur: 22, retardo: 1.5 },
  { d: "M200 -40 V140 L280 220 V480 L200 560 V940", dur: 18, retardo: 5 },
  { d: "M620 -40 V200 L700 280 V540 L620 620 V940", dur: 21, retardo: 9 },
  { d: "M1060 -40 V160 L980 240 V520 L1060 600 V940", dur: 17, retardo: 2 },
];

/** Puntos de soldadura, en los vértices de las pistas. */
const VIAS: Array<[number, number]> = [
  [180, 120], [260, 200], [520, 200], [600, 120], [900, 120], [980, 200],
  [240, 320], [300, 260], [640, 260], [700, 320], [1040, 320], [1120, 400],
  [160, 520], [240, 600], [560, 600], [640, 520], [960, 520], [1040, 600],
  [340, 760], [420, 680], [760, 680], [840, 760], [1180, 760], [1260, 680],
  [200, 140], [280, 220], [280, 480], [200, 560],
  [620, 200], [700, 280], [700, 540], [620, 620],
  [1060, 160], [980, 240], [980, 520], [1060, 600],
];

export function FondoCircuito() {
  return (
    <div className="fondo-circuito" aria-hidden>
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="pulso" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="50%" stopColor="#c4b5fd" stopOpacity="1" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* El cobre: las pistas en reposo */}
        <g fill="none" stroke="#5b21b6" strokeOpacity="0.16" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round">
          {PISTAS.map((p, i) => <path key={i} d={p.d} />)}
        </g>

        {/* La corriente */}
        <g fill="none" stroke="url(#pulso)" strokeWidth="2.6"
           strokeLinecap="round" strokeLinejoin="round">
          {PISTAS.map((p, i) => (
            <path
              key={i}
              d={p.d}
              className="corriente"
              style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.retardo}s` }}
            />
          ))}
        </g>

        {/* Las vías, latiendo muy suave */}
        <g fill="#5b21b6">
          {VIAS.map(([x, y], i) => (
            <circle
              key={i} cx={x} cy={y} r="3.2" className="via"
              style={{ animationDelay: `${(i % 7) * 0.9}s` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
