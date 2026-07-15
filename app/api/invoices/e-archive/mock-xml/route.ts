import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uuid = searchParams.get("uuid") || "demo-uuid-123";
  const invoiceNo = `GIB${new Date().getFullYear()}${Math.floor(100000000 + Math.random() * 900000000)}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <SignatureInformation>
          <ReferencedSignatureID>Signature_${invoiceNo}</ReferencedSignatureID>
          <ds:Signature Id="Signature_${invoiceNo}">
            <ds:SignedInfo>
              <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
              <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
              <ds:Reference URI="">
                <ds:Transforms>
                  <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
                </ds:Transforms>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>mK2bA1h/W2vXp4u1mK5G7H==</ds:DigestValue>
              </ds:Reference>
            </ds:SignedInfo>
            <ds:SignatureValue>Base64SignatureValueSampleString==</ds:SignatureValue>
          </ds:Signature>
        </SignatureInformation>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>EARSIVFATURA</cbc:ProfileID>
  <cbc:ID>${invoiceNo}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${new Date().toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:IssueTime>${new Date().toTimeString().slice(0, 8)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID SchemeID="VKN">8760054321</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID SchemeID="VKN">8760054321</cbc:ID>
      </cac:PartyIdentification>
    </cac:SignatoryParty>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>VibeGSM Iletisim Ltd. Sti.</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Cafaraga Mah. Muvakkithane Cad. No:12/A</cbc:StreetName>
        <cbc:CitySubdivisionName>Kadikoy</cbc:CitySubdivisionName>
        <cbc:CityName>Istanbul</cbc:CityName>
        <cbc:Country>
          <cbc:Name>Turkiye</cbc:Name>
        </cbc:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:Name>Kadikoy V.D.</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Demo Müşteri</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>Istanbul</cbc:CityName>
        <cbc:Country>
          <cbc:Name>Turkiye</cbc:Name>
        </cbc:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
</Invoice>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

