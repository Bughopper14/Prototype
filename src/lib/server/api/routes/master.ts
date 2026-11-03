import {pool} from '../../db/pool';
import {Problem, ensure} from '../../domain';
import {validateMasterCatalog, type MasterCatalog} from '@/lib/shared/master-catalog';
import {saveLocations} from '@/lib/server/db/repositories/location';
import {saveCustomerMasters} from '@/lib/server/db/repositories/customer-masters';
import {saveBusinessMasters} from '@/lib/server/db/repositories/business-masters';
import {saveLegalMasters} from '@/lib/server/db/repositories/legal-masters';
import {saveFinanceMasters} from '@/lib/server/db/repositories/finance-masters';
import {saveEquipmentMasters} from '@/lib/server/db/repositories/equipment-masters';
import {saveDocumentMasters} from '@/lib/server/db/repositories/document-masters';
import {get, put} from '../router';
import {invalidateMasterData, masterData, masterDataGzip} from '../context';

get('/master-data', async (req, res) => {
  const data = await masterData();
  if (String(req.headers.get('accept-encoding') || '').includes('gzip')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('Content-Encoding', 'gzip');
    return res.send(masterDataGzip(data));
  }
  return data;
});

put('/master-data', async req => {
  let catalog: MasterCatalog;
  try { catalog = validateMasterCatalog(req.body.catalog); } catch (e: any) { throw new Problem(422, e.message); }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SELECT id FROM master_data WHERE id=1 FOR UPDATE');
    const previous = await masterData(conn, true);
    ensure(req.body.revision === previous.revision, 'Master data telah berubah. Muat ulang lalu simpan kembali.', 409);
    for (const rows of Object.values(previous.catalog as Record<string, any[]>)) {
      const values = new Set((rows || []).map(x => x.value));
      for (const row of rows || []) ensure(values.has(row.value), 'Data lama harus dipertahankan. Gunakan status tidak aktif untuk menonaktifkan pilihan.');
    }
    await saveLocations(catalog, previous.catalog);
    await saveCustomerMasters(catalog);
    await saveBusinessMasters(catalog);
    await saveLegalMasters(catalog);
    await saveFinanceMasters(catalog);
    await saveEquipmentMasters(catalog);
    await saveDocumentMasters(catalog);
    await conn.query('UPDATE master_data SET catalog=?,revision=revision+1 WHERE id=1', [JSON.stringify(catalog)]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  invalidateMasterData();
  return masterData(undefined, true);
});
