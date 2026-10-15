export type InstrumentClass = "FOREX" | "CRYPTO";

export interface Quote {
  instrumentId: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  change24hPct: number | null;
  isIndicative: boolean;
  source: string;
  sourceTs: string;
}

export interface MarketRow {
  symbol: string;
  class: InstrumentClass;
  isExecutable: boolean;
  tradingEnabled: boolean;
  provider: string;
  contractSize: number;
  minVolume: number;
  maxVolume: number;
  volumeStep: number;
  maxLeverage: number;
  quote: Quote | null;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string | null;
  country: string | null;
  email_verified_at: string | null;
  created_at: string;
}

export type KycStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFORMATION_REQUIRED";
export type KycDocumentType = "PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE" | "PROOF_OF_ADDRESS" | "SELFIE";

export interface KycDocument {
  id: string;
  document_type: KycDocumentType;
  side: "FRONT" | "BACK" | null;
  original_filename: string;
  mime_type: string;
  size_bytes: number | null;
  uploaded_at: string;
}

export interface KycProfile {
  id: string;
  status: KycStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  documents: KycDocument[];
  requirements: { identity: boolean; proofOfAddress: boolean; selfie: boolean; complete: boolean };
  canEdit: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}
