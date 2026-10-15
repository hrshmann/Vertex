import { Router } from "express";
import { adminAuthRouter } from "./auth.routes";
import { adminDashboardRouter } from "./dashboard.routes";
import { adminUsersRouter } from "./users.routes";
import { adminKycRouter } from "./kyc.routes";

export function adminRouter() {
  const router = Router();
  router.use("/auth", adminAuthRouter());
  router.use("/dashboard", adminDashboardRouter());
  router.use("/users", adminUsersRouter());
  router.use("/kyc", adminKycRouter());
  return router;
}
