"use client";

import { useState } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { useAuth, OptionalFeature } from "../context/AuthContext";

export default function FeatureOnboarding({
  feature,
  icon: Icon,
  title,
  description,
  bullets,
}: {
  feature: OptionalFeature;
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
}) {
  const { toggleFeature } = useAuth();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnable = async () => {
    setIsEnabling(true);
    await toggleFeature(feature, true);
    setIsEnabling(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="surface p-8 text-center animate-rise">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--accent-soft)" }}
        >
          <Icon className="w-8 h-8" style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="text-title mb-2">{title}</h1>
        <p className="text-body text-[var(--text-secondary)] mb-6">{description}</p>
        <ul className="text-left space-y-2 mb-6 max-w-sm mx-auto">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              {b}
            </li>
          ))}
        </ul>
        <button onClick={handleEnable} disabled={isEnabling} className="btn btn-primary px-6 py-3">
          {isEnabling ? "Enabling..." : `Enable ${title}`}
        </button>
        <p className="text-caption mt-3">You can turn this off again anytime in Settings.</p>
      </div>
    </div>
  );
}
