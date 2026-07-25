import React from 'react';

/**
 * Parses inline font-size spans and renders them with proper styling.
 * Supports both single and double quotes: <span style="font-size:Xpx"> or <span style='font-size:Xpx'>
 * Inner text is passed through the provided renderInner callback for link/markdown support.
 */
export function renderWithFontSizes(
  text: string,
  renderInner: (t: string) => React.ReactNode
): React.ReactNode[] {
  // Match <span style="font-size:12px">text</span> or <span style='font-size:12px'>text</span>
  const regex = /<span\s+style=["']font-size:(\d+)px["']>(.*?)<\/span>/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before this span
    if (match.index > lastIndex) {
      parts.push(<span key={`t${lastIndex}`}>{renderInner(text.slice(lastIndex, match.index))}</span>);
    }
    const [, size, innerText] = match;
    parts.push(
      <span key={`s${match.index}`} style={{ fontSize: size + 'px' }}>
        {renderInner(innerText)}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Push remaining text after last span
  if (lastIndex < text.length) {
    parts.push(<span key={`t${lastIndex}`}>{renderInner(text.slice(lastIndex))}</span>);
  }

  return parts.length > 0 ? parts : [<span key="0">{renderInner(text)}</span>];
}
