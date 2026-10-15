import { Router } from "express";
import { adminAuthRouter } from "./auth.routes";
import { adminDashboardRouter } from "./dashboard.routes";
import { adminUsersRouter } from "./users.routes";
import { adminInstrumentsRouter } from "./instruments.routes";
import { adminWithdrawalsRouter } from "./withdrawals.routes";
import { adminKycRouter } from "./kyc.routes";

export function adminRouter() {
  const router = Router();
  router.use("/auth", adminAuthRouter());
  router.use("/dashboard", adminDashboardRouter());
  router.use("/users", adminUsersRouter());
  router.use("/instruments", adminInstrumentsRouter());
  router.use("/withdrawals", adminWithdrawalsRouter());
  router.use("/kyc", adminKycRouter());
  return router;
}
