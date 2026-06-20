export function buildStarterPromptOperations(prompts, creatorId) {
  return prompts.map((prompt) => {
    const cleanPrompt = { ...prompt };
    delete cleanPrompt._id;
    delete cleanPrompt.creator;
    delete cleanPrompt.createdAt;
    delete cleanPrompt.updatedAt;
    delete cleanPrompt.copyCount;
    delete cleanPrompt.averageRating;
    delete cleanPrompt.reviewCount;

    return {
      updateOne: {
        filter: { title: cleanPrompt.title, creator: creatorId },
        update: {
          $set: {
            ...cleanPrompt,
            creator: creatorId,
            status: 'approved',
            visibility: 'public',
            featured: false,
            rejectionFeedback: '',
          },
          $setOnInsert: { copyCount: 0, averageRating: 0, reviewCount: 0 },
        },
        upsert: true,
      },
    };
  });
}
