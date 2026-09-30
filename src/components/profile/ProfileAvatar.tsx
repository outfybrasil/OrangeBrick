import Image from "next/image";
import { resolveAvatarUrl } from "@/lib/avatar";

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  isOfficial?: boolean;
}

export function ProfileAvatar({ avatarUrl, displayName, isOfficial }: ProfileAvatarProps) {
  const resolved = resolveAvatarUrl(avatarUrl);
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "OB";

  return (
    <div className="relative -mt-14 shrink-0 sm:-mt-16">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-background-void bg-[#16171D] shadow-xl ring-2 ring-white/10 sm:h-32 sm:w-32">
        {resolved ? (
          <Image
            src={resolved}
            alt={displayName}
            fill
            priority
            sizes="(max-width: 640px) 96px, 128px"
            className="object-cover object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-heading text-xl font-black text-brand-orange sm:text-2xl">
            {initials}
          </div>
        )}
      </div>
      {isOfficial && (
        <span
          title="Conta Oficial Orange Brick"
          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-white shadow-md ring-2 ring-background-void sm:h-7 sm:w-7"
        >
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
}
