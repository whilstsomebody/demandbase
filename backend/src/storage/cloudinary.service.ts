import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /** Item photos: public, unauthenticated delivery. */
  async uploadPublicImage(filePath: string, folder = 'item-photos'): Promise<UploadApiResponse> {
    return cloudinary.uploader.upload(filePath, { folder, resource_type: 'image' });
  }

  /** Item photos uploaded from a multipart request (in-memory buffer). */
  uploadPublicImageBuffer(buffer: Buffer, folder = 'item-photos'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  /**
   * Digital item files (notes/study guides, PDFs included): private delivery, uploaded as
   * `resource_type: 'image'` specifically so a signed URL can later request a given PDF page
   * as an image AND apply a watermark overlay - raw-file delivery supports neither.
   */
  uploadPrivateImageBuffer(buffer: Buffer, folder = 'item-files'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', type: 'authenticated' },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  /**
   * Short-lived, per-viewer-watermarked, token-signed URL for a privately-stored digital file.
   * Requires "Strict transformations" + a configured token-auth key on the Cloudinary account -
   * the URL shape is correct per Cloudinary's documented token-auth API, but cannot be exercised
   * against a live account without real credentials.
   */
  getWatermarkedAccessUrl(params: {
    publicId: string;
    watermarkText: string;
    page?: number;
    expiresInSeconds?: number;
  }): string {
    const { publicId, watermarkText, page = 1, expiresInSeconds = 600 } = params;

    return cloudinary.url(publicId, {
      type: 'authenticated',
      resource_type: 'image',
      sign_url: true,
      auth_token: { duration: expiresInSeconds },
      page,
      transformation: [
        {
          overlay: {
            font_family: 'Arial',
            font_size: 24,
            text: encodeURIComponent(watermarkText),
          },
          gravity: 'south_east',
          x: 10,
          y: 10,
          opacity: 60,
          color: 'white',
        },
      ],
    });
  }
}
