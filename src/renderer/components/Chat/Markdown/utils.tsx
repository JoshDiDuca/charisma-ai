export const preprocessMarkdownText = (text: string): string => {
  if (!text) return '';

  // First, handle paragraph breaks (double newlines)
  const paragraphs = text.split(/\n{2,}/);

  // For each paragraph, ensure single newlines are treated as line breaks
  // by adding two spaces before each newline
  const processedParagraphs = paragraphs.map(para =>
    para.replace(/\n/g, '  \n')
  );

  // Join paragraphs with proper double newlines
  return processedParagraphs.join('\n\n');
};
