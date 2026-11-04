import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const uploadDir = path.resolve(process.cwd(), "uploads", "bills");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, unique);
  },
});

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/pdf",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file format. Only clear JPG, PNG, WEBP images or PDF files are allowed."),
      false
    );
  }
};

export const uploadBill = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter,
});

// ---- Payment proof uploads (separate folder, same rules as bills) ----
const proofDir = path.resolve(process.cwd(), "uploads", "proofs");
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, proofDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Wraps multer so upload problems return a clear 400 instead of a generic 500
export const uploadProofFile = (req, res, next) => {
  uploadProof.single("file")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large. The maximum size is 5MB." : err.message;
    return res.status(400).json({ success: false, message, errors: [] });
  });
};

// Wraps the existing bill uploader so size / type problems return a clear 400 message
export const uploadBillFile = (req, res, next) => {
  uploadBill.single("file")(req, res, (err) => {
    if (!err) return next();
    let message = err.message;
    if (err.code === "LIMIT_FILE_SIZE") message = "File is too large. The maximum size is 5MB.";
    else if (err.code === "LIMIT_UNEXPECTED_FILE") message = "Unexpected upload field. Please attach a single bill file.";
    return res.status(400).json({ success: false, message, errors: [] });
  });
};