(function () {
  var margin = { top: 20, right: 20, bottom: 30, left: 20 };
  var chartEl = document.getElementById('chart3');
  var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
  // Make overall chart smaller so the full map is visible
  var hostH = (chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 360;
  var totalHeight = Math.max(300, Math.min(360, hostH)); // target ~340–360px
  var width = totalWidth - margin.left - margin.right;
  var height = totalHeight - margin.top - margin.bottom;

  var svg = d3.select('#chart3')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  var g = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var geoUrl = 'https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.geojson';

  var abbrByName = {
    'New South Wales': 'NSW',
    'Victoria': 'VIC',
    'Queensland': 'QLD',
    'South Australia': 'SA',
    'Western Australia': 'WA',
    'Tasmania': 'TAS',
    'Northern Territory': 'NT',
    'Australian Capital Territory': 'ACT'
  };
  // Map jurisdiction names to abbreviations
  var abbrByName = {
    'New South Wales': 'NSW',
    'Victoria': 'VIC',
    'Queensland': 'QLD',
    'South Australia': 'SA',
    'Western Australia': 'WA',
    'Tasmania': 'TAS',
    'Northern Territory': 'NT',
    'Australian Capital Territory': 'ACT'
  };
  // Invert to get display names from abbreviations
  var nameByAbbr = {};
  Object.keys(abbrByName).forEach(function (n) { nameByAbbr[abbrByName[n]] = n; });

  function getFeatureName(f) {
    var p = f.properties || {};
    return p.STATE_NAME || p.name || p.STATE || p.STATE_NAM || p.st_name || null;
  }

  function toNum(v) {
    return (v == null || (typeof v === 'string' && v.trim() === '')) ? null : +v;
  }

  var yearSelect = document.getElementById('year3-select');
  var chart3TitleEl = document.getElementById('chart3-title');

  // Load CSV data and GeoJSON
  Promise.all([
    d3.csv('data/visualisation3.csv', function (d) {
      return {
        YEAR: +d.YEAR,
        JURISDICTION: d.JURISDICTION.replace(/"/g, ''),
        FINES: (d['Sum(FINES)'] == null || (typeof d['Sum(FINES)'] === 'string' && d['Sum(FINES)'].trim() === '')) ? null : +d['Sum(FINES)'],
        TOTAL_LICENCES: (d['TOTAL_LICENCES'] == null || (typeof d['TOTAL_LICENCES'] === 'string' && d['TOTAL_LICENCES'].trim() === '')) ? null : +d['TOTAL_LICENCES'],
        RATE: (d['LICENCES_PER_10,000'] == null || (typeof d['LICENCES_PER_10,000'] === 'string' && d['LICENCES_PER_10,000'].trim() === '')) ? null : +d['LICENCES_PER_10,000']
      };
    }),
    d3.json(geoUrl)
  ]).then(function (res) {
    var data = res[0];
    var geo = res[1];

    var yearsMap = {}; data.forEach(function (d) { yearsMap[d.YEAR] = true; });
    var years = Object.keys(yearsMap).map(function (s) { return +s; }).sort(d3.ascending);

    // Build year dropdown
    years.forEach(function (y) {
      var opt = document.createElement('option'); opt.value = y; opt.textContent = y; yearSelect.appendChild(opt);
    });
    yearSelect.value = years[years.length - 1];

    // Remove d3.zoom behavior and use manual centered scaling controlled by +/- buttons
    var zoomK = 1;
    function applyZoom() {
      g.attr('transform',
        'translate(' + margin.left + ',' + margin.top + ') ' +
        'translate(' + (width / 2) + ',' + (height / 2) + ') ' +
        'scale(' + zoomK + ') ' +
        'translate(' + (-width / 2) + ',' + (-height / 2) + ')'
      );
    }
    
    // Apply initial zoom and disable drag cursor hints
    applyZoom();
    svg.style('cursor', 'default');
    
    // Hook up +/- buttons (works regardless of prior container removal)
    var btnZoomIn = document.getElementById('zoom-in');
    var btnZoomOut = document.getElementById('zoom-out');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', function () {
        zoomK = Math.min(8, zoomK * 1.25);
        applyZoom();
      });
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', function () {
        zoomK = Math.max(1, zoomK * 0.8);
        applyZoom();
      });
    }
    // Track focused region and apply visual emphasis (deeper color + thinner border)
    // Keep current data/color in closure for focus updates
    var focusedAbbr = null;
    var currentValueByAbbr = null;
    var currentColorScale = null;
    // Track isolated state (null = none)
    var isolationAbbr = null;

    function updateFocus(abbr) {
      focusedAbbr = abbr || null;
      var hasData = currentValueByAbbr && currentColorScale;
      g.selectAll('path.state')
        .attr('opacity', function (d) {
          if (!focusedAbbr) return 1;
          var name = getFeatureName(d);
          var a = abbrByName[name];
          return a === focusedAbbr ? 1 : 0.25;
        })
        .attr('stroke-width', function (d) {
          if (!focusedAbbr) return 1;
          var name = getFeatureName(d);
          var a = abbrByName[name];
          return a === focusedAbbr ? 0.8 : 1; // thinner border for focus
        })
        .attr('stroke', function (d) {
          if (!focusedAbbr) return '#888';
          var name = getFeatureName(d);
          var a = abbrByName[name];
          return a === focusedAbbr ? '#000' : '#888';
        })
        .attr('fill', function (d) {
          var name = getFeatureName(d);
          var a = abbrByName[name];
          if (!hasData || !a) return '#eee';
          var v = currentValueByAbbr[a];
          var baseFill = (v == null || isNaN(v)) ? '#eee' : currentColorScale(v);
          // deepen focused state’s fill a bit
          if (focusedAbbr && a === focusedAbbr) {
            return d3.hsl(baseFill).darker(0.7).toString();
          }
          return baseFill;
        });
    }

    function draw(year) {
      // Build value map and also keep full row data for details
      var rows = data.filter(function (d) { return d.YEAR === year; });
      var valueByAbbr = {};
      var rowByAbbr = {};
      rows.forEach(function (r) {
        valueByAbbr[r.JURISDICTION] = r.RATE;
        rowByAbbr[r.JURISDICTION] = r;
      });
      currentValueByAbbr = valueByAbbr;
    
      // Compute a SAFE domain, even if this year has no values
      var vals = rows.map(function (r) { return r.RATE; })
        .filter(function (v) { return v != null && !isNaN(v); });
      var allVals = data.map(function (r) { return r.RATE; })
        .filter(function (v) { return v != null && !isNaN(v); });
    
      var min = vals.length ? d3.min(vals) : (allVals.length ? d3.min(allVals) : 0);
      var max = vals.length ? d3.max(vals) : (allVals.length ? d3.max(allVals) : 1);
    
      // Ensure min < max to avoid invalid domain
      if (!isFinite(min) || !isFinite(max) || min === max) {
        min = Math.max(0, min || 0);
        max = min + 1;
      }
    
      var color = d3.scaleSequential(d3.interpolateBlues).domain([min, max]);
    
      g.selectAll('*').remove();
      svg.selectAll('defs').remove();
    
      // Background to clear focus (clicking background restores full view)
      g.append('rect')
          .attr('class', 'focus-bg')
          .attr('x', 0).attr('y', 0)
          .attr('width', width).attr('height', height)
          .style('fill', 'transparent')
          .style('pointer-events', 'all')
          .on('click', function () {
              isolationAbbr = null;
              svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
              g.selectAll('path.state')
                  .attr('opacity', 1)
                  .style('pointer-events', 'all');
              updateFocus(null);
              // Clear details panel
              detailsText.selectAll('tspan').remove();
              detailsText.text('Click a state to view details');
          });
    
      var projection = d3.geoMercator().fitSize([width, height], geo);
      var path = d3.geoPath().projection(projection);
    
      // Store for focus updates
      currentValueByAbbr = valueByAbbr;
      currentColorScale = color;
    
      // Responsive placement: mobile shows legend + hover below the caption (bottom-left)
      var isMobile = window.innerWidth <= 768;
      var legendWidth = 200, legendHeight = 12;
      var legendX = isMobile ? 10 : (width - legendWidth - 10);
      var legendY = isMobile ? (height - 32) : (height - 40);
      var hoverX = isMobile ? 10 : (width - 10);
      var hoverY = isMobile ? (legendY + legendHeight + 18) : (height - 12);
      var hoverAnchor = isMobile ? 'start' : 'end';
      var captionY = isMobile ? (legendY - 12) : (height - 12);
    
      var legend = g.append('g').attr('transform', 'translate(' + legendX + ',' + legendY + ')');
    
      var defs = svg.append('defs');
      var gradId = 'rate-grad';
      var lg = defs.append('linearGradient').attr('id', gradId);
      lg.attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
      lg.append('stop').attr('offset', '0%').attr('stop-color', color(min));
      lg.append('stop').attr('offset', '100%').attr('stop-color', color(max));
    
      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('fill', 'url(#' + gradId + ')')
        .attr('stroke', '#ccc');
    
      var axisScale = d3.scaleLinear().domain([min, max]).range([0, legendWidth]);
      legend.append('g')
        .attr('transform', 'translate(0,' + legendHeight + ')')
        .call(d3.axisBottom(axisScale).ticks(0))
        .selectAll('text')
        .remove();
    
      var legendIndicator = legend.append('line')
        .attr('class', 'legend-indicator')
        .attr('y1', -2)
        .attr('y2', legendHeight + 2)
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('opacity', 0);
    
      var hoverText = g.append('text')
        .attr('class', 'hover-info')
        .attr('x', hoverX)
        .attr('y', hoverY)
        .attr('text-anchor', hoverAnchor)
        .style('font-size', '14px')
        .text('Move over a state');
    
      // Draw states (safe fill + hover/click interactions)
      g.selectAll('path.state')
        .data(geo.features || [])
        .enter()
        .append('path')
        .attr('class', 'state')
        .attr('d', path)
        .attr('stroke', '#888')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .attr('fill', function (d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var v = valueByAbbr[abbr];
          return (v != null && isFinite(v)) ? color(v) : '#eee';
        })
        .on('mouseover', function (event, d) {
          // Hover: slightly thicken border and darken fill
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var v = valueByAbbr[abbr];
          var baseFill = (v != null && isFinite(v)) ? color(v) : '#eee';
          d3.select(this)
            .interrupt()
            .attr('fill', d3.hsl(baseFill).darker(0.35).toString())
            .attr('stroke', focusedAbbr === abbr ? '#000' : '#444')
            .attr('stroke-width', focusedAbbr === abbr ? 1.2 : 1.4)
            .attr('opacity', 1);
        })
        .on('mousemove', function (event, d) {
          // Pointer-driven dynamic value inside same area
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var pt = d3.pointer(event, g.node());
          var b = path.bounds(d);
          var dx = Math.max(1e-6, (b[1][0] - b[0][0]));
          var t = Math.max(0, Math.min(1, (pt[0] - b[0][0]) / dx));
          var vDyn = min + t * (max - min);
    
          var valueLabel = d3.format('.2f')(vDyn) + ' per 10,000';
          hoverText.interrupt().text(name + ' (' + (abbr || '?') + '): ' + valueLabel);
    
          var xOff = axisScale(vDyn);
          legendIndicator.interrupt().attr('x1', xOff).attr('x2', xOff).attr('opacity', 1);
        })
        .on('mouseout', function () {
          hoverText.interrupt().text('Move over a state');
          legendIndicator.interrupt().attr('opacity', 0);
          updateFocus(focusedAbbr || null); // revert styling
        })
        .on('click', function (event, d) {
          // Toggle focus only (no zoom), and show details if you added that panel
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          if (focusedAbbr === abbr) {
            updateFocus(null);
          } else {
            updateFocus(abbr);
          }
          // keep any details panel update here if present
        })
        .append('title')
        .text(function (d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var v = valueByAbbr[abbr];
          return name + ' (' + (abbr || '?') + '): ' +
                 (v != null && isFinite(v) ? d3.format('.2f')(v) : 'N/A') + ' [Per 10,000]';
        });
    
      // Default styling and labels
      updateFocus(null);
      g.append('text')
        .attr('x', 10)
        .attr('y', height - 12)
        .attr('text-anchor', 'start')
        .style('font-size', '16px')
        .text('Fines per 10,000 licences');
    
      if (chart3TitleEl) {
        chart3TitleEl.textContent = 'Fines per 10,000 licences by jurisdiction ' + year;
      }
    }

    // Initial draw and listeners
    draw(+yearSelect.value);
    yearSelect.addEventListener('change', function () { draw(+yearSelect.value); });

    // Responsive redraw for Chart 3
    function debounce(fn, ms) { var t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); }; }
    var onResize3 = debounce(function(){
      var chartEl = document.getElementById('chart3');
      var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
      var totalHeight = 520; // keep laptop baseline
      width = totalWidth - margin.left - margin.right;
      height = totalHeight - margin.top - margin.bottom;
  
      svg
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
  
      // Reset zoom so the full map fits after size changes
      svg.call(zoom.transform, d3.zoomIdentity);
  
      draw(+yearSelect.value);
    }, 150);
  
    window.addEventListener('resize', onResize3);
  }).catch(function (err) {
    console.error(err);
    var msg = document.createElement('div');
    msg.textContent = 'Failed to load choropleth data. Ensure HTTP serving and internet access. Error: ' + err.message;
    msg.style.color = '#d62728';
    msg.style.marginTop = '8px';
    document.getElementById('chart3').appendChild(msg);
  });

  // Initialize zoom on the SVG
  var currentTransform = d3.zoomIdentity;
  var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', function (e) {
      currentTransform = e.transform;
      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ') ' +
        'translate(' + currentTransform.x + ',' + currentTransform.y + ') ' +
        'scale(' + currentTransform.k + ')');
    });
  
  // Enable zoom and disable user drag/pan/wheel/dblclick
  svg.call(zoom);
  svg
    .on('wheel.zoom', null)
    .on('mousedown.zoom', null)
    .on('dblclick.zoom', null)
    .on('touchstart.zoom', null)
    .on('pointerdown.zoom', null);
})();


