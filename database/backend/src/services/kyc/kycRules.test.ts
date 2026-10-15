import { describe, expect, it } from "vitest";
import { detectDocumentMime, evaluateRequirements, sanitizeFilename } from "./kycRules";
import { decryptBuffer, encryptBuffer } from "../../utils/crypto";

const doc = (document_type: string, side: string | null = null) => ({ document_type, side });

describe("KYC requirements", () => {
  it("accepts a passport photo page as the identity document", () => {
    const r = evaluateRequirements([doc("PASSPORT"), doc("PROOF_OF_ADDRESS"), doc("SELFIE")]);
    expect(r).toEqual({ identity: true, proofOfAddress: true, selfie: true, complete: true });
  });

  it("needs both sides of an ID card or driving licence", () => {
    expect(evaluateRequirements([doc("NATIONAL_ID", "FRONT")]).identity).toBe(false);
    expect(evaluateRequirements([doc("NATIONAL_ID", "FRONT"), doc("NATIONAL_ID", "BACK")]).identity).toBe(true);
    // Sides from different document types don't combine.
    expect(evaluateRequirements([doc("NATIONAL_ID", "FRONT"), doc("DRIVERS_LICENSE", "BACK")]).identity).toBe(false);
  });

  it("is incomplete until address and selfie are added", () => {
    const r = evaluateRequirements([doc("PASSPORT")]);
    expect(r.complete).toBe(false);
    expect(r.proofOfAddress).toBe(false);
    expect(r.selfie).toBe(false);
  });
});

describe("document file checks", () => {
  it("detects JPEG, PNG and PDF from the file bytes", () => {
    expect(detectDocumentMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe("image/jpeg");
    expect(detectDocumentMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toBe("image/png");
    expect(detectDocumentMime(Buffer.from("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("rejects other files whatever their name", () => {
    expect(detectDocumentMime(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectDocumentMime(Buffer.from("GIF89a"))).toBeNull();
    expect(detectDocumentMime(Buffer.alloc(0))).toBeNull();
  });

  it("strips paths and unsafe characters from filenames", () => {
    expect(sanitizeFilename("C:\\Users\\me\\passport.jpg")).toBe("passport.jpg");
    expect(sanitizeFilename("../../etc/pa\"ss<wd>.png")).toBe("passwd.png");
    expect(sanitizeFilename("   ")).toBe("document");
  });

  it("round-trips files through encryption and detects tampering", () => {
    const file = Buffer.from("%PDF-1.7 sensitive identity document");
    const sealed = encryptBuffer(file);
    expect(sealed.includes(file)).toBe(false);
    expect(decryptBuffer(sealed).equals(file)).toBe(true);
    sealed[sealed.length - 1] ^= 0xff;
    expect(() => decryptBuffer(sealed)).toThrow();
  });
});
