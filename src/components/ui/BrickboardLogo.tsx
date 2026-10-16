export interface BrickboardLogoProps {
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
  variant?: "full" | "mark";
}

export function BrickboardLogo({
  alt = "BrickBoard",
  className = "",
  loading = "eager",
  variant = "full",
}: BrickboardLogoProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  if (variant === "mark") {
    return (
      <img
        src={`${basePath}/logos/brickboard-mark.png`}
        alt={alt}
        width={280}
        height={237}
        loading={loading}
        decoding="async"
        className={`shrink-0 object-contain ${className}`}
      />
    );
  }

  return (
    <>
      <img
        src={`${basePath}/logos/brickboard-horizontal-light.png`}
        alt={alt}
        width={878}
        height={111}
        loading={loading}
        decoding="async"
        className={`brand-logo-light object-contain ${className}`}
      />
      <img
        src={`${basePath}/logos/brickboard-horizontal-dark.png`}
        alt={alt}
        width={878}
        height={111}
        loading={loading}
        decoding="async"
        className={`brand-logo-dark object-contain ${className}`}
      />
    </>
  );
}
