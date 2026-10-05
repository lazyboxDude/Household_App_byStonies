import Image from "next/image";

// The snail mascot (capybara on its shell) in different poses. The artwork is
// a transparent WebP per pose in public/mascot; the confetti and the sleepy
// "z"s are CSS so they follow the theme and respect reduced motion.
const POSES = {
  welcome: { src: "/mascot/snail-welcome.webp", width: 377, height: 488 },
  piggy: { src: "/mascot/snail-piggy.webp", width: 369, height: 473 },
  shopping: { src: "/mascot/snail-shopping.webp", width: 344, height: 474 },
  celebrate: { src: "/mascot/snail-celebrate.webp", width: 372, height: 479 },
  sleeping: { src: "/mascot/snail-sleeping.webp", width: 344, height: 437 },
} as const;

export type MascotPose = keyof typeof POSES;

// left %, top %, delay s, colour token
const CONFETTI = [
  [8, 10, 0, "--accent"],
  [22, 2, 0.3, "--text-tertiary"],
  [38, 8, 0.6, "--success"],
  [58, 0, 0.15, "--accent-strong"],
  [74, 8, 0.45, "--text-tertiary"],
  [90, 14, 0.75, "--success"],
  [14, 30, 0.9, "--success"],
  [84, 34, 0.2, "--accent"],
  [4, 50, 0.5, "--text-tertiary"],
  [95, 52, 0.8, "--accent-strong"],
] as const;

export default function Mascot({
  pose,
  className = "h-44",
  priority = false,
}: {
  pose: MascotPose;
  /** Sizing utility; the image keeps its aspect ratio (default: h-44). */
  className?: string;
  priority?: boolean;
}) {
  const { src, width, height } = POSES[pose];
  return (
    <div className="relative mx-auto w-fit" aria-hidden="true">
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        priority={priority}
        className={`w-auto drop-shadow-lg ${className}`}
      />
      {pose === "celebrate" &&
        CONFETTI.map(([left, top, delay, color], i) => (
          <span
            key={i}
            className="mascot-confetti"
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s`, background: `var(${color})` }}
          />
        ))}
      {pose === "sleeping" && (
        <>
          <span className="mascot-z" style={{ left: "6%", top: "28%" }}>z</span>
          <span className="mascot-z mascot-z-2" style={{ left: "16%", top: "18%" }}>z</span>
        </>
      )}
    </div>
  );
}
