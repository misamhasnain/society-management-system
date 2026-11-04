import multer from "multer";

// Use memory storage everywhere — avoids ENOENT on Vercel's read-only filesystem.
// The actual file persistence (Blob or local) happens in the controller via blobUpload.js.
const storage = multer.memoryStorage();

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

const uploadBill = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
const uploadProof = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

// Wraps multer so upload problems return a clear 400 instead of a generic 500
export const uploadBillFile = (req, res, next) => {
  uploadBill.single("file")(req, res, (err) => {
    if (!err) return next();
    let message = err.message;
    if (err.code === "LIMIT_FILE_SIZE") message = "File is too large. The maximum size is 5MB.";
    else if (err.code === "LIMIT_UNEXPECTED_FILE") message = "Unexpected upload field. Please attach a single bill file.";
    return res.status(400).json({ success: false, message, errors: [] });
  });
};

export const uploadProofFile = (req, res, next) => {
  uploadProof.single("file")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large. The maximum size is 5MB." : err.message;
    return res.status(400).json({ success: false, message, errors: [] });
  });
};
