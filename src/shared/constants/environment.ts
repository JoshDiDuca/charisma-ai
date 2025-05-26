export const ENVIRONMENT = {
  IS_DEV: process.env.NODE_ENV === 'development',
  DISABLE_TTS_ON_START: true,
  DEFAULT_IGNORE_FOLDERS: ["node_modules", "dist", "build", "bin", ".git", ".vscode", "venv", "env", "lib", "lib64", "__pycache__", ".idea"],
}
