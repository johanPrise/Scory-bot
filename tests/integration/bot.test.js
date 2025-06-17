import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../src/models/User.js';
import Team from '../../src/models/Team.js';
import { Activity } from '../../src/models/activity.js';
import Score from '../../src/models/Score.js';

// Mock du bot Telegram
const mockBot = {
  sendMessage: jest.fn(),
  onText: jest.fn(),
  on: jest.fn()
};

// Mock des services
jest.mock('../../src/config/bot.js', () => ({
  bot: mockBot
}));

// Import des commandes après les mocks
import scoreService from '../../src/services/scoreService.new.js';
import { teamService } from '../../src/services/teamService.new.js';
import * as activityService from '../../src/services/activityService.new.js';

describe('Bot Integration Tests', () => {
  let testUser;
  let testTeam;
  let testActivity;
  let chatId;

  beforeAll(async () => {
    // Connexion à la base de données de test
    const mongoUrl = process.env.MONGO_TEST_URL || 'mongodb://localhost:27017/scory-bot-test';
    await mongoose.connect(mongoUrl);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Nettoyer les collections
    await User.deleteMany({});
    await Team.deleteMany({});
    await Activity.deleteMany({});
    await Score.deleteMany({});

    // Réinitialiser les mocks
    jest.clearAllMocks();

    // Créer des données de test
    chatId = 'test-chat-123';
    
    testUser = new User({
      username: 'bottest',
      email: 'bot@example.com',
      password: 'password123',
      telegram: {
        id: 'telegram-123',
        username: 'bottest',
        chatId: chatId
      }
    });
    await testUser.save();

    testTeam = new Team({
      name: 'Bot Test Team',
      chatId: chatId,
      createdBy: testUser._id,
      members: [{
        userId: testUser._id,
        username: testUser.username,
        isAdmin: true
      }]
    });
    await testTeam.save();

    testActivity = new Activity({
      name: 'Bot Test Activity',
      chatId: chatId,
      createdBy: testUser._id,
      teamId: testTeam._id
    });
    await testActivity.save();
  });

  describe('Score Service Integration', () => {
    it('should add individual score via service', async () => {
      const scoreData = {
        type: 'individual',
        entityId: testUser._id,
        activityId: testActivity._id,
        value: 85,
        maxPossible: 100,
        awardedBy: testUser._id,
        chatId: chatId,
        comments: 'Great job!'
      };

      const result = await scoreService.addScore(scoreData);

      expect(result).toHaveProperty('value', 85);
      expect(result).toHaveProperty('normalizedScore', 85);
      expect(result).toHaveProperty('context', 'individual');

      // Vérifier que le score est en base
      const savedScore = await Score.findById(result._id);
      expect(savedScore).toBeTruthy();
      expect(savedScore.value).toBe(85);
    });

    it('should add team score via service', async () => {
      const scoreData = {
        type: 'team',
        entityId: testTeam._id,
        activityId: testActivity._id,
        value: 92,
        maxPossible: 100,
        awardedBy: testUser._id,
        chatId: chatId
      };

      const result = await scoreService.addScore(scoreData);

      expect(result).toHaveProperty('value', 92);
      expect(result).toHaveProperty('context', 'team');
      expect(result.team.toString()).toBe(testTeam._id.toString());
    });

    it('should get rankings via service', async () => {
      // Créer plusieurs scores
      const scores = [
        {
          type: 'individual',
          entityId: testUser._id,
          activityId: testActivity._id,
          value: 90,
          awardedBy: testUser._id,
          chatId: chatId
        },
        {
          type: 'individual',
          entityId: testUser._id,
          activityId: testActivity._id,
          value: 85,
          awardedBy: testUser._id,
          chatId: chatId
        }
      ];

      for (const scoreData of scores) {
        await scoreService.addScore(scoreData);
      }

      const rankings = await scoreService.getRankings({
        scope: 'individual',
        period: 'all',
        limit: 10
      });

      expect(rankings.items).toBeInstanceOf(Array);
      expect(rankings.total).toBeGreaterThan(0);
    });
  });

  describe('Team Service Integration', () => {
    it('should create team via service', async () => {
      const teamData = {
        name: 'Service Test Team',
        description: 'Created via service',
        createdBy: testUser._id,
        chatId: 'service-chat-456'
      };

      const result = await teamService.createTeam(teamData);

      expect(result).toHaveProperty('name', 'Service Test Team');
      expect(result).toHaveProperty('chatId', 'service-chat-456');
      expect(result.members).toHaveLength(1);
      expect(result.members[0].userId.toString()).toBe(testUser._id.toString());
    });

    it('should add member to team via service', async () => {
      // Créer un autre utilisateur
      const newUser = new User({
        username: 'newmember',
        email: 'newmember@example.com',
        password: 'password123',
        telegram: {
          id: 'telegram-456',
          username: 'newmember',
          chatId: chatId
        }
      });
      await newUser.save();

      const result = await teamService.members.addMember({
        teamId: testTeam._id,
        userId: newUser._id,
        role: 'member'
      });

      expect(result).toHaveProperty('userId', newUser._id.toString());
      expect(result).toHaveProperty('role', 'member');

      // Vérifier en base
      const updatedTeam = await Team.findById(testTeam._id);
      expect(updatedTeam.members).toHaveLength(2);
    });

    it('should get team stats via service', async () => {
      // Ajouter quelques scores à l'équipe
      await testTeam.updateScore(100);
      await testTeam.updateScore(50);

      const stats = await teamService.stats.getTeamStats(testTeam._id);

      expect(stats).toHaveProperty('totalScore');
      expect(stats).toHaveProperty('memberCount', 1);
      expect(stats).toHaveProperty('adminCount', 1);
    });
  });

  describe('Activity Service Integration', () => {
    it('should create activity via service', async () => {
      const activityData = {
        name: 'Service Activity',
        description: 'Created via service',
        createdBy: testUser._id,
        chatId: 'activity-chat-789',
        teamId: testTeam._id
      };

      const result = await activityService.createActivity(activityData);

      expect(result).toHaveProperty('name', 'Service Activity');
      expect(result).toHaveProperty('chatId', 'activity-chat-789');
      expect(result.teamId.toString()).toBe(testTeam._id.toString());
    });

    it('should add subactivity via service', async () => {
      const result = await activityService.addSubActivity({
        parentActivityId: testActivity._id,
        name: 'Test SubActivity',
        description: 'Added via service',
        createdBy: testUser._id,
        chatId: chatId
      });

      expect(result.subActivities).toHaveLength(1);
      expect(result.subActivities[0]).toHaveProperty('name', 'Test SubActivity');
    });

    it('should list activities via service', async () => {
      // Créer quelques activités supplémentaires
      await activityService.createActivity({
        name: 'Activity 1',
        createdBy: testUser._id,
        chatId: chatId
      });

      await activityService.createActivity({
        name: 'Activity 2',
        createdBy: testUser._id,
        chatId: chatId
      });

      const activities = await activityService.listActivities({
        chatId: chatId,
        includeSubActivities: false
      });

      expect(activities).toBeInstanceOf(Array);
      expect(activities.length).toBeGreaterThanOrEqual(3); // testActivity + 2 nouvelles
    });
  });

  describe('Cross-Service Integration', () => {
    it('should maintain data consistency across services', async () => {
      // 1. Créer une activité
      const activity = await activityService.createActivity({
        name: 'Integration Test Activity',
        createdBy: testUser._id,
        chatId: chatId,
        teamId: testTeam._id
      });

      // 2. Ajouter un score individuel
      const individualScore = await scoreService.addScore({
        type: 'individual',
        entityId: testUser._id,
        activityId: activity._id,
        value: 88,
        awardedBy: testUser._id,
        chatId: chatId
      });

      // 3. Ajouter un score d'équipe
      const teamScore = await scoreService.addScore({
        type: 'team',
        entityId: testTeam._id,
        activityId: activity._id,
        value: 95,
        awardedBy: testUser._id,
        chatId: chatId
      });

      // 4. Vérifier les statistiques utilisateur
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.stats.totalScore).toBeGreaterThan(0);

      // 5. Vérifier les statistiques équipe
      const updatedTeam = await Team.findById(testTeam._id);
      expect(updatedTeam.stats.totalScore).toBeGreaterThan(0);

      // 6. Vérifier les classements
      const individualRankings = await scoreService.getRankings({
        scope: 'individual',
        activityId: activity._id,
        period: 'all'
      });

      const teamRankings = await scoreService.getRankings({
        scope: 'team',
        activityId: activity._id,
        period: 'all'
      });

      expect(individualRankings.items).toHaveLength(1);
      expect(teamRankings.items).toHaveLength(1);
      expect(individualRankings.items[0].totalScore).toBe(88);
      expect(teamRankings.items[0].totalScore).toBe(95);
    });

    it('should handle concurrent operations correctly', async () => {
      // Simuler des opérations concurrentes
      const promises = [];

      // Ajouter plusieurs scores en parallèle
      for (let i = 0; i < 5; i++) {
        promises.push(
          scoreService.addScore({
            type: 'individual',
            entityId: testUser._id,
            activityId: testActivity._id,
            value: 80 + i,
            awardedBy: testUser._id,
            chatId: chatId,
            subActivityId: `sub-${i}`
          })
        );
      }

      const results = await Promise.all(promises);

      // Vérifier que tous les scores ont été créés
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.value).toBe(80 + index);
      });

      // Vérifier l'intégrité des données
      const allScores = await Score.find({ user: testUser._id });
      expect(allScores).toHaveLength(5);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.stats.completedActivities).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid user IDs gracefully', async () => {
      await expect(
        scoreService.addScore({
          type: 'individual',
          entityId: 'invalid-id',
          activityId: testActivity._id,
          value: 85,
          awardedBy: testUser._id,
          chatId: chatId
        })
      ).rejects.toThrow();
    });

    it('should handle duplicate scores correctly', async () => {
      const scoreData = {
        type: 'individual',
        entityId: testUser._id,
        activityId: testActivity._id,
        value: 85,
        awardedBy: testUser._id,
        chatId: chatId
      };

      // Premier score
      await scoreService.addScore(scoreData);

      // Tentative de duplication
      await expect(
        scoreService.addScore(scoreData)
      ).rejects.toThrow('Un score existe déjà pour cette combinaison');
    });

    it('should handle team member limits', async () => {
      // Définir une limite de membres
      testTeam.settings.maxMembers = 2;
      await testTeam.save();

      // Ajouter un membre (total: 2)
      const newUser = new User({
        username: 'limituser',
        email: 'limit@example.com',
        password: 'password123'
      });
      await newUser.save();

      await teamService.members.addMember({
        teamId: testTeam._id,
        userId: newUser._id,
        role: 'member'
      });

      // Tenter d'ajouter un troisième membre
      const thirdUser = new User({
        username: 'thirduser',
        email: 'third@example.com',
        password: 'password123'
      });
      await thirdUser.save();

      await expect(
        teamService.members.addMember({
          teamId: testTeam._id,
          userId: thirdUser._id,
          role: 'member'
        })
      ).rejects.toThrow('Le nombre maximum de membres a été atteint');
    });
  });
});