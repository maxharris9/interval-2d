var fc = require('fc');
var center = require('ctx-translate-center')
var iadd = require('interval-add');
var isub = require('interval-subtract');
var imul = require('interval-multiply');
var imin = require('interval-min');

var max = Math.max;
var min = Math.min;

function isqr(a) {
  if (a[0]>=0.0) {
    return [a[0] * a[0], a[1] * a[1]]
  } else if (a[1] < 0.0) {
    return [a[1] * a[1], a[0] * a[0]]
  } else {
    return [0.0, max(a[0]*a[0], a[1]*a[1])]
  }
}

function ilensq(a, b) {
  var pa = isqr(a)
  var pb = isqr(b)

  return [pa[0] + pb[0], pa[1] + pb[1]]
}

function isqrt(a) {
  return [Math.sqrt(a[0]), Math.sqrt(a[1])];
}

function ilen(a, b) {
  var pa = isqr(a);
  var pb = isqr(b);
  return isqrt([
    pa[0] + pb[0],
    pa[1] + pb[1]
  ])
}

function iabs (i) {
  if (i[0] >= 0.0) {
    return i;
  } else if (i[1] <= 0.0) {
    return [-i[1], -i[0]];
  } else {
    return [0, Math.max(-i[0], i[1])];
  }
}

function imax (a, b) {
  if (a[1] <= b[0]) {
    return b;
  }

  if (a[0] <= b[0]) {
    if (b[0] <= a[1]) {
      if (a[1] <= b[1]) {
        return b;
      } else {
        return [b[0], a[1]];
      }
    }
  }

  if (b[1] <= a[0]) {
    return a;
  }

  if (b[0] <= a[0]) {
    if (a[0] <= b[1]) {
      if (b[1] <= a[1]) {
        return a;
      } else {
        return [a[0], b[1]];
      }
    }
  }
}

function iset(out, l, u) {
  out[0] = l;
  out[1] = u;
}

function ival(v) {
  return [v, v]
}

function ipowsmooth(a, b, k) {
  k = k || ival(8);
  a = ipow(a, k);
  b = ipow(b, k);
  return ipow(
    idiv(imul(a, b), iadd(a, b)),
    idiv(ival(1.0), k)
  );
}

function idiv(a, b) {
  var l = a[0] / b[0];
  var u = a[1] / b[1];
  return [min(l, u), max(l, u)]
}

function crossesZero (interval) {
  return 0 >= interval[0] && 0 <= interval[1];
}

function middle (l, u) {
  return (l + u) * 0.5;
}

function circle (x, y, r, translation) {
  var lx = [x[0] - translation[0], x[1] - translation[0]];
  var ly = [y[0] - translation[1], y[1] - translation[1]];

  return isub(ilen(lx, ly), r);
}

function rect (x, y, rx, ry, p) {
  return imax(
    isub(iabs(isub(x, ival(p[0]))), rx),
    isub(iabs(isub(y, ival(p[1]))), ry)
  );
}

function triangle (x, y, w, h) {
  return imax(
    isub(
      imul(
        isub(x, ival(1.5)),
        isub(ival(1.5), ival(1.5))
      ),
      imul(
        isub(y, ival(1.5)),
        isub(ival(0.5), ival(1.5))
      )
    ),
    imax(
      isub(
        imul(
          isub(x, ival(0.5)),
          isub(ival(0.5), ival(1.5))
        ),
        imul(
          isub(y, ival(1.5)),
          isub(ival(1.5), ival(0.5))
        )
      ),
      isub(
        imul(
          isub(x, ival(1.5)),
          isub(ival(1.5), ival(0.5))
        ),
        imul(
          isub(y, ival(0.5)),
          isub(ival(1.5), ival(1.5))
        )
      )
    )
  );
}

function opicut(a, b) {
  var la = -a[0];
  var ua = -a[1];
  return imax(
    [min(la, ua), max(la, ua)],
    b
  )
}

function inout(ctx, r, ix, iy) {
  ctx.save()
    var size = Math.max(ix[1] - ix[0], iy[1] - iy[0]);

    if (r[0] < 0 && r[1] < 0) {
      ctx.fillStyle = "hsla(14, 100%, 55%, .75)"
    } else if (r[0] <= 0 && r[1] >= 0 && (r[1] - r[0]) < (1 / mouse.zoom)) {
      ctx.fillStyle = 'white'
    } else {
      ctx.fillStyle = "#000"
    }
    ctx.fillRect(ix[0], iy[0], (ix[1] - ix[0]), (iy[1] - iy[0]));

  ctx.restore();

  return r;
}

