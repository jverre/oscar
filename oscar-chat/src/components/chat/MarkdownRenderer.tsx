import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type HeadingProps = { children?: React.ReactNode; [key: string]: unknown };
type TextProps = { children?: React.ReactNode; [key: string]: unknown };
type ListProps = { children?: React.ReactNode; [key: string]: unknown };
type BlockquoteProps = { children?: React.ReactNode; [key: string]: unknown };
type CodeProps = { 
  children?: React.ReactNode;
  inline?: boolean;
  [key: string]: unknown;
};

export const markdownComponents = {
  h1: ({ children, ...props }: HeadingProps) => (
    <h1 {...props} className="text-sm font-semibold text-foreground mb-2 mt-2 first:mt-0 break-words">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: HeadingProps) => (
    <h2 {...props} className="text-sm font-semibold text-foreground mb-2 mt-2 first:mt-0 break-words">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: HeadingProps) => (
    <h3 {...props} className="text-xs font-semibold text-foreground mb-1 mt-1 first:mt-0 break-words">
      {children}
    </h3>
  ),
  p: ({ children, ...props }: TextProps) => (
    <p {...props} className="text-xs text-foreground mb-2 last:mb-0 leading-relaxed break-words">
      {children}
    </p>
  ),
  ul: ({ children, ...props }: ListProps) => (
    <ul {...props} className="text-xs text-foreground mb-2 last:mb-0 ml-4 space-y-1 list-disc list-outside break-words">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ListProps) => (
    <ol {...props} className="text-xs text-foreground mb-2 last:mb-0 ml-4 space-y-1 list-decimal list-outside break-words">
      {children}
    </ol>
  ),
  li: ({ children, ...props }: ListProps) => (
    <li {...props} className="text-xs text-foreground leading-relaxed break-words">
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }: BlockquoteProps) => (
    <blockquote {...props} className="text-xs text-muted-foreground border-l-2 border-border pl-2 mb-2 italic break-words">
      {children}
    </blockquote>
  ),
  strong: ({ children, ...props }: TextProps) => (
    <strong {...props} className="font-semibold text-foreground break-words">
      {children}
    </strong>
  ),
  em: ({ children, ...props }: TextProps) => (
    <em {...props} className="italic text-foreground break-words">
      {children}
    </em>
  ),
  code: (props: CodeProps) => {
    const { inline, children } = props;
    if (inline !== false) {
      return (
        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono text-foreground break-all" style={{ display: 'inline' }}>
          {children}
        </code>
      );
    }
    return (
      <div className="text-xs bg-muted p-2 rounded mb-2 overflow-hidden">
        <code className="font-mono text-foreground whitespace-pre-wrap break-all">{children}</code>
      </div>
    );
  },
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-xs text-foreground break-words">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
        {content}
      </ReactMarkdown>
    </div>
  );
}