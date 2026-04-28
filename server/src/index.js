const fs = require("fs");
const app = require("./app");
const { UPLOAD_DIR, OUTPUT_DIR } = require("./config/constants");
const { startCleanupTask } = require("./utils/cleanup");

const PORT = process.env.PORT || 5000;

function ensureDirectories() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

ensureDirectories();
startCleanupTask();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
