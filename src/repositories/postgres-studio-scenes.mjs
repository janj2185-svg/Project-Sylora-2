function iso(value) {
  return value instanceof Date ? value.toISOString() : String(value || '');
}

function sceneFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    overlayTitle: row.overlay_title,
    overlayStyle: row.overlay_style,
    profileId: row.profile_id,
    micGain: Number(row.mic_gain),
    micMuted: !!row.mic_muted,
    actionId: row.action_id || null,
    aiPlan: row.ai_plan && typeof row.ai_plan === 'object' ? row.ai_plan : {},
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

export class PostgresStudioSceneRepository {
  constructor(pool = null) { this.pool = pool; }
  get enabled() { return !!this.pool; }

  async listScenes(userId) {
    const result = await this.pool.query(
      'SELECT * FROM studio_scenes WHERE user_id=$1 ORDER BY updated_at DESC,id DESC',
      [userId]
    );
    return result.rows.map(sceneFromRow);
  }

  async getScene(userId, id) {
    const result = await this.pool.query(
      'SELECT * FROM studio_scenes WHERE id=$1 AND user_id=$2 LIMIT 1',
      [id, userId]
    );
    return sceneFromRow(result.rows[0]);
  }

  async createScene(scene) {
    const result = await this.pool.query(
      `INSERT INTO studio_scenes(
        id,user_id,name,overlay_title,overlay_style,profile_id,mic_gain,mic_muted,
        action_id,action_user_id,ai_plan,created_at,updated_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        scene.id, scene.userId, scene.name, scene.overlayTitle, scene.overlayStyle,
        scene.profileId, scene.micGain, scene.micMuted, scene.actionId || null,
        scene.actionId ? scene.userId : null, JSON.stringify(scene.aiPlan || {}),
        scene.createdAt, scene.updatedAt
      ]
    );
    return sceneFromRow(result.rows[0]);
  }

  async createSceneOnce(scene) {
    const result = await this.pool.query(
      `INSERT INTO studio_scenes(
        id,user_id,name,overlay_title,overlay_style,profile_id,mic_gain,mic_muted,
        action_id,action_user_id,ai_plan,created_at,updated_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT(id) DO UPDATE SET id=EXCLUDED.id
      WHERE studio_scenes.user_id=EXCLUDED.user_id RETURNING *`,
      [
        scene.id, scene.userId, scene.name, scene.overlayTitle, scene.overlayStyle,
        scene.profileId, scene.micGain, scene.micMuted, scene.actionId || null,
        scene.actionId ? scene.userId : null, JSON.stringify(scene.aiPlan || {}),
        scene.createdAt, scene.updatedAt
      ]
    );
    return sceneFromRow(result.rows[0]);
  }

  async updateScene(scene) {
    const result = await this.pool.query(
      `UPDATE studio_scenes SET
        name=$3,overlay_title=$4,overlay_style=$5,profile_id=$6,mic_gain=$7,mic_muted=$8,updated_at=$9
      WHERE id=$1 AND user_id=$2 RETURNING *`,
      [
        scene.id, scene.userId, scene.name, scene.overlayTitle, scene.overlayStyle,
        scene.profileId, scene.micGain, scene.micMuted, scene.updatedAt
      ]
    );
    return sceneFromRow(result.rows[0]);
  }

  async deleteScene(userId, id) {
    const result = await this.pool.query(
      'DELETE FROM studio_scenes WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, userId]
    );
    return result.rowCount > 0;
  }
}
