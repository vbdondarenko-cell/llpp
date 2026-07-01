// Storage Module Exports
export { ImageCompressor, imageCompressor } from './image-compressor';
export type { CompressedImage, CompressionOptions } from './image-compressor';
export { SupabaseStorage, eventImagesStorage, EVENT_IMAGES_CONFIG } from './storage';
export type { StorageConfig, UploadResult, UploadProgress } from './storage';
export { EventImageUploader, eventImageUploader } from './event-image-upload';
export type { UploadState, UploadCallbacks } from './event-image-upload';
