import Image from "next/image";

export default function BrandLogo({
  size = 44,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-dt.png"
      alt="デイトレード.net ロゴ"
      width={size}
      height={size}
      priority={priority}
      className={["brand-logo", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}