// Initialize details panel (top-left)
var detailsGroup = g.append('g').attr('class', 'details');
detailsGroup.append('rect')
  .attr('x', 10).attr('y', 10)
  .attr('width', 280).attr('height', 110)
  .attr('fill', '#f8f8f8').attr('stroke', '#ccc').attr('rx', 6).attr('ry', 6);
var detailsText = detailsGroup.append('text')
  .attr('x', 20).attr('y', 32)
  .style('font-size', '14px')
  .style('line-height', '1.2em')
  .attr('dy', 0)
  .text('Click a state to view details');

function renderDetails(abbr) {
  var row = rowByAbbr[abbr];
  if (!row) {
    detailsText.text('No data available for this selection');
    return;
  }
  var name = nameByAbbr[abbr] || abbr;
  var fmtComma = d3.format(',');
  var fmtRate = d3.format('.2f');

  var lines = [
    name + ' (' + abbr + ')',
    'Fines: ' + (row.FINES != null ? '$' + fmtComma(row.FINES) : 'N/A'),
    'Driver licences: ' + (row.TOTAL_LICENCES != null ? fmtComma(row.TOTAL_LICENCES) : 'N/A'),
    'Per 10,000: ' + (row.RATE != null ? fmtRate(row.RATE) : 'N/A')
  ];
  // Render multiline text
  detailsText.selectAll('tspan').remove();
  lines.forEach(function (line, i) {
    detailsText.append('tspan')
      .attr('x', 20)
      .attr('y', 32 + i * 20)
      .text(line);
  });
}

