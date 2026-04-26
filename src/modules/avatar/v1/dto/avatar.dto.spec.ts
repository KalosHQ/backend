import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AvatarBodyType,
  AvatarGender,
  AvatarExportFormat,
  GenerateAvatarDto,
} from './avatar.dto';

describe('GenerateAvatarDto', () => {
  it('accepts average, neutral, and default glb', async () => {
    const dto = plainToInstance(GenerateAvatarDto, {
      heightCm: 170,
      weightKg: 65,
      bodyType: AvatarBodyType.AVERAGE,
      gender: AvatarGender.NEUTRAL,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.exportFormat).toBe(AvatarExportFormat.GLB);
  });

  it('rejects invalid ranges and enum values', async () => {
    const dto = plainToInstance(GenerateAvatarDto, {
      heightCm: 99,
      weightKg: 301,
      bodyType: 'invalid',
      gender: 'invalid',
      exportFormat: 'fbx',
    });

    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining([
        'heightCm',
        'weightKg',
        'bodyType',
        'gender',
        'exportFormat',
      ]),
    );
  });
});
