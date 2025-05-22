import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { IPC } from 'shared/constants';
import { Settings } from 'shared/types/Settings';

const { App } = window;

interface SettingsContextType {
  settings?: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings | undefined>>;

  //Functions
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
}
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = React.useState<Settings | undefined>();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response: Settings = await App.invoke(IPC.SETTINGS.GET_SETTINGS);
      if (response) {
        setSettings(response);
      } else {
        setSettings(undefined);
      }
    } catch (error) {
      console.error("Failed to get settings:", error);
    }
  };

  const saveSettings = async (settings: Settings) => {
    try {
      const response: Settings = await App.invoke(IPC.SETTINGS.SAVE_SETTINGS, settings);
      if (response) {
        setSettings(response);
      } else {
        setSettings(undefined);
      }
    } catch (error) {
      console.error("Failed to get settings:", error);
    }
  };

  const value = {
    settings,
    setSettings,

    saveSettings,
    loadSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within an SettingsProvider');
  }
  return context;
};
