import Markdown from 'react-markdown';
export default function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="markdown-preview">
      <Markdown skipHtml>{source || '*Nothing to preview yet.*'}</Markdown>
    </div>
  );
}
