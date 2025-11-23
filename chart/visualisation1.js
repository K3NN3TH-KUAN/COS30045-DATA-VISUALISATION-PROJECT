(function () {
  var margin = {
      top: 60,
      right: 24,
      bottom: 0,
      left: 40
  }; 
  var chartEl = document.getElementById('chart');
  var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
  var totalHeight = (chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 520;

  var height = totalHeight - margin.top - margin.bottom;
  var width = totalWidth;

  var svgRoot = d3.select('#chart')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('role','img')
    .attr('aria-label','Annual fines by mobile phone use chart')
    .style('font-family', 'Segoe UI, Arial, sans-serif')
    .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
    .attr('preserveAspectRatio', 'none');
  var svg = svgRoot.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  var redraw = function(){};
  window.chart1Ctx = { svg: svg, margin: margin, chartEl: chartEl, ready: false, needsInitialDraw: false, shouldRender: function(){ var el=document.getElementById('blank1-section'); return el && el.classList.contains('in-view'); }, onSectionEnter: function(){ if (window.chart1Ctx && window.chart1Ctx.needsInitialDraw){ redraw(); window.chart1Ctx.needsInitialDraw=false; } } };
  var selected = { key: null, year: null };
  svgRoot.on('click', function(event){
    var t = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
    if (t === 'circle') return;
    var n = event.target, insideAnno = false; while(n){ if (n.classList && n.classList.contains('annotation-camera')) { insideAnno = true; break; } n = n.parentNode; }
    if (!insideAnno) { svg.selectAll('.annotation-camera').remove(); }
    selected.key = null; selected.year = null;
    svg.selectAll('path.series-line').transition().duration(300).style('opacity', 1).attr('stroke-width', 2);
    svg.selectAll('circle').transition().duration(200).style('opacity', 1).attr('r', 5);
    d3.select('#chart1-tooltip').style('opacity', 0);
    var panel = document.querySelector('#blank1-section aside.info-panel');
    if (panel){ var t = panel.querySelector('#info1-title'); if (t) t.style.display=''; var p = panel.querySelector('ul.info-points'); if (p) p.style.display=''; var a = panel.querySelector('.section-actions'); if (a) a.style.display=''; var bars = panel.querySelector('#info1-bars'); if (bars) panel.removeChild(bars); }
  });

  d3.csv('data/visualisation1.csv', function(d) {
    return {
      YEAR: +d.YEAR,
      Police: (d['Police issued fines'] && d['Police issued fines'].trim() !== '') ? +d['Police issued fines'] : null,
      Camera: (d['Camera issued fines'] && d['Camera issued fines'].trim() !== '') ? +d['Camera issued fines'] : null
    };
  }).then(function(data) {
    // Populate filters
    var startSel = document.getElementById('year1-start');
    var endSel = document.getElementById('year1-end');
    var methodSel = document.getElementById('det-method');
    var methodOptions = ['All','Police issued fines','Camera issued fines'];
    if (methodSel && methodSel.options.length === 0) {
      methodOptions.forEach(function(o){ var opt=document.createElement('option'); opt.value=o; opt.textContent=o; methodSel.appendChild(opt); });
      methodSel.value = 'All';
    }

    var yearsMap = {};
    data.forEach(function(d){ yearsMap[d.YEAR] = true; });
    var years = Object.keys(yearsMap).map(function(s){ return +s; }).sort(d3.ascending);

    years.forEach(function(y){
      var opt1 = document.createElement('option'); opt1.value = y; opt1.textContent = y; startSel.appendChild(opt1);
      var opt2 = document.createElement('option'); opt2.value = y; opt2.textContent = y; endSel.appendChild(opt2);
    });
    startSel.value = years[0];
    endSel.value = years[years.length - 1];

    function filtered() {
      var start = +startSel.value, end = +endSel.value;
      return data.filter(function(d){ return d.YEAR >= start && d.YEAR <= end; });
    }

    function currentKeys() {
      var v = methodSel ? methodSel.value : 'All';
      if (v === 'Police issued fines') return ['Police'];
      if (v === 'Camera issued fines') return ['Camera'];
      return ['Police','Camera'];
    }

    // Reusable tooltip for Chart 1
    var tooltip = d3.select('body')
      .append('div')
      .attr('id', 'chart1-tooltip')
      .style('position', 'absolute')
      .style('background', '#eef1f5')
      .style('color', '#0b1f3b')
      .style('padding', '10px 12px')
      .style('border-radius', '8px')
      .style('box-shadow', '0 6px 18px rgba(0,0,0,0.20)')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    function setInfo1Visibility(show){
      var section = document.getElementById('blank1-section');
      var panel = section ? section.querySelector('aside.info-panel') : null;
      var t = panel ? panel.querySelector('#info1-title') : null;
      var p = panel ? panel.querySelector('ul.info-points') : null;
      var a = panel ? panel.querySelector('.section-actions') : null;
      var bars = panel ? panel.querySelector('#info1-bars') : null;
      if (t) t.style.display = show ? '' : 'none';
      if (p) p.style.display = show ? '' : 'none';
      if (a) a.style.display = show ? '' : 'none';
      if (bars) bars.style.display = show ? 'none' : 'block';
    }
    function ensureBarStyles(){
      if (document.getElementById('chart1-bar-styles')) return;
      var style = document.createElement('style');
      style.id = 'chart1-bar-styles';
      style.textContent = '#info1-bars{width:100%;min-height:260px}#info1-bars .axis text{fill:#fff;font-family:Segoe UI, Arial, sans-serif;font-size:13px}#info1-bars .axis path,#info1-bars .axis line{stroke:#d1d5db}#info1-bars .bar-label{fill:#fff;font-weight:700;font-size:14px}';
      document.head.appendChild(style);
    }
    function resetInfo1Panel(){
      var panel = document.querySelector('#blank1-section aside.info-panel');
      if (!panel) return;
      var c = panel.querySelector('#info1-bars');
      if (c) panel.removeChild(c);
      setInfo1Visibility(true);
    }
    function renderInfoBars(year){
      ensureBarStyles();
      var panel = document.querySelector('#blank1-section aside.info-panel');
      if (!panel) return;
      var container = panel.querySelector('#info1-bars');
      if (!container){
        container = document.createElement('div');
        container.id = 'info1-bars';
        container.setAttribute('role','img');
        panel.appendChild(container);
      }
      setInfo1Visibility(false);
      var row = filtered().find(function(d){ return d.YEAR === year; }) || data.find(function(d){ return d.YEAR === year; });
      var police = row ? row.Police : null;
      var camera = row ? row.Camera : null;
      var series = [];
      var mode = methodSel ? methodSel.value : 'All';
      if (mode === 'Police issued fines' || mode === 'Police') { if (police != null && !isNaN(police)) series.push({ label:'Police', value:+police }); }
      else if (mode === 'Camera issued fines' || mode === 'Camera') { if (camera != null && !isNaN(camera)) series.push({ label:'Camera', value:+camera }); }
      else { if (police != null && !isNaN(police)) series.push({ label:'Police', value:+police }); if (camera != null && !isNaN(camera)) series.push({ label:'Camera', value:+camera }); }
      if (series.length === 0){ var msg = document.createElement('div'); msg.textContent = 'No enforcement data available for '+year+' ('+mode+')'; msg.style.color = '#ddd'; msg.style.fontSize='13px'; msg.style.padding='8px 4px'; container.innerHTML = ''; container.appendChild(msg); return; }
      var colors = { Police: '#0072B2', Camera: '#D55E00' };
      function draw(){
        container.innerHTML = '';
        var w = Math.max(260, panel.clientWidth || 300);
        var h = Math.max(280, panel.clientHeight || 340);
        var mq = window.matchMedia('(max-width: 768px)');
        var isMobile = mq.matches;
        var m = isMobile ? { top: 50, right: 14, bottom: 42, left: 56 } : { top: 60, right: 18, bottom: 46, left: 60 };
        var iw = Math.max(220, Math.round((w - m.left - m.right) * 0.78));
        var ih = Math.max(220, Math.round((h - m.top - m.bottom) * 0.70));
        var svg = d3.select(container).append('svg').attr('width','100%').attr('height',h).attr('viewBox','0 0 '+w+' '+h).attr('preserveAspectRatio','xMinYMin meet').style('display','block');
        var innerW = w - m.left - m.right;
        var leftPad = m.left + Math.round((innerW - iw)/2);
        var g = svg.append('g').attr('transform','translate('+leftPad+','+m.top+')');
        var x = d3.scaleBand().domain(series.map(function(d){ return d.label; })).range([0, iw]).padding(0.35);
        var yMax = d3.max(series, function(d){ return d.value; });
        var y = d3.scaleLinear().domain([0, yMax]).nice().range([ih, 0]);
        var abbr = function(n){ if (n==null||!isFinite(n)) return ''; var a=Math.abs(n); if (a>=1000000) return (Math.round(n/100000)/10)+'M'; if (a>=1000) return (Math.round(n/100)/10)+'k'; return d3.format(',')(n); };
        g.append('g').attr('class','axis axis--x').attr('transform','translate(0,'+ih+')').call(d3.axisBottom(x));
        g.append('g').attr('class','axis axis--y').call(d3.axisLeft(y).ticks(5).tickFormat(isMobile?abbr:d3.format(',')));
        var bars = g.selectAll('rect.bar').data(series).enter().append('rect').attr('class','bar').attr('x', function(d){ return x(d.label); }).attr('y', ih).attr('width', x.bandwidth()).attr('height', 0).attr('fill', function(d){ return colors[d.label]; }).attr('rx',4);
        bars.transition().duration(600).ease(d3.easeCubicOut).attr('y', function(d){ return y(d.value); }).attr('height', function(d){ return ih - y(d.value); });
        var fmtN = d3.format(',');
        g.selectAll('text.bar-label').data(series).enter().append('text').attr('class','bar-label').attr('text-anchor','middle').attr('x', function(d){ return x(d.label) + x.bandwidth()/2; }).attr('y', function(d){ return y(d.value) - 8; }).style('opacity',0).style('font-size', isMobile? 'clamp(12px,2.2vw,14px)' : '14px').text(function(d){ return fmtN(d.value); }).transition().duration(600).style('opacity',1);
        svg.append('text').attr('x', w/2).attr('y', 18).attr('text-anchor','middle').style('font-size', isMobile? 'clamp(14px,2.4vw,18px)' : '18px').style('font-weight','700').style('fill','#fff').text('Annual Fines Comparison in '+year);
        svg.append('text').attr('transform','rotate(-90)').attr('x', -(m.top + ih/2)).attr('y', 16).attr('text-anchor','middle').style('font-size', isMobile? 'clamp(12px,2vw,16px)' : '16px').style('fill','#fff').text('Annual Fines');
        var maxTickHX = 0; g.select('.axis--x').selectAll('text').each(function(){ var b = this.getBBox(); if (b && b.height > maxTickHX) maxTickHX = b.height; });
        var gapX = isMobile ? 20 : 30;
        svg.append('text').attr('x', w/2).attr('y', m.top + ih + maxTickHX + gapX).attr('text-anchor','middle').style('font-size', isMobile? 'clamp(12px,2vw,16px)' : '16px').style('fill','#fff').text('Detection Method');
        container.setAttribute('aria-label','Police vs Camera Annual Fines in '+year);
      }
      draw();
      if ('ResizeObserver' in window){ var ro = new ResizeObserver(function(){ draw(); }); ro.observe(panel); ro.observe(container); }
      var mq768 = window.matchMedia('(max-width: 768px)'); if (mq768.addEventListener) mq768.addEventListener('change', function(){ draw(); }); else if (mq768.addListener) mq768.addListener(function(){ draw(); });
    }

    redraw = function() {
      var f = filtered();
      var keys = currentKeys();
  
      svg.selectAll('*').remove();
  
      var isMobile = window.innerWidth <= 768;
      var x = d3.scaleLinear()
        .domain(d3.extent(f, function(d){ return d.YEAR; }))
        .range([0, width]); // use full x-range
  
      var displayKeys = keys.filter(function(k){ return f.some(function(d){ return d[k] != null && !isNaN(d[k]); }); });
      console.log('Chart1 displayKeys', displayKeys, 'counts', displayKeys.map(function(k){ return f.filter(function(d){ return d[k]!=null && !isNaN(d[k]); }).length; }));
      var yMax = d3.max(displayKeys, function(k){ return d3.max(f, function(d){ return (d[k] != null && !isNaN(d[k])) ? d[k] : null; }); });
      if (!isFinite(yMax) || yMax <= 0) yMax = 1;
      var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();
  
      // Responsive ticks: odd-only when odd range selected; else even-only on mobile; full set otherwise; thin further at ≤400px
      var startY = +startSel.value, endY = +endSel.value;
      var oddRangeSelected = (startY % 2 === 1) && (endY % 2 === 1);
      var yearVals = f.map(function(d){ return d.YEAR; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).sort(d3.ascending);
      yearVals = oddRangeSelected ? yearVals.filter(function(y){ return y % 2 === 1; })
                                  : (isMobile ? yearVals.filter(function(y){ return y % 2 === 0; }) : yearVals);
      var isTiny = (window.innerWidth || document.documentElement.clientWidth) <= 400;
      if (isTiny) { var maxTicks = 5; var step = Math.max(1, Math.ceil(yearVals.length / maxTicks)); yearVals = yearVals.filter(function(y,i){ return i % step === 0; }); }
      function abbr(n){ if (n == null || !isFinite(n)) return ''; var abs = Math.abs(n); if (abs >= 1000000) return (Math.round(n/100000)/10)+'M'; if (abs >= 1000) return (Math.round(n/100)/10)+'k'; return d3.format(',')(n); }
      var xAxis = d3.axisBottom(x).tickValues(yearVals).tickFormat(d3.format('d')).tickSizeOuter(0);
      var yAxis = isMobile ? d3.axisLeft(y).ticks(6).tickFormat(abbr) : d3.axisLeft(y).ticks(6).tickFormat(d3.format(','));

      var isNarrow = (window.innerWidth || totalWidth) <= 780;
      var xAxisG = svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .attr('class', 'axis axis--x')
        .attr('role','img')
        .attr('aria-label','X axis: Year')
        .call(xAxis);

      xAxisG.selectAll('text')
        .attr('transform', 'rotate(0)')
        .style('text-anchor', 'middle')
        .attr('dx', '0')
        .attr('dy', '0.85em')
        .attr('font-size', isMobile ? 11 : 13);
    
      var yAxisG = svg.append('g')
        .attr('class', 'axis axis--y')
        .attr('role','img')
        .attr('aria-label','Y axis: Annual fines')
        .call(yAxis);

      yAxisG.selectAll('text')
        .style('font-size', isMobile ? '11px' : '13px');

      var gridTicks = y.ticks();
      var grid = svg.append('g').attr('class','grid grid--y').style('pointer-events','none');
      grid.selectAll('line')
        .data(gridTicks.slice(1))
        .enter().append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', function(d){ return y(d); })
        .attr('y2', function(d){ return y(d); })
        .attr('stroke', '#b5c0cb')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,4')
        .attr('opacity', 0.35);

      // Chart title
      svg.append('text')
        .attr('class', 'chart1-title')
        .attr('x', -90)
        .attr('y', -30)
        .attr('text-anchor', 'start')
        .style('font-size', isMobile ? '18px' : '20px')
        .style('font-weight', '700')
        .text('Annual Fines by Mobile Phone Use');

      // Y-axis label
      var ylab = svg.append('text')
        .attr('class', 'y-label')
        .attr('transform', 'rotate(-90) translate(' + (-height/2) + ',0)')
        .attr('x', 0)
        .attr('y', -(isNarrow ? 60 : 70))
        .attr('text-anchor', 'middle')
        .style('font-size', isNarrow ? 'clamp(12px, 2.2vw, 16px)' : (isMobile ? '14px' : '18px'))
        .text('Annual Fines');

      // Lines with continuous reveal
      var colors = { Police: '#0072B2', Camera: '#D55E00' };
      var defs = svgRoot.select('defs'); if (defs.empty()) defs = svgRoot.append('defs');
      var clipId = 'chart1-clip';
      defs.select('#'+clipId).remove();
      var cp = defs.append('clipPath').attr('id', clipId).attr('clipPathUnits','userSpaceOnUse');
      var clipRect = cp.append('rect').attr('x', 0).attr('y', 0).attr('width', 0).attr('height', height);
      var lineGroup = svg.append('g').attr('class','line-group').attr('clip-path','url(#'+clipId+')');

      var lineFor = function(key){
        return d3.line()
          .defined(function(d){ return d[key] != null && !isNaN(d[key]); })
          .x(function(d){ return x(d.YEAR); })
          .y(function(d){ return y(d[key]); });
      };

      displayKeys.forEach(function(k, i){
        lineGroup.append('path')
          .datum(f)
          .attr('class','series-line series-'+k)
          .attr('data-key', k)
          .attr('fill', 'none')
          .attr('stroke', colors[k])
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round')
          .attr('d', lineFor(k));
      });
      clipRect.transition().duration(3000).ease(d3.easeCubicOut).attr('width', width).on('end', renderCameraAnnotation);
      // Keep only one Year label (lower position)
      var maxTickH = 0;
      xAxisG.selectAll('text').each(function(){ var b = this.getBBox(); if (b && b.height > maxTickH) maxTickH = b.height; });
      var gap = isNarrow ? 30 : 30;
      var xlab = svg.append('text')
        .attr('class','x-label')
        .attr('text-anchor','middle')
        .style('font-size', isNarrow ? 'clamp(12px, 2.2vw, 16px)' : (isMobile ? '16px' : '18px'))
        .attr('transform', 'translate(' + (width/2) + ',' + (height + maxTickH + gap) + ')')
        .text('Year');

      // Legend: centered; tighter spacing and shorter labels on mobile
      var legend = svg.append('g')
        .attr('role','group')
        .attr('aria-label','Legend')
        .attr('transform', 'translate(' + (width / 2 - 80) + ',' + (height + 95) + ')');

      var spacing = isMobile ? 120 : 240;
      var labels = isMobile ? { Police: 'Police', Camera: 'Camera' }
                            : { Police: 'Police issued fines', Camera: 'Camera issued fines' };

      displayKeys.forEach(function(k, i) {
        var xoff = (i - (displayKeys.length - 1) / 2) * spacing;
      
        // Rectangle swatch
        legend.append('rect')
          .attr('x', xoff)
          .attr('y', -8)
          .attr('width', 30)
          .attr('height', 16)
          .attr('rx', 3).attr('ry', 3)
          .attr('fill', colors[k])
          .attr('stroke', '#555')
          .attr('stroke-width', 1);
      
        legend.append('text')
          .attr('x', xoff + 36)
          .attr('y', 0)
          .attr('dominant-baseline', 'middle')
          .style('font-size', isNarrow ? 'clamp(12px, 2vw, 15px)' : (isMobile ? '14px' : '18px'))
          .text(labels[k]);
      });
    
      // Add circles with hover tooltip at each data point
      // Interactive dots: grow + solid fill on hover
      var fmt = d3.format(',');
      function placeTip(event){
        var rect = tooltip.node().getBoundingClientRect();
        var cont = (svgRoot.node && svgRoot.node()) ? svgRoot.node().getBoundingClientRect() : document.getElementById('chart').getBoundingClientRect();
        var pad = 10;
        var x = event.pageX, y = event.pageY;
        var contL = cont.left + window.scrollX, contT = cont.top + window.scrollY;
        var contR = cont.right + window.scrollX, contB = cont.bottom + window.scrollY;
        var left = x + 10;
        var top = y + 10;
        if (left + rect.width > contR - pad) left = contR - pad - rect.width;
        if (left < contL + pad) left = contL + pad;
        if (top + rect.height > contB - pad) top = contB - pad - rect.height;
        if (top < contT + pad) top = contT + pad;
        tooltip.style('left', left + 'px').style('top', top + 'px');
      }
      var vwPts = window.innerWidth || document.documentElement.clientWidth;
      var isTinyPts = vwPts <= 400;
      var isSmallPts = vwPts <= 480;
      var baseR = isTinyPts ? 3.5 : (isSmallPts ? 4 : 5);
      var hoverR = isTinyPts ? 5.5 : (isSmallPts ? 6 : 7);
      var selectedR = isTinyPts ? 7 : (isSmallPts ? 8 : 9);
      var circleGroup = svg.append('g').attr('class', 'points');
  
      displayKeys.forEach(function(k){
        var seriesColor = colors[k];
        circleGroup.selectAll('circle.point-' + k)
          .data(f.filter(function(d){ return d[k] != null && !isNaN(d[k]); }))
          .enter()
          .append('circle')
          .attr('class', 'point-' + k)
          .attr('data-key', k)
          .attr('cx', function(d){ return x(d.YEAR); })
          .attr('cy', function(d){ return y(d[k]); })
          .attr('r', baseR)
          .attr('fill', seriesColor)
          .attr('stroke', 'none')
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d){
            d3.select(this).transition().duration(120).attr('r', hoverR);
            var lbl = k === 'Police' ? 'Police issued fines' : 'Camera issued fines';
            var html = '<div style="font-weight:700;margin-bottom:6px;font-size:15px">' + d.YEAR + '</div>'+
                       '<div style="display:flex;align-items:center;gap:8px">'+
                       '<span style="display:inline-block;width:26px;height:8px;border-radius:8px;background:'+seriesColor+'"></span>'+
                       '<span style="min-width:160px">'+lbl+'</span>'+
                       '<span style="margin-left:auto;font-variant-numeric:tabular-nums">'+fmt(d[k])+'</span>'+
                       '</div>';
            tooltip.html(html).style('opacity', 0.95);
            placeTip(event);
          })
          .on('mousemove', function(event){
            placeTip(event);
          })
          .on('mouseout', function(event, d){
            var ck = this.getAttribute('data-key');
            var keep = (selected.key === ck && selected.year === d.YEAR);
            d3.select(this).transition().duration(150).attr('r', keep ? selectedR : baseR);
            if (!keep) tooltip.style('opacity', 0);
          })
          .on('click', function(event, d){
            selected.key = k; selected.year = d.YEAR; applySelection();
            renderInfoBars(d.YEAR);
            var lbl = k === 'Police' ? 'Police issued fines' : 'Camera issued fines';
            var html = '<div style="font-weight:700;margin-bottom:6px;font-size:15px">' + d.YEAR + '</div>'+
                       '<div style="display:flex;align-items:center;gap:8px">'+
                       '<span style="display:inline-block;width:26px;height:8px;border-radius:8px;background:'+seriesColor+'"></span>'+
                       '<span style="min-width:160px">'+lbl+'</span>'+
                       '<span style="margin-left:auto;font-variant-numeric:tabular-nums">'+fmt(d[k])+'</span>'+
                       '</div>';
            tooltip.html(html).style('opacity', 0.98);
            placeTip(event);
            event.stopPropagation();
          });
      });

      var camPoints = f.filter(function(d){ return d.Camera != null && !isNaN(d.Camera); });
      function renderCameraAnnotation(){
        if (displayKeys.indexOf('Camera') < 0 || !camPoints.length) return;
        var firstYear = d3.min(camPoints, function(d){ return d.YEAR; });
        if (firstYear !== 2020) return;
        var first = camPoints.find(function(d){ return d.YEAR === firstYear; });
        var px = x(first.YEAR) - 20;
        var py = y(first.Camera) - 180;
        var pad = 14;
        var vwAnno = window.innerWidth || document.documentElement.clientWidth;
        var isSmallAnno = vwAnno <= 480;
        var isTinyAnno = vwAnno <= 400;
        var padMin = 10;
        var boxW = isTinyAnno ? Math.max(200, Math.min(Math.round(width * 0.92), 240))
                               : (isSmallAnno ? Math.max(240, Math.min(Math.round(width * 0.90), 280))
                                              : Math.max(220, Math.min(360, Math.round(width * 0.58))));
        var boxH = isTinyAnno ? Math.max(200, Math.min(Math.round(height * 0.42), 130))
                               : (isSmallAnno ? Math.max(180, Math.min(Math.round(height * 0.40), 150))
                                              : Math.max(180, Math.min(Math.round(height * 0.34), 160)));
        var right = (px + 12 + boxW) <= width;
        var bx, by;
        if (isSmallAnno) {
          bx = Math.round((width - boxW) / 2);
          bx = Math.max(padMin, Math.min(width - boxW - padMin, bx));
          if (py - boxH - 12 >= padMin) { by = py - boxH - 12; } else { by = py + 12; }
          by = Math.max(padMin, Math.min(height - boxH - padMin, by));
        } else {
          bx = right ? px + 12 : px - boxW - 12;
          bx = Math.max(padMin, Math.min(width - boxW - padMin, bx));
          by = py - 24;
          by = Math.max(padMin, Math.min(height - boxH - padMin, by));
        }
        var ag = svg.append('g').attr('class','annotation-camera').style('pointer-events','none');
        var leader = ag.append('line')
          .attr('x1', px + 20)
          .attr('y1', py + 180)
          .attr('stroke','#333')
          .attr('stroke-width',1.4)
          .attr('stroke-dasharray','4,3')
          .style('opacity',0);
        leader.transition().duration(700).ease(d3.easeCubicOut)
          .style('opacity',1)
          .attr('x2', Math.max(bx + 8, Math.min(bx + boxW - 8, bx + boxW/2)))
          .attr('y2', Math.max(by + 8, Math.min(by + boxH - 8, py)));
          
        var rect = ag.append('rect')
          .attr('x', bx)
          .attr('y', by)
          .attr('width', boxW)
          .attr('height', boxH)
          .attr('rx', 10)
          .attr('fill','#eef1f5')
          .attr('stroke','#374151')
          .attr('stroke-width',1.2)
          .style('opacity',0);
        rect.transition().duration(500).ease(d3.easeCubicOut).style('opacity',1);
        var fo = ag.append('foreignObject')
          .attr('x', bx)
          .attr('y', by)
          .attr('width', boxW)
          .attr('height', boxH)
          .style('opacity',0);
        fo.append('xhtml:div')
          .style('padding', (pad+6) + 'px ' + pad + 'px ' + pad + 'px ' + pad + 'px')
          .style('width', (boxW - pad*2) + 'px')
          .style('height', (boxH) + 'px')
          .style('font-family', 'Segoe UI, Arial, sans-serif')
          .style('line-height', '1.35')
          .style('color', '#111827')
          .style('font-size', '14px')
          .html('<div style="font-weight:700;font-size:16px;margin-bottom:6px;">Camera enforcement introduced in 2020</div><div style="color:#374151;font-size:14px;margin-bottom:4px;">Reason: Catching distracted driving is hard for police to do all the time</div><div style="color:#374151;font-size:14px;">Before 2020, enforcement data was from police-issued fines only</div>');
        fo.transition().delay(350).duration(450).style('opacity',1);

        var cb = ag.append('g')
          .attr('class','annotation-close')
          .attr('transform', 'translate(' + (bx + boxW - 22) + ',' + (by + 6) + ')')
          .style('pointer-events','auto')
          .style('cursor','pointer')
          .style('opacity',0)
          .on('click', function(){ ag.transition().duration(180).style('opacity',0).on('end', function(){ ag.remove(); }); });
        cb.append('rect')
          .attr('width', 18)
          .attr('height', 18)
          .attr('rx', 9)
          .attr('fill', '#6b7280');
        cb.append('text')
          .attr('x', 9)
          .attr('y', 12)
          .attr('text-anchor','middle')
          .style('font-size','12px')
          .style('fill','#ffffff')
          .text('×');
        cb.transition().delay(500).duration(300).style('opacity',1);
      }

      function applySelection(){
        var has = selected.key != null;
        svg.selectAll('path.series-line')
          .transition().duration(300)
          .style('opacity', function(){ var kk = this.getAttribute('data-key'); return (!has || kk === selected.key) ? 1 : 0.1; })
          .attr('stroke-width', function(){ var kk = this.getAttribute('data-key'); return (has && kk === selected.key) ? 3 : 2; });
        circleGroup.selectAll('circle')
          .transition().duration(200)
          .style('opacity', function(){ var ck = this.getAttribute('data-key'); return (!has || ck === selected.key) ? 1 : 0.1; })
          .attr('r', function(p){ var ck = this.getAttribute('data-key'); return (has && ck === selected.key && p.YEAR === selected.year) ? selectedR : baseR; });
        if (!has) { resetInfo1Panel(); }
      }
      applySelection();
    }

    // Mobile-only axis styling for better readability
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // X axis: gently rotate and shrink font
      svg.select('.axis--x').selectAll('text')
        .attr('font-size', 11)
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(35)');
      // Y axis: larger font for readability
      svg.select('.axis--y').selectAll('text')
        .attr('font-size', 15);
    }
    if (window.chart1Ctx.shouldRender()) { redraw(); } else { window.chart1Ctx.needsInitialDraw = true; }

    // Detection method select behavior
    if (methodSel) { methodSel.addEventListener('change', function(){ if (window.chart1Ctx.shouldRender()) { redraw(); } else { window.chart1Ctx.needsInitialDraw = true; } if (selected && selected.year != null){ renderInfoBars(selected.year); } }); }
    startSel.addEventListener('change', function(){ if (window.chart1Ctx.shouldRender()) { redraw(); } else { window.chart1Ctx.needsInitialDraw = true; } });
    endSel.addEventListener('change', function(){ if (window.chart1Ctx.shouldRender()) { redraw(); } else { window.chart1Ctx.needsInitialDraw = true; } });
  }).catch(function(err){
    console.error(err);
    var msg = document.createElement('div');
    msg.textContent = 'Failed to load CSV. Serve this page over HTTP (e.g., http://localhost:8000). Error: ' + err.message;
    msg.style.color = '#d62728';
    msg.style.marginTop = '8px';
    document.getElementById('chart').appendChild(msg);
  });
  window.chart1Ctx.ready = true;
  (function setupObserver1(){
    var section = document.getElementById('blank1-section');
    if (!section){ if (window.chart1Ctx && window.chart1Ctx.onSectionEnter) window.chart1Ctx.onSectionEnter(); return; }
    function onEnter(){ section.classList.add('in-view'); if (window.chart1Ctx && window.chart1Ctx.onSectionEnter) window.chart1Ctx.onSectionEnter(); }
    function onExit(){ section.classList.remove('in-view'); }
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){ var e = entries[0]; if (!e) return; var vis = e.intersectionRatio >= 0.28; if (vis){ onEnter(); } else { onExit(); } }, { threshold: [0,0.28,0.5,1] });
      io.observe(section);
    } else { onEnter(); }
  })();

  // Add responsive redraw for Chart 1
  // Responsive redraw must be inside this scope
  function debounce(fn, ms) {
    var t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); };
  }
  function setDimensions() {
    var chartEl = document.getElementById('chart');
    var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
    var isMobile = totalWidth <= 768;

    if (isMobile) {
      margin.left = 90;
      margin.right = 16;
      margin.bottom = 120; // extra room for centered legend
    } else {
        margin.left = 100;
        margin.right = 80;
        margin.bottom = 110;
      }

    var baseTotalHeight = 480;
    var totalHeight = isMobile ? Math.max(260, Math.round(totalWidth * 0.55)) : baseTotalHeight;

    width = totalWidth - margin.left - margin.right;
    height = totalHeight - margin.top - margin.bottom;

    d3.select('#chart svg')
      .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom));

    svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  }
  // Initial sizing + draw
  setDimensions();
  if (window.chart1Ctx.shouldRender()) { redraw(); } else { window.chart1Ctx.needsInitialDraw = true; }

  // Redraw on resize
  window.addEventListener('resize', debounce(function(){
      setDimensions();
      if (window.chart1Ctx.shouldRender()) { redraw(); } else { window.chart1Ctx.needsInitialDraw = true; }
  }, 150));
})();
