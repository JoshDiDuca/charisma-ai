
import { useSettings } from "renderer/store/settingsProvider";
import logo from "./../../public/logo.png";
import logo_white from "./../../public/logo_white.png";


export const Logo = (props: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) => {
  const { settings, saveSettings } = useSettings();

  return (<img src={(settings?.darkMode ? logo_white : logo)}
      title="Logo"
      className="w-8 h-8 cursor-pointer"
      {...props}
    />)
}
