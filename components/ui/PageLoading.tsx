import { SkeletonPage } from "@/components/ui/Skeleton";

/** Universal `loading.tsx` fallback for every authenticated page. Renders a
 *  page-shaped skeleton (header + stat tiles + list) so navigation never lands
 *  on an empty viewport while server components fetch data. */
export default function PageLoading() {
  return <SkeletonPage stats={4} rows={6} />;
}
