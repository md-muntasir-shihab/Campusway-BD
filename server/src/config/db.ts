import mongoose from 'mongoose';

export const connectDb = async (mongoUri: string) => {
  await mongoose.connect(mongoUri);
};
