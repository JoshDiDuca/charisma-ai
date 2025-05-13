import React, {useState} from "react";

const CopyCodeButton = ({children, code} : React.PropsWithChildren & { code: string }) => {
  const [copyOk, setCopyOk] = useState(false);
  const iconColor = copyOk ? '#0af20a' : '#ddd';
  const icon = copyOk ? 'fa-check-square' : 'fa-copy';

  const handleClick = () => {
    navigator.clipboard.writeText(code);
    setCopyOk(true);
    setTimeout(() => {
      setCopyOk(false);
    }, 500);
  };

  return (
    <div className="code-copy-btn">
      <i className={`fas ${icon}`} onClick={handleClick} style={{color: iconColor}} />
    </div>
  );
};

export default CopyCodeButton;
