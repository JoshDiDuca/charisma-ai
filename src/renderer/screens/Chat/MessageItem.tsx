import React from 'react';
import Markdown from 'react-markdown';
import { Tabs, Tab, Card, CardBody, Accordion, AccordionItem } from '@heroui/react';
import { Message } from 'shared/types/Conversation';
import { get } from 'lodash';
import { ChatMarkdown } from './ChatMarkdown';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {

  const text = message.userInput || message.text;
  return (
    <div
      style={{ userSelect: "text" }}
      className={`max-w-[80%] px-4 py-2 rounded-large ${message.role === 'user'
        ? 'self-end bg-primary text-primary-foreground'
        : 'self-start bg-default-300 text-default-foreground'
        }`}
    >
      {message.role === 'user' ? (
        <Markdown>{text}</Markdown>
      ) : (
        <Tabs aria-label="Options">
          <Tab key="answer" title="Answer">
            <Card>
              <CardBody>
                <ChatMarkdown message={text} />
              </CardBody>
            </Card>
          </Tab>
          {(message.thoughts && message.thoughts.length > 0) && <Tab key="thoughts" title="Thoughts">
            <Card>
              <CardBody>
                  {message.thoughts?.map((source, index) => {
                    return (
                      <div
                      >
                        <ChatMarkdown message={source} />
                      </div>
                    );
                  }) ?? []}
              </CardBody>
            </Card>
          </Tab>}
          {(message.messageSources && message.messageSources.length > 0) && <Tab key="sources" title="Sources">
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
          </Tab>}
        </Tabs>
      )}
    </div>
  );
};
