import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ChatGroup from '../src/api/models/ChatGroup.js';

dotenv.config({ path: '.env' });

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    const userIdStr = "69998980dfa03944b96b807b";
    const userIdObj = new mongoose.Types.ObjectId(userIdStr);

    console.log("1. Testing getUserGroups with string ID:");
    const groups1 = await ChatGroup.getUserGroups(userIdStr);
    console.log(`Found: ${groups1.length} groups`);

    console.log("\n2. Testing getUserGroups with ObjectId:");
    const groups2 = await ChatGroup.getUserGroups(userIdObj);
    console.log(`Found: ${groups2.length} groups`);

    console.log("\n3. Testing direct find query with string ID:");
    const groups3 = await ChatGroup.find({ 'members.userId': userIdStr, isActive: true });
    console.log(`Found: ${groups3.length} groups`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

check();
