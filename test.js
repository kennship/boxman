import co from 'co';

import {createBox, destroyBox} from './index';

co(function *() {
  const droplet = yield createBox({playbook: 'foo'});
  console.log('Destroying droplet...');
  yield destroyBox(droplet.id);
}).catch(err => {
  console.error(err.toString());
});
