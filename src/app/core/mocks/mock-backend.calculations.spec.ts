import { calculateSessionMetrics, SessionInput } from '@app/core/mocks/mock-backend.calculations';

describe('calculateSessionMetrics', () => {
  const now = new Date('2026-01-10T12:00:00.000Z');

  it('calculates durations and totals for a finished session with both breasts', () => {
    const input: SessionInput = {
      startTime: '2026-01-10T08:00:00.000Z',
      endTime: '2026-01-10T08:20:00.000Z',
      segments: [
        { breast: 'right', startTime: '2026-01-10T08:00:00.000Z', endTime: '2026-01-10T08:12:00.000Z' },
        { breast: 'left', startTime: '2026-01-10T08:12:00.000Z', endTime: '2026-01-10T08:20:00.000Z' },
      ],
    };

    const metrics = calculateSessionMetrics(input, now);

    expect(metrics.status).toBe('finished');
    expect(metrics.segmentDurationsSeconds).toEqual([720, 480]);
    expect(metrics.rightBreastDurationSeconds).toBe(720);
    expect(metrics.leftBreastDurationSeconds).toBe(480);
    expect(metrics.totalDurationSeconds).toBe(1200);
    expect(metrics.firstBreast).toBe('right');
  });

  it('determines the first breast by startTime, not by array order', () => {
    const input: SessionInput = {
      startTime: '2026-01-10T08:00:00.000Z',
      endTime: '2026-01-10T08:20:00.000Z',
      segments: [
        { breast: 'left', startTime: '2026-01-10T08:10:00.000Z', endTime: '2026-01-10T08:20:00.000Z' },
        { breast: 'right', startTime: '2026-01-10T08:00:00.000Z', endTime: '2026-01-10T08:10:00.000Z' },
      ],
    };

    expect(calculateSessionMetrics(input, now).firstBreast).toBe('right');
  });

  it('accumulates several segments on the same breast', () => {
    const input: SessionInput = {
      startTime: '2026-01-10T08:00:00.000Z',
      endTime: '2026-01-10T08:30:00.000Z',
      segments: [
        { breast: 'left', startTime: '2026-01-10T08:00:00.000Z', endTime: '2026-01-10T08:10:00.000Z' },
        { breast: 'right', startTime: '2026-01-10T08:10:00.000Z', endTime: '2026-01-10T08:20:00.000Z' },
        { breast: 'left', startTime: '2026-01-10T08:20:00.000Z', endTime: '2026-01-10T08:30:00.000Z' },
      ],
    };

    const metrics = calculateSessionMetrics(input, now);

    expect(metrics.leftBreastDurationSeconds).toBe(1200);
    expect(metrics.rightBreastDurationSeconds).toBe(600);
    expect(metrics.totalDurationSeconds).toBe(1800);
  });

  it('closes open segments with the session endTime when the session is finished', () => {
    const input: SessionInput = {
      startTime: '2026-01-10T08:00:00.000Z',
      endTime: '2026-01-10T08:15:00.000Z',
      segments: [{ breast: 'left', startTime: '2026-01-10T08:00:00.000Z', endTime: null }],
    };

    const metrics = calculateSessionMetrics(input, now);

    expect(metrics.segments[0].endTime).toBe('2026-01-10T08:15:00.000Z');
    expect(metrics.leftBreastDurationSeconds).toBe(900);
  });

  it('marks the session as in progress and measures open segments up to now', () => {
    const input: SessionInput = {
      startTime: '2026-01-10T11:50:00.000Z',
      endTime: null,
      segments: [
        { breast: 'left', startTime: '2026-01-10T11:50:00.000Z', endTime: '2026-01-10T11:55:00.000Z' },
        { breast: 'right', startTime: '2026-01-10T11:55:00.000Z', endTime: null },
      ],
    };

    const metrics = calculateSessionMetrics(input, now);

    expect(metrics.status).toBe('in_progress');
    expect(metrics.segments[1].endTime).toBeNull();
    expect(metrics.leftBreastDurationSeconds).toBe(300);
    expect(metrics.rightBreastDurationSeconds).toBe(300);
    expect(metrics.totalDurationSeconds).toBe(600);
  });

  it('returns null firstBreast and falls back to the session span when there are no segments', () => {
    const input: SessionInput = {
      startTime: '2026-01-10T08:00:00.000Z',
      endTime: '2026-01-10T08:10:00.000Z',
      segments: [],
    };

    const metrics = calculateSessionMetrics(input, now);

    expect(metrics.firstBreast).toBeNull();
    expect(metrics.leftBreastDurationSeconds).toBe(0);
    expect(metrics.rightBreastDurationSeconds).toBe(0);
    expect(metrics.totalDurationSeconds).toBe(600);
  });
});
