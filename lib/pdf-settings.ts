import { promises as fs } from "node:fs";
import path from "node:path";

export type PdfSettings = {
  template1DealerName: string;
  template1PartnerName: string;
  template2CompanyTradeName: string;
  template2CompanyTaxInfo: string;
  template2CompanyAddress: string;
  template2CompanyPhone: string;
  template2MaterialType: string;
};

const DEFAULT_SETTINGS: PdfSettings = {
  template1DealerName: "Merkez",
  template1PartnerName: "Is Ortagi",
  template2CompanyTradeName: "",
  template2CompanyTaxInfo: "/",
  template2CompanyAddress: "",
  template2CompanyPhone: "",
  template2MaterialType: "Cep Telefonu",
};

const SETTINGS_PATH = path.join(process.cwd(), "data", "pdf-settings.json");

export async function readPdfSettings(): Promise<PdfSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<PdfSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function writePdfSettings(input: PdfSettings) {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(input, null, 2), "utf8");
}
