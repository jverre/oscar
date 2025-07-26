import { MarkdownRenderer } from "./MarkdownRenderer";

interface AssistantMessageProps {
  content: string;
}

export function AssistantMessage({ content }: AssistantMessageProps) {
  return <MarkdownRenderer content={content} />;
}