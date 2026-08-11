import { describe, it } from "vitest";
import { TShirtService } from "@/services/tshirtService";
const S: any = TShirtService;
describe("parse", () => {
  it("samples", () => {
    const samples: Record<string,string>[] = [
      {"merchandise.tshirt":"1","merchandise.tshirt.womensFittedVneckXlarge":"1"},
      {"merchandise.tshirt":"1","merchandise.tshirt.unisexCrewNeck2x":"1"},
      {"merchandise.tshirt":"2","merchandise.tshirt.med":"1","merchandise.tshirt.unisexCrewNeckLarge":"1"},
      {"volunteerShirt":"1","volunteerShirt.unisexMed":"1","volunteerShirt.unisexMed.variant":"Unisex Med"},
      {"merchandise.tshirt":"1","merchandise.tshirt.unisexCrewNeck3x":"1"},
      {"merchandise.tshirt":"1","merchandise.tshirt.womensFittedVneck4x":"1"},
    ];
    for (const s of samples) console.log(JSON.stringify(s), "=>", JSON.stringify(S.extractTShirtDetails(s)));
  });
});
