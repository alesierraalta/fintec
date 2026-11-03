import React from 'react';

/**
 * Parses inline markdown tokens: `code`, **bold**, *italic*, [label](url).
 * Safely returns React nodes without dangerouslySetInnerHTML.
 */
function parseInline(text: string): React.ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-[13px] text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **bold**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *italic*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      const safeUrl =
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('/')
          ? url
          : '#';

      return (
        <a
          key={index}
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {label}
        </a>
      );
    }

    return part;
  });
}

export interface FormattedMarkdownProps {
  content: string;
}

/**
 * Lightweight, zero-dependency, streaming-safe Markdown renderer for FinTec AI chat.
 * Renders headers, lists, code blocks, blockquotes, and inline formatting
 * with accessible semantic HTML and premium styling.
 */
export function FormattedMarkdown({ content }: FormattedMarkdownProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = (key: number) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul
          key={`ul-${key}`}
          className="my-1.5 list-disc space-y-1 pl-4 marker:text-primary"
        >
          {currentList.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol
          key={`ol-${key}`}
          className="my-1.5 list-decimal space-y-1 pl-4 marker:text-primary"
        >
          {currentList.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, index) => {
    // Code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="my-2 overflow-x-auto rounded-xl border border-border bg-card/90 p-3 font-mono text-xs text-foreground shadow-ios-sm"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        return;
      } else {
        flushList(index);
        inCodeBlock = true;
        return;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Empty line separates blocks
    if (!line.trim()) {
      flushList(index);
      return;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList(index);
      elements.push(
        <h3
          key={index}
          className="mb-1 mt-3 text-sm font-semibold tracking-tight text-foreground"
        >
          {parseInline(line.slice(4))}
        </h3>
      );
      return;
    }
    if (line.startsWith('## ')) {
      flushList(index);
      elements.push(
        <h2
          key={index}
          className="mb-1.5 mt-3 text-base font-bold tracking-tight text-foreground"
        >
          {parseInline(line.slice(3))}
        </h2>
      );
      return;
    }
    if (line.startsWith('# ')) {
      flushList(index);
      elements.push(
        <h1
          key={index}
          className="mb-2 mt-3.5 text-lg font-bold tracking-tight text-foreground"
        >
          {parseInline(line.slice(2))}
        </h1>
      );
      return;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList(index);
      elements.push(
        <blockquote
          key={index}
          className="my-1.5 border-l-2 border-primary/60 pl-3 text-sm italic text-muted-foreground"
        >
          {parseInline(line.slice(2))}
        </blockquote>
      );
      return;
    }

    // Unordered List (- or *)
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList(index);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Ordered List (1. , 2. )
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList(index);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[1]);
      return;
    }

    // Regular paragraph
    flushList(index);
    elements.push(
      <p key={index} className="my-1 leading-relaxed">
        {parseInline(line)}
      </p>
    );
  });

  flushList(lines.length);

  // If streaming leaves code block open, still render it gracefully
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key="open-code"
        className="my-2 overflow-x-auto rounded-xl border border-border bg-card/90 p-3 font-mono text-xs text-foreground shadow-ios-sm"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-1 text-[15px]">{elements}</div>;
}
