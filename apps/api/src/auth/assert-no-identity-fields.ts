import { BadRequestException } from '@nestjs/common';

export function assertNoIdentityFields(body: object, fields: string[]): void {
  const submittedFields = fields.filter((field) => Object.prototype.hasOwnProperty.call(body, field));
  if (submittedFields.length > 0) {
    throw new BadRequestException(`Identity fields are server-managed: ${submittedFields.join(', ')}`);
  }
}
