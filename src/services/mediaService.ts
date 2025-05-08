import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Types of media supported
export type MediaType = 'image' | 'gif' | 'audio';

export const uploadMedia = async (
  file: File, 
  mediaType: MediaType,
  userId: string
): Promise<string | null> => {
  try {
    // Validate file type
    if (!validateFileType(file, mediaType)) {
      throw new Error(`Invalid file type for ${mediaType} upload`);
    }
    
    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${uuidv4()}.${fileExt}`;
    const filePath = `${mediaType}s/${fileName}`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase
      .storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('media')
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
};

// Helper function to validate file types
const validateFileType = (file: File, mediaType: MediaType): boolean => {
  const validTypes: Record<MediaType, string[]> = {
    'image': ['image/jpeg', 'image/png', 'image/webp'],
    'gif': ['image/gif'],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg']
  };
  
  return validTypes[mediaType].includes(file.type);
};

// Helper function to get file size in MB
export const getFileSizeInMB = (file: File): number => {
  return file.size / (1024 * 1024);
};

// Helper function to check if file is too large (10MB limit)
export const isFileTooLarge = (file: File): boolean => {
  return getFileSizeInMB(file) > 10;
};
