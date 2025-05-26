
import { useSettings } from "renderer/store/settingsProvider";
import logo from "./../../public/logo.png";
import logo_white from "./../../public/logo_white.png";
import logo_metal from "./../../public/liquid_metal_logo.gif";


export const Logo = (props: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) => {
  const { settings } = useSettings();

  return (<img src={(settings?.useChromeLogo ? logo_metal : settings?.darkMode ? logo_white : logo)}
      title="Logo"
      className="w-8 h-8 cursor-pointer"
      {...props}
    />)
}
