import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";

interface LogoProps {
  size?: number;
  dark?: boolean;
  to?: string;
}

export default function Logo({ size = 38, dark = false, to = "/" }: LogoProps) {
  const navigate = useNavigate();
  const fontSize = Math.round(size * 0.53);
  const wordSize = Math.round(size * 0.55);

  return (
    <div
      style={s("display:flex;align-items:center;gap:11px;cursor:pointer;")}
      onClick={() => navigate(to)}
    >
      <div
        style={s(
          `width:${size}px;height:${size}px;border-radius:11px;background:linear-gradient(140deg,#0E2A47,#12B5A5);display:flex;align-items:center;justify-content:center;font:700 ${fontSize}px Space Grotesk,sans-serif;color:#fff;box-shadow:0 6px 14px rgba(18,181,165,.32);`,
        )}
      >
        A
      </div>
      <span
        style={s(
          `font:700 ${wordSize}px Space Grotesk,sans-serif;letter-spacing:-.3px;color:${dark ? "#fff" : "#0E2A47"};`,
        )}
      >
        Active<span style={s("color:#FF6A2B;")}>Hub</span>
      </span>
    </div>
  );
}
