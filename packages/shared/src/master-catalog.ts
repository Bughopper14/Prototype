export type MasterItem = {
  value: string;
  name: string;
  active: boolean;
  parentValue?: string;
  required?: boolean;
  role?: string;
  timing?: string;
  areaCode?: string;
  region?: string;
  zipCode?: string;
  /** Currency symbol (crm_master_currencies.symbol). */
  symbol?: string;
  /** BANK / MULTIFINANCE / OTHER (crm_master_financial_institutions.institution_type). */
  institutionType?: string;
  /** ALL / ESTABLISHMENT / AMENDMENT (crm_master_legal_remark_categories.deed_scope). */
  deedScope?: string;
  /** Document types: display title, default section, description and workflow stage code. */
  title?: string;
  section?: string;
  description?: string;
  stage?: string;
  /** FAP checklist options: the FAP sheet cell id, the group heading and whether the box is shown. */
  paramKey?: string;
  groupLabel?: string;
  visible?: boolean;
  /** Workflow: stage order (workflowStage) and whether a status is final (workflowStatus). */
  sequence?: number;
  terminal?: boolean;
};
export type MasterCatalog = Record<string, MasterItem[]>;
export type MasterGroup = {key: string; name: string; section: string; parent?: string; parentField?: string};
export const masterGroups: MasterGroup[] = [
  {key: 'branchCode', name: 'Branch', section: 'Customer & PIC'},
  {key: 'companyType', name: 'Business Category', section: 'Customer & PIC'},
  {key: 'industrySegment', name: 'Industry', section: 'Customer & PIC'},
  {key: 'businessRole', name: 'Business Role', section: 'Customer & PIC'},
  {key: 'position', name: 'Position PIC', section: 'Customer & PIC'},
  {key: 'locationStatus', name: 'Business Premises Status', section: 'Customer & PIC'},
  {key: 'remarkCategoryId', name: 'Remarks Category', section: 'Legal'},
  {key: 'representativeType', name: 'Representative Type', section: 'Legal'},
  {key: 'designation', name: 'Designation', section: 'Legal'},
  {key: 'positions', name: 'Stakeholder Position', section: 'Legal'},
  {key: 'country', name: 'Country', section: 'Address'},
  {key: 'province', name: 'Province', section: 'Address', parent: 'country', parentField: 'country'},
  {key: 'city', name: 'City / Regency', section: 'Address', parent: 'province', parentField: 'province'},
  {key: 'district', name: 'District', section: 'Address', parent: 'city', parentField: 'cityRegency'},
  {
    key: 'village',
    name: 'Village / Sub-district',
    section: 'Address',
    parent: 'district',
    parentField: 'district',
  },
  {key: 'postalCode', name: 'ZIP Code', section: 'Address', parent: 'city', parentField: 'cityRegency'},
  {key: 'bankOrFinInstitution', name: 'Bank / Financial Institution', section: 'Business & banks'},
  {key: 'projectRole', name: 'Role in Project', section: 'Business & banks'},
  {key: 'applicationSource', name: 'Application Source', section: 'Business & banks'},
  {key: 'unitCategory', name: 'Unit Category', section: 'Equipment'},
  {key: 'brand', name: 'Brand', section: 'Equipment', parent: 'unitCategory', parentField: 'unitCategory'},
  {key: 'unitType', name: 'Type', section: 'Equipment', parent: 'brand', parentField: 'brand'},
  {key: 'modelName', name: 'Model', section: 'Equipment', parent: 'unitType', parentField: 'unitType'},
  {key: 'assetName', name: 'Asset Name', section: 'Equipment', parent: 'modelName', parentField: 'modelName'},
  {key: 'facilityPurpose', name: 'Facility Purpose', section: 'Financing'},
  {key: 'financingMethod', name: 'Financing Method', section: 'Financing'},
  {key: 'currency', name: 'Currency', section: 'Financing'},
  {key: 'paymentMethod', name: 'Payment Timing', section: 'Financing'},
  {key: 'documents', name: 'Document Types & Required', section: 'Documents'},
  {key: 'preanInvestmentPlanOptions', name: 'Investment Plan Options', section: 'Pre-Analysis'},
];
export const masterKey = (key: string) => (key === 'cityRegency' ? 'city' : key);
/**
 * An empty catalog with every group present. All values come from the crm_ master tables (plan-seed.sql); nothing is
 * hardcoded here any more.
 */
export function emptyMasterCatalog(): MasterCatalog {
  return Object.fromEntries(masterGroups.map(g => [g.key, [] as MasterItem[]]));
}

