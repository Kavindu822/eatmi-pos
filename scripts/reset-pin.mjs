import { getDatabase } from '../lib/db.ts';

try {
  const db = getDatabase();
  db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES('owner_pin', '1234')").run();
  console.log('\n========================================================');
  console.log(' [SUCCESS] Owner PIN has been successfully reset to: 1234');
  console.log(' Master Emergency Key is: EATMI-8899');
  console.log(' You can now unlock the Owner Portal using PIN: 1234');
  console.log('========================================================\n');
} catch (error) {
  console.error('[ERROR] Failed to reset PIN:', error);
}

