-- CreateTable
CREATE TABLE "SmsHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recipients" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "msgType" TEXT NOT NULL,
    "requestNo" TEXT,
    "status" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
