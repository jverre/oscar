import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const markdownComponents = {
  h1: ({ children, ...props }: any) => (
    <h1 {...props} className="text-sm font-semibold text-foreground mb-2 mt-2 first:mt-0 break-words">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 {...props} className="text-sm font-semibold text-foreground mb-2 mt-2 first:mt-0 break-words">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 {...props} className="text-xs font-semibold text-foreground mb-1 mt-1 first:mt-0 break-words">
      {children}
    </h3>
  ),
  p: ({ children, ...props }: any) => (
    <p {...props} className="text-xs text-foreground mb-2 last:mb-0 leading-relaxed break-words">
      {children}
    </p>
  ),
  ul: ({ children, ...props }: any) => (
    <ul {...props} className="text-xs text-foreground mb-2 last:mb-0 ml-4 space-y-1 list-disc list-outside break-words">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol {...props} className="text-xs text-foreground mb-2 last:mb-0 ml-4 space-y-1 list-decimal list-outside break-words">
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li {...props} className="text-xs text-foreground leading-relaxed break-words">
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote {...props} className="text-xs text-muted-foreground border-l-2 border-border pl-2 mb-2 italic break-words">
      {children}
    </blockquote>
  ),
  strong: ({ children, ...props }: any) => (
    <strong {...props} className="font-semibold text-foreground break-words">
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em {...props} className="italic text-foreground break-words">
      {children}
    </em>
  ),
  code: (props: any) => {
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}