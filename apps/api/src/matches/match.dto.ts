import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MatchModeInput {
  PASS_AND_PLAY = 'PASS_AND_PLAY',
  VS_COMPUTER = 'VS_COMPUTER',
  PING_PONG = 'PING_PONG',
  REAL_TIME = 'REAL_TIME',
}

export enum MatchJoinPolicyInput {
  OPEN = 'OPEN',
  INVITE_ONLY = 'INVITE_ONLY',
}

export class CreateMatchDto {
  @IsString()
  gameVersionId!: string;

  @IsEnum(MatchModeInput)
  mode!: MatchModeInput;

  @IsOptional()
  @IsEnum(MatchJoinPolicyInput)
  joinPolicy?: MatchJoinPolicyInput;
}
