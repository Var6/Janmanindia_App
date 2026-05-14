import JanSahayak from "@/components/jan-sahayak/JanSahayak";

/** Public citizen-facing legal aid app. No auth — intentionally open so
 *  anyone in Bihar can self-serve schemes, rights, helplines, intake. */
export const metadata = {
  title: "Jan Sahayak — Your Legal Companion | Janman People's Foundation",
  description: "Free legal help, government schemes, and rights for citizens in Bihar.",
};

export default function Page() {
  return <JanSahayak />;
}
