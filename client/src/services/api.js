import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
});

export async function startConversion({ file, outputType, outputFormat, quality }) {
  const formData = new FormData();
  const files = Array.isArray(file) ? file : [file];
  files.forEach((item) => {
    formData.append("media", item);
  });
  formData.append("outputType", outputType);
  formData.append("outputFormat", outputFormat);
  formData.append("quality", quality);

  const response = await api.post("/api/convert", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
}

export async function getJobStatus(jobId) {
  const response = await api.get(`/api/jobs/${jobId}`);
  return response.data;
}

export async function downloadFile(jobId, fileName) {
  const response = await api.get(`/api/download/${jobId}`, {
    responseType: "blob"
  });

  const url = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || `converted_${jobId}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
