const path = require("path");
const { randomUUID } = require("crypto");
const multer = require("multer");
const { MAX_BATCH_FILES, MAX_FILE_SIZE_BYTES, UPLOAD_DIR } = require("../config/constants");
const { isAllowedInputFile } = require("../utils/fileValidation");

function normalizeOriginalName(fileName = "") {
  // Some browsers send UTF-8 names that arrive as latin1-decoded mojibake in multipart parsing.
  const looksMojibake = /(?:Ã.|â.|à¦|à§)/.test(fileName);

  if (!looksMojibake) {
    return fileName;
  }

  try {
    return Buffer.from(fileName, "latin1").toString("utf8");
  } catch (_error) {
    return fileName;
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const normalizedName = normalizeOriginalName(file.originalname);
    const extension = path.extname(normalizedName).toLowerCase();
    const baseName = path.basename(normalizedName, extension).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${baseName}_${randomUUID()}${extension}`);
  }
});

function fileFilter(_req, file, cb) {
  file.originalname = normalizeOriginalName(file.originalname);

  if (!isAllowedInputFile(file.originalname)) {
    return cb(new Error("Unsupported file type."));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_BATCH_FILES
  }
});

module.exports = upload;
