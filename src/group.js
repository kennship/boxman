function *group(args) {
  const {db} = args;

  if (args.all) {
    // Syntax: boxman group --all
    // Should list all groups
    const groups = (yield db.query({
      map: `function (doc) {
        doc.groups.forEach(function (gr) {
          emit(gr);
        });
      }`
    }));
    console.log(groups.rows.map(r => r.key).join('\n'));
    return;
  }

  // Syntax: boxman group <node-name> --groups <groups> [--add | --remove | --replace]
  const boxName = args._[0];
  const boxResult = (yield db.query({
    map: `function (doc) {
      emit(doc.name, doc);
    }`
  }, {
    group: true,
    key: boxName
  })).rows[0];

  if (!boxResult) {
    console.log(`No such box "${boxName}"`);
    return;
  }

  const box = boxResult.value;
  box.groups = box.groups || [];

  if (args.add) {
    const groups = args.add.split ? args.add.split(',') : [];
    groups.forEach(gr => box.groups.push(gr));
  } else if (args.remove) {
    const groups = args.remove.split ? args.remove.split(',') : [];
    groups.forEach(gr => {
      const i = box.groups.indexOf(gr);
      if (i < 0) {
        return;
      }
      box.groups.splice(i, 1);
    });
  } else if (args.replace) {
    box.groups = args.replace.split ? args.replace.split(',') : [];
  } else {
    console.log(box.groups.join('\n'));
    return;
  }

  yield db.put(box);
}

export {group};
