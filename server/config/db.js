const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    // Force IPv4 to avoid Jio/Windows DNS issues
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4 
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;