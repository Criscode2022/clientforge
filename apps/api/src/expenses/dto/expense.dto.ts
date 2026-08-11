import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExpenseDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(2)
  description!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  projectId?: string | null;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}
