import type { ReactNode } from "react";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1]) nodes.push(<strong key={`${keyPrefix}-b-${index}`}>{match[1]}</strong>);
    else if (match[2]) nodes.push(<em key={`${keyPrefix}-i-${index}`}>{match[2]}</em>);
    else if (match[3] && match[4]) {
      nodes.push(
        <a key={`${keyPrefix}-a-${index}`} href={match[4]} className="underline underline-offset-2" rel="noreferrer">
          {match[3]}
        </a>,
      );
    }
    last = match.index + match[0].length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const list = lines.every((line) => /^(\s*[-*]|\s*\d+\.)\s+/.test(line));
        if (list) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{inline(line.replace(/^(\s*[-*]|\s*\d+\.)\s+/, ""), `${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={blockIndex}>{inline(block.replace(/\n/g, " "), String(blockIndex))}</p>;
      })}
    </div>
  );
}
