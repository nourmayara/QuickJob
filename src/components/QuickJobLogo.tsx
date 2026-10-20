import Image from "next/image";

type QuickJobLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function QuickJobLogo({ className = "", priority = false }: QuickJobLogoProps) {
  return <Image
    src="/images/quickjob-logo.png"
    alt="QuickJob"
    width={1944}
    height={809}
    priority={priority}
    className={`quickjob-logo ${className}`.trim()}
  />;
}
