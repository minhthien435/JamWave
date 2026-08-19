-- Nâng cấp bảo mật auth: email verification + Google login
ALTER TABLE "User"
  ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verificationToken" TEXT,
  ADD COLUMN "verificationTokenExpires" TIMESTAMP(3),
  ADD COLUMN "googleId" TEXT,
  ADD COLUMN "avatarUrl" TEXT;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");