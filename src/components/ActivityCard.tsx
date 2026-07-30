import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import StatusBadge, { type StatusType } from "./StatusBadge";
import type { NivelIntensidad } from "../lib/types";

const NIVEL_COLORS: Record<NivelIntensidad, [bg: string, fg: string, bd: string]> = {
  "Física baja": ["#E7F8F5", "#0C8576", "#CBEDE7"],
  "Física media": ["#FFF3E0", "#B9741A", "#F6E2C0"],
  "Física alta": ["#FBEAEB", "#BE3A3E", "#F3D2D3"],
};

interface ActivityCardProps {
  id: string;
  name: string;
  catName: string;
  nivel: NivelIntensidad;
  photoTint: string;
  statusType: StatusType;
  rating: number;
  location: string;
  instructor: string;
  price: number;
  cupText: string;
  cupColor: string;
  href?: string;
}

export default function ActivityCard({
  id,
  name,
  catName,
  nivel,
  photoTint,
  statusType,
  rating,
  location,
  instructor,
  price,
  cupText,
  cupColor,
  href,
}: ActivityCardProps) {
  const navigate = useNavigate();
  const [nivelBg, nivelFg, nivelBd] = NIVEL_COLORS[nivel];

  return (
    <div
      className="ah-hov"
      onClick={() => navigate(href ?? `/alumno/actividad/${id}`)}
      style={s(
        "cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.05);font-family:Manrope,system-ui,sans-serif;",
      )}
    >
      <div style={s(`position:relative;height:158px;background:${photoTint};`)}>
        <div
          style={s(
            "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.8);font:600 11.5px ui-monospace,Menlo,monospace;",
          )}
        >
          FOTO · {name}
        </div>
        <div style={s("position:absolute;top:12px;left:12px;")}>
          <StatusBadge type={statusType} />
        </div>
        <div
          style={s(
            "position:absolute;top:12px;right:12px;background:rgba(14,42,71,.78);backdrop-filter:blur(4px);color:#fff;padding:5px 10px;border-radius:99px;font:700 12px Manrope,sans-serif;display:flex;align-items:center;gap:5px;",
          )}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFC53D" stroke="none">
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
          {rating.toFixed(1)}
        </div>
      </div>
      <div style={s("padding:15px 16px 17px;")}>
        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;")}>
          <span style={s("font:700 11.5px Manrope,sans-serif;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;")}>
            {catName}
          </span>
          <span
            style={s(
              `display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:99px;background:${nivelBg};color:${nivelFg};border:1px solid ${nivelBd};`,
            )}
          >
            {nivel}
          </span>
        </div>
        <div style={s("font:700 17.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:10px;line-height:1.25;")}>{name}</div>
        <div style={s("display:flex;align-items:center;gap:7px;color:#65788C;font-size:13px;font-weight:600;margin-bottom:5px;")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {location}
        </div>
        <div style={s("display:flex;align-items:center;gap:7px;color:#65788C;font-size:13px;font-weight:600;")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
          </svg>
          {instructor}
        </div>
        <div style={s("height:1px;background:#EEF2F6;margin:13px 0 12px;")} />
        <div style={s("display:flex;align-items:center;justify-content:space-between;")}>
          <div>
            <span style={s("font:700 19px Space Grotesk,sans-serif;color:#0E2A47;")}>${price.toLocaleString("es-AR")}</span>
            <span style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}> /clase</span>
          </div>
          <div style={s(`font-size:12.5px;font-weight:700;color:${cupColor};`)}>{cupText}</div>
        </div>
      </div>
    </div>
  );
}
