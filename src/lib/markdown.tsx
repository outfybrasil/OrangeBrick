import type { ReactNode } from "react";

export function parseInlineMarkdown(text: string): ReactNode {
  if (!text) return "";

  const parts: ReactNode[] = [];
  let currentIndex = 0;

  const tokenRegex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchStr = match[0];

    if (matchIndex > currentIndex) {
      const between = text.slice(currentIndex, matchIndex);
      if (between.includes("[") && between.includes("](")) {
        parts.push(parseInlineMarkdown(between));
      } else {
        parts.push(between);
      }
    }

    if (matchStr.startsWith("**") && matchStr.endsWith("**")) {
      const boldText = matchStr.slice(2, -2);
      parts.push(
        <strong key={matchIndex} className="text-white font-bold">
          {boldText}
        </strong>
      );
    } else if (matchStr.startsWith("[") && matchStr.includes("](")) {
      const closeBracketIndex = matchStr.indexOf("]");
      const label = matchStr.slice(1, closeBracketIndex);
      const url = matchStr.slice(closeBracketIndex + 2, -1);

      const isInternal = url.startsWith("/") || url.startsWith("file://");

      parts.push(
        <a
          key={matchIndex}
          href={url}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noopener noreferrer"}
          className="text-brand-orange hover:underline font-semibold"
        >
          {label}
        </a>
      );
    }

    currentIndex = tokenRegex.lastIndex;
  }

  if (currentIndex < text.length) {
    const remaining = text.slice(currentIndex);
    if (remaining.includes("[") && remaining.includes("](")) {
      parts.push(parseInlineMarkdown(remaining));
    } else {
      parts.push(remaining);
    }
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export function parseMarkdownToReact(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={i} className="text-lg font-mono font-bold text-white mt-6 mb-3 uppercase tracking-tight">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} className="text-xl font-mono font-bold text-white mt-8 mb-4 uppercase tracking-tight border-b border-brand-orange-muted/10 pb-2">
          {parseInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={i} className="text-2xl font-mono font-black text-white mt-10 mb-6 uppercase tracking-tight">
          {parseInlineMarkdown(trimmed.slice(2))}
        </h1>
      );
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <ul key={i} className="list-disc list-inside ml-4 my-2 text-gray-300 font-sans leading-relaxed">
          <li>{parseInlineMarkdown(trimmed.slice(2))}</li>
        </ul>
      );
    }

    if (trimmed === "") {
      return <div key={i} className="h-4" />;
    }

    return (
      <p key={i} className="text-gray-300 font-sans text-base leading-relaxed my-4">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });
}
