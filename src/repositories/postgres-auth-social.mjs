function iso(value) { return value instanceof Date ? value.toISOString() : String(value || ''); }
function userFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    bio: row.bio || '',
    locale: row.locale || 'uk',
    avatar: row.avatar || '',
    role: row.role || 'user',
    status: row.status || 'active',
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at || row.created_at)
  };
}
function postFromRow(row) { return row ? { id: row.id, userId: row.user_id, text: row.body || '', kind: row.kind || 'text', createdAt: iso(row.created_at) } : null; }
function commentFromRow(row) { return row ? { id:row.id,postId:row.post_id,userId:row.user_id,text:row.body||'',createdAt:iso(row.created_at) } : null; }
function messageFromRow(row) { return row ? { id:row.id,conversationId:row.conversation_id,userId:row.user_id,text:row.body||'',createdAt:iso(row.created_at),editedAt:row.edited_at?iso(row.edited_at):null } : null; }
function notificationFromRow(row) { return row ? { id:row.id,userId:row.user_id,actorId:row.actor_id,type:row.type,payload:row.payload||{},read:!!row.read_at,createdAt:iso(row.created_at) } : null; }

export class PostgresAuthSocialRepository {
  constructor(pool = null) { this.pool = pool; }
  get enabled() { return !!this.pool; }

  async accountExists(email, username) {
    const result = await this.pool.query('SELECT 1 FROM users WHERE lower(email)=lower($1) OR lower(username)=lower($2) LIMIT 1', [email, username]);
    return result.rowCount > 0;
  }

