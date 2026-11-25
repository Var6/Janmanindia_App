/** A picture on a dashboard or report, with an optional caption. The file
 *  is one uploaded through the app. */
export default function ImageTile({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure className="h-full flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={caption ?? ""} className="w-full flex-1 min-h-0 object-contain rounded-lg" style={{ maxHeight: 520 }} />
      {caption && <figcaption className="text-xs text-(--muted)">{caption}</figcaption>}
    </figure>
  );
}
