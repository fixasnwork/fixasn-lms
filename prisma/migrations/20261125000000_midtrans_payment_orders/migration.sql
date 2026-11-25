CREATE TABLE "paymentOrders" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packageId" INTEGER NOT NULL,
  "packageName" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "adminFee" INTEGER NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "accessDurationMonths" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'creating',
  "transactionId" TEXT,
  "snapToken" TEXT,
  "snapRedirectUrl" TEXT,
  "paymentId" UUID,
  "paidAt" TIMESTAMPTZ(6),
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "lastSyncedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "paymentOrders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "paymentOrders_amount_check" CHECK ("amount" > 0 AND "adminFee" >= 0 AND "totalAmount" = "amount" + "adminFee" AND "accessDurationMonths" > 0),
  CONSTRAINT "paymentOrders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("email") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "paymentOrders_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "paymentOrders_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "paymentOrders_orderId_key" ON "paymentOrders"("orderId");
CREATE UNIQUE INDEX "paymentOrders_paymentId_key" ON "paymentOrders"("paymentId");
CREATE INDEX "paymentOrders_userId_packageId_status_idx" ON "paymentOrders"("userId", "packageId", "status");
CREATE INDEX "paymentOrders_userId_createdAt_idx" ON "paymentOrders"("userId", "createdAt");
CREATE INDEX "paymentOrders_createdAt_idx" ON "paymentOrders"("createdAt");
CREATE INDEX "paymentOrders_packageId_idx" ON "paymentOrders"("packageId");
