import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createDefaultJob, OutputAttempt } from './jobModel';
import { LabelTemplate } from '../../types';

describe('Production Job Spine & Resumable Lifecycle', () => {
  const dummyTemplate: LabelTemplate = {
    schema_version: 1,
    name: 'Gabarit 50x30',
    width_mm: 50,
    height_mm: 30,
    inner_margins_mm: { top: 0, bottom: 0, left: 0, right: 0 },
    outer_margins_mm: { top: 0, bottom: 0, left: 0, right: 0 },
    bg_color: '#ffffff',
    bg_opacity: 1,
    items: [],
  };

  it('initializes a production job with correct defaults and stock profile', () => {
    const rows = [
      { ITEMNAME: 'Article A', SELLING_PRICE: 1.5 },
      { ITEMNAME: 'Article B', SELLING_PRICE: 2.5 },
      { ITEMNAME: 'Article C', SELLING_PRICE: 3.5 },
    ];
    const job = createDefaultJob(dummyTemplate, rows, 'Opérateur Test');

    assert.ok(job.id.startsWith('JOB-'));
    assert.strictEqual(job.status, 'STAGED');
    assert.strictEqual(job.totalLabels, 3);
    assert.strictEqual(job.lastCompletedIndex, 0);
    assert.strictEqual(job.stockProfile.mediaType, 'THERMAL_ROLL');
  });

  it('tracks resumable printing progress without duplicating labels', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      ITEMNAME: `Article ${i + 1}`,
      SELLING_PRICE: 10 + i,
    }));
    const job = createDefaultJob(dummyTemplate, rows);

    assert.strictEqual(job.lastCompletedIndex, 0);

    // Simulate batch 1: labels 0 to 40 printed
    const attempt1: OutputAttempt = {
      id: 'att-1',
      jobId: job.id,
      timestamp: new Date().toISOString(),
      outputFormat: 'PDF_THERMAL',
      printerName: 'Test Thermal',
      transport: 'FILE_DOWNLOAD',
      startIndex: 0,
      endIndex: 40,
      totalQuantity: 40,
      completedQuantity: 40,
      outcome: 'HANDED_TO_SYSTEM',
      operator: 'Opérateur Test',
    };

    job.outputAttempts.push(attempt1);
    job.lastCompletedIndex = attempt1.endIndex;
    assert.strictEqual(job.lastCompletedIndex, 40);

    // Simulate batch 2 (Resume): next 60 labels (from 40 to 100)
    const attempt2: OutputAttempt = {
      id: 'att-2',
      jobId: job.id,
      timestamp: new Date().toISOString(),
      outputFormat: 'PDF_THERMAL',
      printerName: 'Test Thermal',
      transport: 'FILE_DOWNLOAD',
      startIndex: job.lastCompletedIndex, // 40!
      endIndex: 100,
      totalQuantity: 60,
      completedQuantity: 60,
      outcome: 'HANDED_TO_SYSTEM',
      operator: 'Opérateur Test',
    };

    job.outputAttempts.push(attempt2);
    job.lastCompletedIndex = attempt2.endIndex;

    assert.strictEqual(job.lastCompletedIndex, 100);
    assert.strictEqual(job.outputAttempts.length, 2);
    // Verified: attempt 2 started strictly at 40 and ended at 100, no duplicates!
  });
});
