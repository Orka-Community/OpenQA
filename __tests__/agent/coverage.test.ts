import { describe, it, expect } from 'vitest';
import { CoverageTracker } from '../../agent/coverage/index.js';

describe('CoverageTracker', () => {
  it('should start empty', () => {
    const tracker = new CoverageTracker();
    const report = tracker.getReport();
    expect(report.total).toBe(0);
    expect(report.coveragePercent).toBe(0);
  });

  it('should register and report untested routes', () => {
    const tracker = new CoverageTracker();
    tracker.registerRoute('GET', '/api/users');
    tracker.registerRoute('POST', '/api/users');

    const report = tracker.getReport();
    expect(report.total).toBe(2);
    expect(report.tested).toBe(0);
    expect(report.untested).toBe(2);
    expect(report.coveragePercent).toBe(0);
  });

  it('should mark a route as tested after recordTest', () => {
    const tracker = new CoverageTracker();
    tracker.registerRoute('GET', '/api/health');
    tracker.recordTest('GET', '/api/health');

    const report = tracker.getReport();
    expect(report.tested).toBe(1);
    expect(report.coveragePercent).toBe(100);
  });

  it('should auto-register unregistered routes on recordTest', () => {
    const tracker = new CoverageTracker();
    tracker.recordTest('POST', '/api/login');

    const report = tracker.getReport();
    expect(report.total).toBe(1);
    expect(report.tested).toBe(1);
  });

  it('should calculate coverage percent correctly', () => {
    const tracker = new CoverageTracker();
    tracker.registerRoute('GET', '/a');
    tracker.registerRoute('GET', '/b');
    tracker.registerRoute('GET', '/c');
    tracker.registerRoute('GET', '/d');
    tracker.recordTest('GET', '/a');
    tracker.recordTest('GET', '/b');

    const report = tracker.getReport();
    expect(report.coveragePercent).toBe(50);
    expect(report.tested).toBe(2);
    expect(report.untested).toBe(2);
  });

  it('should increment testCount on multiple tests', () => {
    const tracker = new CoverageTracker();
    tracker.registerRoute('GET', '/api/items');
    tracker.recordTest('GET', '/api/items');
    tracker.recordTest('GET', '/api/items');

    const entry = tracker.getReport().entries.find(e => e.url === '/api/items');
    expect(entry?.testCount).toBe(2);
  });

  it('should reset to empty state', () => {
    const tracker = new CoverageTracker();
    tracker.registerRoute('GET', '/api/data');
    tracker.recordTest('GET', '/api/data');
    tracker.reset();

    expect(tracker.getReport().total).toBe(0);
  });
});
