require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || '127.0.0.1'],
  localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
  keyspace: 'rtlms',
  queryOptions: { prepare: true },
});

client.connect()
  .then(() => console.log('✓ Cassandra connected to keyspace rtlms'))
  .catch(err => {
    console.error('✗ Cassandra connection failed:', err.message);
    process.exit(1);
  });

module.exports = client;
