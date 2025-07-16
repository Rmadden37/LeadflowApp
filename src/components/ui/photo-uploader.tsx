"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImagePlus, X, Upload, AlertCircle, Check } from 'lucide-react';
import { usePhotoUpload } from '@/hooks/use-photo-upload';

interface PhotoUploaderProps {
  onPhotosChange?: (urls: string[]) => void;
  maxPhotos?: number;
  folder?: string;
  label?: string;
  className?: string;
}

export function PhotoUploader({ 
  onPhotosChange, 
  maxPhotos = 5, 
  folder = 'leads',
  label = 'Photos',
  className = ''
}: PhotoUploaderProps) {
  const {
    photos,
    isUploading,
    addPhotos,
    removePhoto,
    uploadAllPhotos,
    canAddMore,
    hasPhotos
  } = usePhotoUpload(maxPhotos);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      addPhotos(files);
    }
    // Reset input
    event.target.value = '';
  };

  const handleUploadAll = async () => {
    try {
      const urls = await uploadAllPhotos(folder);
      onPhotosChange?.(urls);
    } catch (error) {
      console.error('Failed to upload photos:', error);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Label className="form-label">{label} (up to {maxPhotos})</Label>
      
      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square">
            <img
              src={photo.preview}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg border border-white/20"
            />
            
            {/* Upload Status Overlay */}
            {photo.uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Upload className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            
            {/* Error Overlay */}
            {photo.error && (
              <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center rounded-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            )}
            
            {/* Remove Button */}
            <button
              type="button"
              onClick={() => removePhoto(photo.id)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Upload Status Indicator */}
            {photo.uploaded && (
              <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        
        {/* Add Photo Button */}
        {canAddMore && (
          <label className="aspect-square border-2 border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#007AFF] hover:bg-white/5 transition-all">
            <ImagePlus className="w-8 h-8 text-white/60 mb-2" />
            <span className="text-sm text-white/60">Add Photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>
        )}
      </div>
      
      {/* Photo Counter and Upload Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          {photos.length} of {maxPhotos} photos selected
        </p>
        
        {hasPhotos && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadAll}
            disabled={isUploading}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            {isUploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload All'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
