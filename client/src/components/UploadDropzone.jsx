import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

const accepted = {
  "video/*": [".mp4", ".avi", ".mov", ".mkv", ".webm"],
  "audio/*": [".mp3", ".wav", ".aac", ".flac", ".m4a"]
};

export default function UploadDropzone({ onFileSelected, disabled }) {
  const onDrop = useCallback(
    (files) => {
      if (!files || files.length === 0) {
        return;
      }
      onFileSelected(files);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled,
    accept: accepted
  });

  return (
    <div
      {...getRootProps({
        className: `dropzone ${isDragActive ? "dropzone-active" : ""} ${disabled ? "dropzone-disabled" : ""}`
      })}
    >
      <input {...getInputProps()} />
      <p className="dropzone-title">Drop one or more media files here</p>
      <p className="dropzone-subtitle">or click to browse MP4, AVI, MOV, MKV, WEBM, MP3, WAV, AAC, FLAC, M4A</p>
    </div>
  );
}
