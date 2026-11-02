import Image from "next/image";
import logo from "../../public/images/quickjob-logo-v2.png";
import styles from "./QuickJobLogo.module.css";

type QuickJobLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function QuickJobLogo({ className = "", priority = false }: QuickJobLogoProps) {
  return <Image
    src={logo}
    alt="QuickJob"
    priority={priority}
    sizes="(max-width: 700px) 132px, 190px"
    style={{ objectFit: "contain", maxWidth: "100%", filter: "none", background: "transparent" }}
    className={`${styles.logo} quickjob-logo ${className}`.trim()}
  />;
}
