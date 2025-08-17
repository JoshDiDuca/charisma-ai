import React from 'react';
import { Checkbox, Input, Button, Accordion, AccordionItem } from '@heroui/react';
import { useSettings } from 'renderer/store/settingsProvider';
import { FaTrash } from 'react-icons/fa';
import { ENVIRONMENT } from 'shared/constants';
import { useForm, Controller, useFieldArray } from 'react-hook-form';

interface SettingsFormValues {
  ignorePaths: { value: string }[];
  darkMode: boolean;
  useChromeLogo: boolean;
  ollamaModelsPath: string;
}

interface SettingsViewProps {
  status: any;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ status }) => {
  const isDev = ENVIRONMENT.IS_DEV;
  const { settings, saveSettings } = useSettings();

  const { control, handleSubmit } = useForm<SettingsFormValues>({
    defaultValues: {
      ignorePaths: (settings?.ignorePaths || []).map((p: string) => ({ value: p })),
      darkMode: settings?.darkMode ?? false,
      useChromeLogo: settings?.useChromeLogo ?? false,
      ollamaModelsPath: settings?.ollamaModelsPath || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ignorePaths',
  });

  const onSubmit = (data: SettingsFormValues) => {
    saveSettings({
      ...settings,
      ignorePaths: data.ignorePaths.map((p) => p.value),
      darkMode: data.darkMode,
      useChromeLogo: data.useChromeLogo,
      ollamaModelsPath: data.ollamaModelsPath,
    });
  };

  const getStatusDisplay = () => {
    if (typeof status === 'string') {
      return {
        text: status,
        color: status === 'Error' ? 'red' : 'green',
      };
    } else {
      const noDB = status.Database === 'Stopped';
      const runningText = `Running (${status.GPU ? 'GPU' : 'CPU'})`;
      const embeddingText = noDB ? ' - No Embedding' : '';
      return {
        text: runningText + embeddingText,
        color: noDB ? 'orange' : 'green',
      };
    }
  };

  const { text: statusText, color: statusColor } = getStatusDisplay();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-4 rounded-none"
      style={{ height: '100%', minWidth: '400px' }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Settings</h2>
          <Button className='h-7' type="submit" color="primary">
            Save
          </Button>
        </div>
        <div className="inline-flex items-center mb-4">
          <span className="text-sm font-medium">
            Status: <b style={{ color: statusColor }}>{statusText}</b>
          </span>
        </div>
        <Accordion>
          <AccordionItem key="1" aria-label="Configuration" title="Configuration">
            <div className="mt-2">
              <span className="text-sm font-medium mb-2 block">Ignore Paths</span>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="Enter path to ignore..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const inputValue = (e.target as HTMLInputElement).value.trim();
                      if (inputValue && !fields.some(f => f.value === inputValue)) {
                        append({ value: inputValue });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>(
                      'input[placeholder="Enter path to ignore..."]'
                    );
                    if (input) {
                      const val = input.value.trim();
                      if (val && !fields.some(f => f.value === val)) {
                        append({ value: val });
                        input.value = '';
                      }
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '200px' }}>
                {fields.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded"
                  >
                    <span className="text-sm">{item.value}</span>
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      onClick={() => remove(index)}
                    >
                      <FaTrash />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <span className="text-sm font-medium mb-2 block">Ollama Models Path</span>
                <Controller
                  control={control}
                  name="ollamaModelsPath"
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter Ollama models path..."
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>
          </AccordionItem>
          <AccordionItem key="2" aria-label="Appearance" title="Appearance">
            <div className="items-center mt-2 mb-1">
              <Controller
                control={control}
                name="darkMode"
                render={({ field }) => (
                  <Checkbox isSelected={field.value} onChange={field.onChange}>
                    Dark Mode
                  </Checkbox>
                )}
              />
            </div>
            <div className="items-center mt-2 mb-1">
              <Controller
                control={control}
                name="useChromeLogo"
                render={({ field }) => (
                  <Checkbox isSelected={field.value} onChange={field.onChange}>
                    Use Chrome Logo
                  </Checkbox>
                )}
              />
            </div>
          </AccordionItem>
        </Accordion>
      </div>
    </form>
  );
};
