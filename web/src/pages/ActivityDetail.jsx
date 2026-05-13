import { useParams, useNavigate } from 'react-router-dom';
import { BackButton, LoadingSpinner, EmptyState, StatCard, NoGroupSelected } from '../components';
import { useGroup } from '../components/GroupContext';
import { useActivityDetail } from '../hooks/useActivityDetail';
import { TYPE_EMOJIS } from '../constants/activityTypes';
import PropTypes from 'prop-types';
import ActivityTabs from '../components/activity-detail/ActivityTabs';
import InfoTab from '../components/activity-detail/InfoTab';
import SubActivitiesTab from '../components/activity-detail/SubActivitiesTab';
import ScoresTab from '../components/activity-detail/ScoresTab';

const ACTIVITIES_ROUTE = '/activities';

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedGroupId, selectedGroup } = useGroup();

  const activityDetail = useActivityDetail({
    id,
    navigate,
    enabled: Boolean(id && selectedGroupId),
    selectedGroupId,
  });

  if (!selectedGroupId) return <NoGroupSelected />;
  if (activityDetail.loading) return <PageLoader />;
  if (!activityDetail.activity) {
    return (
      <ActivityNotFound
        error={activityDetail.error}
        onBack={() => navigate(ACTIVITIES_ROUTE)}
      />
    );
  }

  const subActivities = activityDetail.activity.subActivities || [];

  return (
    <div className="page activity-detail-page">
      <ActivityHeader
        activity={activityDetail.activity}
        selectedGroup={selectedGroup}
        subActivitiesCount={subActivities.length}
      />

      <ActivityStats stats={activityDetail.activity.stats} />

      <ActivityActions
        activityId={id}
        navigate={navigate}
        deleting={activityDetail.deleting}
        onDelete={activityDetail.handleDelete}
      />

      <ActivityTabs
        activeTab={activityDetail.activeTab}
        setActiveTab={activityDetail.setActiveTab}
        subActivitiesCount={subActivities.length}
        scoresCount={activityDetail.scores.length}
      />

      <ActivityTabContent
        activeTab={activityDetail.activeTab}
        activity={activityDetail.activity}
        scores={activityDetail.scores}
        scoresError={activityDetail.scoresError}
        subActivities={subActivities}
        showSubForm={activityDetail.showSubForm}
        subForm={activityDetail.subForm}
        submittingSub={activityDetail.submittingSub}
        updateSubForm={activityDetail.updateSubForm}
        openSubForm={activityDetail.openSubForm}
        closeSubForm={activityDetail.closeSubForm}
        handleAddSubActivity={activityDetail.handleAddSubActivity}
        handleDeleteSubActivity={activityDetail.handleDeleteSubActivity}
        handleDeleteScore={activityDetail.handleDeleteScore}
      />
    </div>
  );
}

function PageLoader() {
  return (
    <div className="page">
      <LoadingSpinner />
    </div>
  );
}

function ActivityNotFound({ error, onBack }) {
  return (
    <div className="page">
      <EmptyState icon="❌" text={error?.message || 'Activité introuvable'} />
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        ← Retour aux activités
      </button>
    </div>
  );
}

ActivityNotFound.propTypes = {
  error: PropTypes.object,
  onBack: PropTypes.func.isRequired,
};

function ActivityHeader({ activity, selectedGroup, subActivitiesCount }) {
  return (
    <section className="activity-detail-hero slide-up">
      <BackButton fallback={ACTIVITIES_ROUTE} />

      <div className="activity-detail-hero-main">
        <div className="activity-detail-icon">
          {TYPE_EMOJIS[activity.type] || '📌'}
        </div>

        <div className="activity-detail-copy">
          <div className="dashboard-eyebrow">{activity.settings?.isActive ? 'Active' : 'Inactive'}</div>
          <h1>{activity.name}</h1>
          <p>
            {activity.description || 'Pas de description'}
          </p>
        </div>
      </div>

      <div className="activity-detail-meta-row">
        <SelectedGroupLabel selectedGroup={selectedGroup} />
        <span>{subActivitiesCount} sous-activité{subActivitiesCount > 1 ? 's' : ''}</span>
      </div>
    </section>
  );
}

ActivityHeader.propTypes = {
  activity: PropTypes.object.isRequired,
  selectedGroup: PropTypes.object,
  subActivitiesCount: PropTypes.number.isRequired,
};

function SelectedGroupLabel({ selectedGroup }) {
  if (!selectedGroup) return null;

  return (
    <span>{selectedGroup.title || 'Groupe'}</span>
  );
}

SelectedGroupLabel.propTypes = {
  selectedGroup: PropTypes.object,
};

function ActivityStats({ stats }) {
  return (
    <div className="activity-stat-strip slide-up-delay-1">
      <StatCard value={stats?.totalParticipants || 0} label="Participants" />
      <StatCard value={stats?.totalSubmissions || 0} label="Scores" />
      <StatCard value={formatAverageScore(stats?.averageScore)} label="Moyenne" />
    </div>
  );
}

ActivityStats.propTypes = {
  stats: PropTypes.object,
};

function formatAverageScore(averageScore) {
  return averageScore !== undefined && averageScore !== null
    ? Math.round(averageScore)
    : '—';
}

function ActivityActions({ activityId, navigate, deleting, onDelete }) {
  return (
    <div className="activity-action-row slide-up-delay-1">
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => navigate(`/add-score?activityId=${activityId}`)}
      >
        Ajouter un score
      </button>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={onDelete}
        disabled={deleting}
        title="Supprimer l'activité"
        aria-label="Supprimer l'activité"
      >
        {deleting ? '...' : '🗑'}
      </button>
    </div>
  );
}

ActivityActions.propTypes = {
  activityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  navigate: PropTypes.func.isRequired,
  deleting: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};

function ActivityTabContent({
  activeTab,
  activity,
  scores,
  scoresError,
  subActivities,
  showSubForm,
  subForm,
  submittingSub,
  updateSubForm,
  openSubForm,
  closeSubForm,
  handleAddSubActivity,
  handleDeleteSubActivity,
  handleDeleteScore,
}) {
  const tabContent = {
    info: <InfoTab activity={activity} />,

    sub: (
      <SubActivitiesTab
        subActivities={subActivities}
        showSubForm={showSubForm}
        subForm={subForm}
        submittingSub={submittingSub}
        updateSubForm={updateSubForm}
        openSubForm={openSubForm}
        closeSubForm={closeSubForm}
        handleAddSubActivity={handleAddSubActivity}
        handleDeleteSubActivity={handleDeleteSubActivity}
      />
    ),

    scores: (
      <ScoresTab
        scores={scores}
        scoresError={scoresError}
        handleDeleteScore={handleDeleteScore}
      />
    ),
  };

  return (
    <div className="slide-up-delay-2">
      {tabContent[activeTab] || tabContent.info}
    </div>
  );
}

ActivityTabContent.propTypes = {
  activeTab: PropTypes.string.isRequired,
  activity: PropTypes.object.isRequired,
  scores: PropTypes.array.isRequired,
  scoresError: PropTypes.object,
  subActivities: PropTypes.array.isRequired,
  showSubForm: PropTypes.bool.isRequired,
  subForm: PropTypes.object.isRequired,
  submittingSub: PropTypes.bool.isRequired,
  updateSubForm: PropTypes.func.isRequired,
  openSubForm: PropTypes.func.isRequired,
  closeSubForm: PropTypes.func.isRequired,
  handleAddSubActivity: PropTypes.func.isRequired,
  handleDeleteSubActivity: PropTypes.func.isRequired,
  handleDeleteScore: PropTypes.func.isRequired,
};
