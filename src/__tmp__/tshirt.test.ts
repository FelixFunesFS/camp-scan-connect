import { vi, describe, it } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { TShirtService } from "@/services/tshirtService";
const S: any = TShirtService;
describe("parse", () => {
  it("keys", () => {
    for (const k of ["merchandise.tshirt.womensFittedVneckXlarge","merchandise.tshirt.unisexCrewNeck2x","merchandise.tshirt.unisexCrewNeck3x","merchandise.tshirt.womensFittedVneck4x","merchandise.tshirt.unisexCrewNeckLarge"]) {
      console.log(k, "| human:", S.humanizeFieldName(k), "| isProduct:", S.isTShirtProduct(k), "| parsed:", JSON.stringify(S.parseTShirtProduct(k)));
    }
  });
});
