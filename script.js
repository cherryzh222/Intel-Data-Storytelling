(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var progressBar = document.getElementById("progressBar");
  var counter = document.getElementById("slideCounter");

  /* ---------- Reading progress ---------- */
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- "Insight 2 of 5" label in the top bar ---------- */
  var slides = document.querySelectorAll("[data-slide]");
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) counter.textContent = en.target.getAttribute("data-slide");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    slides.forEach(function (s) { so.observe(s); });
  }

  /* =========================================================
     DATA (Intel figures as provided in the project brief)
     Index 0 = 2019 ... index 6 = 2025
  ========================================================= */
  var YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
  var D = {
    rev:    [72.0, 77.9, 79.0, 63.1, 54.2, 53.1, 52.9],
    rd:     [13.4, 13.6, 15.2, 17.5, 16.0, 16.5, 13.8],
    capex:  [16.2, 14.3, 18.7, 24.8, 25.8, 23.9, 14.6],
    emp:    [110.8, 110.6, 121.1, 131.9, 124.8, 108.9, 85.1],
    ghg:    [1.57, 1.32, 1.50, 1.53, 0.89, 1.20, 1.32],
    ren:    [71, 82, 80, 93, 99, 98, 99],
    energy: [9.6, 10.6, 11.6, 10.9, 10.8, 11.4, 12.0],
    water:  [12.6, 13.8, 14.3, 10.9, 10.5, 11.1, 11.1],
    waste:  [387, 414, 344, 311, 292, 264, 249]
  };
  // Derived series, calculated from the data above
  var rdShare = D.rd.map(function (v, i) { return (v / D.rev[i]) * 100; });
  function indexTo2019(arr) { return arr.map(function (v) { return (v / arr[0]) * 100; }); }

  /* =========================================================
     SVG CHART HELPERS
  ========================================================= */
  function yearLabel(y, slot) { return slot < 44 ? "’" + String(y).slice(2) : String(y); }
  function leftPad(ticks, tickFmt) {
    var longest = 0;
    ticks.forEach(function (t) { longest = Math.max(longest, String(tickFmt(t)).length); });
    return 14 + longest * 6.6;
  }
  function gridMarkup(o) {
    var out = "";
    o.ticks.forEach(function (t) {
      var yy = o.y(t);
      out += '<line class="' + (t === o.ticks[0] ? "base-line" : "grid-line") + '" x1="' + o.l + '" x2="' + (o.W - o.r) + '" y1="' + yy + '" y2="' + yy + '"/>';
      out += '<text class="tick" x="' + (o.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + o.tickFmt(t) + "</text>";
    });
    return out;
  }
  function setA11y(host, label) {
    host.setAttribute("role", "img");
    host.setAttribute("aria-label", label);
  }

  function barChart(host, o) {
    var W = Math.max(host.clientWidth, 240), H = 250;
    var tickFmt = o.tickFmt || String;
    var l = leftPad(o.ticks, tickFmt), r = 6, t = 28, b = 30;
    var iw = W - l - r, ih = H - t - b;
    var n = o.values.length, slot = iw / n, bw = Math.min(slot * 0.62, 46);
    var y = function (v) { return t + ih - (v / o.max) * ih; };
    var svg = gridMarkup({ ticks: o.ticks, tickFmt: tickFmt, y: y, l: l, r: r, W: W });
    var showAll = slot >= 32;
    o.values.forEach(function (v, i) {
      var cls = o.colors && o.colors[i] ? o.colors[i] : "";
      var x = l + i * slot + (slot - bw) / 2;
      var hl = !!(o.colors && o.colors[i]);
      svg += '<rect class="bar ' + cls + '" style="--d:' + (i * 60) + 'ms" x="' + x.toFixed(1) + '" y="' + y(v).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (t + ih - y(v)).toFixed(1) + '" rx="3"/>';
      if (showAll || hl) {
        svg += '<text class="val' + (hl ? " hl" : "") + '" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y(v) - 7).toFixed(1) + '" text-anchor="middle">' + o.fmt(v) + "</text>";
      }
      svg += '<text class="xlab" x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle">' + yearLabel(YEARS[i], slot) + "</text>";
    });
    host.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true" focusable="false">' + svg + "</svg>";
    setA11y(host, o.aria);
  }

  function lineChart(host, o) {
    var W = Math.max(host.clientWidth, 240), H = 250;
    var tickFmt = o.tickFmt || String;
    var l = leftPad(o.ticks, tickFmt), r = o.endNames ? (W < 420 ? 84 : 104) : 30, t = 28, b = 30;
    var iw = W - l - r, ih = H - t - b;
    var n = YEARS.length, step = iw / (n - 1);
    var y = function (v) { return t + ih - ((v - o.yMin) / (o.yMax - o.yMin)) * ih; };
    var x = function (i) { return l + i * step; };
    var svg = gridMarkup({ ticks: o.ticks, tickFmt: tickFmt, y: y, l: l, r: r, W: W });

    if (o.refLine != null) {
      svg += '<line class="ref-line" x1="' + l + '" x2="' + (W - r) + '" y1="' + y(o.refLine) + '" y2="' + y(o.refLine) + '"/>';
    }
    YEARS.forEach(function (yr, i) {
      svg += '<text class="xlab" x="' + x(i).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle">' + yearLabel(yr, step) + "</text>";
    });

    var ends = [];
    o.series.forEach(function (s) {
      var d = s.vals.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
      svg += '<path class="line-path ' + s.cls + '" pathLength="1" d="' + d + '"/>';
      s.vals.forEach(function (v, i) {
        svg += '<circle class="dot ' + s.cls + '" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.8"/>';
      });
      if (o.valueLabels) {
        var showAll = step >= 40;
        s.vals.forEach(function (v, i) {
          if (showAll || i === 0 || i === n - 1) {
            svg += '<text class="val" x="' + x(i).toFixed(1) + '" y="' + (y(v) - 11).toFixed(1) + '" text-anchor="middle">' + o.valFmt(v) + "</text>";
          }
        });
      }
      ends.push({ y: y(s.vals[n - 1]), text: s.name + " " + o.valFmt(s.vals[n - 1]), cls: s.cls });
    });

    if (o.marks) {
      o.marks.forEach(function (m) {
        var s = o.series[m.s], v = s.vals[m.i];
        svg += '<text class="val hl" x="' + x(m.i).toFixed(1) + '" y="' + (y(v) - 11).toFixed(1) + '" text-anchor="middle">' + m.text + "</text>";
      });
    }

    if (o.endNames) {
      ends.sort(function (a, b2) { return a.y - b2.y; });
      for (var k = 1; k < ends.length; k++) {
        if (ends[k].y - ends[k - 1].y < 16) ends[k].y = ends[k - 1].y + 16;
      }
      ends.forEach(function (e) {
        svg += '<text class="end-lab ' + e.cls + '" x="' + (W - r + 10) + '" y="' + (e.y + 4).toFixed(1) + '">' + e.text + "</text>";
      });
    }
    host.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true" focusable="false">' + svg + "</svg>";
    setA11y(host, o.aria);
  }

  /* =========================================================
     CHART DEFINITIONS
  ========================================================= */
  var pct = function (v) { return v + "%"; };
  var one = function (v) { return v.toFixed(1); };
  var two = function (v) { return v.toFixed(2); };
  var whole = function (v) { return String(Math.round(v)); };

  var CHARTS = {
    c1a: function (h) {
      lineChart(h, { series: [{ name: "", vals: D.ren, cls: "c-teal" }], yMin: 0, yMax: 100, ticks: [0, 25, 50, 75, 100],
        tickFmt: pct, valFmt: pct, valueLabels: true,
        aria: "Line chart. Renewable electricity as a share of global use rose from 71 percent in 2019 to 99 percent in 2025." });
    },
    c1b: function (h) {
      barChart(h, { values: D.energy, max: 15, ticks: [0, 5, 10, 15], fmt: one, colors: { 0: "gray", 6: "orange" },
        aria: "Bar chart. Energy use rose from 9.6 billion kilowatt-hours in 2019 to 12.0 in 2025, a 25 percent increase." });
    },
    c2: function (h) {
      barChart(h, { values: D.ghg, max: 2, ticks: [0, 0.5, 1, 1.5, 2], tickFmt: one, fmt: two, colors: { 0: "gray", 4: "teal", 6: "orange" },
        aria: "Bar chart. Greenhouse gas emissions were 1.57 million metric tons in 2019, reached a low of 0.89 in 2023, and rose to 1.32 in 2025." });
    },
    c3a: function (h) {
      barChart(h, { values: D.rev, max: 90, ticks: [0, 30, 60, 90], fmt: one, colors: { 0: "gray", 6: "orange" },
        aria: "Bar chart. Net revenue fell from 72.0 billion dollars in 2019 to 52.9 billion in 2025." });
    },
    c3b: function (h) {
      lineChart(h, { series: [{ name: "", vals: rdShare, cls: "c-orange" }], yMin: 0, yMax: 35, ticks: [0, 10, 20, 30],
        tickFmt: pct, valFmt: function (v) { return v.toFixed(1) + "%"; }, valueLabels: true,
        aria: "Line chart. R and D spending as a share of net revenue rose from 18.6 percent in 2019 to 26.1 percent in 2025, peaking at 31.1 percent in 2024." });
    },
    c4: function (h) {
      lineChart(h, { series: [
          { name: "Capex", vals: indexTo2019(D.capex), cls: "c-orange" },
          { name: "Employees", vals: indexTo2019(D.emp), cls: "c-blue" },
          { name: "Revenue", vals: indexTo2019(D.rev), cls: "c-gray" }
        ], yMin: 50, yMax: 170, ticks: [50, 100, 150], valFmt: whole, endNames: true, refLine: 100,
        marks: [{ s: 0, i: 4, text: "159" }, { s: 1, i: 3, text: "119" }],
        aria: "Line chart indexed to 2019 equals 100. In 2025, employees are at 77, capital investments at 90 and net revenue at 73. Employees peaked at 119 in 2022 and capital investments at 159 in 2023." });
    },
    c5a: function (h) {
      barChart(h, { values: D.waste, max: 450, ticks: [0, 150, 300, 450], fmt: whole, colors: { 0: "gray", 6: "teal" },
        aria: "Bar chart. Total waste generated fell from 387 thousand short tons in 2019 to 249 thousand in 2025." });
    },
    c5b: function (h) {
      barChart(h, { values: D.water, max: 16, ticks: [0, 4, 8, 12, 16], fmt: one, colors: { 0: "gray", 6: "teal" },
        aria: "Bar chart. Total water withdrawn fell from 12.6 billion gallons in 2019 to 11.1 billion in 2025." });
    }
  };

  var hosts = [];
  Object.keys(CHARTS).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) hosts.push({ el: el, draw: CHARTS[id], w: 0 });
  });

  function render(item) {
    var w = Math.round(item.el.clientWidth);
    if (w < 10 || w === item.w) return;
    item.w = w;
    item.draw(item.el);
  }
  hosts.forEach(render);

  if ("ResizeObserver" in window) {
    var resizeObs = new ResizeObserver(function (entries) {
      entries.forEach(function (en) {
        for (var i = 0; i < hosts.length; i++) if (hosts[i].el === en.target) render(hosts[i]);
      });
    });
    hosts.forEach(function (h) { resizeObs.observe(h.el); });
  } else {
    window.addEventListener("resize", function () { hosts.forEach(render); });
  }

  /* Draw-in animation when a chart scrolls into view */
  if (reduceMotion || !("IntersectionObserver" in window)) {
    hosts.forEach(function (h) { h.el.classList.add("active"); });
  } else {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("active"); co.unobserve(en.target); }
      });
    }, { threshold: 0.3 });
    hosts.forEach(function (h) { co.observe(h.el); });
  }
})();
