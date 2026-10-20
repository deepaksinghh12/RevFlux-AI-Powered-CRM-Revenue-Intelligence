import mongoose from "mongoose";
import crypto from "crypto";

const microsoftAuthCodeSchema = new mongoose.Schema(
  {
    codeHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenVersion: {
      type: Number,
      required: true,
      default: 0,
    },
    consumed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index: automatically deletes document after expiresAt
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Creates a new single-use authorization exchange code valid for 60 seconds.
 * Stores only a SHA-256 hash of the code to prevent raw code exposure.
 */
microsoftAuthCodeSchema.statics.createCode = async function ({ userId, tokenVersion = 0 }) {
  const rawCode = crypto.randomBytes(32).toString("hex");
  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds TTL

  await this.create({
    codeHash,
    user: userId,
    tokenVersion,
    consumed: false,
    expiresAt,
  });

  return rawCode;
};

/**
 * Atomically consumes an authorization exchange code.
 * Ensures the code is single-use, unexpired, and not replayed across multiple server instances.
 */
microsoftAuthCodeSchema.statics.consumeCode = async function (rawCode) {
  if (!rawCode || typeof rawCode !== "string") return null;

  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
  const now = new Date();

  // findOneAndUpdate with consumed: false provides atomic lock-and-consume semantics in MongoDB
  const record = await this.findOneAndUpdate(
    {
      codeHash,
      consumed: false,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        consumed: true,
        consumedAt: now,
      },
    },
    {
      new: false, // returns the document state prior to update
    }
  );

  return record;
};

export default mongoose.model("MicrosoftAuthCode", microsoftAuthCodeSchema);
