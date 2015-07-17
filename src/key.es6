import sh from './promishe';
import fs from 'q-io/fs';

function *getPublicKey(config) {
  if (!(yield fs.isFile(config.sshKey))) {
    yield sh(`ssh-keygen -f ${config.sshKey} -t rsa -N ''`);
  }
  return (yield fs.read(config.sshKey+'.pub')).toString();
}

export {getPublicKey};
