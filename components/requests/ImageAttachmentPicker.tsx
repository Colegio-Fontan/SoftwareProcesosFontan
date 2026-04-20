'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  ACCEPTED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_MB,
} from '@/lib/storage';

interface ImageAttachmentPickerProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFileSizeMB?: number;
  label?: string;
}

const ACCEPTED_TYPES = ACCEPTED_ATTACHMENT_MIME_TYPES;

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx';

export const ImageAttachmentPicker: React.FC<ImageAttachmentPickerProps> = ({
  files,
  onFilesChange,
  maxFileSizeMB = MAX_ATTACHMENT_MB,
  label = 'Adjuntar imágenes o documentos (Opcional)',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateAndAddFiles = useCallback((newFiles: FileList | File[]) => {
    setError('');
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    const validFiles: File[] = [];

    for (const file of Array.from(newFiles)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" no es un formato válido. Usa JPG, PNG, GIF, WebP, PDF o DOCX.`);
        continue;
      }
      if (file.size > maxBytes) {
        setError(`"${file.name}" excede el límite de ${maxFileSizeMB}MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, maxFileSizeMB, onFilesChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      validateAndAddFiles(e.target.files);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all group
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-300 hover:border-primary hover:bg-primary/5'
          }
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept={ACCEPTED_EXTENSIONS}
        />
        <div className="flex flex-col items-center gap-1.5">
          <span className={`text-3xl transition-transform ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}>
            📷
          </span>
          <p className="text-sm text-gray-500 group-hover:text-primary font-medium">
            {isDragging ? 'Suelta los archivos aquí' : 'Arrastra o haz clic para adjuntar'}
          </p>
          <p className="text-xs text-gray-400">
            JPG, PNG, GIF, WebP, PDF, DOCX — Máx. {maxFileSizeMB}MB por archivo
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
          ⚠️ {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="relative group/item bg-gray-50 border border-gray-200 rounded-xl overflow-hidden transition-shadow hover:shadow-md"
            >
              {isImage(file) ? (
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl">📄</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    {file.name.split('.').pop()}
                  </span>
                </div>
              )}
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/item:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                title="Quitar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
