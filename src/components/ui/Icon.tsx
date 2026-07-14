import type { SVGProps } from "react";

export type IconName = "hype" | "flop" | "salty" | "defendo" | "comment" | "brick" | "close" | "chevron-right" | "sparkle";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, string> = {
  hype: "M12 2L15 8.5L22 9.5L17 14.5L18 22L12 18.5L6 22L7 14.5L2 9.5L9 8.5L12 2Z",
  flop: "M12 2L15 8.5L22 9.5L17 14.5L18 22L12 18.5L6 22L7 14.5L2 9.5L9 8.5L12 2Z",
  salty: "M8 10L16 10M8 14L14 14M12 2L2 7L2 17L12 22L22 17L22 7L12 2Z",
  defendo: "M12 2L22 9L22 20L2 20L2 9L12 2ZM8 12L16 12M8 16L14 16M12 12V8",
  comment: "M2 2H22V18H6L2 22V2Z",
  brick: "M4 2H20V6H4V2ZM2 6H22V10H2V6ZM4 10H20V18H4V10ZM8 18H16V22H8V18Z",
  close: "M6 6L18 18M18 6L6 18",
  "chevron-right": "M9 6L15 12L9 18",
  sparkle: "M12 2L13 9L20 12L13 15L12 22L11 15L4 12L11 9L12 2Z",
};

const VIEWBOX: Record<IconName, string> = {
  hype: "0 0 24 24",
  flop: "0 0 24 24",
  salty: "0 0 24 24",
  defendo: "0 0 24 24",
  comment: "0 0 24 24",
  brick: "0 0 24 24",
  close: "0 0 24 24",
  "chevron-right": "0 0 24 24",
  sparkle: "0 0 24 24",
};

export function Icon({ name, size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEWBOX[name]}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
