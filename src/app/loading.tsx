import { NewsFeedSkeleton } from "@/components/feed/NewsFeedSkeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <NewsFeedSkeleton />
    </div>
  );
}
