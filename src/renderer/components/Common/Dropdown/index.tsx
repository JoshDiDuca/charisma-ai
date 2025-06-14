import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from 'renderer/store/settingsProvider';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const CustomDropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  className = ''
}) => {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div onClick={toggleDropdown}>
        {trigger}
      </div>

      {isOpen && (
        <div className={`${settings?.darkMode ? "bg-black" : "bg-white"} text-foreground bg-background absolute right-0 mt-2 w-64 border rounded-md shadow-lg z-50`}>
          {children}
        </div>
      )}
    </div>
  );
};
