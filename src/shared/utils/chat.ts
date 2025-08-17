import { Message } from "shared/types/Conversation";

export function extractThoughtsAndMessage(input: string): { thoughts: string[], text: string; isThinking: boolean } {
  const thoughts: string[] = [];
  let isThinking = false;
  let message = input;

  // Extract complete thoughts (anything between <think> and </think> tags)
  const completeThoughtRegex = /<think>([\s\S]*?)<\/think>/g;
  let match;

  while ((match = completeThoughtRegex.exec(input)) !== null) {
    thoughts.push(match[1].trim());  // Add the thought content (without tags)
    message = message.replace(match[0], '');  // Remove the entire thought block from message
  }

  // Check for an incomplete thought (a <think> tag without a matching </think>)
  const incompleteThoughtIndex = message.lastIndexOf('<think>');
  if (incompleteThoughtIndex !== -1) {
    // Extract content after the <think> tag
    const incompleteThoughtContent = message.substring(incompleteThoughtIndex + '<think>'.length);
    thoughts.push(incompleteThoughtContent.trim());
    message = message.substring(0, incompleteThoughtIndex);
    isThinking = true;
  }

  return { thoughts, text: message.trim(), isThinking };
}
export const processMessagesThoughts = (messages: Message[]) => messages.map(e => {
  if (e.role === "assistant") {
    const {text, thoughts} = extractThoughtsAndMessage(e.text);
    return { ...e, text, thoughts };
  } else {
    return e;
  }
}) || [];
