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
    .attr('preserveAspectRatio', 'none')
    .style('font-family', 'Segoe UI, Arial, sans-serif')
    .style('background', '#ffffff');

  var g = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Fullscreen state and controls
  var isFullscreen = false;
  var uiScale = 1;
  function setCanvasSize(){
    var chartEl = document.getElementById('chart3');
    var totalWidth = isFullscreen ? window.innerWidth : ((chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960);
    var totalHeight = isFullscreen ? window.innerHeight : ((chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 500);
    width = totalWidth - margin.left - margin.right;
    height = totalHeight - margin.top - margin.bottom;
    svg.attr('width', totalWidth).attr('height', totalHeight);
  }
  var fsBtn = svg.append('g')
    .attr('class','fullscreen-btn')
    .style('cursor','pointer')
    .style('pointer-events','all');
  var btnSize = 28;
  fsBtn.append('rect')
    .attr('width', btnSize)
    .attr('height', btnSize)
    .attr('rx', 6)
    .attr('fill', '#f3f4f6')
    .attr('stroke', '#9aa5b1');
  function getFsIconPath(full){
    // Icon geometry on a 36x36 grid, scaled to button size.
    // Enter: four outward corners (open square corners)
    // Exit: four inward corners (corners pointing toward center)
    if (!full) {
      // Enter fullscreen
      return [
        'M 8 14 H 14 V 8',       // top-left outward
        'M 28 14 H 22 V 8',      // top-right outward
        'M 8 22 H 14 V 28',      // bottom-left outward
        'M 28 22 H 22 V 28'      // bottom-right outward
      ].join(' ');
    } else {
      // Exit fullscreen
      return [
        'M 12 12 H 8 V 16',      // top-left inward
        'M 24 12 H 28 V 16',     // top-right inward
        'M 12 24 H 8 V 20',      // bottom-left inward
        'M 24 24 H 28 V 20'      // bottom-right inward
      ].join(' ');
    }
  }
  var fsIcon = fsBtn.append('path')
    .attr('class','fs-icon')
    .attr('d', getFsIconPath(false))
    .attr('stroke', '#1f2937')
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('transform', 'scale(' + (btnSize / 36) + ')');
  function positionFullscreenBtn(){
    fsBtn.attr('transform', 'translate(' + (margin.left + Math.max(0, width - (btnSize + 12))) + ',' + (margin.top + Math.max(0, height - (btnSize + 8))) + ')');
  }
  function updateFsLabel(){
    fsBtn.select('rect').attr('fill', isFullscreen ? '#e5e7eb' : '#f3f4f6');
    fsIcon.attr('d', getFsIconPath(isFullscreen));
  }
  positionFullscreenBtn();
  fsBtn.on('click', function(){
    isFullscreen = !isFullscreen;
    try {
      var container = document.getElementById('chart3');
      if (isFullscreen) { if (container && container.requestFullscreen) container.requestFullscreen(); }
      else { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); }
    } catch(e){}
    uiScale = isFullscreen ? 1.2 : 1.0;
    setCanvasSize();
    updateFsLabel();
    positionFullscreenBtn();
    draw(+yearSelect.value);
  });
  document.addEventListener('fullscreenchange', function(){
    isFullscreen = !!document.fullscreenElement;
    uiScale = isFullscreen ? 1.2 : 1.0;
    setCanvasSize();
    updateFsLabel();
    positionFullscreenBtn();
    draw(+yearSelect.value);
  });

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
    var lastHoverAbbr = null;

  function updateFocus(abbr) {
      focusedAbbr = abbr || null;
      var hasData = currentValueByAbbr && currentColorScale;
      g.selectAll('path.state')
        .interrupt()
        .transition().duration(350).ease(d3.easeBackOut)
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
          return a === focusedAbbr ? 0.9 : 1;
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

      // Dim/restore callout containers and leader lines based on focus
      var dimDefault = 0.08;  // default: slightly deeper transparency
      var dimOthers = 0.03;   // others when focused: very faint
      var full = 1;
      g.selectAll('.callout')
        .each(function(){
          var s = d3.select(this);
          var a = s.attr('data-abbr');
          var bx = +s.attr('data-box-x');
          var by = +s.attr('data-box-y');
          var bw = +s.attr('data-box-w');
          var bh = +s.attr('data-box-h');
          var scale = (!focusedAbbr ? 1 : (a === focusedAbbr ? 1.06 : 1));
          var t = 'translate(' + bx + ',' + by + ') translate(' + (bw/2) + ',' + (bh/2) + ') scale(' + scale + ') translate(' + (-bw/2) + ',' + (-bh/2) + ')';
          s.interrupt().transition().duration(350).ease(d3.easeBackOut).attr('transform', t);
        })
        .transition().duration(350).ease(d3.easeBackOut)
        .attr('opacity', function(){
          var a = d3.select(this).attr('data-abbr');
          if (!focusedAbbr) return dimDefault;
          return a === focusedAbbr ? full : dimOthers;
        });
      g.selectAll('.callout-link')
        .transition().duration(300).ease(d3.easeCubicOut)
        .attr('opacity', function(){
          var a = d3.select(this).attr('data-abbr');
          if (!focusedAbbr) return dimDefault;
          return a === focusedAbbr ? full : dimOthers;
        })
        .attr('stroke-width', function(){
          var a = d3.select(this).attr('data-abbr');
          return (focusedAbbr && a === focusedAbbr) ? (2.6 * uiScale) : (2 * uiScale);
        });
      g.selectAll('.callout-link-node')
        .transition().duration(300).ease(d3.easeCubicOut)
        .attr('opacity', function(){
          var a = d3.select(this).attr('data-abbr');
          if (!focusedAbbr) return dimDefault;
          return a === focusedAbbr ? full : dimOthers;
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
    
      // Use a lighter, colour‑blind friendly palette (YlGnBu) trimmed to lighter range
      function trimSequential(interp, start, end) {
        return function (t) { return interp(start + (end - start) * t); };
      }
      var color = d3.scaleSequential(trimSequential(d3.interpolateYlGnBu, 0.15, 0.75)).domain([min, max]);
    
      g.selectAll('*').remove();
      svg.selectAll('defs').remove();
    
      // Use the entire container for the map
      var projection = d3.geoMercator()
        .fitSize([width, height], geo);

      var path = d3.geoPath().projection(projection);
    
      currentValueByAbbr = valueByAbbr;
      currentColorScale = color;
    
      // Vertical legend on the right
      var legendWidth = isFullscreen ? 18 : 14;
      var legendHeight = Math.max(120 * uiScale, Math.min(240 * uiScale, height - 40));
      var legendX = width - legendWidth - 36; // moved further left
      var legendY = 14;

      var hoverX = legendX + (legendWidth / 2);
      var hoverY = legendY + legendHeight + 16;

      var legend = g.append('g').attr('transform', 'translate(' + legendX + ',' + legendY + ')');

      var defs = svg.append('defs');
      var gradId = 'rate-grad';
      var lg = defs.append('linearGradient').attr('id', gradId);
      lg.attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
      lg.append('stop').attr('offset', '0%').attr('stop-color', color(max));
      lg.append('stop').attr('offset', '100%').attr('stop-color', color(min));

      // Futuristic leader line defs: neon glow filter and arrow marker
      var glow = defs.append('filter')
        .attr('id', 'neon-glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
      glow.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'blur');
      var merge = glow.append('feMerge');
      merge.append('feMergeNode').attr('in', 'blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');

      var arrow = defs.append('marker')
        .attr('id', 'arrowHead')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse');
      arrow.append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', '#00e5ff');

      // Lightweight CSS for animated dashes
      svg.select('#chart3-tech-style').remove();
      svg.append('style')
        .attr('id', 'chart3-tech-style')
        .text('@keyframes dash { to { stroke-dashoffset: -24; } }\n' +
              '#chart3 svg .callout-link.futuristic { animation: dash 4s linear infinite; }');

      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('fill', 'url(#' + gradId + ')')
        .attr('stroke', '#ccc');

      var axisScale = d3.scaleLinear().domain([min, max]).range([legendHeight, 0]);
      legend.append('g')
        .attr('transform', 'translate(' + legendWidth + ',0)')
        .call(d3.axisRight(axisScale).ticks(6).tickFormat(d3.format('.2f')))
        .call(function(gAxis){ gAxis.select('.domain').attr('stroke','#ccc'); });

      var legendIndicator = legend.append('line')
        .attr('class', 'legend-indicator')
        .attr('x1', -2)
        .attr('x2', legendWidth + 2)
        .attr('stroke', '#000')
        .attr('stroke-width', 2) // thicker indicator line
        .attr('opacity', 0);

      // Legend caption
      legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', isFullscreen ? '12px' : '10px')
        .style('fill', '#444')
        .text('Rate per 10k');

      // Map title (left-aligned)
      svg.selectAll('.chart3-title').remove();
      svg.append('text')
        .attr('class', 'chart3-title')
        .attr('x', margin.left)
        .attr('y', Math.max(22, margin.top + 18))
        .attr('text-anchor', 'start')
        .style('font-weight', '700')
        .style('font-size', '18px')
        .style('fill', '#222')
        .text('Fines per 10,000 licences by jurisdiction — ' + year);

      // Always-on callouts: one container per region, arranged in two columns
      var callouts = g.append('g').attr('class', 'callouts');
      // Compute overall map bounds to support absolute placement
      var mapFC = { type: 'FeatureCollection', features: geo.features || [] };
      var mb = path.bounds(mapFC);
      var mapLeft = mb[0][0], mapTop = mb[0][1], mapRight = mb[1][0], mapBottom = mb[1][1];

      var features = (geo.features || []).map(function(fe){
        var ab = abbrByName[getFeatureName(fe)];
        return ab ? { abbr: ab, feature: fe, centroid: path.centroid(fe) } : null;
      }).filter(Boolean);

      // Slightly smaller containers to reduce interior right-side space
      var boxW = Math.max(160, Math.min(200, width * 0.20));
      var boxH = isFullscreen ? 84 : 72;
      var gap = isFullscreen ? 24 : 18; // more breathing room between boxes
      var paneRightLimit = legendX - 8; // avoid legend overlap
      var cornerR = isFullscreen ? 9 : 8; // rounded corner radius for callout boxes

      // Absolute placements per your spec
      var positions = {};
      var centerY = (mapTop + mapBottom) / 2;
      // Left-side explicit placements
      var leftX = margin.left + 14; // baseline for left column
      // NT: top-left without covering the title
      positions.NT  = { x: leftX, y: margin.top + 44, edge: 'right' };
      // WA: middle-left, move further left a bit
      positions.WA  = { x: leftX - 26, y: centerY - boxH / 2, edge: 'right' };
      // SA: bottom-left, move right a bit more
      positions.SA  = { x: leftX + 20, y: Math.min(height - boxH - 24, mapBottom + 80), edge: 'right' };

      // Right column baseline (QLD/NSW remain similar)
      // Shift right column closer to the legend to reduce empty space
      var rightX = paneRightLimit - boxW - 2;
      var rightY0 = Math.max(legendY + 6, 24);
      // QLD: nudge left a bit more
      positions.QLD = { x: rightX - 16, y: rightY0 + 0 * (boxH + gap) + 18, edge: 'left' };
      // TAS: bottom-right (move slightly further down)
      positions.TAS = { x: rightX, y: height - boxH, edge: 'left' };
      // ACT: above TAS; move further up (more in non-fullscreen)
      positions.ACT = {
        x: rightX,
        y: positions.TAS.y - (boxH + gap) - (isFullscreen ? 0 : 12),
        edge: 'left'
      };
      // NSW: place directly below QLD; nudge left in fullscreen while respecting legend
      var nswRightLimit = legendX - 6; // allow NSW 2px closer to legend than others
      positions.NSW = {
        x: Math.min(nswRightLimit - boxW, (rightX + 14) - (isFullscreen ? 20 : 0)),
        y: positions.QLD.y + (boxH + gap),
        edge: 'bottom'
      };

      // VIC: move down and right a bit
      var vicY = Math.min(height - boxH - 6, mapBottom + 24);
      var vicX = Math.max(margin.left + 6, Math.min(paneRightLimit - boxW, (mapLeft + mapRight) / 2 - boxW / 2 - 36));
      // VIC: link from right side middle
      positions.VIC = { x: vicX, y: vicY, edge: 'right' };

      features.forEach(function(item){
        var abbr = item.abbr;
        var row = rowByAbbr[abbr];
        var pos = positions[abbr];
        // Fallback if a region wasn’t specified
        if (!pos) {
          pos = { x: Math.max(margin.left + 6, mapLeft), y: Math.min(height - boxH - 12, mapBottom + 12), edge: 'top' };
        }

        var boxX = pos.x, boxY = pos.y;
        var cg = callouts.append('g')
          .attr('class', 'callout')
          .attr('data-abbr', abbr)
          .attr('transform', 'translate(' + boxX + ',' + boxY + ')')
          .attr('data-box-x', boxX)
          .attr('data-box-y', boxY)
          .attr('data-box-w', boxW)
          .attr('data-box-h', boxH)
          .attr('opacity', 0.08)
          .style('cursor', 'pointer')
          .style('pointer-events', 'all')
          .on('click', function(event){
            event.stopPropagation();
            var a = d3.select(this).attr('data-abbr');
            if (focusedAbbr === a) {
              updateFocus(null);
            } else {
              updateFocus(a);
            }
          });
        cg.append('rect')
          .attr('width', boxW)
          .attr('height', boxH)
          .attr('rx', cornerR)
          .attr('fill', '#e9edf2')
          .attr('stroke', '#9aa5b1');

        // Align all text left; place values a fixed gap from labels
        var labelsX = 12; // left padding
        var columnGap = 90; // distance between label and value columns
        var valuesX = labelsX + columnGap; // left-aligned values
        var baseY = 18;
        var lineGap = 16;
        // Header: full region name with short name, centered at top
        var fullName = nameByAbbr[abbr] || abbr || '?';
        cg.append('text')
          .attr('class', 'callout-title')
          .attr('x', boxW / 2)
          .attr('y', baseY)
          .attr('text-anchor', 'middle')
          .style('font-size', (12 * uiScale) + 'px')
          .style('font-weight', '600')
          .style('fill', '#1f2937')
          .text(fullName + ' (' + (abbr || '?') + ')');

        // Detail rows (excluding Jurisdiction): start from next line below header
        var calloutLabels = cg.append('g').attr('class', 'callout-labels').attr('text-anchor', 'start');
        var calloutValues = cg.append('g').attr('class', 'callout-values').attr('text-anchor', 'start');
        ['Fines per 10,000','Fines','Licences'].forEach(function(lbl, i){
          var y = baseY + (i + 1) * lineGap;
          calloutLabels.append('text')
            .attr('x', labelsX)
            .attr('y', y)
            .style('font-size', '10px')
            .style('fill', '#1f2937')
            .text(lbl);
          var val = (function(){
            if (i === 0) return (row && row.RATE != null && isFinite(row.RATE)) ? d3.format('.2f')(row.RATE) : 'N/A';
            if (i === 1) return (row && row.FINES != null && isFinite(row.FINES)) ? d3.format(',d')(row.FINES) : 'N/A';
            return (row && row.TOTAL_LICENCES != null && isFinite(row.TOTAL_LICENCES)) ? d3.format(',d')(row.TOTAL_LICENCES) : 'N/A';
          })();
          calloutValues.append('text')
            .attr('x', valuesX)
            .attr('y', y)
            .style('font-size', '10px')
            .style('fill', '#1f2937')
            .text(val);
        });

        // Compute per-region color to match state fill
        var vForColor = (row && row.RATE != null && isFinite(row.RATE)) ? row.RATE : null;
        var regionColor = (vForColor != null) ? color(vForColor) : '#00e5ff';

        // Per-region arrow marker so the arrow matches the line color
        var markerId = 'arrowHead-' + abbr;
        var aMarker = defs.append('marker')
          .attr('id', markerId)
          .attr('viewBox', '0 0 10 10')
          .attr('refX', 8)
          .attr('refY', 5)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto-start-reverse');
        aMarker.append('path')
          .attr('d', 'M 0 0 L 10 5 L 0 10 z')
          .attr('fill', '#000');

        // Linking line from state centroid to appropriate box edge
        var c = item.centroid;
        var linkEdge = pos.edge || 'right';
        var x2, y2;
        if (linkEdge === 'right') { x2 = boxX + boxW; y2 = boxY + boxH / 2; }
        else if (linkEdge === 'left') { x2 = boxX; y2 = boxY + boxH / 2; }
        else if (linkEdge === 'top') { x2 = boxX + boxW / 2; y2 = boxY; }
        else if (linkEdge === 'bottom') { x2 = boxX + boxW / 2; y2 = boxY + boxH; }
        else if (linkEdge === 'topRight') { x2 = boxX + boxW - cornerR; y2 = boxY; }
        else { x2 = boxX + boxW / 2; y2 = boxY + boxH / 2; }
        // Route: straight by default; elbow for VIC, NT, NSW, SA or when anchor is outside bounds
        var elbowPad = 10; // go just outside the map before turning
        var forceElbow = (abbr === 'NT' || abbr === 'NSW' || abbr === 'SA');
        var needsElbowBase = (x2 > mapRight + 2) || (x2 < mapLeft - 2) || (y2 > mapBottom + 2) || (y2 < mapTop - 2);
        var needsElbow = (abbr === 'WA' || abbr === 'VIC') ? false : (forceElbow || needsElbowBase);
        var exitX = c[0], exitY = c[1];
        if (needsElbow) {
          if (abbr === 'NT') {
            // NT: 75° up-left for a longer exit, then bend to container
            var radNT = Math.PI * 75 / 180;
            var lenNT = 180;
            exitX = c[0] - lenNT * Math.cos(radNT);
            exitY = c[1] - lenNT * Math.sin(radNT);
          } else if (abbr === 'NSW') {
            // NSW: smooth, gentle rightward bend toward the container's left edge
            // Bias the exit toward x2 with a small fraction of vertical offset
            var dxNSW = Math.max(40, Math.min(140, Math.abs(x2 - c[0]) * 0.6));
            var dyNSW = (y2 - c[1]) * 0.25;
            exitX = c[0] + dxNSW;
            exitY = c[1] + dyNSW;
          } else if (abbr === 'SA') {
            // SA: down-left smooth bend toward the container's right edge
            var dxSA = Math.max(30, Math.min(120, Math.abs(x2 - c[0]) * 0.6));
            var dySA = Math.max(20, Math.min(80, Math.abs(y2 - c[1]) * 0.5));
            exitX = c[0] - dxSA;
            exitY = c[1] + dySA;
          } else if (abbr === 'VIC') {
            // VIC: 75° down-right for a longer exit, then bend to container
            var radV = Math.PI * 75 / 180;
            var lenV = 18;
            exitX = c[0] + lenV * Math.cos(radV);
            exitY = c[1] + lenV * Math.sin(radV);
            // ensure the target is right-edge middle of VIC container
          } else if (x2 > mapRight + 2) {
            exitX = mapRight + elbowPad; exitY = c[1];
          } else if (x2 < mapLeft - 2) {
            exitX = mapLeft - elbowPad; exitY = c[1];
          } else if (y2 > mapBottom + 2) {
            exitX = c[0]; exitY = mapBottom + elbowPad;
          } else if (y2 < mapTop - 2) {
            exitX = c[0]; exitY = mapTop - elbowPad;
          }
        }
        if (needsElbow) {
          var pathD;
          if (abbr === 'NT' || abbr === 'NSW' || abbr === 'SA') {
            // Smooth bend using a quadratic curve via the exit point
            pathD = 'M ' + c[0] + ' ' + c[1] + ' Q ' + exitX + ' ' + exitY + ' ' + x2 + ' ' + y2;
          } else {
            // Default elbow: two straight segments
            pathD = 'M ' + c[0] + ' ' + c[1] + ' L ' + exitX + ' ' + exitY + ' L ' + x2 + ' ' + y2;
          }
          g.append('path')
            .attr('class', 'callout-link')
            .attr('data-abbr', abbr)
            .attr('marker-end', 'url(#' + markerId + ')')
            .attr('stroke', '#000')
            .attr('stroke-width', 1.2)
            .attr('fill', 'none')
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', pathD)
            .attr('opacity', 0.08)
            .style('pointer-events', 'none');
        } else {
          g.append('line')
            .attr('class', 'callout-link')
            .attr('data-abbr', abbr)
            .attr('marker-end', 'url(#' + markerId + ')')
            .attr('stroke', '#000')
            .attr('stroke-width', 1.2)
            .attr('stroke-linecap', 'round')
            .attr('x1', c[0])
            .attr('y1', c[1])
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('opacity', 0.08)
            .style('pointer-events', 'none');
        }

        // Small glowing node at the centroid for a tech aesthetic
        g.append('circle')
          .attr('class', 'callout-link-node')
          .attr('data-abbr', abbr)
          .attr('cx', c[0])
          .attr('cy', c[1])
          .attr('r', 2.5)
          .attr('fill', '#000')
          .attr('opacity', 0.08)
          .style('pointer-events', 'none');
      });

      var hoverText = g.append('text')
        .attr('class', 'hover-info')
        .attr('x', hoverX)
        .attr('y', hoverY)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
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
          if (abbr === lastHoverAbbr) return; // only update when entering a different region
          lastHoverAbbr = abbr;
          var v = valueByAbbr[abbr];
          var baseFill = (v != null && isFinite(v)) ? color(v) : '#eee';
          d3.select(this)
            .interrupt()
            .attr('fill', d3.hsl(baseFill).brighter(0.2).toString())
            .attr('stroke', focusedAbbr === abbr ? '#000' : '#444')
            .attr('stroke-width', focusedAbbr === abbr ? 1 : 0.8)
            .attr('opacity', 1);

          // Update legend and hover text only when entering a new region
          var label = (v != null && isFinite(v)) ? (d3.format('.2f')(v) + ' per 10,000') : 'N/A';
          hoverText.text((abbr || '?') + ': ' + label);
          if (v != null && isFinite(v)) {
            var yOff = axisScale(v);
            legendIndicator.attr('y1', yOff).attr('y2', yOff).attr('opacity', 1);
          } else {
            legendIndicator.attr('opacity', 0);
          }

          // Callouts are always visible; no updates on hover
        })
        .on('mouseout', function () {
          lastHoverAbbr = null;
          hoverText.text('Hover over states');
          legendIndicator.attr('opacity', 0);
          // Callouts stay visible; no change on mouseout
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
          // Callouts already rendered; click only updates focus styling
        })
        .append('title')
        .text(function (d) {
          var name = getFeatureName(d);
          var abbr = abbrByName[name];
          var v = valueByAbbr[abbr];
          return (abbr || '?') + ': ' +
                 (v != null && isFinite(v) ? d3.format('.2f')(v) + ' per 10,000' : 'N/A');
        });
      // Ensure callout boxes, leader lines, and nodes render above the map
      g.selectAll('.callout, .callout-link, .callout-link-node').raise();
      // Click on empty space clears focus
      svg.on('click', function(event){
        var t = event.target;
        var cls = (t && t.getAttribute && t.getAttribute('class')) || '';
        var isInteractive = /\b(state|callout|callout-link|callout-link-node)\b/.test(cls);
        if (!isInteractive) {
          updateFocus(null);
        }
      });
      // Re-apply focus after redraw so the selected region stays focused
      updateFocus(focusedAbbr || null);
      // Keep focus unchanged; callouts for all regions are rendered above
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