import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApiApp } from '../../src/api/index.js';
import User from '../../src/models/User.js';
import Team from '../../src/models/Team.js';
import { Activity } from '../../src/models/activity.js';
import Score from '../../src/models/Score.js';

describe('API Integration Tests', () => {
  let app;
  let server;
  let testUser;
  let adminUser;
  let authToken;
  let adminToken;
  let testTeam;
  let testActivity;

  beforeAll(async () => {
    // Connexion à la base de données de test
    const mongoUrl = process.env.MONGO_TEST_URL || 'mongodb://localhost:27017/scory-bot-test';
    await mongoose.connect(mongoUrl);
    
    // Créer l'application
    app = createApiApp();
    server = app.listen(0); // Port aléatoire pour les tests
  });

  afterAll(async () => {
    // Nettoyer la base de données de test
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
    server.close();
  });

  beforeEach(async () => {
    // Nettoyer les collections avant chaque test
    await User.deleteMany({});
    await Team.deleteMany({});
    await Activity.deleteMany({});
    await Score.deleteMany({});
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('password');

      testUser = response.body.user;
      authToken = response.body.token;
    });

    it('should login with valid credentials', async () => {
      // Créer un utilisateur d'abord
      const user = new User({
        username: 'logintest',
        email: 'login@example.com',
        password: 'password123'
      });
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'logintest',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', 'logintest');
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          login: 'nonexistent',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should get current user profile', async () => {
      // Créer et connecter un utilisateur
      const user = new User({
        username: 'profiletest',
        email: 'profile@example.com',
        password: 'password123'
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'profiletest',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('username', 'profiletest');
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('Teams Management', () => {
    beforeEach(async () => {
      // Créer un utilisateur de test
      testUser = new User({
        username: 'teamtest',
        email: 'team@example.com',
        password: 'password123'
      });
      await testUser.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'teamtest',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should create a new team', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        chatId: 'test-chat-123'
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(teamData)
        .expect(201);

      expect(response.body.team).toHaveProperty('name', 'Test Team');
      expect(response.body.team).toHaveProperty('chatId', 'test-chat-123');
      expect(response.body.team.members).toHaveLength(1);

      testTeam = response.body.team;
    });

    it('should get team details', async () => {
      // Créer une équipe d'abord
      const team = new Team({
        name: 'Get Test Team',
        chatId: 'get-test-123',
        createdBy: testUser._id,
        members: [{
          userId: testUser._id,
          username: testUser.username,
          isAdmin: true
        }]
      });
      await team.save();

      const response = await request(app)
        .get(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.team).toHaveProperty('name', 'Get Test Team');
      expect(response.body.team.members).toHaveLength(1);
    });

    it('should add member to team', async () => {
      // Créer une équipe
      const team = new Team({
        name: 'Member Test Team',
        chatId: 'member-test-123',
        createdBy: testUser._id,
        members: [{
          userId: testUser._id,
          username: testUser.username,
          isAdmin: true
        }]
      });
      await team.save();

      // Créer un autre utilisateur
      const newUser = new User({
        username: 'newmember',
        email: 'newmember@example.com',
        password: 'password123'
      });
      await newUser.save();

      const response = await request(app)
        .post(`/api/teams/${team._id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: newUser._id,
          username: newUser.username
        })
        .expect(200);

      expect(response.body.member).toHaveProperty('userId', newUser._id.toString());
    });
  });

  describe('Activities Management', () => {
    beforeEach(async () => {
      // Créer un utilisateur et une équipe de test
      testUser = new User({
        username: 'activitytest',
        email: 'activity@example.com',
        password: 'password123'
      });
      await testUser.save();

      testTeam = new Team({
        name: 'Activity Test Team',
        chatId: 'activity-test-123',
        createdBy: testUser._id,
        members: [{
          userId: testUser._id,
          username: testUser.username,
          isAdmin: true
        }]
      });
      await testTeam.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'activitytest',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should create a new activity', async () => {
      const activityData = {
        name: 'Test Activity',
        description: 'A test activity',
        chatId: 'activity-chat-123',
        teamId: testTeam._id
      };

      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData)
        .expect(201);

      expect(response.body.activity).toHaveProperty('name', 'Test Activity');
      expect(response.body.activity).toHaveProperty('teamId', testTeam._id.toString());

      testActivity = response.body.activity;
    });

    it('should add subactivity', async () => {
      // Créer une activité d'abord
      const activity = new Activity({
        name: 'Sub Test Activity',
        chatId: 'sub-test-123',
        createdBy: testUser._id,
        teamId: testTeam._id
      });
      await activity.save();

      const subActivityData = {
        name: 'Test SubActivity',
        description: 'A test subactivity',
        maxScore: 100
      };

      const response = await request(app)
        .post(`/api/activities/${activity._id}/subactivities`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(subActivityData)
        .expect(201);

      expect(response.body.subActivity).toHaveProperty('name', 'Test SubActivity');
    });
  });

  describe('Scores Management', () => {
    beforeEach(async () => {
      // Créer les données de test nécessaires
      testUser = new User({
        username: 'scoretest',
        email: 'score@example.com',
        password: 'password123'
      });
      await testUser.save();

      testActivity = new Activity({
        name: 'Score Test Activity',
        chatId: 'score-test-123',
        createdBy: testUser._id
      });
      await testActivity.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'scoretest',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should create a new score', async () => {
      const scoreData = {
        userId: testUser._id,
        activityId: testActivity._id,
        value: 85,
        maxPossible: 100,
        context: 'individual',
        metadata: {
          chatId: 'score-chat-123',
          comments: 'Great performance!'
        }
      };

      const response = await request(app)
        .post('/api/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scoreData)
        .expect(201);

      expect(response.body.score).toHaveProperty('value', 85);
      expect(response.body.score).toHaveProperty('normalizedScore', 85);
      expect(response.body.score).toHaveProperty('context', 'individual');
    });

    it('should get rankings', async () => {
      // Créer quelques scores de test
      const scores = [
        {
          user: testUser._id,
          activity: testActivity._id,
          value: 90,
          maxPossible: 100,
          context: 'individual',
          awardedBy: testUser._id,
          metadata: { chatId: 'ranking-test-123' }
        },
        {
          user: testUser._id,
          activity: testActivity._id,
          value: 75,
          maxPossible: 100,
          context: 'individual',
          awardedBy: testUser._id,
          metadata: { chatId: 'ranking-test-123' }
        }
      ];

      await Score.insertMany(scores);

      const response = await request(app)
        .get('/api/scores/rankings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          scope: 'individual',
          period: 'all',
          limit: 10
        })
        .expect(200);

      expect(response.body.rankings).toBeInstanceOf(Array);
      expect(response.body.metadata).toHaveProperty('scope', 'individual');
    });
  });

  describe('Dashboard Statistics', () => {
    beforeEach(async () => {
      // Créer un utilisateur admin
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
      });
      await adminUser.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'admin',
          password: 'admin123'
        });

      adminToken = loginResponse.body.token;
    });

    it('should get dashboard stats for admin', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: 'month' })
        .expect(200);

      expect(response.body.stats).toHaveProperty('personal');
      expect(response.body.stats).toHaveProperty('overview');
      expect(response.body).toHaveProperty('period', 'month');
    });

    it('should get recent activity', async () => {
      const response = await request(app)
        .get('/api/dashboard/recent-activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('activities');
      expect(response.body.activities).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    it('should handle invalid JWT tokens', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle non-existent resources', async () => {
      const user = new User({
        username: 'notfoundtest',
        email: 'notfound@example.com',
        password: 'password123'
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'notfoundtest',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      await request(app)
        .get('/api/teams/507f1f77bcf86cd799439011') // ObjectId valide mais inexistant
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should validate request data', async () => {
      const user = new User({
        username: 'validationtest',
        email: 'validation@example.com',
        password: 'password123'
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'validationtest',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      // Tenter de créer une équipe sans nom
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Team without name',
          chatId: 'validation-test-123'
        })
        .expect(400);
    });
  });
});