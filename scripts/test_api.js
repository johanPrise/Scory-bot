import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Using fetch API which is built-in to Node 18+
dotenv.config({ path: '.env' });

const userId = "69998980dfa03944b96b807b";
const username = "vanishingguy";

const token = jwt.sign(
    { userId, username },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '1h' }
);

async function check() {
  try {
    console.log("Fetching http://localhost:3001/api/groups...");
    const res = await fetch('http://localhost:3001/api/groups', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("STATUS:", res.status);
    const body = await res.text();
    console.log("BODY:", body);
  } catch(e) {
    if (e.cause && e.cause.code === 'ECONNREFUSED') {
      console.error("Local API server is not running on port 3001.");
    } else {
      console.error(e);
    }
  }
}
check();
