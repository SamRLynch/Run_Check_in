import type { CSSProperties } from "react";

const SPRITE_W = 238;
const SPRITE_H = 28;
const ICON_NATURAL_SIZE = 28;
const CY = SPRITE_H / 2;

export const UI_ICON = {
  clock: 54,
  location: 81,
  person1: 154,
  person2: 188,
  person3: 225,
} as const;

export const PERSON_ICONS = [UI_ICON.person1, UI_ICON.person2, UI_ICON.person3];

export function UiSprite({
  cx,
  size = 20,
  className = "",
  style,
}: {
  cx: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const scale = size / ICON_NATURAL_SIZE;

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/ui-icons.svg)",
        backgroundSize: `${SPRITE_W * scale}px ${SPRITE_H * scale}px`,
        backgroundPosition: `-${cx * scale - size / 2}px -${CY * scale - size / 2}px`,
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}
