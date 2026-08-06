import 'dotenv/config';

import { runDatabaseSecurityMigration } from '../server/database-security-migration.js';

const apply = process.argv.includes('--apply');

function printState(state) {
  console.log(`Database role: ${state.role?.current_user || 'unknown'}`);
  console.table(
    state.tables.map((table) => ({
      table: table.table_name,
      owner: table.owner_name,
      rls: table.rls_enabled,
      forced: table.rls_forced,
      runtimeOwner: table.runtime_owns_or_inherits,
      anonAccess: table.anon_has_any,
      authenticatedAccess: table.authenticated_has_any,
      publicAccess: table.public_has_any,
      denyPolicy: table.deny_policy_exists,
    })),
  );
}

const result = await runDatabaseSecurityMigration({ apply });
printState(result.after);
console.log(
  result.applied
    ? 'Database security migration applied and verified.'
    : 'Database security check passed.',
);
