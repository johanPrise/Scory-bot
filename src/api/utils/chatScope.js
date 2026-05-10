export const resourceInChatFilter = (id, chatId) => ({
  _id: id,
  chatId,
});

export const scoreInChatFilter = (id, chatId) => ({
  _id: id,
  'metadata.chatId': chatId,
});

export const scoresForChatFilter = (chatId) => ({
  'metadata.chatId': chatId,
});
