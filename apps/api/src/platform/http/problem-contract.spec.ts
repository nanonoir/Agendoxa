import { problemSchema } from '@agendoxa/shared';

const base = {
  type: 'urn:agendoxa:problem:conflict',
  title: 'The current state prevents the operation',
  status: 409,
  code: 'conflict',
  requestId: 'req_01JC8Q2W7N4',
};
const lateChange = {
  noticeMinutes: 90,
  startAt: '2026-11-20T15:00:00Z',
  depositRefundPolicy: 'NO_MONEY_BACK',
};
const allocationLimit = {
  index: 0,
  chargeBalance: '4000.00',
  availableFunds: '7000.00',
};

describe('problemSchema (CON-02 Problem)', () => {
  it('accepts a basic problem and one with every base field', () => {
    expect(problemSchema.safeParse(base).success).toBe(true);
    expect(
      problemSchema.safeParse({
        ...base,
        reason: 'stale_revision',
        detail: 'Reload and retry.',
        errors: [{ path: '/slug', message: 'Invalid' }],
      }).success,
    ).toBe(true);
  });

  it('accepts lateChange, with and without a refund policy', () => {
    const problem = {
      ...base,
      status: 422,
      code: 'rule_violation',
      reason: 'late_change_requires_acceptance',
    };

    expect(problemSchema.safeParse({ ...problem, lateChange }).success).toBe(
      true,
    );
    expect(
      problemSchema.safeParse({
        ...problem,
        lateChange: { ...lateChange, depositRefundPolicy: null },
      }).success,
    ).toBe(true);
  });

  it('accepts currentRevision from zero', () => {
    expect(
      problemSchema.safeParse({ ...base, currentRevision: 0 }).success,
    ).toBe(true);
    expect(
      problemSchema.safeParse({ ...base, currentRevision: 15 }).success,
    ).toBe(true);
  });

  it('accepts allocationLimit', () => {
    expect(
      problemSchema.safeParse({
        ...base,
        status: 422,
        code: 'rule_violation',
        reason: 'allocation_exceeds_charge_balance',
        allocationLimit,
      }).success,
    ).toBe(true);
  });

  it.each([
    ['an undeclared field', { ...base, extra: true }],
    ['status below 400', { ...base, status: 399 }],
    ['status above 599', { ...base, status: 600 }],
    ['a non-integer status', { ...base, status: 409.5 }],
    ['a reason that is not snake_case', { ...base, reason: 'Stale-Revision' }],
    ['a code outside the enum', { ...base, code: 'rate_limited' }],
    ['a missing requestId', { ...base, requestId: undefined }],
    ['a negative currentRevision', { ...base, currentRevision: -1 }],
    ['a fractional currentRevision', { ...base, currentRevision: 1.5 }],
    [
      'an extra field in an error item',
      { ...base, errors: [{ path: '/a', message: 'm', extra: 1 }] },
    ],
    [
      'an extra field in lateChange',
      { ...base, lateChange: { ...lateChange, extra: 1 } },
    ],
    [
      'a negative noticeMinutes',
      { ...base, lateChange: { ...lateChange, noticeMinutes: -1 } },
    ],
    [
      'a startAt without the Z suffix',
      {
        ...base,
        lateChange: { ...lateChange, startAt: '2026-11-20T15:00:00-03:00' },
      },
    ],
    [
      'an unknown depositRefundPolicy',
      {
        ...base,
        lateChange: { ...lateChange, depositRefundPolicy: 'SOMETIMES' },
      },
    ],
    [
      'a missing depositRefundPolicy',
      {
        ...base,
        lateChange: {
          noticeMinutes: lateChange.noticeMinutes,
          startAt: lateChange.startAt,
        },
      },
    ],
    [
      'a negative allocationLimit index',
      { ...base, allocationLimit: { ...allocationLimit, index: -1 } },
    ],
    [
      'an allocationLimit amount that is not Money',
      { ...base, allocationLimit: { ...allocationLimit, chargeBalance: '1' } },
    ],
  ])('rejects %s', (_name, value) => {
    expect(problemSchema.safeParse(value).success).toBe(false);
  });
});
