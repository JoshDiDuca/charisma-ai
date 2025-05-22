// Enhanced usePasteHandler.ts with drag and drop support
import { useState, useRef, ClipboardEvent, DragEvent } from 'react';

export interface FileAttachment {
  file: File;
  name: string;
  type: string;
  size: number;
  data?: ArrayBuffer;  // Store the file data
}

interface UsePasteHandlerProps {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  onAttach?: (file: File, data: ArrayBuffer) => Promise<void>;
}

export function usePasteHandler({ inputValue, setInputValue, onAttach }: UsePasteHandlerProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

 const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: FileAttachment[] = [];

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

    for (const file of fileArray) {
      try {
        console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

        // Read the file data using FileReader
        const data = await readFileAsArrayBuffer(file);
        console.log(`Successfully read file data, length: ${data.byteLength}`);

        const attachment: FileAttachment = {
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          data
        };

        newAttachments.push(attachment);

        // Call onAttach with both file and data if provided
        if (onAttach) {
          await onAttach(file, data);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handlePaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    const isInputFocused = document.activeElement === inputRef.current;
    const clipboardData = e.clipboardData;

    // Always handle file paste regardless of focus
    if (clipboardData.files && clipboardData.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await processFiles(clipboardData.files);
      return;
    }

    // Only handle text paste if not focused on input
    if (!isInputFocused && clipboardData.getData('text')) {
      e.preventDefault();
      e.stopPropagation();
      const pastedText = clipboardData.getData('text');
      setInputValue(prev => prev + pastedText);
      inputRef.current?.focus();
    }

    // Let default behavior happen when input is focused
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're leaving the drop zone completely
    // This prevents flicker when dragging over child elements
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    } else if (e.dataTransfer.getData('text')) {
      const droppedText = e.dataTransfer.getData('text');
      setInputValue((prev) => prev + droppedText);
      inputRef.current?.focus();
    }
  };

  const removeAttachment = async (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  return {
    attachments,
    removeAttachment,
    inputRef,
    handlePaste,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDragging
  };
}
