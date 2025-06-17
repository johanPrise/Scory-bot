import { expect } from 'chai';
import scoreService from '../src/services/scoreService.js';

describe('ScoreService', () => {
  describe('getRankings', () => {
    it('devrait retourner un classement vide par défaut', async () => {
      const result = await scoreService.getRankings();
      expect(result).to.have.property('items').that.is.an('array');
      expect(result).to.have.property('total', 0);
      expect(result).to.have.property('stats').that.is.an('object');
    });

    it('devrait gérer les erreurs correctement', async () => {
      // Simuler une erreur réseau
      const originalFetch = global.fetchAPI;
      global.fetchAPI = () => Promise.reject(new Error('Erreur réseau'));

      try {
        await scoreService.getRankings();
        throw new Error('Une erreur aurait dû être lancée');
      } catch (error) {
        expect(error.message).to.include('Erreur lors de la récupération du classement');
        expect(error.details).to.have.property('code', 'SCORE_SERVICE_ERROR');
      } finally {
        global.fetchAPI = originalFetch;
      }
    });
  });

  describe('addScore', () => {
    it('devrait ajouter un score avec les valeurs par défaut', async () => {
      const scoreData = {
        type: 'individual',
        entityId: 'user123',
        activityId: 'activity456',
        value: 100
      };

      const result = await scoreService.addScore(scoreData);
      expect(result).to.have.property('id');
      expect(result).to.have.property('status', 'pending');
      expect(result).to.have.property('value', 100);
    });
  });
});
