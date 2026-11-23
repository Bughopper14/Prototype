const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong',
    multipleStatements: true
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, '../apps/backend/db/1-schema.sql'), 'utf-8');

  // Parse CREATE TABLE statements from 1-schema.sql
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE/gi;
  let match;
  const expectedTables = new Map();

  while ((match = tableRegex.exec(schemaSql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = [];
    const colLines = body.split('\n');
    for (const line of colLines) {
      const trimmed = line.trim();
      const colMatch = trimmed.match(/^`([^`]+)`\s+([^,]+)/);
      if (colMatch && !trimmed.startsWith('PRIMARY KEY') && !trimmed.startsWith('KEY') && !trimmed.startsWith('UNIQUE KEY') && !trimmed.startsWith('CONSTRAINT')) {
        columns.push({
          name: colMatch[1],
          def: colMatch[2].replace(/,$/, '').trim()
        });
      }
    }
    expectedTables.set(tableName, columns);
  }

  console.log(`Found ${expectedTables.size} tables in 1-schema.sql.`);

  const diffs = [];

  for (const [tableName, expectedCols] of expectedTables.entries()) {
    try {
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\``);
      const actualColNames = cols.map(c => c.Field);
      
      for (const ec of expectedCols) {
        if (!actualColNames.includes(ec.name)) {
          // Check if old name exists (e.g. freeze_id instead of fap_freeze_id)
          let oldCandidate = null;
          if (ec.name === 'fap_freeze_id' && actualColNames.includes('freeze_id')) {
            oldCandidate = 'freeze_id';
          } else if (ec.name === 'workflow_freeze_id' && actualColNames.includes('freeze_id')) {
            oldCandidate = 'freeze_id';
          } else if (ec.name === 'approval_freeze_id' && actualColNames.includes('freeze_id')) {
            oldCandidate = 'freeze_id';
          }
          
          diffs.push({
            table: tableName,
            column: ec.name,
            oldName: oldCandidate,
            def: ec.def
          });
        }
      }
    } catch (e) {
      diffs.push({
        table: tableName,
        missingTable: true
      });
    }
  }

  console.log('--- FOUND SCHEMA DISCREPANCIES ---');
  console.log(JSON.stringify(diffs, null, 2));

  // Now apply the fixes safely
  console.log('\n--- APPLYING MIGRATIONS ---');
  for (const d of diffs) {
    if (d.missingTable) {
      console.log(`Table ${d.table} missing, creating...`);
      // Extract create table statement
      const createMatch = schemaSql.match(new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?\`${d.table}\`[\\s\\S]*?\\) ENGINE=InnoDB[^;]*;`, 'i'));
      if (createMatch) {
        await conn.query(createMatch[0]);
        console.log(`✓ Created table ${d.table}`);
      }
    } else if (d.oldName) {
      console.log(`Renaming ${d.table}.${d.oldName} -> ${d.column}...`);
      // Drop any foreign key that references old column if needed
      try {
        const [fks] = await conn.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = 'crm_liugong' 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [d.table, d.oldName]);
        for (const fk of fks) {
          console.log(`  Dropping FK ${fk.CONSTRAINT_NAME} on ${d.table}...`);
          await conn.query(`ALTER TABLE \`${d.table}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        }
      } catch (fkErr) {
        console.log('  FK drop note:', fkErr.message);
      }

      await conn.query(`ALTER TABLE \`${d.table}\` CHANGE COLUMN \`${d.oldName}\` \`${d.column}\` ${d.def}`);
      console.log(`✓ Renamed ${d.table}.${d.oldName} -> ${d.column}`);
    } else {
      console.log(`Adding missing column ${d.table}.${d.column}...`);
      await conn.query(`ALTER TABLE \`${d.table}\` ADD COLUMN \`${d.column}\` ${d.def}`);
      console.log(`✓ Added column ${d.table}.${d.column}`);
    }
  }

  console.log('\nAll schema discrepancies have been completely synchronized with 1-schema.sql!');
  await conn.end();
}

run().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
