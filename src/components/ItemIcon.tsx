import type { ItemId } from "../game/types";
import key from "../assets/equipment/cell_key.webp";
import screwdriver from "../assets/equipment/screwdriver.webp";
import spoon from "../assets/equipment/spoon.webp";
import crowbar from "../assets/equipment/heavy_crowbar.webp";
import pistol from "../assets/equipment/dart_pistol.webp";
import pistol10 from "../assets/equipment/pistol_10mm.webp";
import pipe from "../assets/equipment/pipe.webp";
import lockpick from "../assets/equipment/lockpick.webp";
import stethoscope from "../assets/equipment/stethoscope.webp";
import wool from "../assets/equipment/steel_wool.webp";
import washer from "../assets/equipment/rubber_washer.webp";
import silencer from "../assets/equipment/silencer.webp";
import { FileText } from "lucide-react";
const icons: Partial<Record<ItemId, string>> = {
  pistol_10mm: pistol10,
  cell_key: key,
  small_key: key,
  master_key_c: key,
  screwdriver,
  spoon,
  heavy_crowbar: crowbar,
  dart_pistol: pistol,
  pipe,
  lockpick,
  stethoscope,
  steel_wool: wool,
  rubber_washer: washer,
  silencer,
};
export function ItemIcon({ id }: { id: ItemId }) {
  return icons[id] ? (
    <img src={icons[id]} alt="" draggable={false} />
  ) : (
    <FileText aria-hidden="true" />
  );
}
