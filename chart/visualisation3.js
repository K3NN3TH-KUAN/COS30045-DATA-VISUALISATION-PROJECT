(function () {
  var margin = { top: 5, right: 5, bottom: 5, left: 5 };
  var chartEl = document.getElementById('chart3');
  var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
  var totalHeight = (chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 500;
  var width = totalWidth - margin.left - margin.right;
  var height = totalHeight - margin.top - margin.bottom;

  var svg = d3.select('#chart3')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('preserveAspectRatio', 'none');

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

    // Manual zoom controls
    var zoomK = 1;
    function applyZoom() {
      g.attr('transform',
        'translate(' + margin.left + ',' + margin.top + ') ' +
        'translate(' + (width / 2) + ',' + (height / 2) + ') ' +
        'scale(' + zoomK + ') ' +
        'translate(' + (-width / 2) + ',' + (-height / 2) + ')'
      );
    }
    
    applyZoom();
    svg.style('cursor', 'default');
    
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

    var focusedAbbr = null;
    var currentValueByAbbr = null;
    var currentColorScale = null;

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
          return a === focusedAbbr ? 0.8 : 1;
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
          if (focusedAbbr && a === focusedAbbr) {
            return d3.hsl(baseFill).darker(0.7).toString();
          }
          return baseFill;
        });
    }

    function draw(year) {
      var rows = data.filter(function (d) { return d.YEAR === year; });
      var valueByAbbr = {};
      var rowByAbbr = {};
      rows.forEach(function (r) {
        valueByAbbr[r.JURISDICTION] = r.RATE;
        rowByAbbr[r.JURISDICTION] = r;
      });
      currentValueByAbbr = valueByAbbr;
    
      var vals = rows.map(function (r) { return r.RATE; })
        .filter(function (v) { return v != null && !isNaN(v); });
      var allVals = data.map(function (r) { return r.RATE; })
        .filter(function (v) { return v != null && !isNaN(v); });
    
      var min = vals.length ? d3.min(vals) : (allVals.length ? d3.min(allVals) : 0);
      var max = vals.length ? d3.max(vals) : (allVals.length ? d3.max(allVals) : 1);
    
      if (!isFinite(min) || !isFinite(max) || min === max) {
        min = Math.max(0, min || 0);
        max = min + 1;
      }
    
      var color = d3.scaleSequential(d3.interpolateBlues).domain([min, max]);
    
      g.selectAll('*').remove();
      svg.selectAll('defs').remove();
    
      // Use the entire container for the map
      var projection = d3.geoMercator()
        .fitSize([width, height], geo);

      var path = d3.geoPath().projection(projection);
    
      currentValueByAbbr = valueByAbbr;
      currentColorScale = color;
    
      // Very compact legend positioning
      var legendWidth = 120;
      var legendHeight = 6;
      var legendX = width - legendWidth - 5;
      var legendY = height - 15;
      
      var hoverX = width - 5;
      var hoverY = height - 5;
      
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
        .attr('text-anchor', 'end')
        .style('font-size', '9px')
        .style('fill', '#666')
        .text('Hover over states');
    
      // Draw states - this will now fill the entire container
      g.selectAll('path.state')
        .data(geo.features || [])
        .enter()
        .append('path')
        .attr('class', 'state')
        .attr('d', path)
        .attr('stroke', '#888')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .attr('fill', function (d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var v = valueByAbbr[abbr];
          return (v != null && isFinite(v)) ? color(v) : '#eee';
        })
        .on('mouseover', function (event, d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var v = valueByAbbr[abbr];
          var baseFill = (v != null && isFinite(v)) ? color(v) : '#eee';
          d3.select(this)
            .interrupt()
            .attr('fill', d3.hsl(baseFill).darker(0.35).toString())
            .attr('stroke', focusedAbbr === abbr ? '#000' : '#444')
            .attr('stroke-width', focusedAbbr === abbr ? 1 : 0.8)
            .attr('opacity', 1);
        })
        .on('mousemove', function (event, d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var pt = d3.pointer(event, g.node());
          var b = path.bounds(d);
          var dx = Math.max(1e-6, (b[1][0] - b[0][0]));
          var t = Math.max(0, Math.min(1, (pt[0] - b[0][0]) / dx));
          var vDyn = min + t * (max - min);

          var valueLabel = d3.format('.2f')(vDyn) + ' per 10,000';
          hoverText.text(name + ' (' + (abbr || '?') + '): ' + valueLabel);

          var xOff = axisScale(vDyn);
          legendIndicator.attr('x1', xOff).attr('x2', xOff).attr('opacity', 1);
        })
        .on('mouseout', function () {
          hoverText.text('Hover over states');
          legendIndicator.attr('opacity', 0);
          updateFocus(focusedAbbr || null);
        })
        .on('click', function (event, d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          if (focusedAbbr === abbr) {
            updateFocus(null);
          } else {
            updateFocus(abbr);
          }
        })
        .append('title')
        .text(function (d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var v = valueByAbbr[abbr];
          return name + ' (' + (abbr || '?') + '): ' +
                 (v != null && isFinite(v) ? d3.format('.2f')(v) : 'N/A') + ' [Per 10,000]';
        });
    }

    // Initial draw and listeners
    draw(+yearSelect.value);
    yearSelect.addEventListener('change', function () { draw(+yearSelect.value); });

    // Responsive redraw
    function debounce(fn, ms) { var t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); }; }
    var onResize3 = debounce(function(){
      var chartEl = document.getElementById('chart3');
      var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
      var totalHeight = (chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 500;
      width = totalWidth - margin.left - margin.right;
      height = totalHeight - margin.top - margin.bottom;
  
      svg
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
  
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

  // Initialize zoom
  var currentTransform = d3.zoomIdentity;
  var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', function (e) {
      currentTransform = e.transform;
      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ') ' +
        'translate(' + currentTransform.x + ',' + currentTransform.y + ') ' +
        'scale(' + currentTransform.k + ')');
    });
  
  svg.call(zoom);
  svg
    .on('wheel.zoom', null)
    .on('mousedown.zoom', null)
    .on('dblclick.zoom', null)
    .on('touchstart.zoom', null)
    .on('pointerdown.zoom', null);
})();