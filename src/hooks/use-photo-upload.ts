"use client";

import { useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface PhotoUpload {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

export function usePhotoUpload(maxPhotos: number = 5) {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addPhotos = (files: FileList | File[]) => {
    const newPhotos: PhotoUpload[] = [];
    const remainingSlots = maxPhotos - photos.length;
    const fileArray = Array.from(files);

    for (let i = 0; i < Math.min(fileArray.length, remainingSlots); i++) {
      const file = fileArray[i];
      if (file.type.startsWith('image/')) {
        const photoUpload: PhotoUpload = {
          id: uuidv4(),
          file,
          preview: URL.createObjectURL(file),
          uploading: false,
          uploaded: false
        };
        newPhotos.push(photoUpload);
      }
    }

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo && photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const uploadPhoto = async (photo: PhotoUpload, folder: string = 'leads'): Promise<string> => {
    setPhotos(prev => prev.map(p => 
      p.id === photo.id ? { ...p, uploading: true, error: undefined } : p
    ));

    try {
      const fileName = `${folder}/${uuidv4()}-${photo.file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, photo.file);
      const downloadURL = await getDownloadURL(storageRef);

      setPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, uploading: false, uploaded: true, url: downloadURL }
          : p
      ));

      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      setPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, uploading: false, error: 'Upload failed' }
          : p
      ));
      throw error;
    }
  };

  const uploadAllPhotos = async (folder: string = 'leads'): Promise<string[]> => {
    setIsUploading(true);
    const photosToUpload = photos.filter(photo => !photo.uploaded);

    try {
      const uploadPromises = photosToUpload.map(photo => uploadPhoto(photo, folder));
      const newUrls = await Promise.all(uploadPromises);
      
      const existingUrls = photos
        .filter(photo => photo.uploaded && photo.url)
        .map(photo => photo.url!);
      
      setIsUploading(false);
      return [...existingUrls, ...newUrls];
    } catch (error) {
      setIsUploading(false);
      throw error;
    }
  };

  const clearPhotos = () => {
    photos.forEach(photo => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setPhotos([]);
  };

  return {
    photos,
    isUploading,
    addPhotos,
    removePhoto,
    uploadPhoto,
    uploadAllPhotos,
    clearPhotos,
    canAddMore: photos.length < maxPhotos,
    hasPhotos: photos.length > 0
  };
}