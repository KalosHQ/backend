import { Injectable } from '@nestjs/common';
import { StorageProvider } from './storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;

  constructor(private readonly config: AppConfigService) {
    const providerName = this.config.getStorageProvider();
    switch (providerName) {
      case 's3':
      default:
        this.provider = new S3StorageProvider(this.config.getS3Bucket());
        break;
    }
  }

  async uploadFile(params: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
  }) {
    return this.provider.uploadFile(params);
  }
}
