import {pool, checkMysql, readMenu, writeMenu} from '../../db/pool';
import {ensure} from '../../domain';
import {get, post, put, patch} from '../router';
import crypto from 'node:crypto';

/* ---------- health ---------- */

get('/health', () => ({status: 'ok'}), {public: true});
get(
  '/mysql/health',
  async () => {
    await checkMysql();
    return {status: 'ok', database: process.env.DB_NAME};
  },
  {public: true},
);

/* ---------- current user ---------- */

get('/auth/me', req => ({...req.actor, sessionId: undefined}));
post('/auth/logout', async (req, res) => {
  const {endSession, sessionCookie} = await import('../../auth/session');
  await endSession(req.actor.sessionId);
  res.setHeader('Set-Cookie', sessionCookie(null, req.headers));
  return {ok: true};
});

/* ---------- mandatory-field rules ---------- */

const MANDATORY_SQL =
  'SELECT id, stage, section, field_key, field_label, mandatory FROM master_mandatory ORDER BY stage, section, id';
const listMandatory = async () => (await pool.query<any[]>(MANDATORY_SQL))[0];
get(['/mandatory', '/master-mandatory'], listMandatory, {public: true});
put(['/mandatory', '/master-mandatory'], async req => {
  const {id, section, fieldKey, field_key, mandatory} = req.body;
  const flag = mandatory === 1 || mandatory === true || mandatory === '1' ? 1 : 0;
  if (id !== undefined && id !== null) {
    await pool.execute('UPDATE master_mandatory SET mandatory=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [
      flag,
      id,
    ]);
  } else if (section && (fieldKey || field_key)) {
    await pool.execute(
      'UPDATE master_mandatory SET mandatory=?, updated_at=CURRENT_TIMESTAMP WHERE section=? AND field_key=?',
      [flag, section, fieldKey || field_key],
    );
  }
  return listMandatory();
});

/* ---------- wilayah (location) reverse lookup ---------- */

const clean = (s: unknown) =>
  String(s || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
const VILLAGE_SELECT = `SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
  d.id AS district_id, d.name AS district_name, c.id AS city_id, c.name AS city_name, p.id AS province_id, p.name AS province_name
  FROM master_kelurahan_desa v JOIN master_kecamatan d ON v.kecamatan_id=d.id
  JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id JOIN master_provinsi p ON c.provinsi_id=p.id`;
const DISTRICT_SELECT = `SELECT NULL AS village_id, NULL AS village_name, NULL AS postal_code,
  d.id AS district_id, d.name AS district_name, c.id AS city_id, c.name AS city_name, p.id AS province_id, p.name AS province_name
  FROM master_kecamatan d JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id JOIN master_provinsi p ON c.provinsi_id=p.id`;

get(
  '/wilayah/reverse-lookup',
  async req => {
    const kel = clean(req.query.kelurahan),
      kec = clean(req.query.kecamatan),
      pos = clean(req.query.postalCode);
    const attempts: Array<[boolean, string, string[]]> = [
      [
        Boolean(kec && kel),
        `${VILLAGE_SELECT} WHERE REPLACE(UPPER(d.name),' ','')=? AND REPLACE(UPPER(v.name),' ','')=? LIMIT 1`,
        [kec, kel],
      ],
      [
        Boolean(pos && kec),
        `${VILLAGE_SELECT} WHERE v.postal_code=? AND REPLACE(UPPER(d.name),' ','')=? LIMIT 1`,
        [pos, kec],
      ],
      [Boolean(pos), `${VILLAGE_SELECT} WHERE v.postal_code=? LIMIT 1`, [pos]],
      [Boolean(kec), `${DISTRICT_SELECT} WHERE REPLACE(UPPER(d.name),' ','')=? LIMIT 1`, [kec]],
      [Boolean(kel), `${VILLAGE_SELECT} WHERE REPLACE(UPPER(v.name),' ','')=? LIMIT 1`, [kel]],
    ];
    for (const [enabled, sql, args] of attempts) {
      if (!enabled) continue;
      const [rows] = await pool.query<any[]>(sql, args);
      const row = rows[0];
      if (row) {
        return {
          found: true,
          province: row.province_name,
          provinceId: row.province_id,
          city: row.city_name,
          cityRegency: row.city_name,
          cityId: row.city_id,
          district: row.district_name,
          districtId: row.district_id,
          village: row.village_name,
          villageId: row.village_id,
          postalCode: row.postal_code,
        };
      }
    }
    return {found: false};
  },
  {public: true},
);

/* ---------- workspace menus, activity, notifications ---------- */

get('/workspace-data/:menu', req => readMenu(req.params.menu));
post('/workspace-data/:menu', async (req, res) => {
  res.status(201);
  return writeMenu(req.params.menu, req.body?.payload);
});

post('/user-activity', req => ({ok: true, action: req.body?.action}));

get('/activity', async () => {
  const [rows] = await pool.query<any[]>(`
    SELECT l.id, l.application_id AS applicationId, l.action_by AS actionBy, l.user_role AS userRole,
           l.previous_status AS previousStatus, l.new_status AS newStatus, l.comments,
           l.action_timestamp AS actionTimestamp, COALESCE(f.company_name, '') AS companyName
    FROM application_activity l
    LEFT JOIN all_applications a ON a.application_id = l.application_id
    LEFT JOIN new_application_fap_stage f ON f.id_fap_stage = a.id_fap_stage
    ORDER BY l.action_timestamp DESC LIMIT 100`);
  return rows;
});

get('/notifications', async req => {
  const [rows] = await pool.query<any[]>(
    `SELECT id, application_id AS applicationId, deed_id AS deedId, title, message, read_at AS readAt, created_at AS createdAt
     FROM notifications WHERE recipient_user_id=? ORDER BY created_at DESC LIMIT 200`,
    [req.actor.id],
  );
  return rows;
});
patch('/notifications/:id/read', async req => {
  const [result] = await pool.execute<any>(
    'UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP(3)) WHERE id=? AND recipient_user_id=?',
    [req.params.id, req.actor.id],
  );
  ensure(result.affectedRows, 'Notifikasi tidak ditemukan.', 404);
  return {ok: true};
});

export const newNotification = (
  recipient: string,
  applicationId: string,
  deedId: string,
  title: string,
  message: string,
) =>
  pool.execute(
    'INSERT INTO notifications(id,recipient_user_id,application_id,deed_id,title,message) VALUES(?,?,?,?,?,?)',
    [crypto.randomUUID(), recipient, applicationId, deedId, title, message],
  );
