import React, { useCallback, useState } from 'react';
import { ImageProcessor } from '../../utils/imageProcessor';

interface ImageUploaderProps {
  onImageUpload: (imageData: string, fileName: string) => void;
  multiple?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUpload, 
  multiple = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = useCallback(async (files: FileList) => {
    setIsProcessing(true);
    
    try {
      const fileArray = Array.from(files);
      
      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          console.error(`File ${file.name} is not an image`);
          continue;
        }
        
        try {
          const processedImage = await ImageProcessor.processHighResImage(file);
          onImageUpload(processedImage, file.name);
          
          if (!multiple) break;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [onImageUpload, multiple]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div
      className={`upload-area relative ${isDragging ? 'border-indigo-500 bg-indigo-50' : ''} ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        
        <div>
          <p className="text-lg font-medium text-gray-700">
            {isProcessing ? 'Processing...' : 'Drop your character artwork here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to browse (supports high-res images up to 14"×14" @ 300dpi)
          </p>
        </div>
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-sm text-gray-600">Processing high-resolution image...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};