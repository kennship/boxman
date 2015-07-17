import PouchDB from 'pouchdb';
import path from 'path';

const debug = require('debug')('boxman');

function *loadDatabase(config) {
  const {
    configDir = path.join(process.env.HOME, '.boxman'),
    database = {}
  } = config;

  const {
    type = 'local',
    location = path.join(configDir, 'db'),
    username,
    password
  } = database;

  if (type === 'local') {
    return new PouchDB(location);
  } else {
    throw new Error(`Unrecognized database type ${type}`)
  }

}

export default loadDatabase;
