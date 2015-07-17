var SHIFT = [0,3,1,4,2,5,6,7];
var DOTS = [0,1,3,5,7,6,4,2];
var BRAILLE_SPINNER_DOTS = [0,1,2];

function toBraille(dots) {
  return String.fromCharCode(0x2800 + dots.map(function (x, i) {
    return (1 << SHIFT[x])
  }).reduce(function (a, b) {
    return a + b;
  }));
}

function nextDot(d, c){
  return DOTS[(DOTS.indexOf(d)+c)%DOTS.length];
}

function rotate(pattern, n) {
  return pattern.map(function (dot) {
    return nextDot(dot, n);
  });
}

function braille(spinner) {
  var n = 0;
  spinner = spinner || DEFAULT_SPINNER;
  return setInterval(function () {
    n++;
    n %= DOTS.length;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write([toBraille(rotate(spinner, n)), "Processing...", n].join(" "));
  }, 1000/8);
}

function spin(chars, defaultOpts) {
  if (typeof chars === 'string') {
    chars = chars.split('');
  }
  defaultOpts = defaultOpts || {};
  if (defaultOpts.duration && !defaultOpts.interval) {
    defaultOpts.interval = defaultOpts.duration / chars.length;
  }
  return function (message, opts) {
    var n = 0;
    if (typeof message !== 'string' && !opts) {
      opts = message;
      message = '';
    }
    opts = opts || {};
    var ms = opts.interval || defaultOpts.interval || (opts.duration || 1000)/chars.length;
    var interval = setInterval(function () {
      n++;
      n %= chars.length;
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write([chars[n], message].join(" "));
    }, ms);

    return {
      stop: function () {
        clearInterval(interval);
      }
    };
  }
}

var BLINK_FRAMES = Array.apply(null, {length:20}).map(function () {return '(o)(o)'})
  .concat(['(-)(-)','(o)(o)','(-)(-)']);

module.exports = {
  braille: spin(Array.apply(null,{length:4}).map(function(_, i) {
    return toBraille(rotate(BRAILLE_SPINNER_DOTS, i));
  })),
  brailleCircle: spin(['⢎⡰','⢎⡡','⢎⡑','⢎⠱','⠎⡱','⢊⡱','⢌⡱','⢆⡱']),
  arrows: spin('←↖↑↗→↘↓↙'),

  volume: spin('▁▂▃▄▅▆▇█▇▆▅▄▃▁'),

  width: spin('▉▊▋▌▍▎▏▎▍▌▋▊▉'),
  corner: spin('◢◣◤◥'),
  boxCorner: spin('◰◳◲◱'),
  circleCorner: spin('◴◷◶◵'),
  slashes: spin('-\\|/', {duration: 250}),
  halfNHalf: spin('◐◓◑◒'),
  blink: spin(BLINK_FRAMES, {duration: 5000}),
  moon: spin(Array.apply(null,{length:8}).map(function (_,i) {
    return String.fromCodePoint(i+0x1F311);
  })),
  clock: spin(Array.apply(null, {length:12}).map(function (_, i) {
    return String.fromCodePoint(i+128336);
  }))
};