export function validateMasterGroupItems(
  groupKey: string,
  rows: unknown[],
  lookupParent?: Set<string>,
): MasterItem[] {
  const group = masterGroups.find(g => g.key === groupKey);
  const groupName = group ? group.name : groupKey;
  if (
    !Array.isArray(rows) ||
    rows.length >
      (['province', 'city', 'district', 'village', 'postalCode'].includes(groupKey) ? 150000 : 1000)
  ) {
    throw Error(`${groupName} list is not valid.`);
  }
  const seen = new Set<string>();
  const seenNames = new Set<string>();

  const result: MasterItem[] = (rows as any[]).map((row: any) => {
    if (
      !row ||
      typeof row.value !== 'string' ||
      typeof row.name !== 'string' ||
      typeof row.active !== 'boolean'
    ) {
      throw Error(`${groupName} data is not valid.`);
    }
    const value = row.value.trim(),
      name = row.name.trim();
    const valueLimit =
      (
        {
          postalCode: 20,
          currency: 5,
          branchCode: 20,
          brand: 50,
          paymentMethod: 50,
          position: 100,
          projectRole: 100,
          applicationSource: 100,
          province: 100,
          city: 100,
          district: 100,
          village: 100,
          modelName: 100,
        } as Record<string, number>
      )[groupKey] || 150;

    if (value.length > valueLimit)
      throw Error(`${groupName} code exceeds maximum of ${valueLimit} characters.`);
    if (!value || value.length > 150 || !name || name.length > 150)
      throw Error('Code and name are required, maximum 150 characters.');
    const uniqueValue =
      groupKey === 'postalCode' ? `${row.parentValue || ''}|${value.toLowerCase()}` : value.toLowerCase();
    if (seen.has(uniqueValue)) throw Error(`Duplicate code in ${groupName}.`);
    seen.add(uniqueValue);

    const nameKey = (row.parentValue || '') + '|' + name.toLocaleLowerCase();
    if (seenNames.has(nameKey) && !['province', 'city', 'district', 'village'].includes(groupKey)) {
      throw Error(`Duplicate name in ${groupName}.`);
    }
    seenNames.add(nameKey);

    if (groupKey === 'paymentMethod' && !['advance', 'arrear'].includes(row.timing || '')) {
      throw Error('Please select the payment timing rule.');
    }
    for (const [key, limit] of [
      ['areaCode', 20],
      ['region', 100],
      ['zipCode', 20],
    ] as const) {
      if (row[key] !== undefined && (typeof row[key] !== 'string' || row[key]!.trim().length > limit)) {
        throw Error(`Field ${key} exceeds maximum of ${limit} characters.`);
      }
    }
    if (lookupParent && group?.parent && row.parentValue && !lookupParent.has(row.parentValue)) {
      throw Error(`Parent data not available for ${groupName}.`);
    }

    return {
      value,
      name,
      active: row.active,
      ...(row.areaCode ? {areaCode: row.areaCode.trim()} : {}),
      ...(row.region ? {region: row.region.trim()} : {}),
      ...(row.zipCode ? {zipCode: row.zipCode.trim()} : {}),
      ...(row.parentValue ? {parentValue: String(row.parentValue)} : {}),
      ...(groupKey === 'paymentMethod' ? {timing: row.timing} : {}),
      ...(groupKey === 'currency' && typeof row.symbol === 'string' ? {symbol: row.symbol.trim().slice(0, 10)} : {}),
      ...(groupKey === 'bankOrFinInstitution' && ['BANK', 'MULTIFINANCE', 'OTHER'].includes(row.institutionType)
        ? {institutionType: row.institutionType}
        : {}),
      ...(groupKey === 'remarkCategoryId' && ['ALL', 'ESTABLISHMENT', 'AMENDMENT'].includes(row.deedScope)
        ? {deedScope: row.deedScope}
        : {}),
    };
  });

  if (groupKey === 'documents') {
    if (!result.some(x => x.value === 'NPWP-EKITAS') || !result.some(x => x.value === 'LEGAL-OPINION')) {
      throw Error('NPWP / E-KITAS and Legal opinion documents must be retained for the review workflow.');
    }
  }

  return result;
}

export function validateMasterCatalog(input: unknown): MasterCatalog {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Master data is not valid.');
  const result: MasterCatalog = {};
  for (const group of masterGroups) {
    const rows = (input as MasterCatalog)[group.key];
    result[group.key] = validateMasterGroupItems(group.key, rows);
  }
  const lookup = Object.fromEntries(
    Object.entries(result).map(([key, rows]) => [key, new Map(rows.map(x => [x.value, x]))]),
  );
  for (const group of masterGroups) {
    for (const row of result[group.key]) {
      if (group.key === 'village' && row.zipCode) {
        const district = lookup.district.get(row.parentValue || ''),
          zipRows = result.postalCode.filter(zip => zip.value === row.zipCode);
        if (!zipRows.length) throw Error('ZIP code is not available in master data.');
        if (!district || !zipRows.some(zip => zip.parentValue === district.parentValue))
          throw Error('ZIP code must belong to the same city/regency as the village.');
      }
      if (group.parent && row.parentValue && !lookup[group.parent].has(row.parentValue))
        throw Error('Parent data not available for ' + group.name + '.');
    }
  }
  return result;
}
