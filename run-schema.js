const fs = require('fs');
const { Client } = require('pg');

const regions = [
  'us-east-1', 'us-west-1', 'us-west-2', 
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2',
  'ca-central-1', 'sa-east-1'
];

async function run() {
  const sql = fs.readFileSync('schema.sql', 'utf8');
  let success = false;

  for (const region of regions) {
    if (success) break;
    
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connectionString = `postgresql://postgres.fketanlqcxdfnncarnzh:Pokemon%400918723@${host}:6543/postgres`;
    
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      console.log(`Trying ${region}...`);
      await client.connect();
      console.log(`✅ Connected successfully to ${region}!`);
      
      console.log('Executing schema.sql...');
      await client.query(sql);
      console.log('🎉 Schema executed successfully!');
      success = true;
    } catch (err) {
      console.log(`❌ Failed on ${region}`);
    } finally {
      await client.end().catch(() => {});
    }
  }

  if (!success) {
    console.error('Could not connect to any region.');
  }
}

run();
