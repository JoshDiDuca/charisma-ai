import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Tabs, Tab, Card, CardBody, Accordion, AccordionItem } from '@heroui/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Message } from 'shared/types/Conversation';
import { get } from 'lodash';
import { preprocessMarkdownText } from 'renderer/components/Chat/Markdown/utils';
import CopyCodeButton from 'renderer/components/Chat/Markdown/CopyCodeButton';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  return (
    <div
      style={{ userSelect: "text" }}
      className={`max-w-[80%] px-4 py-2 rounded-large ${message.role === 'user'
        ? 'self-end bg-primary text-primary-foreground'
        : 'self-start bg-default-300 text-default-foreground'
        }`}
    >
      {message.role === 'user' ? (
        <Markdown>{message.userInput || message.text}</Markdown>
      ) : (
        <Tabs aria-label="Options">
          <Tab key="answer" title="Answer">
            <Card>
              <CardBody>
                <Markdown
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
                  {preprocessMarkdownText(message.userInput || message.text)}
                </Markdown>
              </CardBody>
            </Card>
          </Tab>
          <Tab key="sources" title="Sources">
            <Card>
              <CardBody>
                <Accordion>
                  {message.messageSources?.map((source, index) => {
                    const title = get(source.metadata, "title");
                    const path = get(source.metadata, "path");
                    const url = get(source.metadata, "url");
                    const score = source.score;

                    const useTitle = title || path || url || `Source ${index}`;
                    const elementTitle = useTitle + ` ${score ? `(${score})` : ""}`;

                    return (
                      <AccordionItem
                        key={index}
                        aria-label={`Source ${index}`}
                        subtitle="Press to expand"
                        title={elementTitle}
                      >
                        <div>{source.content ?? ""}</div>
                      </AccordionItem>
                    );
                  }) ?? []}
                </Accordion>
              </CardBody>
            </Card>
          </Tab>
        </Tabs>
      )}
    </div>
  );
};
