import type { ReactNode } from "react";

export type MascotMood = "happy" | "wave" | "cheer" | "sleepy" | "think";

interface MascotProps {
  mood?: MascotMood;
  /** Rendered width in px; height follows the viewBox. */
  size?: number;
  /** Gentle idle bob + blink. Turned off automatically for reduced motion. */
  animated?: boolean;
  /** Pass a label only when the mascot carries meaning; otherwise it is decorative. */
  label?: string;
  className?: string;
}

// A tiny house spirit — echoes the app icon. Everything is plain SVG so it
// works in server and client components, scales crisply, and takes its colours
// from CSS tokens (see `.mascot` in globals.css).
export default function Mascot({ mood = "happy", size = 96, animated = true, label, className = "" }: MascotProps) {
  const armsUp = mood === "cheer";
  const waving = mood === "wave";

  return (
    <svg
      viewBox="0 -12 120 132"
      width={size}
      height={(size * 132) / 120}
      className={`mascot ${animated ? "mascot-animated" : ""} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <ellipse cx="60" cy="112" rx="30" ry="4" className="mascot-shadow" />

      <g className="mascot-float">
        {/* chimney + smoke sit behind the roof */}
        <path
          d="M76 40 L76 24 Q76 22 78 22 L88 22 Q90 22 90 24 L90 46 Z"
          className="mascot-chimney mascot-line"
        />
        <path d="M83 16 Q78 11 83 7 Q88 3 84 -3" className="mascot-smoke" />

        {/* arms: drawn twice (outline, then fill) so they read on any background */}
        <MascotLimb d={armsUp ? "M31 80 Q13 79 11 56" : "M31 82 Q22 84 19 93"} />
        <g className={waving ? "mascot-wave" : undefined}>
          <MascotLimb d={armsUp || waving ? "M89 80 Q107 79 109 56" : "M89 82 Q98 84 101 93"} />
        </g>

        {/* feet */}
        <ellipse cx="46" cy="108" rx="7.5" ry="3.6" className="mascot-body mascot-line" />
        <ellipse cx="74" cy="108" rx="7.5" ry="3.6" className="mascot-body mascot-line" />

        {/* body */}
        <path
          d="M30 58 C28.5 72 28 88 31 100 Q32.5 107 39 107 L81 107 Q88 107 89.5 100 C92 88 91.5 72 90 58 Z"
          className="mascot-body mascot-line"
        />

        {/* roof — doubles as a hat */}
        <path
          d="M16 62 Q15 58 19 55 L55 25 Q60 21 65 25 L101 55 Q105 58 104 62 Q98 64 91 63 L29 63 Q22 64 16 62 Z"
          className="mascot-roof mascot-line"
        />
        <path d="M38 55 Q42 49.5 46 55 M54 47 Q58 41.5 62 47 M70 55 Q74 49.5 78 55" className="mascot-tiles" />

        <MascotFace mood={mood} />
        {mood === "sleepy" && <MascotZs />}
        {mood === "think" && <MascotThoughts />}
      </g>
    </svg>
  );
}

function MascotLimb({ d }: { d: string }) {
  return (
    <>
      <path d={d} className="mascot-limb-outline" />
      <path d={d} className="mascot-limb-fill" />
    </>
  );
}

function MascotFace({ mood }: { mood: MascotMood }) {
  const cheeks = (
    <>
      <ellipse cx="39" cy="88" rx="5.5" ry="3.4" className="mascot-cheek" />
      <ellipse cx="81" cy="88" rx="5.5" ry="3.4" className="mascot-cheek" />
    </>
  );

  if (mood === "cheer") {
    return (
      <g>
        <path d="M42.5 80 Q47 73.5 51.5 80 M68.5 80 Q73 73.5 77.5 80" className="mascot-stroke" />
        {cheeks}
        <path d="M52 85 Q60 99 68 85 Z" className="mascot-mouth mascot-line" />
      </g>
    );
  }

  if (mood === "sleepy") {
    return (
      <g>
        <path d="M42 79 Q47 83.5 52 79 M68 79 Q73 83.5 78 79" className="mascot-stroke" />
        {cheeks}
        <path d="M57 87.5 Q60 90 63 87.5" className="mascot-stroke" />
      </g>
    );
  }

  if (mood === "think") {
    return (
      <g>
        <g className="mascot-eyes">
          <circle cx="49" cy="77" r="3.6" className="mascot-ink" />
          <circle cx="75" cy="77" r="3.6" className="mascot-ink" />
        </g>
        {cheeks}
        <ellipse cx="62" cy="88.5" rx="2.6" ry="3" className="mascot-ink" />
      </g>
    );
  }

  // happy + wave
  return (
    <g>
      <g className="mascot-eyes">
        <circle cx="47" cy="79" r="3.6" className="mascot-ink" />
        <circle cx="73" cy="79" r="3.6" className="mascot-ink" />
        <circle cx="48.2" cy="77.8" r="1.1" className="mascot-glint" />
        <circle cx="74.2" cy="77.8" r="1.1" className="mascot-glint" />
      </g>
      {cheeks}
      <path d="M54 86 Q60 92.5 66 86" className="mascot-stroke" />
    </g>
  );
}

function MascotZs() {
  return (
    <g className="mascot-z" aria-hidden>
      <text x="94" y="38" fontSize="15">z</text>
      <text x="103" y="25" fontSize="11">z</text>
    </g>
  );
}

function MascotThoughts() {
  return (
    <g className="mascot-thoughts" aria-hidden>
      <circle cx="98" cy="36" r="2" />
      <circle cx="104" cy="27" r="2.8" />
      <circle cx="112" cy="16" r="3.6" />
    </g>
  );
}

// The mascot with a short handwritten line next to it — for greetings and
// empty states. Keep the copy calm and short (see the onboarding-tone skill).
export function MascotNote({
  mood = "happy",
  size = 72,
  children,
  className = "",
}: {
  mood?: MascotMood;
  size?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <Mascot mood={mood} size={size} />
      <p className="scribble">{children}</p>
    </div>
  );
}

// Full-area loading state: the mascot thinks while data arrives.
export function MascotLoader({ size = 72, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex justify-center ${className}`} role="status" aria-label="Lädt">
      <Mascot mood="think" size={size} />
    </div>
  );
}
