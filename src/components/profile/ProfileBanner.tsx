import Image from "next/image";

interface ProfileBannerProps {
  bannerUrl?: string | null;
  username: string;
}

export function ProfileBanner({ bannerUrl, username }: ProfileBannerProps) {
  return (
    <div className="relative h-40 w-full overflow-hidden bg-background-void sm:h-56 lg:h-64">
      {bannerUrl ? (
        <Image
          src={bannerUrl}
          alt={`Banner de perfil de ${username}`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      ) : (
        <div className="relative h-full w-full bg-gradient-to-r from-[#111217] via-[#1a120e] to-[#111217]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-orange/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-brand-orange/10 via-transparent to-transparent" />
          <div className="absolute bottom-4 right-6 hidden font-heading text-4xl font-black uppercase tracking-widest text-white/[0.04] sm:block">
            Orange Brick
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background-void via-transparent to-black/20" />
    </div>
  );
}