  async register(user, session, provisionAccount = null) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO users(id,email,username,password_hash,display_name,bio,locale,avatar,role,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [user.id,user.email,user.username,user.passwordHash,user.displayName,user.bio,user.locale,user.avatar,user.role,user.status||'active',user.createdAt,user.updatedAt||user.createdAt]);
      await client.query('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES($1,$2,$3,$4)', [session.tokenHash,user.id,session.expiresAt,session.createdAt]);
      if (provisionAccount) await provisionAccount(client);
      await client.query('COMMIT');
    } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; }
    finally { client.release(); }
  }

  async findUserByIdentity(identity) {
    const result = await this.pool.query('SELECT * FROM users WHERE lower(email)=lower($1) OR lower(username)=lower($1) LIMIT 1', [identity]);
    return userFromRow(result.rows[0]);
  }

  async findUserById(id) {
    const result = await this.pool.query('SELECT * FROM users WHERE id=$1 LIMIT 1', [id]);
    return userFromRow(result.rows[0]);
  }

  async findUserByUsername(username) {
    const result = await this.pool.query('SELECT * FROM users WHERE lower(username)=lower($1) LIMIT 1', [username]);
    return userFromRow(result.rows[0]);
  }

  async listUsers(query = '') {
    const q = String(query || '').trim();
    const result = q ? await this.pool.query("SELECT * FROM users WHERE status='active' AND (username ILIKE $1 OR display_name ILIKE $1) ORDER BY created_at DESC LIMIT 50", [`%${q}%`]) : await this.pool.query("SELECT * FROM users WHERE status='active' ORDER BY created_at DESC LIMIT 50");
    return result.rows.map(userFromRow);
  }

  async createSession(session) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const account = await client.query('SELECT status FROM users WHERE id=$1 FOR SHARE', [session.userId]);
      if (!account.rowCount || account.rows[0].status !== 'active') {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query(
        'INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES($1,$2,$3,$4)',
        [session.tokenHash, session.userId, session.expiresAt, session.createdAt]
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }
  async deleteSession(tokenHash) { const result=await this.pool.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash]); return result.rowCount>0; }

  async deleteExpiredSessions() { const result=await this.pool.query('DELETE FROM sessions WHERE expires_at<=now()'); return result.rowCount; }

  async userForSession(tokenHash) {
    const result = await this.pool.query("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active' LIMIT 1", [tokenHash]);
    return userFromRow(result.rows[0]);
  }

  async patchUser(userId, patch = {}, updatedAt = new Date().toISOString()) {
    const values = [userId, updatedAt];
    const assignments = ['updated_at=$2'];
    const columns = [
      ['displayName', 'display_name'],
      ['bio', 'bio'],
      ['locale', 'locale'],
      ['avatar', 'avatar']
    ];
    for (const [field, column] of columns) {
      if (!Object.hasOwn(patch, field)) continue;
      values.push(patch[field]);
      assignments.push(`${column}=$${values.length}`);
    }
    const result = await this.pool.query(
      `UPDATE users SET ${assignments.join(',')} WHERE id=$1 RETURNING *`,
      values
    );
    return userFromRow(result.rows[0]);
  }

  async createPost(post) {
    const result = await this.pool.query('INSERT INTO posts(id,user_id,kind,body,created_at) VALUES($1,$2,$3,$4,$5) RETURNING *', [post.id,post.userId,post.kind,post.text,post.createdAt]);
    return postFromRow(result.rows[0]);
  }

  async findPost(id) { const result = await this.pool.query('SELECT * FROM posts WHERE id=$1 LIMIT 1', [id]); return postFromRow(result.rows[0]); }

  async listPosts(limit = 100) {
    const result = await this.pool.query('SELECT p.*,u.email AS author_email,u.username AS author_username,u.display_name AS author_display_name,u.bio AS author_bio,u.locale AS author_locale,u.avatar AS author_avatar,u.role AS author_role,u.created_at AS author_created_at FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT $1', [Math.max(1,Math.min(200,Number(limit)||100))]);
    return result.rows.map(row => ({ post: postFromRow(row), author: userFromRow({id:row.user_id,email:row.author_email,username:row.author_username,password_hash:'',display_name:row.author_display_name,bio:row.author_bio,locale:row.author_locale,avatar:row.author_avatar,role:row.author_role,created_at:row.author_created_at}) }));
  }

  async engagementForPosts(postIds, viewerId = null) {
    if (!postIds.length) return new Map();
    const [comments,reactions,mine] = await Promise.all([
      this.pool.query('SELECT post_id,count(*)::int AS count FROM comments WHERE post_id=ANY($1::uuid[]) GROUP BY post_id',[postIds]),
      this.pool.query('SELECT post_id,count(*)::int AS count FROM reactions WHERE post_id=ANY($1::uuid[]) GROUP BY post_id',[postIds]),
      viewerId?this.pool.query('SELECT post_id FROM reactions WHERE post_id=ANY($1::uuid[]) AND user_id=$2',[postIds,viewerId]):Promise.resolve({rows:[]})
    ]);
    const map=new Map(postIds.map(id=>[id,{commentCount:0,reactionCount:0,reacted:false}]));
    comments.rows.forEach(r=>{if(map.has(r.post_id))map.get(r.post_id).commentCount=Number(r.count)});reactions.rows.forEach(r=>{if(map.has(r.post_id))map.get(r.post_id).reactionCount=Number(r.count)});mine.rows.forEach(r=>{if(map.has(r.post_id))map.get(r.post_id).reacted=true});return map;
  }

  async toggleReaction(postId,userId){const client=await this.pool.connect();try{await client.query('BEGIN');const removed=await client.query("DELETE FROM reactions WHERE post_id=$1 AND user_id=$2 AND kind='spark' RETURNING post_id",[postId,userId]);let reacted=false;if(!removed.rowCount){await client.query("INSERT INTO reactions(post_id,user_id,kind) VALUES($1,$2,'spark')",[postId,userId]);reacted=true}await client.query('COMMIT');return reacted}catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}}
  async listComments(postId){const result=await this.pool.query('SELECT c.*,u.email AS author_email,u.username AS author_username,u.display_name AS author_display_name,u.bio AS author_bio,u.locale AS author_locale,u.avatar AS author_avatar,u.role AS author_role,u.created_at AS author_created_at FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at',[postId]);return result.rows.map(row=>({comment:commentFromRow(row),author:userFromRow({id:row.user_id,email:row.author_email,username:row.author_username,password_hash:'',display_name:row.author_display_name,bio:row.author_bio,locale:row.author_locale,avatar:row.author_avatar,role:row.author_role,created_at:row.author_created_at})}))}
  async createComment(comment){const result=await this.pool.query('INSERT INTO comments(id,post_id,user_id,body,created_at) VALUES($1,$2,$3,$4,$5) RETURNING *',[comment.id,comment.postId,comment.userId,comment.text,comment.createdAt]);return commentFromRow(result.rows[0])}
  async toggleFollow(followerId,followingId){const client=await this.pool.connect();try{await client.query('BEGIN');const removed=await client.query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2 RETURNING follower_id',[followerId,followingId]);let following=false;if(!removed.rowCount){await client.query('INSERT INTO follows(follower_id,following_id) VALUES($1,$2)',[followerId,followingId]);following=true}await client.query('COMMIT');return following}catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}}
  async block(blockerId,blockedId){const client=await this.pool.connect();try{await client.query('BEGIN');await client.query('INSERT INTO blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[blockerId,blockedId]);await client.query('DELETE FROM follows WHERE (follower_id=$1 AND following_id=$2) OR (follower_id=$2 AND following_id=$1)',[blockerId,blockedId]);await client.query('COMMIT')}catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}}
  async unblock(blockerId,blockedId){await this.pool.query('DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2',[blockerId,blockedId])}
  async isBlockedBetween(a,b){const result=await this.pool.query('SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1',[a,b]);return result.rowCount>0}
  async blockedUserIds(userId){const result=await this.pool.query('SELECT CASE WHEN blocker_id=$1 THEN blocked_id ELSE blocker_id END AS user_id FROM blocks WHERE blocker_id=$1 OR blocked_id=$1',[userId]);return result.rows.map(r=>r.user_id)}
  async listBlockedUsers(userId){const result=await this.pool.query('SELECT u.* FROM blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.created_at DESC',[userId]);return result.rows.map(userFromRow)}

  directKey(a,b){return [a,b].sort().join(':')}
  async getOrCreateConversation(a,b,id,createdAt){const key=this.directKey(a,b);let result=await this.pool.query('SELECT id,created_at FROM conversations WHERE direct_key=$1 LIMIT 1',[key]);if(!result.rowCount){const client=await this.pool.connect();try{await client.query('BEGIN');result=await client.query('INSERT INTO conversations(id,direct_key,created_at) VALUES($1,$2,$3) ON CONFLICT(direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING id,created_at',[id,key,createdAt]);const conversationId=result.rows[0].id;await client.query('INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING',[conversationId,a,b]);await client.query('COMMIT')}catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}}return {id:result.rows[0].id,memberIds:[a,b],createdAt:iso(result.rows[0].created_at)}}
  async conversationForUser(id,userId){const result=await this.pool.query('SELECT c.id,c.created_at FROM conversations c JOIN conversation_members mine ON mine.conversation_id=c.id AND mine.user_id=$2 WHERE c.id=$1',[id,userId]);if(!result.rowCount)return null;const members=await this.pool.query('SELECT user_id FROM conversation_members WHERE conversation_id=$1 ORDER BY joined_at',[id]);return {id,memberIds:members.rows.map(r=>r.user_id),createdAt:iso(result.rows[0].created_at)}}
  async listConversations(userId){const rows=await this.pool.query('SELECT c.id,c.created_at FROM conversations c JOIN conversation_members mine ON mine.conversation_id=c.id WHERE mine.user_id=$1 ORDER BY c.created_at DESC',[userId]);return Promise.all(rows.rows.map(async row=>{const members=await this.pool.query('SELECT u.* FROM conversation_members cm JOIN users u ON u.id=cm.user_id WHERE cm.conversation_id=$1',[row.id]);const last=await this.pool.query('SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 1',[row.id]);return {id:row.id,memberIds:members.rows.map(r=>r.id),members:members.rows.map(userFromRow),lastMessage:messageFromRow(last.rows[0]),createdAt:iso(row.created_at)}}))}
  async listMessages(conversationId){const result=await this.pool.query('SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC LIMIT 200',[conversationId]);return result.rows.map(messageFromRow)}
  async createMessage(message){const result=await this.pool.query('INSERT INTO messages(id,conversation_id,user_id,body,created_at,edited_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[message.id,message.conversationId,message.userId,message.text,message.createdAt,message.editedAt]);return messageFromRow(result.rows[0])}
  async createNotification(notification){await this.pool.query('INSERT INTO notifications(id,user_id,actor_id,type,payload,created_at) VALUES($1,$2,$3,$4,$5,$6)',[notification.id,notification.userId,notification.actorId,notification.type,notification.payload,notification.createdAt])}
  async listNotifications(userId){const result=await this.pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[userId]);return result.rows.map(notificationFromRow)}
  async socialStats(userId){const [posts,followers,following]=await Promise.all([this.pool.query('SELECT count(*)::int AS n FROM posts WHERE user_id=$1',[userId]),this.pool.query('SELECT count(*)::int AS n FROM follows WHERE following_id=$1',[userId]),this.pool.query('SELECT count(*)::int AS n FROM follows WHERE follower_id=$1',[userId])]);return {posts:Number(posts.rows[0]?.n||0),followers:Number(followers.rows[0]?.n||0),following:Number(following.rows[0]?.n||0)}}
}
