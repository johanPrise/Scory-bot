import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import * as api from '../api';
import { NoGroupSelected } from '../components';
import { useGroup } from '../components/GroupContext';
import {
  ActivityFilter,
  RankingResults,
  ScoreboardHeader,
  SegmentControl,
} from '../components/rankings/RankingWidgets';

const PERIODS = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
  { value: 'all', label: 'Tout' },
];

const SCOPES = [
  { value: 'individual', label: 'Joueurs' },
  { value: 'team', label: 'Équipes' },
];

const INITIAL_FILTERS = {
  scope: 'individual',
  period: 'month',
  activityId: '',
};

const filtersShape = PropTypes.shape({
  scope: PropTypes.string.isRequired,
  period: PropTypes.string.isRequired,
  activityId: PropTypes.string.isRequired,
});

function getRankName(item, scope) {
  if (scope === 'team') return item.name || 'Équipe';

  const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim();
  return item.username || fullName || 'Joueur';
}

function buildRankingParams(filters) {
  const params = { scope: filters.scope, period: filters.period, limit: 30 };

  if (filters.activityId) {
    params.activityId = filters.activityId;
  }

  return params;
}

function getRankingRequestKey(selectedGroupId, filters) {
  return [selectedGroupId, filters.scope, filters.period, filters.activityId].join(':');
}

async function fetchRankingActivities() {
  const data = await api.getActivities({ limit: 100 });
  return data.activities || data || [];
}

async function fetchRankingResults(filters) {
  const data = await api.getRankings(buildRankingParams(filters));
  return data.rankings || [];
}

function useRankingActivities(selectedGroupId) {
  const [activityState, setActivityState] = useState({ groupId: '', activities: [] });

  useEffect(() => {
    if (selectedGroupId) {
      let ignoreResult = false;

      fetchRankingActivities()
        .then(activities => {
          if (ignoreResult) return;
          setActivityState({ groupId: selectedGroupId, activities });
        })
        .catch(error => {
          if (ignoreResult) return;
          console.error('Erreur chargement activités:', error);
          setActivityState({ groupId: selectedGroupId, activities: [] });
        });

      return () => {
        ignoreResult = true;
      };
    }
  }, [selectedGroupId]);

  const loadingActivities = Boolean(selectedGroupId) && activityState.groupId !== selectedGroupId;
  const activities = loadingActivities ? [] : activityState.activities;

  return { activities, loadingActivities };
}

function useRankingResults(selectedGroupId, filters) {
  const requestKey = getRankingRequestKey(selectedGroupId, filters);
  const [rankingState, setRankingState] = useState({ requestKey: '', rankings: [] });

  useEffect(() => {
    if (selectedGroupId) {
      let ignoreResult = false;
      const activeRequestKey = getRankingRequestKey(selectedGroupId, filters);

      fetchRankingResults(filters)
        .then(rankings => {
          if (ignoreResult) return;
          setRankingState({ requestKey: activeRequestKey, rankings });
        })
        .catch(error => {
          if (ignoreResult) return;
          console.error('Erreur chargement classement:', error);
          setRankingState({ requestKey: activeRequestKey, rankings: [] });
        });

      return () => {
        ignoreResult = true;
      };
    }
  }, [selectedGroupId, filters]);

  const loadingRankings = Boolean(selectedGroupId) && rankingState.requestKey !== requestKey;
  const rankings = loadingRankings ? [] : rankingState.rankings;

  return { rankings, loadingRankings };
}

function ScoreboardFilters({ filters, loadingActivities, activities, onFilterChange }) {
  return (
    <section className="scoreboard-filters slide-up-delay-1">
      <SegmentControl
        label="Type de classement"
        options={SCOPES}
        value={filters.scope}
        onChange={value => onFilterChange('scope', value)}
      />
      <SegmentControl
        label="Période"
        options={PERIODS}
        value={filters.period}
        onChange={value => onFilterChange('period', value)}
      />
      {loadingActivities ? null : (
        <ActivityFilter
          activities={activities}
          value={filters.activityId}
          onChange={value => onFilterChange('activityId', value)}
        />
      )}
    </section>
  );
}

ScoreboardFilters.propTypes = {
  filters: filtersShape.isRequired,
  loadingActivities: PropTypes.bool.isRequired,
  activities: PropTypes.array.isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default function Rankings() {
  const { selectedGroupId, selectedGroup } = useGroup();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const { activities, loadingActivities } = useRankingActivities(selectedGroupId);
  const { rankings, loadingRankings } = useRankingResults(selectedGroupId, filters);

  const groupName = selectedGroup?.title || 'Groupe';
  const leaderName = useMemo(() => {
    return rankings[0] ? getRankName(rankings[0], filters.scope) : '';
  }, [rankings, filters.scope]);

  const updateFilter = useCallback((field, value) => {
    setFilters(currentFilters => ({ ...currentFilters, [field]: value }));
  }, []);

  if (!selectedGroupId) {
    return <NoGroupSelected />;
  }

  return (
    <div className="page scoreboard-page">
      <ScoreboardHeader groupName={groupName} total={rankings.length} leaderName={leaderName} />

      <ScoreboardFilters
        filters={filters}
        loadingActivities={loadingActivities}
        activities={activities}
        onFilterChange={updateFilter}
      />

      <RankingResults loading={loadingRankings} rankings={rankings} scope={filters.scope} />
    </div>
  );
}
