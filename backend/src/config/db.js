import mongoose from "mongoose";

import dns from 'node:dns';

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing in the .env file");
  }

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected: ${conn.connection.host}`);
  console.log(`Database name: ${conn.connection.name}`);
};

export default connectDB;


let kdkd = process.env.MONGODB_URI