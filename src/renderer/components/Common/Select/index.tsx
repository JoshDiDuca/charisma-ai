import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSettings } from 'renderer/store/settingsProvider';

interface SelectOption {
  key: string;
  value: string;
  label: React.ReactNode;
  selectedLabel?: React.ReactNode;
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
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const lowerFilter = filter.toLowerCase();
    return options.filter(option => {
      // Search in value and label (assuming label is string or can be converted to string)
      const labelText = typeof option.label === 'string' ? option.label : String(option.label);
      return (
        option.value.toLowerCase().includes(lowerFilter) ||
        labelText.toLowerCase().includes(lowerFilter)
      );
    });
  }, [filter, options]);

  const selectedOption = options.find(option => option.value === value);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFilter('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFilter('');
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
        className={`flex items-center justify-between p-2 border rounded cursor-pointer ${settings?.darkMode ? "bg-black" : "bg-white"} hover:bg-gray-50 dark:hover:bg-gray-950`}
        onClick={toggleDropdown}
      >
        <div className="flex-grow truncate">
          {selectedOption ? selectedOption.selectedLabel || selectedOption.label : placeholder}
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
        <div className={`absolute text-foreground bg-background z-50 w-full mt-1 ${settings?.darkMode ? "bg-black" : "bg-white"} border rounded shadow-lg overflow-y-auto max-w-screen`} style={{ maxHeight: '400px' }}>
          <input
            type="text"
            className="w-full p-2 border-b outline-none"
            placeholder="Search..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option.key}
                className={`p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${option.value === value ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                onClick={() => handleOptionClick(option.value)}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-500">No options found</div>
          )}
        </div>
      )}
    </div>
  );
};
