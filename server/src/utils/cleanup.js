const fs = require("fs/promises");
const { CLEANUP_INTERVAL_MS } = require("../config/constants");
const { getAllJobs, removeJob } = require("../services/jobStore");

async function deleteIfExists(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Cleanup failed for ${filePath}:`, error.message);
    }
  }
}

function startCleanupTask() {
  setInterval(async () => {
    const now = Date.now();
    const jobs = getAllJobs();

    for (const job of jobs) {
      if (job.expiresAt <= now) {
        await deleteIfExists(job.inputPath);
        await deleteIfExists(job.outputPath);
        removeJob(job.id);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

module.exports = {
  startCleanupTask,
  deleteIfExists
};
