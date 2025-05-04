import React, { useState, useRef, useEffect } from 'react';

interface SelectOption {
  key: string;
  value: string;
  label: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <div
        className="flex items-center justify-between p-2 border rounded cursor-pointer bg-white hover:bg-gray-50"
        onClick={toggleDropdown}
      >
        <div className="flex-grow truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </div>
        <div className="ml-2">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.key}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                option.value === value ? 'bg-gray-100' : ''
              }`}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
