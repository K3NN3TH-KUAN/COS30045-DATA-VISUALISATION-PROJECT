// Horizontal bar chart for Visualisation 3 info panel (jurisdiction rates)
(function(){
  var containerId = 'chart3-bars';
  var csvPath = 'data/visualisation3.csv';
  var detCsvPath = 'data/visualisation4.csv';
  var state = { data: null, detData: null, svg: null, g: null, margin: { top: 48, right: 40, bottom: 36, left: 90 }, width: 0, height: 0, focusedAbbr: null };
  var nameByAbbr = { NSW:'New South Wales', VIC:'Victoria', QLD:'Queensland', SA:'South Australia', WA:'Western Australia', TAS:'Tasmania', NT:'Northern Territory', ACT:'Australian Capital Territory' };

  function getContainer(){ return document.getElementById(containerId); }
  function currentYear(){
    var sel = document.getElementById('year3-select');
    var v = sel && sel.value ? +sel.value : null;
    if (v) return v;
    // fallback to latest year in data
    if (state.data){ return d3.max(state.data, function(d){ return d.YEAR; }); }
    return 2024;
  }

  function ensureSvg(){
    var host = getContainer();
    if (!host) return;
    var totalW = host.clientWidth || 600;
    var totalH = host.clientHeight || 280;
    state.width = totalW - state.margin.left - state.margin.right;
    state.height = totalH - state.margin.top - state.margin.bottom;
    if (!state.svg){
      state.svg = d3.select(host)
        .append('svg')
        .attr('width', totalW)
        .attr('height', totalH)
        .attr('preserveAspectRatio','none')
        .style('font-family','Segoe UI, Arial, sans-serif');
      state.g = state.svg.append('g').attr('transform','translate(' + state.margin.left + ',' + state.margin.top + ')');
      // Tooltip container (HTML)
      var tipHost = document.getElementById('bar3-tip');
      if (!tipHost){
        tipHost = document.createElement('div');
        tipHost.id = 'bar3-tip';
        tipHost.style.position = 'absolute';
        tipHost.style.pointerEvents = 'none';
        tipHost.style.background = '#e9edf2';
        tipHost.style.border = '1px solid #9aa5b1';
        tipHost.style.borderRadius = '8px';
        tipHost.style.padding = '8px 10px';
        tipHost.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        tipHost.style.fontSize = '12px';
        tipHost.style.color = '#1f2937';
        tipHost.style.display = 'none';
        tipHost.style.zIndex = '5';
        tipHost.style.left = '0';
        tipHost.style.top = '0';
        tipHost.style.transform = 'translate(0px,0px)';
        tipHost.style.transition = 'transform 100ms ease-out, opacity 120ms ease-out';
        tipHost.style.willChange = 'transform';
        // attach to the info panel card (#info3-bars) to position inside
        var infoCard = document.getElementById('info3-bars');
        if (infoCard) { infoCard.style.position = 'relative'; infoCard.appendChild(tipHost); }
      }
    } else {
      state.svg.attr('width', totalW).attr('height', totalH);
    }
  }

  function loadData(cb){
    if (state.data && state.detData) { cb(); return; }
    Promise.all([
      d3.csv(csvPath),
      d3.csv(detCsvPath)
    ]).then(function(res){
      var rows = res[0] || [];
      var det = res[1] || [];
      state.data = rows.map(function(r){
        return {
          YEAR: +r['YEAR'],
          JURISDICTION: r['JURISDICTION'],
          RATE: (r['LICENCES_PER_10,000'] == null || (typeof r['LICENCES_PER_10,000'] === 'string' && r['LICENCES_PER_10,000'].trim() === '')) ? null : +r['LICENCES_PER_10,000'],
          FINES: (r['Sum(FINES)'] == null || (typeof r['Sum(FINES)'] === 'string' && r['Sum(FINES)'].trim() === '')) ? null : +r['Sum(FINES)'],
          TOTAL_LICENCES: (r['TOTAL_LICENCES'] == null || (typeof r['TOTAL_LICENCES'] === 'string' && r['TOTAL_LICENCES'].trim() === '')) ? null : +r['TOTAL_LICENCES']
        };
      });
      state.detData = det.map(function(r){
        return {
          YEAR: +r['YEAR'],
          JURISDICTION: r['JURISDICTION'],
          DETECTION_METHOD: r['DETECTION_METHOD'],
          RATE: (r['LICENCES_PER_10,000'] == null || (typeof r['LICENCES_PER_10,000'] === 'string' && r['LICENCES_PER_10,000'].trim() === '')) ? null : +r['LICENCES_PER_10,000'],
          FINES: (r['Sum(FINES)'] == null || (typeof r['Sum(FINES)'] === 'string' && r['Sum(FINES)'].trim() === '')) ? null : +r['Sum(FINES)'],
          TOTAL_LICENCES: (r['TOTAL_LICENCES'] == null || (typeof r['TOTAL_LICENCES'] === 'string' && r['TOTAL_LICENCES'].trim() === '')) ? null : +r['TOTAL_LICENCES']
        };
      });
      cb();
    });
  }

  function renderBars(year){
    ensureSvg();
    if (!state.g || !state.data) return;

    function getSelectedMethods(){
      var cont = document.getElementById('det3-method');
      if (!cont) return ['All'];
      var all = cont.querySelector('#det3-all');
      if (all && all.checked) return ['All'];
      var opts = Array.from(cont.querySelectorAll('input[type="checkbox"][data-method]'))
        .filter(function(b){ return b.id !== 'det3-all' && b.checked; })
        .map(function(b){ return b.getAttribute('data-method'); });
      return (opts.length ? opts : ['All']);
    }
    var sel = getSelectedMethods();
    var rows;
    if (sel.length === 1 && sel[0] === 'All') {
      rows = state.data.filter(function(d){ return d.YEAR === year; });
    } else {
      var matchers = sel.map(function(label){
        if (/police/i.test(label)) return function(m){ return /police/i.test(m); };
        if (/fixed or mobile camera/i.test(label)) return function(m){ return /fixed or mobile camera/i.test(m); };
        if (/fixed camera/i.test(label)) return function(m){ return /fixed camera/i.test(m); };
        if (/mobile camera/i.test(label)) return function(m){ return /mobile camera/i.test(m); };
        if (/camera/i.test(label)) return function(m){ return /camera/i.test(m); };
        return function(){ return false; };
      });
      var detRows = (state.detData || []).filter(function(d){ return d.YEAR === year && matchers.some(function(fn){ return fn(d.DETECTION_METHOD); }); });
      var licByJur = {};
      state.data.filter(function(d){ return d.YEAR === year; }).forEach(function(d){ licByJur[d.JURISDICTION] = d.TOTAL_LICENCES; });
      var agg = {};
      detRows.forEach(function(r){
        var j = r.JURISDICTION;
        var a = agg[j] || { YEAR: year, JURISDICTION: j, FINES: 0, TOTAL_LICENCES: licByJur[j] != null ? licByJur[j] : r.TOTAL_LICENCES, RATE: null };
        if (r.FINES != null && !isNaN(r.FINES)) a.FINES += r.FINES;
        agg[j] = a;
      });
      rows = Object.keys(agg).map(function(k){
        var a = agg[k];
        var L = a.TOTAL_LICENCES;
        var F = a.FINES;
        a.RATE = (L != null && L > 0 && F != null) ? (F / L) * 10000 : null;
        return a;
      });
    }
    rows.sort(function(a,b){ return d3.descending(a.RATE, b.RATE); });

    var y = d3.scaleBand().domain(rows.map(function(d){ return d.JURISDICTION; })).range([0, state.height]).padding(0.2);
    var xMax = d3.max(rows, function(d){ return d.RATE; }) || 0;
    var x = d3.scaleLinear().domain([0, xMax * 1.05]).nice().range([0, state.width]);

    // Color scale similar to the map (trimmed YlGnBu)
    function trimSequential(interp, start, end) { return function(t){ return interp(start + (end - start) * t); }; }
    var cmin = d3.min(rows, function(d){ return d.RATE; }) || 0;
    var cmax = d3.max(rows, function(d){ return d.RATE; }) || 1;
    if (!isFinite(cmin) || !isFinite(cmax) || cmin === cmax) { cmin = Math.max(0, cmin || 0); cmax = cmin + 1; }
    var color = d3.scaleSequential(trimSequential(d3.interpolateYlGnBu, 0.15, 0.75)).domain([cmin, cmax]);

    // Clear
    state.g.selectAll('*').remove();

    // Title
    state.svg.selectAll('.chart-title').remove();
    var vwTitle = window.innerWidth || document.documentElement.clientWidth;
    var fsTitle = vwTitle <= 480 ? 11 : (vwTitle <= 768 ? 13 : (vwTitle <= 1024 ? 14 : 15));
    state.svg.append('text')
      .attr('class','chart-title')
      .attr('x', state.margin.left)
      .attr('y', 22)
      .style('font-size', fsTitle + 'px')
      .style('font-weight','700')
      .style('fill','#000000')
      .text('Fines per 10,000 by Jurisdiction');

    // Gridlines (vertical dotted)
    var grid = d3.axisBottom(x).ticks(6).tickSize(state.height).tickFormat('');
    state.g.append('g')
      .attr('class','grid')
      .attr('transform','translate(0,0)')
      .call(grid)
      .selectAll('line')
      .attr('stroke','#d9dde6')
      .attr('stroke-dasharray','3,3');
    state.g.selectAll('.grid path').remove();

    // Bars
    var barColor = null;
    var bars = state.g.selectAll('.bar')
      .data(rows)
      .enter()
      .append('rect')
      .attr('class','bar')
      .attr('x', 0)
      .attr('y', function(d){ return y(d.JURISDICTION); })
      .attr('width', function(d){ return x(d.RATE); })
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', function(d){ return color(d.RATE); })
      .style('cursor','pointer')
      .on('mouseover', function(event, d){
        var tip = document.getElementById('bar3-tip'); if (!tip) return;
        var full = (nameByAbbr[d.JURISDICTION] || d.JURISDICTION) + ' (' + d.JURISDICTION + ')';
        var rateTxt = (d.RATE != null && isFinite(d.RATE)) ? d3.format('.2f')(d.RATE) : 'N/A';
        var finesTxt = (d.FINES != null && isFinite(d.FINES)) ? d3.format(',d')(d.FINES) : 'N/A';
        var licTxt = (d.TOTAL_LICENCES != null && isFinite(d.TOTAL_LICENCES)) ? d3.format(',d')(d.TOTAL_LICENCES) : 'N/A';
        tip.innerHTML = '<div style="font-weight:600;text-align:center;margin-bottom:4px">' + full + '</div>'+
                        '<div style="display:flex;gap:18px"><div>Fines per 10,000</div><div style="margin-left:auto">' + rateTxt + '</div></div>'+
                        '<div style="display:flex;gap:18px"><div>Fines</div><div style="margin-left:auto">' + finesTxt + '</div></div>'+
                        '<div style="display:flex;gap:18px"><div>Licences</div><div style="margin-left:auto">' + licTxt + '</div></div>';
        tip.style.display = 'block';
        positionTipToPointer(event);
      })
      .on('mousemove', function(event){ positionTipToPointer(event); })
      .on('mouseout', function(){ var tip = document.getElementById('bar3-tip'); if (tip) tip.style.display='none'; })
      .on('click', function(event, d){
        // focus selection in bars and sync to map
        state.focusedAbbr = (state.focusedAbbr === d.JURISDICTION) ? null : d.JURISDICTION;
        applyBarFocus();
        if (window.chart3Api && typeof window.chart3Api.focusJurisdiction === 'function') {
          window.chart3Api.focusJurisdiction(state.focusedAbbr || null);
        }
      });

    function applyBarFocus(){
      state.g.selectAll('rect.bar')
        .attr('opacity', function(dd){ return (!state.focusedAbbr || dd.JURISDICTION === state.focusedAbbr) ? 1 : 0.35; })
        .attr('stroke', function(dd){ return (state.focusedAbbr && dd.JURISDICTION === state.focusedAbbr) ? '#0f172a' : 'none'; })
        .attr('stroke-width', function(dd){ return (state.focusedAbbr && dd.JURISDICTION === state.focusedAbbr) ? 1.2 : 0; });
      state.g.selectAll('text.val')
        .attr('opacity', function(dd){ return (!state.focusedAbbr || dd.JURISDICTION === state.focusedAbbr) ? 1 : 0.35; });
    }

    // Expose API for map to sync focus on bars
    if (!window.chart3BarsApi) window.chart3BarsApi = {};
    window.chart3BarsApi.focusJurisdiction = function(code){
      state.focusedAbbr = code || null;
      applyBarFocus();
    };

    function positionTipToPointer(event){
      var tip = document.getElementById('bar3-tip'); var card = document.getElementById('info3-bars');
      if (!tip || !card) return;
      var rect = card.getBoundingClientRect();
      var xPos = (event.clientX - rect.left) + 14;
      var yPos = (event.clientY - rect.top) + 14;
      var w = tip.offsetWidth || 160; var h = tip.offsetHeight || 80;
      xPos = Math.max(8, Math.min(xPos, card.clientWidth - w - 8));
      yPos = Math.max(8, Math.min(yPos, card.clientHeight - h - 8));
      tip.style.transform = 'translate(' + xPos + 'px,' + yPos + 'px)';
    }

    // Left labels (jurisdictions)
    state.g.append('g')
      .attr('class','y-axis')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('fill','#0f172a')
      .style('font-size','12px');

    // Values on bar ends
    state.g.selectAll('.val')
      .data(rows)
      .enter()
      .append('text')
      .attr('class','val')
      .attr('x', function(d){ return x(d.RATE) + 6; })
      .attr('y', function(d){ return (y(d.JURISDICTION) || 0) + y.bandwidth()/2 + 4; })
      .style('font-size','12px')
      .style('fill','#0f172a')
      .text(function(d){ return Math.round(d.RATE); });

    // Bottom x-axis (optional; subtle)
    var ax = state.g.append('g')
      .attr('transform','translate(0,' + state.height + ')')
      .call(d3.axisBottom(x).ticks(6));
    ax.selectAll('text').style('fill','#0f172a').style('font-size','11px');
    ax.selectAll('path, line').attr('stroke','#cbd5e1');

    // Axis label
    state.svg.selectAll('.x-axis-title').remove();
    state.svg.append('text')
      .attr('class','x-axis-title')
      .attr('x', state.margin.left + state.width / 2)
      .attr('y', state.margin.top + state.height + state.margin.bottom - 6)
      .attr('text-anchor','middle')
      .style('fill','#0f172a')
      .style('font-size','12px')
      .text('Rate per 10,000');

    // Y-axis title
    state.svg.selectAll('.y-axis-title').remove();
    state.svg.append('text')
      .attr('class','y-axis-title')
      .attr('transform','rotate(-90)')
      .attr('x', -(state.margin.top + state.height / 2))
      .attr('y', Math.max(12, state.margin.left - 72))
      .attr('text-anchor','middle')
      .style('fill','#0f172a')
      .style('font-size','12px')
      .text('Jurisdiction');

    // apply focus styling after render
    applyBarFocus();
  }

  function draw(){ loadData(function(){ renderBars(currentYear()); }); }

  // Toggle behavior
  function setupToggle(){
    var dotDesc = document.getElementById('btn-desc');
    var dotBars = document.getElementById('btn-bars');
    var viewDesc = document.getElementById('info3-desc');
    var viewBars = document.getElementById('info3-bars');
    var actions = document.querySelector('#blank3-section .section-actions');
    if (!dotDesc || !dotBars || !viewDesc || !viewBars) return;
    function activateDesc(){
      dotDesc.classList.add('active'); dotBars.classList.remove('active');
      dotDesc.setAttribute('aria-selected','true'); dotBars.setAttribute('aria-selected','false');
      viewDesc.removeAttribute('hidden'); viewDesc.classList.add('active');
      viewBars.setAttribute('hidden',''); viewBars.classList.remove('active');
      if (actions) { actions.style.display = 'flex'; }
    }
    function activateBars(){
      dotBars.classList.add('active'); dotDesc.classList.remove('active');
      dotBars.setAttribute('aria-selected','true'); dotDesc.setAttribute('aria-selected','false');
      viewBars.removeAttribute('hidden'); viewBars.classList.add('active');
      viewDesc.setAttribute('hidden',''); viewDesc.classList.remove('active');
      if (actions) { actions.style.display = 'none'; }
      draw();
    }
    dotDesc.addEventListener('click', activateDesc);
    dotBars.addEventListener('click', activateBars);
  }

  // Update chart when year changes (if bars are visible)
  function hookYearSelect(){
    var sel = document.getElementById('year3-select');
    if (!sel) return;
    sel.addEventListener('change', function(){
      var viewBars = document.getElementById('info3-bars');
      if (viewBars && !viewBars.hasAttribute('hidden')) { draw(); }
    });
  }

  // Update chart when detection method changes (if bars are visible)
  function hookMethodSelect(){
    var sel = document.getElementById('det3-method');
    if (!sel) return;
    sel.addEventListener('change', function(){
      var viewBars = document.getElementById('info3-bars');
      if (viewBars && !viewBars.hasAttribute('hidden')) { draw(); }
    });
  }

  // Resize handling when bars are visible
  window.addEventListener('resize', function(){
    var viewBars = document.getElementById('info3-bars');
    if (viewBars && !viewBars.hasAttribute('hidden')) { draw(); }
  });

  // Init
  document.addEventListener('DOMContentLoaded', function(){ setupToggle(); hookYearSelect(); hookMethodSelect(); });
})();