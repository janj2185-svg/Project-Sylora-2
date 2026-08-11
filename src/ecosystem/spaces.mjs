/**
 * Unified Space Engine adapter.
 * Business Room / Study Group / Research Circle / Project Room share one model.
 * Does not fork four realtime stacks — wraps existing conferences/orgs/communities/events.
 */

export const SPACE_KINDS = Object.freeze(['business', 'science', 'community', 'project', 'event']);

export const SPACE_CAPABILITIES = Object.freeze([
  'members', 'chat', 'voice', 'video', 'live', 'files', 'tasks', 'calendar', 'ai', 'knowledge', 'permissions', 'schedule', 'notifications'
]);

export function spaceFromConference(room, members = []) {
  return {
    id: room.id,
    kind: room.kind === 'science' ? 'science' : 'business',
    title: room.title,
    engine: 'conference',
    capabilities: ['members', 'chat', 'voice', 'video', 'ai', 'permissions'],
    members,
    source: { type: 'conference', id: room.id }
  };
}

export function spaceFromOrg(org, workspace = {}) {
  return {
    id: org.id,
    kind: 'project',
    title: org.name,
    engine: 'business_os',
    capabilities: ['members', 'files', 'tasks', 'ai', 'knowledge', 'permissions'],
    teams: workspace.teams || [],
    documents: workspace.documents || [],
    tasks: workspace.tasks || [],
    source: { type: 'organization', id: org.id }
  };
}

export function spaceFromCommunity(community, memberCount = 0) {
  return {
    id: community.id,
    kind: 'community',
    title: community.name,
    engine: 'community',
    capabilities: ['members', 'chat', 'permissions'],
    memberCount,
    source: { type: 'community', id: community.id }
  };
}

export function spaceFromEvent(event) {
  return {
    id: event.id,
    kind: 'event',
    title: event.title,
    engine: 'events',
    capabilities: ['members', 'schedule', 'live', 'chat', 'notifications'],
    startsAt: event.startsAt,
    mode: event.mode || 'online',
    source: { type: 'event', id: event.id }
  };
}

/** Aggregate Spaces the user can see from existing collections. */
export function listSpacesForUser(userId, storeData = {}) {
  const spaces = [];
  const memberRoomIds = new Set(
    (storeData.conferenceMembers || []).filter(m => m.userId === userId).map(m => m.roomId)
  );
  for (const room of storeData.conferenceRooms || []) {
    if (room.ownerId === userId || memberRoomIds.has(room.id)) {
      const members = (storeData.conferenceMembers || []).filter(m => m.roomId === room.id);
      spaces.push(spaceFromConference(room, members));
    }
  }
  const orgIds = new Set(
    (storeData.orgMembers || []).filter(m => m.userId === userId).map(m => m.orgId)
  );
  for (const org of storeData.organizations || []) {
    if (org.ownerId === userId || orgIds.has(org.id)) {
      spaces.push(spaceFromOrg(org, {
        teams: (storeData.orgTeams || []).filter(t => t.orgId === org.id),
        documents: (storeData.orgDocuments || []).filter(d => d.orgId === org.id),
        tasks: (storeData.orgTasks || []).filter(t => t.orgId === org.id)
      }));
    }
  }
  const communityIds = new Set(
    (storeData.communityMembers || []).filter(m => m.userId === userId).map(m => m.communityId)
  );
  for (const c of storeData.communities || []) {
    if (c.ownerId === userId || communityIds.has(c.id)) {
      const count = (storeData.communityMembers || []).filter(m => m.communityId === c.id).length;
      spaces.push(spaceFromCommunity(c, count));
    }
  }
  for (const event of storeData.platformEvents || []) {
    if (event.ownerId === userId || (event.participantIds || []).includes(userId)) {
      spaces.push(spaceFromEvent(event));
    }
  }
  return spaces;
}

export function getSpace(spaceId, storeData = {}) {
  const room = (storeData.conferenceRooms || []).find(r => r.id === spaceId);
  if (room) {
    const members = (storeData.conferenceMembers || []).filter(m => m.roomId === room.id);
    return spaceFromConference(room, members);
  }
  const org = (storeData.organizations || []).find(o => o.id === spaceId);
  if (org) {
    return spaceFromOrg(org, {
      teams: (storeData.orgTeams || []).filter(t => t.orgId === org.id),
      documents: (storeData.orgDocuments || []).filter(d => d.orgId === org.id),
      tasks: (storeData.orgTasks || []).filter(t => t.orgId === org.id)
    });
  }
  const community = (storeData.communities || []).find(c => c.id === spaceId);
  if (community) {
    const count = (storeData.communityMembers || []).filter(m => m.communityId === community.id).length;
    return spaceFromCommunity(community, count);
  }
  const event = (storeData.platformEvents || []).find(e => e.id === spaceId);
  if (event) return spaceFromEvent(event);
  return null;
}
