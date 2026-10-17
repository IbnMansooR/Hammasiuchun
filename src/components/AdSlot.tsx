import { getActiveAd, type Placement } from "@/lib/ads";
import AdBox from "./AdBox";

/** Renders the banner for a slot, or nothing at all (no empty box, no layout shift) when none is live. */
export default async function AdSlot({ placement }: { placement: Placement }) {
  const ad = await getActiveAd(placement);
  if (!ad) return null;
  return (
    <div className="container ad-slot">
      <AdBox ad={ad} />
    </div>
  );
}
