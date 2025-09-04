const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Add email
app.post('/add', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  await redisClient.lPush('emails', email);
  const count = await redisClient.lLen('emails');
  res.json({ message: 'Email added', count });
});

// Get & consume random email
app.get('/get', async (req, res) => {
  const count = await redisClient.lLen('emails');
  if (count === 0) return res.status(404).json({ error: 'No emails available' });

  const index = Math.floor(Math.random() * count);
  const email = await redisClient.lIndex('emails', index);

  // Remove email at that index (safe way: pop + push swap)
  let removed = false;
  for (let i = 0; i < count; i++) {
    const e = await redisClient.rPop('emails');
    if (e === email && !removed) {
      removed = true;
    } else {
      await redisClient.lPush('emails', e);
    }
  }

  res.json({ email });
});

// Count emails
app.get('/count', async (req, res) => {
  const count = await redisClient.lLen('emails');
  res.json({ count });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
