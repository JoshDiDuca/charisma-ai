import { Module } from "shared/constants/modules";

export type ComponentStatus = "Running" | "Stopped" | "Loading" | "Error";
export type AppStatus = {
  [module in Module]: ComponentStatus;
};
