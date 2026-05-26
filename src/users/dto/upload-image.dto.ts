import { IsString, IsNotEmpty, IsBase64, Matches } from 'class-validator';

export class UploadImageDto {
  @IsString({ message: 'base64Image debe ser un string' })
  @IsNotEmpty({ message: 'base64Image es requerido' })
  @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,/)
  image!: string;
}
