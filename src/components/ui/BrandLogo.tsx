import { BrickboardLogo, type BrickboardLogoProps } from "./BrickboardLogo";

export { BrickboardLogo, type BrickboardLogoProps };

interface BrandLogoProps {
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  variant?: "full" | "mark";
  brand?: "orange-brick" | "brickboard";
}

export function BrandLogo({ alt, className = "", loading = "eager", variant = "full", brand = "orange-brick" }: BrandLogoProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  if (brand === "brickboard") {
    return <BrickboardLogo alt={alt} className={className} loading={loading} variant={variant} />;
  }

  if (variant === "mark") {
    return (
      <img
        src={`${basePath}/logos/orange-brick-mark.png`}
        alt={alt}
        width={304}
        height={171}
        loading={loading}
        decoding="async"
        className={`shrink-0 object-contain ${className}`}
      />
    );
  }

  return (
    <>
      <img
        src={`${basePath}/logos/orange-brick-horizontal-light.png`}
        alt={alt}
        width={1703}
        height={171}
        loading={loading}
        decoding="async"
        className={`brand-logo-light object-contain ${className}`}
      />
      <img
        src={`${basePath}/logos/orange-brick-horizontal-dark.png`}
        alt={alt}
        width={1703}
        height={171}
        loading={loading}
        decoding="async"
        className={`brand-logo-dark object-contain ${className}`}
      />
    </>
  );
}
