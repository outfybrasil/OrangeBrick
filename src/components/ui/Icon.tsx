import type { SVGProps } from "react";

export type IconName = "hype" | "flop" | "salty" | "comment" | "brick" | "close" | "chevron-right" | "sparkle" | "eye";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, string> = {
  hype: "M10 2C10 2 6 7 6 11c0 2.8 2.2 5 5 5s5-2.2 5-5c0-4-6-9-6-9zm0 12c-1.7 0-3-1.3-3-3 0-2 3-5 3-5s3 3 3 5c0 1.7-1.3 3-3 3z",
  flop: "M6 6l12 12M18 6l-12 12",
  salty: "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM7 9L11 11M17 9L13 11M9 13.5H9.01M15 13.5H15.01M9 17.5C10.5 16.5 13.5 16.5 15 17.5",
  comment: "M2 2H22V18H6L2 22V2Z",
  brick: "M4 2H20V6H4V2ZM2 6H22V10H2V6ZM4 10H20V18H4V10ZM8 18H16V22H8V18Z",
  close: "M6 6L18 18M18 6L6 18",
  "chevron-right": "M9 6L15 12L9 18",
  sparkle: "M12 2L13 9L20 12L13 15L12 22L11 15L4 12L11 9L12 2Z",
  eye: "M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7ZM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5ZM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3Z",
};

const VIEWBOX: Record<IconName, string> = {
  hype: "0 0 24 24",
  flop: "0 0 24 24",
  salty: "0 0 24 24",
  comment: "0 0 24 24",
  brick: "0 0 24 24",
  close: "0 0 24 24",
  "chevron-right": "0 0 24 24",
  sparkle: "0 0 24 24",
  eye: "0 0 24 24",
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
