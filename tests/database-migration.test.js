import { describe, expect, it } from 'vitest';
import { buildInsertOnlyOperations } from '../src/services/database-migration.js';

describe('database migration operations', () => {
  it('preserves existing documents by inserting only missing ids', () => {
    const documents = [{ _id: 'one', value: 'source' }, { _id: 'two', value: 'source' }];
    expect(buildInsertOnlyOperations(documents)).toEqual([
      { updateOne: { filter: { _id: 'one' }, update: { $setOnInsert: documents[0] }, upsert: true } },
      { updateOne: { filter: { _id: 'two' }, update: { $setOnInsert: documents[1] }, upsert: true } },
    ]);
  });
});
