import { ApiError } from "../../middleware/errorHandler";
import { DemoTradingEngine } from "./demoEngine";

/** Resolves (and lazily creates) the caller's trading account for a given mode. DEMO only for now. */
export async function resolveAccountId(
  demoEngine: DemoTradingEngine,
  userId: string,
  mode: string
): Promise<string> {
  if (mode !== "DEMO") {
    throw new ApiError(
      400,
      "LIVE accounts require a connected, authorized broker/exchange — none is configured yet. Use mode=DEMO."
    );
  }
  return demoEngine.ensureDemoAccount(userId);
}
