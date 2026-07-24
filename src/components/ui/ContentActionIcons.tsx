export type SocialNetwork = "whatsapp" | "telegram" | "x";

interface IconProps {
  className?: string;
}

interface BookmarkIconProps extends IconProps {
  filled?: boolean;
}

const SOCIAL_PATHS: Record<SocialNetwork, string> = {
  whatsapp: "M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.487 1.33 5.004l-1.413 5.161 5.286-1.385a9.945 9.945 0 0 0 4.782 1.222h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.667-1.038-5.176-2.924-7.062A9.92 9.92 0 0 0 12.012 2zm5.836 14.154c-.244.688-1.417 1.31-1.982 1.394-.506.076-1.15.107-1.856-.118a14.773 14.773 0 0 1-1.677-.619c-2.951-1.275-4.877-4.246-5.024-4.442-.147-.196-1.2-1.597-1.2-3.045 0-1.448.756-2.158 1.026-2.452.269-.294.587-.368.783-.368.195 0 .392.002.564.01.18.008.423-.069.663.504.244.585.83 2.027.903 2.174.073.147.122.319.025.515-.098.196-.147.319-.294.49-.147.172-.309.384-.442.515-.147.147-.301.309-.13.603.17.294.757 1.25 1.626 2.024 1.119.998 2.062 1.308 2.356 1.455.294.147.465.123.637-.073.172-.196.735-.858.931-1.152.196-.294.392-.245.662-.147.27.098 1.71.806 2.004.953.294.147.49.221.564.343.073.123.073.71-.171 1.398z",
  telegram: "M23.91 3.79 20.3 20.84c-.27 1.2-.98 1.49-1.98.93l-5.5-4.05-2.65 2.55c-.29.29-.54.54-1.1.54l.39-5.6 10.2-9.22c.44-.39-.1-.61-.69-.22L6.36 13.71.93 12.01c-1.18-.37-1.2-1.18.25-1.75L22.4 2.08c.98-.36 1.84.24 1.51 1.71Z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z",
};

export function SocialLogo({ network, className = "h-4 w-4" }: IconProps & { network: SocialNetwork }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="currentColor">
      <path d={SOCIAL_PATHS[network]} />
    </svg>
  );
}

export function BookmarkIcon({ className = "h-4 w-4", filled = false }: BookmarkIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.75L6 21Z" />
    </svg>
  );
}

export function RepostIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 3 4 4-4 4" />
      <path d="M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4" />
      <path d="M21 13v2a2 2 0 0 1-2 2H3" />
    </svg>
  );
}
