import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ExtractReceiptDto {
  /**
   * Imagen del ticket en base64 (JPEG o PNG).
   * Limitado a ~4 MB de base64 (≈3 MB en binario).
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000_000) // ~4 MB base64
  imageBase64!: string;
}
