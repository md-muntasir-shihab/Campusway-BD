import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    // Legacy exam routes read from the shared users collection.
    // The canonical User model owns index management for that collection.
    userId: { type: String, trim: true, index: { unique: true, sparse: true } },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "admin", "moderator", "editor", "chairman"], default: "student" },
    fullName: String,
    avatarUrl: String,
    phone: String,
    email: String,
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    guardianPhone: String,
    address: String,
    sscBatch: String,
    hscBatch: String,
    department: String,
    collegeName: String,
    collegeAddress: String,
    dateOfBirth: Date,
    profileScore: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    autoIndex: false,
    autoCreate: false,
  }
);

export const UserModel = model("users", userSchema);
