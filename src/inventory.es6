import yaml from 'js-yaml';
import path from 'path';
import fs from 'q-io/fs';

function *inventory(args) {
  const {
    host,
    raw,
    list,
    db
  } = args;
  if (host) {
    console.log('{}');
    process.exit(0);
  } else if (raw) {
    console.log(JSON.stringify((yield db.allDocs({include_docs:true})), null, 2));
  } else if (list) {
    const {hostvars, groups} = yield {
      hostvars: db.query({
        map: `function (doc) {
          if (doc.type === 'box') {
            doc.vars = doc.vars || {};
            doc.vars.canonicalName = doc.canonicalName;
            var x = {};
            x[doc.canonicalName] = doc.vars;
            emit(null, x);
          }
        }`,
        reduce: `function (key, values) {
          return Object.assign.apply(Object, values);
        }`
      }),
      groups: db.query({
        map: `function (doc) {
          if (doc.type === 'box') {
            var groups = ['default'].concat(doc.groups || []);
            groups.push('provider-'+doc.provider);
            groups.forEach(function (gr) {
              emit(gr, {
                hosts: [doc.canonicalName],
                vars: {}
              });
            });
          } else if (doc.type === 'group') {
            emit (doc.name, {
              hosts: [],
              vars: doc.vars || {}
            });
          }
        }`,
        reduce: `function (keys, values, rereduce) {
          return {
            hosts: [].concat.apply([], values.map(function (val) {return val.hosts;})),
            vars: Object.assign.apply(Object, values.map(function (val) {return val.vars;}))
          };
        }`
      },{group:true})
    };
    const _meta = {hostvars: (hostvars.rows[0] && hostvars.rows[0].value) || {}};
    groups.rows = groups.rows.map(row => ({[row.key]: row.value}));
    groups.local = ['127.0.0.1'];
    const output =
      groups.rows.length ? Object.assign.apply(Object, groups.rows) : {}
    output._meta = _meta;
    if (args.yaml || args.yml) {
      console.log(yaml.safeDump(output));
    } else {
      console.log(JSON.stringify(output,null,2));
    }
    process.exit(0);
  }
}

inventory.help = function *(args) {
  const fnm = path.resolve(__dirname, '..', 'help', 'inventory.txt');
  console.log(fnm);
  console.log(yield fs.read(fnm));
};

export {inventory};
