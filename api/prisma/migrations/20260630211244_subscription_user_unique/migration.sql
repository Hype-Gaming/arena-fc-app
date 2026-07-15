-- Enforce one subscription per user so plan webhooks can upsert by userId.
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
