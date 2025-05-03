import { Button, ButtonGroup, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { get } from "lodash";
import React from "react";
import { FaChevronDown } from "react-icons/fa";

type MultiButtonProps = {
  options: Options;
};

type Options = { [key: string] : {
  label: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}
}

export const MultiButton = ({ options }: MultiButtonProps) => {
  const [selectedOption, setSelectedOption] = React.useState("folder");

  const handleMainButtonClick = () => {
    const option = get(options, selectedOption);
    if (!option.disabled && option.onClick) {
      option.onClick();
    }
  };

  return (
    <ButtonGroup variant="light">
      <Button
        onClick={handleMainButtonClick}
        disabled={get(options, selectedOption).disabled}
      >
        {get(options, selectedOption).label}
      </Button>
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button isIconOnly>
            <FaChevronDown />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Source options"
          className="max-w-[300px]"
          selectedKeys={[selectedOption]}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0].toString();
            setSelectedOption(selected);
          }}
        >
          {Object.entries(options).map(([key, { label, description, disabled, onClick }]) => (
            <DropdownItem
              key={key}
              description={description}
              isDisabled={disabled}
            >
              {label}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </ButtonGroup>
  );
};
