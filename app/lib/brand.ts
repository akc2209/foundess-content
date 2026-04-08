import fs from "fs";
import path from "path";

let cached: any = null;
export function getBrand() {
  if (cached) return cached;
  const p = path.join(process.cwd(), "branding", "brand.json");
  cached = JSON.parse(fs.readFileSync(p, "utf8"));
  return cached;
}
