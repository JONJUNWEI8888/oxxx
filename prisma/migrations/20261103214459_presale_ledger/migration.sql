-- CreateTable
CREATE TABLE "presale_indexer_state" (
    "id" TEXT NOT NULL,
    "start_block" INTEGER NOT NULL,
    "last_scanned_block" INTEGER NOT NULL,
    "last_scanned_hash" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3),
    "lock_owner" TEXT,
    "lock_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presale_indexer_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presale_checkpoints" (
    "block_number" INTEGER NOT NULL,
    "block_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presale_checkpoints_pkey" PRIMARY KEY ("block_number")
);

-- CreateTable
CREATE TABLE "presale_contributions" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "amount_raw" DECIMAL(78,0) NOT NULL,
    "block_number" INTEGER NOT NULL,
    "block_hash" TEXT NOT NULL,
    "block_time" TIMESTAMP(3) NOT NULL,
    "confirmations" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presale_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presale_reconciliations" (
    "id" TEXT NOT NULL,
    "ledger_raw" DECIMAL(78,0) NOT NULL,
    "opening_raw" DECIMAL(78,0) NOT NULL,
    "closing_raw" DECIMAL(78,0) NOT NULL,
    "chain_delta_raw" DECIMAL(78,0) NOT NULL,
    "diff_raw" DECIMAL(78,0) NOT NULL,
    "matched" BOOLEAN NOT NULL,
    "block_number" INTEGER NOT NULL,
    "detail" TEXT,
    "alerted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presale_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presale_contributions_from_address_idx" ON "presale_contributions"("from_address");

-- CreateIndex
CREATE INDEX "presale_contributions_block_number_idx" ON "presale_contributions"("block_number");

-- CreateIndex
CREATE INDEX "presale_contributions_tx_hash_idx" ON "presale_contributions"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "presale_contribution_tx_log" ON "presale_contributions"("tx_hash", "log_index");

-- CreateIndex
CREATE INDEX "presale_reconciliations_created_at_idx" ON "presale_reconciliations"("created_at");
