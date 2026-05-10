import mongoose from 'mongoose';

export const toObjectId = (id) => {
  const stringId = String(id);

  if (!mongoose.Types.ObjectId.isValid(stringId)) {
    const err = new Error(`ID invalide: ${id}`);
    err.status = 400;
    throw err;
  }

  return new mongoose.Types.ObjectId(stringId);
};
