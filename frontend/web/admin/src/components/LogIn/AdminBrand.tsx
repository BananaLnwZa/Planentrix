import Image from "next/image";

export default function AdminBrand() {
  return (
    <>
      <Image
        src="/images/logo.png"
        alt="Planentrix"
        width={816}
        height={816}
        priority
        className="h-auto w-[170px] drop-shadow-[0_10px_20px_rgba(72,81,99,0.12)] sm:w-[205px]"
      />

      <div className="-mt-2 mb-5 rounded-xl border border-white/90 bg-white/85 px-8 py-2.5 text-center shadow-[0_8px_20px_rgba(70,91,105,0.16),0_2px_5px_rgba(70,91,105,0.16)] backdrop-blur-md sm:mb-6">
        <p className="mt-0.5 text-xl text-[#df947e]">Admin</p>
      </div>
    </>
  );
}