g.selectAll('path.state')
  .data(geo.features || [])
  .enter()
  .append('path')
  .attr('class', 'state')
  .attr('d', path)
  .attr('stroke', '#888')
  .attr('stroke-width', 1)
  .style('cursor', 'pointer')
  .attr('fill', function (d) {
    var name = getFeatureName(d);
    var abbr = abbrByName[name];
    var v = valueByAbbr[abbr];
    return (v != null && isFinite(v)) ? color(v) : '#eee';
  })
  .on('mouseover', function (event, d) {
    // Hover: slightly thicken border and darken fill
    var name = getFeatureName(d);
    var abbr = abbrByName[name];
    var v = valueByAbbr[abbr];
    var baseFill = (v != null && isFinite(v)) ? color(v) : '#eee';
    d3.select(this)
      .interrupt()
      .attr('fill', d3.hsl(baseFill).darker(0.35).toString())
      .attr('stroke', focusedAbbr === abbr ? '#000' : '#444')
      .attr('stroke-width', focusedAbbr === abbr ? 1.2 : 1.4)
      .attr('opacity', 1);
  })
  .on('mousemove', function (event, d) {
    // Pointer-driven dynamic value inside same area
    var name = getFeatureName(d);
    var abbr = abbrByName[name];
    var pt = d3.pointer(event, g.node());
    var b = path.bounds(d);
    var dx = Math.max(1e-6, (b[1][0] - b[0][0]));
    var t = Math.max(0, Math.min(1, (pt[0] - b[0][0]) / dx));
    var vDyn = min + t * (max - min);

    var valueLabel = d3.format('.2f')(vDyn) + ' per 10,000';
    hoverText.interrupt().text(name + ' (' + (abbr || '?') + '): ' + valueLabel);

    var xOff = axisScale(vDyn);
    legendIndicator.interrupt().attr('x1', xOff).attr('x2', xOff).attr('opacity', 1);
  })
  .on('mouseout', function () {
    hoverText.interrupt().text('Move over a state');
    legendIndicator.interrupt().attr('opacity', 0);
    updateFocus(focusedAbbr || null); // revert styling
  })
  .on('click', function (event, d) {
    // Isolate clicked region, center it, and show details
    var name = getFeatureName(d);
    var abbr = abbrByName[name];
  
    // Hide other states
    g.selectAll('path.state')
      .attr('opacity', function (d2) {
        var a2 = abbrByName[getFeatureName(d2)];
        return a2 === abbr ? 1 : 0;
      })
      .style('pointer-events', function (d2) {
        var a2 = abbrByName[getFeatureName(d2)];
        return a2 === abbr ? 'all' : 'none';
      });
  
    // Compute zoom-to-bounds transform
    var b = path.bounds(d);
    var c = path.centroid(d);
    var k = Math.min(8, 0.85 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height));
    var tx = width / 2 - k * c[0];
    var ty = height / 2 - k * c[1];
  
    // Apply smooth transform (center the clicked region)
    svg.transition().duration(350).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(k)
    );
  
    // Emphasize focused style and render details
    updateFocus(abbr);
    renderDetails(abbr);
  })
  .append('title')
  .text(function (d) {
    var name = getFeatureName(d);
    var abbr = abbrByName[name];
    var v = valueByAbbr[abbr];
    return name + ' (' + (abbr || '?') + '): ' +
           (v != null && isFinite(v) ? d3.format('.2f')(v) : 'N/A') + ' [Per 10,000]';
  });