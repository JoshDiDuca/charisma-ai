import { FileAttachment } from './usePasteHandler';
import { Button, Chip } from '@heroui/react';
import { FaTimes } from 'react-icons/fa';

interface AttachmentProps {
  attachment: FileAttachment;
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
      {attachment.name} ({Math.round(attachment.size / 1024)} KB)
    </Chip>
  );
};

interface AttachmentListProps {
  attachments: FileAttachment[];
  onRemove: (index: number) => void;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap mt-2">
      {attachments.map((attachment, index) => (
        <Attachment
          key={`${attachment.name}-${index}`}
          attachment={attachment}
          onRemove={() => onRemove(index)}
        />
      ))}
    </div>
  );
};
