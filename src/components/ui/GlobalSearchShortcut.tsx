"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function GlobalSearchShortcut() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isInput) return;

      const isSearchKey =
        event.key === "/" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");

      if (isSearchKey) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>("[data-site-search-input], input[type='search']");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          router.push("/busca");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
