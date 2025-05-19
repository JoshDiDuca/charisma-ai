import { Message } from "shared/types/Conversation";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import remarkBreaks from 'remark-breaks';
import { preprocessMarkdownText } from 'renderer/components/Chat/Markdown/utils';
import CopyCodeButton from 'renderer/components/Chat/Markdown/CopyCodeButton';


interface ChatMarkdownProps {
  message: string;
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ message }) => {

  return (<Markdown
    remarkPlugins={[remarkGfm, remarkBreaks]}
    components={{
      code(props) {
        const { children, className, node, ...rest } = props;
        const match = /language-(\w+)/.exec(className || '');
        return match ? (
          <div style={{ position: 'relative' }}>
            <CopyCodeButton code={String(children)}>{children}</CopyCodeButton>
            <SyntaxHighlighter language={match[1]} {...props}>
              {String(children)}
            </SyntaxHighlighter>
          </div>
        ) : (
          <code {...rest} className={className}>
            {children}
          </code>
        );
      },
      p: ({ node, children, ...props }) => (
        <p style={{ marginBottom: "1em" }} {...props}>{children}</p>
      ),
      br: () => <br style={{ marginBottom: "0.5em" }} />
    }}
  >
    {preprocessMarkdownText(message)}
  </Markdown>)
}
