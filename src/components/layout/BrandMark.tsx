import growbetLogo from "../../assets/brand/growbet-logo.png";

export function BrandMark({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={growbetLogo}
      alt=""
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={`pixelated shrink-0 ${className}`.trim()}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 0 6px rgba(1, 146, 1, 0.45))",
      }}
    />
  );
}