var scratchx = [0, 0];
var scratchy = [0, 0];
function box (translation, lx, ly, ux, uy, ctx, scale, depth, fn) {
  var maxDepth = depth;
  var size = Math.max(ux - lx, uy - ly) * scale

  if (size < 1) {
    return maxDepth;
  }

  var midx = middle(lx, ux);
  var midy = middle(ly, uy);

  iset(scratchx, midx, ux);
  iset(scratchy, midy, uy);
  var r = fn(scratchx, scratchy, translation);
  inout(ctx, r, scratchx, scratchy);
  if (crossesZero(r)) { // upper-right
    maxDepth = max(maxDepth, box(translation, midx, midy, ux, uy, ctx, scale, depth + 1, fn));
  }

  iset(scratchx, lx, midx);
  iset(scratchy, midy, uy);

  r = fn(scratchx, scratchy, translation);
  inout(ctx, r, scratchx, scratchy);

  if (crossesZero(r)) { // upper-left
    maxDepth = max(maxDepth, box(translation, lx, midy, midx, uy, ctx, scale, depth + 1, fn));
  }

  iset(scratchx, lx, midx);
  iset(scratchy, ly, midy);
  r = fn(scratchx, scratchy, translation)
  inout(ctx, r, scratchx, scratchy);
  if (crossesZero(r)) { // lower-right
    maxDepth = max(maxDepth, box(translation, lx, ly, midx, midy, ctx, scale, depth + 1, fn));
  }

  iset(scratchx, midx, ux);
  iset(scratchy, ly, midy);
  r = fn(scratchx, scratchy, translation);
  inout(ctx, r, scratchx, scratchy);
  if (crossesZero(r)) { // lower-left
    maxDepth = max(maxDepth, box(translation, midx, ly, ux, midy, ctx, scale, depth + 1, fn));
  }

  return maxDepth;
}

var mouse = { zoom: 1, down: false, translate: [0, 0] }
window.addEventListener('mousewheel', function(e) {
  ctx.dirty();
  mouse.zoom += e.wheelDelta / 500;
  if (mouse.zoom < .1) {
    mouse.zoom = .1;
  }
  e.preventDefault();
})

window.addEventListener('mousedown', function(e) { mouse.down = [e.clientX, e.clientY]; })
window.addEventListener('mouseup', function(e) { mouse.down = false; })
window.addEventListener('mousemove', function(e) {
  if (mouse.down) {
    mouse.translate[0] += (e.clientX - mouse.down[0]) / mouse.zoom;
    mouse.translate[1] += (e.clientY - mouse.down[1]) / mouse.zoom;
    mouse.down[0] = e.clientX;
    mouse.down[1] = e.clientY;
    ctx.dirty()
  }
})

var translation = [0, 0]
var ctx = fc(function (dt) {
  ctx.clear('black');
  ctx.strokeStyle = 'rgba(255,5,5, 0.25)';
  center(ctx);
  // ctx.translate(mouse.translate[0], mouse.translate[1]);
  ctx.scale(mouse.zoom, mouse.zoom)
  ctx.lineWidth = 1/mouse.zoom

  translation[0] = mouse.translate[0];
  translation[1] = mouse.translate[1];

  var maspect = max(ctx.canvas.height, ctx.canvas.width);
  var hw = (maspect / 2) / mouse.zoom;
  var hh = (maspect / 2) / mouse.zoom;

  var cx = mouse.translate[0];
  var cy = mouse.translate[1];

  var lx = -hw;
  var ly = -hh;
  var ux =  hw;
  var uy =  hh;

  console.log('maxDepth:', box(translation, lx, ly, ux, uy, ctx, mouse.zoom, 0, function (x, y, translation) {
    // var moving = circle(x, y, ival(200), [translation[0] + 50, translation[1] - 10]);
    var moving = opicut(
      circle(x, y, ival(40), [translation[0] - 100, translation[1] - 25]),
      rect(x, y, ival(75), ival(50), [translation[0] - 100, translation[1] - 25])
    );

    var fixed = opicut(
      circle(x, y, ival(75), [0, 0]),
      circle(x, y, ival(100), [0, 0])
    );

    // var fixed = circle(x, y, ival(50), ival(0));
    // var moving = rect(x, y, ival(10), ival(60), translation);
    // var moving = circle(x, y, ival(100), [translation[0] + 50, translation[1] - 10]);

    // return isub(
    //   ival(1.0),
    //   iadd(
    //     idiv(ival(.01), isqr(fixed)),
    //     idiv(ival(.01), isqr(moving))
    //   )
    // );

    // return imax(
    //   imul(moving, ival(-1)),
    //   fixed
    // )

    return imin(
      imin(fixed, moving),
      imul(
        iadd(
          isub(fixed, ival(10)),
          moving
        ),
        isqrt(ival(0.5))
      )
    );

    // return imin(
    //   imax(
    //     imax(
    //       imul(circle(x, y, ival(180), [translation[0] + 50, translation[1] - 10]), ival(-1)),
    //       circle(x, y, ival(200), [translation[0] + 50, translation[1] - 10])
    //     ),
    //     circle(x, y, ival(800), [translation[0] + 15, translation[1] - 70])
    //   ),
    //   rect(x, y, ival(200), ival(10), [translation[0] + 250, translation[1] + 180])
    // );
  }));

  ctx.strokeStyle = "#f0f"
  ctx.strokeRect(lx, ly, ux - lx, uy - ly);
}, false);
