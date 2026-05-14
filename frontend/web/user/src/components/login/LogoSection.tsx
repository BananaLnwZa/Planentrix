import Image from "next/image";

export default function LogoSection() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="/images/logo.png"
        alt="Planentrix Logo"
        width={300}
        height={300}
        priority
      />
    </div>
  );
}