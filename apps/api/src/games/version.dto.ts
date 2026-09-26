import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateGameVersionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  engineKey!: string;

  @IsInt()
  @Min(1)
  engineVersion!: number;

  @IsObject()
  manifest!: Record<string, unknown>;

  @IsObject()
  capabilities!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  rulesArtifact?: string;

  @IsOptional()
  @IsString()
  uiArtifact?: string;

  @IsOptional()
  @IsString()
  assetArtifact?: string;
}