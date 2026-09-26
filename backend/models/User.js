import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["owner", "member"],
      default: "owner",
    },

    company: {
      type: String,
      trim: true,
      default: "",
    },

    avatar: {
      type: String,
      trim: true,
      default: "",
    },

    plan: {
      type: String,
      enum: ["free", "starter", "growth", "business"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "canceled"],
      default: "trialing",
    },

    leadLimit: {
      type: Number,
      default: 50,
    },

    aiCallCount: {
      type: Number,
      default: 0,
    },

    lastPaymentId: {
      type: String,
      default: "",
    },

    lastBilledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);