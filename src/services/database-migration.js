export function buildInsertOnlyOperations(documents) {
  return documents.map((document) => ({
    updateOne: {
      filter: { _id: document._id },
      update: { $setOnInsert: document },
      upsert: true,
    },
  }));
}
