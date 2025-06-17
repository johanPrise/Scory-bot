const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.MOCK_SERVER_PORT || 3002;

app.use(cors());
app.use(bodyParser.json());

// Mock data
const users = [
  { id: 1, username: 'creator', password: 'password', role: 'creator', email: 'creator@example.com' },
  { id: 2, username: 'groupadmin', password: 'password', role: 'groupAdmin', email: 'groupadmin@example.com', groupId: 1 },
  { id: 3, username: 'user1', password: 'password', role: 'user', email: 'user1@example.com' },
  { id: 4, username: 'user2', password: 'password', role: 'user', email: 'user2@example.com' }
];

const groups = [
  { id: 1, name: 'Group A', settings: { maxMembers: 100, allowGuests: true } },
  { id: 2, name: 'Group B', settings: { maxMembers: 50, allowGuests: false } }
];

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, token: `mock_token_${user.id}` });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  const userId = parseInt(token.split('_')[2]);
  const user = users.find(u => u.id === userId);
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Users
app.get('/api/users', (req, res) => {
  res.json(users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }));
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.post('/api/users', (req, res) => {
  const newUser = { id: users.length + 1, ...req.body };
  users.push(newUser);
  const { password, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

app.put('/api/users/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...req.body };
    const { password, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Groups
app.get('/api/groups', (req, res) => {
  res.json(groups);
});

app.get('/api/groups/:id', (req, res) => {
  const group = groups.find(g => g.id === parseInt(req.params.id));
  if (group) {
    res.json(group);
  } else {
    res.status(404).json({ message: 'Group not found' });
  }
});

app.post('/api/groups', (req, res) => {
  const newGroup = { id: groups.length + 1, ...req.body };
  groups.push(newGroup);
  res.status(201).json(newGroup);
});

app.put('/api/groups/:id', (req, res) => {
  const groupIndex = groups.findIndex(g => g.id === parseInt(req.params.id));
  if (groupIndex !== -1) {
    groups[groupIndex] = { ...groups[groupIndex], ...req.body };
    res.json(groups[groupIndex]);
  } else {
    res.status(404).json({ message: 'Group not found' });
  }
});

app.delete('/api/groups/:id', (req, res) => {
  const groupIndex = groups.findIndex(g => g.id === parseInt(req.params.id));
  if (groupIndex !== -1) {
    groups.splice(groupIndex, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Group not found' });
  }
});

// Group Admins
app.get('/api/groups/:id/admins', (req, res) => {
  res.json(users.filter(u => u.role === 'groupAdmin' && u.groupId === parseInt(req.params.id)));
});

app.post('/api/groups/:id/admins', (req, res) => {
  const userId = req.body.userId;
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].role = 'groupAdmin';
    users[userIndex].groupId = parseInt(req.params.id);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.delete('/api/groups/:id/admins/:userId', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.userId));
  if (userIndex !== -1) {
    users[userIndex].role = 'user';
    delete users[userIndex].groupId;
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Group Members
app.get('/api/groups/:id/members', (req, res) => {
  res.json(users.filter(u => u.role === 'user' && u.groupId === parseInt(req.params.id)));
});

app.post('/api/groups/:id/members', (req, res) => {
  const userId = req.body.userId;
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].groupId = parseInt(req.params.id);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.put('/api/groups/:id/members/:memberId', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.memberId));
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...req.body };
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Member not found' });
  }
});

app.delete('/api/groups/:id/members/:memberId', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.memberId));
  if (userIndex !== -1) {
    delete users[userIndex].groupId;
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Member not found' });
  }
});

// Group Settings
app.get('/api/groups/:id/settings', (req, res) => {
  const group = groups.find(g => g.id === parseInt(req.params.id));
  if (group) {
    res.json(group.settings);
  } else {
    res.status(404).json({ message: 'Group not found' });
  }
});

app.put('/api/groups/:id/settings', (req, res) => {
  const groupIndex = groups.findIndex(g => g.id === parseInt(req.params.id));
  if (groupIndex !== -1) {
    groups[groupIndex].settings = req.body;
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Group not found' });
  }
});

// Placeholder endpoints for other functionalities
app.get('/api/dashboard-stats', (req, res) => {
  res.json({ users: users.length, groups: groups.length, activeUsers: users.filter(u => u.role !== 'user').length });
});

app.get('/api/stats', (req, res) => {
  res.json({ data: [10, 20, 30, 40, 50] });
});

app.get('/api/settings', (req, res) => {
  res.json({ setting1: 'value1', setting2: 'value2' });
});

app.put('/api/settings', (req, res) => {
  res.status(204).send();
});

app.get('/api/groups/:id/scores', (req, res) => {
  res.json([{ id: 1, value: 100 }, { id: 2, value: 200 }]);
});

app.post('/api/groups/:id/scores', (req, res) => {
  res.status(201).json({ id: 3, value: req.body.value });
});

app.put('/api/groups/:id/scores/:scoreId', (req, res) => {
  res.status(204).send();
});

app.delete('/api/groups/:id/scores/:scoreId', (req, res) => {
  res.status(204).send();
});

app.get('/api/groups/:id/teams', (req, res) => {
  res.json([{ id: 1, name: 'Team 1' }, { id: 2, name: 'Team 2' }]);
});

app.post('/api/groups/:id/teams', (req, res) => {
  res.status(201).json({ id: 3, name: req.body.name });
});

app.put('/api/groups/:id/teams/:teamId', (req, res) => {
  res.status(204).send();
});

app.delete('/api/groups/:id/teams/:teamId', (req, res) => {
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
