import { FileAttachment } from './usePasteHandler';
import { Button, Chip } from '@heroui/react';
import { FaTimes } from 'react-icons/fa';
import { Source } from 'shared/types/Sources/Source';

interface AttachmentProps {
  attachment: Source;
  onRemove: () => void;
}

export const Attachment: React.FC<AttachmentProps> = ({ attachment, onRemove }) => {
  return (
    <Chip
      variant="flat"
      className="mr-2 mb-2"
      endContent={
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onClick={onRemove}
          className="ml-1"
        >
          <FaTimes size={12} />
        </Button>
      }
    >
      {(() => {
        switch(attachment.type){
          case "Web":
          return `${attachment.title}`
          case "File":
          case "FilePath":
          return `${attachment.fileType} (${Math.round(attachment.fileSize / 1024)} KB)`
          case "Directory":
          return `${attachment.directoryName} ${attachment.directorySize ? `(${Math.round(attachment.directorySize / 1024)} KB)`: ""}`
        }
      })()}

    </Chip>
  );
};

interface AttachmentListProps {
  attachments: Source[];
  onRemove: (index: number) => void;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap mt-2">
      {attachments.map((attachment, index) => (
        <Attachment
          key={`${attachment.type}-${index}`}
          attachment={attachment}
          onRemove={() => onRemove(index)}
        />
      ))}
    </div>
  );
};
