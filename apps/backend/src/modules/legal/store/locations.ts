/** Resolves stakeholder location IDs and readable names against crm_master_* location tables. */
import {resolveLocationIds, resolveLocationNames} from '../../../core/db/crm-lookups';

export async function stakeholderLocationNames(conn: any, input: any) {
  const ids = await resolveLocationIds(
    {
      country: input?.country || 'Indonesia',
      province: input?.province,
      city: input?.city || input?.cityRegency,
      district: input?.district,
      village: input?.village,
      postalCode: input?.postalCode || input?.postalZip,
    },
    conn,
  );
  const names = await resolveLocationNames(
    {
      country_id: ids.countryId,
      province_id: ids.provinceId,
      city_id: ids.cityId,
      district_id: ids.districtId,
      village_id: ids.villageId,
      postal_code_id: ids.postalCodeId,
    },
    conn,
  );
  return {ids, names};
}

export async function migrateStakeholderLocationNames() {
  // Locations use normalized UUID FKs in crm_liugong1; no legacy column backfill needed.
}
