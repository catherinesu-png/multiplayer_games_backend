import { IsInt, IsNotEmpty, IsObject, IsString, Min } from 'class-validator';

export class SubmitMoveDto {
  @IsString()
  @IsNotEmpty()
  clientMoveId!: string;

  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsObject()
  move!: Record<string, unknown>;
}
