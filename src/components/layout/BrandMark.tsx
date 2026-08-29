import seedbetLogo from "../../assets/brand/seedbet-logo.png";

export function BrandMark({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={seedbetLogo}
      alt=""
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={`pixelated shrink-0 ${className}`.trim()}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 0 8px rgba(88, 255, 255, 0.55))",
      }}
    />
  );
}
