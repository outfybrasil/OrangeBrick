import { Suspense } from "react";
import { BrickboardContent } from "@/app/brickboard/page";

export default function EnglishBrickboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background-void">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        </div>
      }
    >
      <BrickboardContent isEn={true} />
    </Suspense>
  );
}
