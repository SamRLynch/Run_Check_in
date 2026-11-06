import type { CSSProperties } from "react";

const SPRITE_W = 376;
const SPRITE_H = 168;

const COL_X = [16, 59, 102, 145, 188, 231, 274, 317, 360];
const ROW_Y = [16, 84, 152];

const ICON_NATURAL_SIZE = 28;

export const WIND_SPRITE: [number, number] = [2, 6];

export function WeatherSprite({
  row,
  col,
  size = 28,
  className = "",
  style,
}: {
  row: number;
  col: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const cx = COL_X[col];
  const cy = ROW_Y[row];
  const scale = size / ICON_NATURAL_SIZE;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/weather-icons.svg)",
        backgroundSize: `${SPRITE_W * scale}px ${SPRITE_H * scale}px`,
        backgroundPosition: `-${cx * scale - size / 2}px -${cy * scale - size / 2}px`,
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
        display: "inline-block",
        ...style,
      }}
    />
  );
}
