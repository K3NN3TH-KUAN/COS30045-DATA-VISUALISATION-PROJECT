(function(){
    var margin = {
        top: 60,
        right: 100,
        bottom: 0,
        left: 100
    }; 
    var chartEl = document.getElementById('chart2');
    var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
    var vwInit = window.innerWidth || document.documentElement.clientWidth;
    margin.right = (vwInit >= 1025) ? 0 : 100;

    // make a width-only estimate first; bottom margin doesn't affect width
    var width = totalWidth;
    var isMobile = vwInit <= 768;

    // Estimate legend layout to decide how much bottom space we need
    var seriesKeys = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
    var maxPerRow = isMobile ? Math.min(4, Math.max(2, Math.floor(width / 110)))
                             : Math.max(4, Math.floor(width / 140)); // desktop columns
    var rowsEstimate = Math.ceil(seriesKeys.length / Math.max(1, maxPerRow));
    // reserve extra bottom space if legend spans multiple rows
    margin.bottom = 110 + (rowsEstimate > 1 ? (rowsEstimate - 1) * 26 : 0);

    var totalHeight = (chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 520;
    var height = totalHeight - margin.top - margin.bottom;

    var root = d3.select('#chart2')
        .append('svg')
        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .style('display','block')
        .style('width','100%')
        .style('height','auto')
        .attr('role','img')
        .attr('aria-label','Annual fines by jurisdiction line chart')
        .style('font-family', 'Segoe UI, Arial, sans-serif');
    root.append('desc').text('Multi-series line chart of annual fines by jurisdiction over years with a log-scaled Y axis.');
    var svg = root.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    var live = document.getElementById('chart2-live');
    if (!live) { live = document.createElement('div'); live.id='chart2-live'; live.setAttribute('role','status'); live.setAttribute('aria-live','polite'); live.className='visually-hidden'; document.getElementById('chart2').appendChild(live); }
    function announce(msg){ if (live) { live.textContent = msg; } }

    var redraw = function(){};

    window.chart2Ctx = { svg: svg, margin: margin, chartEl: chartEl, ready: false, needsInitialDraw: false, shouldRender: function(){ var el=document.getElementById('blank2-section'); return el && el.classList.contains('in-view'); }, onSectionEnter: function(){ if (window.chart2Ctx && window.chart2Ctx.needsInitialDraw && typeof redraw === 'function'){ redraw(); window.chart2Ctx.needsInitialDraw = false; } } };

    function toNum(v) {
        return (v == null || (typeof v === 'string' && v.trim() === '')) ? null : +v;
    }
    function safe(v, fallback) {
        return (v == null || isNaN(v)) ? fallback : v;
    }

    var seriesKeys = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
    var color = d3.scaleOrdinal()
        .domain(seriesKeys)
        .range(['#E69F00','#56B4E9','#009E73','#F0E442','#0072B2','#D55E00','#CC79A7','#999999']);

    Promise.all([
        d3.csv('data/visualisation2.csv', function(d){
            return {
                YEAR: +d.YEAR,
                ACT: toNum(d.ACT),
                NSW: toNum(d.NSW),
                NT: toNum(d.NT),
                QLD: toNum(d.QLD),
                SA: toNum(d.SA),
                TAS: toNum(d.TAS),
                VIC: toNum(d.VIC),
                WA: toNum(d.WA)
            };
        }),
        d3.csv('data/visualisation5.csv', function(d){
            return {
                YEAR: +d.YEAR,
                DETECTION_METHOD: d.DETECTION_METHOD,
                ACT: toNum(d.ACT),
                NSW: toNum(d.NSW),
                NT: toNum(d.NT),
                QLD: toNum(d.QLD),
                SA: toNum(d.SA),
                TAS: toNum(d.TAS),
                VIC: toNum(d.VIC),
                WA: toNum(d.WA)
            };
        })
    ]).then(function(res){
        var data2 = res[0], data5 = res[1];
        window.chart2Ctx.data2 = data2;
        window.chart2Ctx.data5 = data5;
        var startSel = document.getElementById('year2-start');
        var endSel = document.getElementById('year2-end');
        var jurSelect = document.getElementById('jur-select');
        var jurToggle = document.getElementById('jur-toggle');
        var jurMenu = document.getElementById('jur-menu');
        var methodSel = document.getElementById('det2-method');

        var seriesKeys = Object.keys(data2[0]).filter(function(k){ return k !== 'YEAR'; });
        color.domain(seriesKeys);

        var yearsMap = {}; data2.forEach(function(d){ yearsMap[d.YEAR] = true; });
        var years = Object.keys(yearsMap).map(function(s){ return +s; }).sort(d3.ascending);
        years.forEach(function(y){
            var opt1 = document.createElement('option'); opt1.value = y; opt1.textContent = y; startSel.appendChild(opt1);
            var opt2 = document.createElement('option'); opt2.value = y; opt2.textContent = y; endSel.appendChild(opt2);
        });
        startSel.value = years[0];
        endSel.value = years[years.length - 1];

        var selectedJurisdictions = seriesKeys.slice();
        function setJurLabel(){ jurToggle.textContent = (selectedJurisdictions.length===seriesKeys.length) ? 'All' : selectedJurisdictions.join(', '); }
        function buildJurisdictionMenu(){
            jurMenu.innerHTML = '';
            var labAll = document.createElement('label');
            var cbAll = document.createElement('input'); cbAll.type='checkbox'; cbAll.value='All'; cbAll.checked = selectedJurisdictions.length===seriesKeys.length;
            labAll.appendChild(cbAll); labAll.appendChild(document.createTextNode(' All'));
            jurMenu.appendChild(labAll);
            seriesKeys.forEach(function(k){
                var lab = document.createElement('label');
                var cb = document.createElement('input'); cb.type='checkbox'; cb.value=k; cb.checked = selectedJurisdictions.indexOf(k)>=0;
                lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + k));
                jurMenu.appendChild(lab);
            });
        }
        buildJurisdictionMenu();
        setJurLabel();
        jurToggle.addEventListener('click', function(){
            var expanded = jurSelect.getAttribute('aria-expanded') === 'true';
            jurSelect.setAttribute('aria-expanded', (!expanded)+'');
            jurToggle.setAttribute('aria-expanded', (!expanded)+'');
        });
        jurMenu.addEventListener('change', function(e){
            var t = e.target; if (!t || t.type !== 'checkbox') return;
            if (t.value === 'All') {
                selectedJurisdictions = t.checked ? seriesKeys.slice() : [];
            } else {
                var idx = selectedJurisdictions.indexOf(t.value);
                if (t.checked && idx < 0) selectedJurisdictions.push(t.value);
                if (!t.checked && idx >= 0) selectedJurisdictions.splice(idx,1);
                var allCb = jurMenu.querySelector('input[type="checkbox"][value="All"]');
                if (allCb) allCb.checked = (selectedJurisdictions.length === seriesKeys.length);
            }
            buildJurisdictionMenu();
            setJurLabel();
            updateMethodOptions();
            redraw();
        });

        function updateMethodOptions(){
            var set = new Set();
            data5.forEach(function(r){
                var anySel = (selectedJurisdictions.length === seriesKeys.length)
                    ? seriesKeys.some(function(k){ return toNum(r[k]) != null; })
                    : selectedJurisdictions.some(function(k){ return toNum(r[k]) != null; });
                if (anySel) set.add(r.DETECTION_METHOD);
            });
            var prev = methodSel.value;
            methodSel.innerHTML = '';
            var optB = document.createElement('option'); optB.value='All'; optB.textContent='All'; methodSel.appendChild(optB);
            Array.from(set).sort().forEach(function(m){ var o=document.createElement('option'); o.value=m; o.textContent=m; methodSel.appendChild(o); });
            methodSel.value = (prev && Array.from(set).includes(prev)) ? prev : 'All';
        }

        function filteredData(){
            var start = +startSel.value, end = +endSel.value;
            var method = methodSel.value;
            if (method === 'All' || !method) {
                return data2.filter(function(d){ return d.YEAR >= start && d.YEAR <= end; });
            } else {
                return data5.filter(function(d){ return d.DETECTION_METHOD === method && d.YEAR >= start && d.YEAR <= end; });
            }
        }
        function selectedKeys(){
            return (selectedJurisdictions && selectedJurisdictions.length) ? selectedJurisdictions.slice() : seriesKeys.slice();
        }

        window.chart2Ctx.filteredData = filteredData;
        window.chart2Ctx.selectedKeys = selectedKeys;
        window.chart2Ctx.color = color;
        window.chart2Ctx.methodSel = methodSel;
        window.chart2Ctx.ready = true;

        redraw = function(){
            var f = filteredData();
            var keys = selectedKeys();
            svg.selectAll('*').remove();
            window.chart2Ctx.renderId = (window.chart2Ctx.renderId || 0) + 1;
            var renderId = window.chart2Ctx.renderId;

            var vw = window.innerWidth || document.documentElement.clientWidth;
            var isTablet = vw <= 1024;
            var isMobile = vw <= 768;
            var isTiny = vw <= 480;
            var uiScale = isTiny ? 0.78 : (isMobile ? 0.86 : (isTablet ? 0.93 : 1));
            var x = d3.scaleLinear()
                .domain(d3.extent(f, function(d){ return d.YEAR; }))
                .range([0, width]);

            var yearVals = f.map(function(d){ return d.YEAR; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).sort(d3.ascending);
            var startY = +startSel.value, endY = +endSel.value;
            var oddRangeSelected = (startY % 2 === 1) && (endY % 2 === 1);
            var tickYears = (isMobile || isTiny) ? yearVals.filter(function(y){ return oddRangeSelected ? (y % 2 === 1) : (y % 2 === 0); }) : yearVals.slice();
            if (isMobile || isTiny) { var maxTicks = isTiny ? 5 : 6; var step = Math.max(1, Math.ceil(tickYears.length / maxTicks)); tickYears = tickYears.filter(function(y,i){ return i % step === 0; }); }
            if (tickYears.length === 0 || tickYears[tickYears.length - 1] !== yearVals[yearVals.length - 1]) { tickYears.push(yearVals[yearVals.length - 1]); }

            // Add x-axis
            var xAxis = d3.axisBottom(x)
                .tickValues(tickYears)
                .tickFormat(d3.format('d'))
                .tickSizeOuter(0);

            var xAxisG = svg.append('g')
                .attr('transform','translate(0,'+height+')')
                .attr('class','axis axis--x')
                .attr('role','img')
                .attr('aria-label','X axis: Year')
                .call(xAxis);

            var isDesktop = vw >= 1025;
            var fsAxis = isDesktop ? 15 : Math.max(10, Math.round(13 * uiScale));
            xAxisG.selectAll('text')
                .attr('transform','rotate(0)')
                .style('text-anchor','middle')
                .attr('dx','0')
                .attr('dy','0.85em')
                .attr('font-size', fsAxis)
                .style('fill','#0f172a');

            var yMax = d3.max(keys, function(k){ return d3.max(f, function(d){ return safe(d[k], 0); }); });
            var yMinPos = Infinity;
            keys.forEach(function(k){
                f.forEach(function(d){
                    var v = safe(d[k], null);
                    if (v != null && v > 0 && v < yMinPos) { yMinPos = v; }
                });
            });
            if (!isFinite(yMinPos)) { yMinPos = 1; }
            if (!isFinite(yMax) || yMax <= yMinPos) { yMax = yMinPos * 10; }

            var y = d3.scaleLog().domain([yMinPos, yMax]).range([height, 0]);

            var logMin = Math.log10(yMinPos);
            var logMax = Math.log10(yMax);
            var ticks = [yMinPos];
            for (var p = Math.ceil(logMin); p <= Math.floor(logMax); p++) {
                var val = Math.pow(10, p);
                if (ticks.indexOf(val) < 0) ticks.push(val);
            }
            ticks = ticks.filter(function(v){ return v >= yMinPos && v <= yMax; }).sort(d3.ascending);
            if (ticks[ticks.length - 1] !== yMax) { ticks.push(yMax); }

            var yAxis = d3.axisLeft(y)
                .tickValues(ticks)
                .tickFormat(d3.format(','));

            var yAxisG = svg.append('g')
                .attr('transform','translate(0,0)')
                .attr('class','axis axis--y')
                .attr('role','img')
                .attr('aria-label','Y axis: Annual fines (log)');
            yAxisG.transition().duration(600).call(yAxis);
            yAxisG.selectAll('text').style('font-size', fsAxis + 'px').style('fill','#0f172a');

            window.chart2Ctx.x = x;
            window.chart2Ctx.y = y;
            window.chart2Ctx.data = f;
            window.chart2Ctx.keysCache = keys;
            window.chart2Ctx.width = width;
            window.chart2Ctx.height = height;
            window.chart2Ctx.yearVals = yearVals;

            // horizontal gridlines aligned with y-axis ticks
            var gridEnabled = !(chartEl && chartEl.dataset && typeof chartEl.dataset.grid !== 'undefined' && ['off','false','0'].includes(String(chartEl.dataset.grid).toLowerCase()));
            if (gridEnabled) {
                var grid = svg.append('g').attr('class','grid grid--y').style('pointer-events','none');
                grid.selectAll('line')
                    .data(ticks.slice(1))
                    .enter().append('line')
                    .attr('x1', 0)
                    .attr('x2', width)
                    .attr('y1', function(d){ return y(d); })
                    .attr('y2', function(d){ return y(d); })
                    .attr('stroke', '#e0e0e0')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4,4')
                    .attr('opacity', 0.8);
            }

            yAxisG.append('text')
                .attr('x', -9)
                .attr('y', height)
                .attr('dy', '0.32em')
                .attr('font-size', isMobile ? 11 : 13)
                .style('text-anchor','end')
                .text('0');

            var yLabel = 'Annual Fines (log scale)';

            var line = d3.line().defined(function(d){ return d.value != null && !isNaN(d.value) && d.value > 0; }).x(function(d){ return x(d.YEAR); }).y(function(d){ return y(d.value); });
            var labelYs = [];
            window.chart2Ctx.animating = true;
            var pendingAnimations = keys.length;
            keys.forEach(function(key,i){
                var seriesData = f.map(function(d){
                    return {
                        YEAR: d.YEAR,
                        value: d[key]
                    };
                });
                var p = svg.append('path')
                    .datum(seriesData)
                    .attr('class','series-line series-'+key)
                    .attr('data-key', key)
                    .attr('fill','none')
                    .attr('stroke', color(key))
                    .attr('stroke-width',4)
                    .attr('stroke-linecap','round')
                    .attr('role','button')
                    .attr('tabindex', 0)
                    .attr('aria-label','Series '+key+' line')
                    .attr('d', line);
                    
                var totalLength = p.node().getTotalLength();
                p.attr('stroke-dasharray', totalLength + ' ' + totalLength)
                 .attr('stroke-dashoffset', totalLength)
                 .transition()
                 .delay(i*150)
                 .duration(1500)
                 .ease(d3.easeLinear)
                 .attr('stroke-dashoffset', 0)
                 .on('end', function(){ if (renderId !== window.chart2Ctx.renderId) { return; }
                    var last = null;
                    for (var j = f.length - 1; j >= 0; j--) {
                        var vj = safe(f[j][key], null);
                        if (vj != null && vj > 0) { last = { YEAR: f[j].YEAR, value: vj }; break; }
                    }
                    if (!last) { pendingAnimations--; if (pendingAnimations<=0){ window.chart2Ctx.animating = false; if(window.chart2Ctx.onAnimDone) window.chart2Ctx.onAnimDone(); } return; }
                    var gy = y(last.value);
                    var overlapTolerance = isMobile ? 16 : 18;
                    var overlapped = labelYs.some(function(py){ return Math.abs(py - gy) < overlapTolerance; });
                    if (!overlapped) {
                        labelYs.push(gy);
                        var gx = width + 20;
                        var g = svg.append('g')
                            .attr('class','series-end-label label-'+key)
                            .attr('transform','translate('+gx+','+gy+')')
                            .attr('role','button')
                            .attr('tabindex', 0)
                            .attr('aria-label','Highlight '+key)
                            .style('cursor','pointer');
                        var label = g.append('text')
                            .attr('x', 0)
                            .attr('y', 0)
                            .attr('text-anchor','start')
                            .attr('dominant-baseline','middle')
                            .style('font-size', (isMobile ? '12px' : (isTablet ? '13px' : '16px')))
                            .style('fill', color(key))
                            .text(key);
                        var bb = label.node().getBBox();
                        g.insert('rect','text')
                            .attr('x', bb.x - 6)
                            .attr('y', bb.y - 3)
                            .attr('width', bb.width + 12)
                            .attr('height', bb.height + 6)
                            .attr('rx', 4)
                            .attr('ry', 4)
                            .attr('fill', '#fff')
                            .attr('opacity', 1)
                            .attr('stroke', color(key))
                            .attr('stroke-width', 0.8);
                        function highlightFromLabel(ev){
                            if (window.chart2Ctx && window.chart2Ctx.applySelection){
                                window.chart2Ctx.applySelection(key, last.YEAR, ev);
                            }
                        }
                        g.on('click', function(ev){ highlightFromLabel(ev); })
                         .on('keydown', function(ev){ if (ev.code==='Enter' || ev.code==='Space'){ highlightFromLabel(ev); } });
                    }
                    pendingAnimations--;
                    if (pendingAnimations<=0){ window.chart2Ctx.animating = false; if(window.chart2Ctx.onAnimDone) window.chart2Ctx.onAnimDone(); }
                 });
            });

            // Title
            var fsTitle = isDesktop ? 24 : Math.round(20 * uiScale);
            svg.append('text')
                .attr('x', -90)
                .attr('y', -50)
                .attr('text-anchor', 'start')
                .attr('dominant-baseline','hanging')
                .style('font-size', fsTitle + 'px')
                .style('font-weight', '700')
                .style('fill','#0f172a')
                .text('Annual Fines by Jurisdiction');

            // X-axis label
            var fsLabel = isDesktop ? 20 : Math.round(18 * uiScale);
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height + 50)
                .attr('text-anchor', 'middle')
                .style('font-size', fsLabel + 'px')
                .style('fill','#0f172a')
                .text('Year');

            // Horizontal legend below X-axis label
            var itemW = Math.round((isTiny ? 120 : (isMobile ? 112 : 128)) * uiScale);
            var perRow = isTiny ? 3 : (isMobile ? 4 : (isTablet ? 6 : 8));
            perRow = Math.max(3, Math.min(perRow, keys.length));
            var rowH = isTiny ? 28 : 26;
            var legend = svg.append('g')
              .attr('class','legend')
              .attr('role','group')
              .attr('aria-label','Legend')
              .attr('transform', 'translate(0,' + (height + 80) + ')');
            keys.forEach(function(k, i){
              var row = Math.floor(i / perRow), col = i % perRow;
              var totalRowW = perRow * itemW;
              var baseX = isTiny ? 8 : Math.max(0, (width - totalRowW) / 2);
              var gapX = isTiny ? 12 : 0;
              var colSlot = isTiny ? (itemW / 2 + gapX) : itemW;
              var lx = baseX + col * colSlot;
              var ly = row * rowH;
              var gi = legend.append('g')
                .attr('transform','translate('+lx+','+ly+')')
                .attr('role','button')
                .attr('tabindex',0)
                .attr('aria-label','Toggle '+k+' series')
                .style('cursor','pointer')
                .on('pointerdown', function(ev){ if (window.chart2Ctx && window.chart2Ctx.animating) return; var y = (window.chart2Ctx && window.chart2Ctx.yearVals) ? window.chart2Ctx.yearVals[window.chart2Ctx.yearVals.length-1] : null; if (window.chart2Ctx && window.chart2Ctx.applySelection) window.chart2Ctx.applySelection(k, y, ev); })
                .on('keydown', function(ev){ if (window.chart2Ctx && window.chart2Ctx.animating) return; if (ev.code==='Enter' || ev.code==='Space'){ var y = (window.chart2Ctx && window.chart2Ctx.yearVals) ? window.chart2Ctx.yearVals[window.chart2Ctx.yearVals.length-1] : null; if (window.chart2Ctx && window.chart2Ctx.applySelection) window.chart2Ctx.applySelection(k, y, ev); }});
              gi.append('rect').attr('x',0).attr('y',-8).attr('width',20).attr('height',14).attr('rx',3).attr('ry',3).attr('fill', color(k));
              gi.append('text').attr('x',24).attr('y',0).attr('dominant-baseline','middle').style('font-size', (isTiny?14:(isMobile?16:18))+'px').style('fill','#0f172a').text(k);
            });

            // Y-axis label
            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -height / 2)
                .attr('y', -70)
                .attr('text-anchor', 'middle')
                .style('font-size', fsLabel + 'px')
                .style('fill','#0f172a')
                .text(yLabel);

            announce('Chart updated: years '+startSel.value+' to '+endSel.value+', '+selectedJurisdictions.length+' jurisdictions, method '+(methodSel.value||'All')+'.');
            if (window.chart2Ctx && window.chart2Ctx.onRedraw) window.chart2Ctx.onRedraw();
        };

        updateMethodOptions();
        if (window.chart2Ctx.shouldRender()) { redraw(); } else { window.chart2Ctx.needsInitialDraw = true; }

        startSel.addEventListener('change', function(){ var s=+startSel.value, e=+endSel.value; if (e < s) endSel.value = s; if (window.chart2Ctx.shouldRender()) redraw(); else window.chart2Ctx.needsInitialDraw = true; });
        endSel.addEventListener('change', function(){ var s=+startSel.value, e=+endSel.value; if (e < s) endSel.value = s; if (window.chart2Ctx.shouldRender()) redraw(); else window.chart2Ctx.needsInitialDraw = true; });
        methodSel.addEventListener('change', function(){ if (window.chart2Ctx.shouldRender()) redraw(); else window.chart2Ctx.needsInitialDraw = true; });
    }).catch(function (err) {
        console.error(err);
        var msg = document.createElement('div');
        msg.textContent = 'Failed to load visualisation data. Serve over HTTP (e.g., http://localhost:8000). Error: ' + err.message;
        msg.style.color = '#d62728';
        msg.style.marginTop = '8px';
        document.getElementById('chart2').appendChild(msg);
    });

    // Add responsive redraw for Chart 2
    // Responsive: recalc width from container and redraw (inside this scope)
    function debounce(fn, ms) { var t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); }; }
    var lastOuterW = 0, lastOuterH = 0;
    function setDimensions2() {
      var chartEl = document.getElementById('chart2');
      var outerW = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
      var vw = window.innerWidth || document.documentElement.clientWidth;
      var isTiny = vw <= 480, isMobile = vw <= 768;
      margin.right = (vw >= 1025) ? 0 : 100;
      var baseH = isTiny ? Math.round(outerW * 0.55) : (isMobile ? Math.round(outerW * 0.60) : Math.round(outerW * 0.50));
      var outerH = Math.max(360, baseH) + margin.top + margin.bottom;

      if (outerW === lastOuterW && outerH === lastOuterH) return;
      lastOuterW = outerW; lastOuterH = outerH;

      width = outerW - margin.left - margin.right;
      height = outerH - margin.top - margin.bottom;

      var rootSel = d3.select('#chart2 svg');
      rootSel
        .attr('viewBox', '0 0 ' + outerW + ' ' + outerH)
        .style('width','100%')
        .style('height','100%')
        .attr('preserveAspectRatio','xMinYMin meet');

      svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    // Initial sizing + draw
    setDimensions2();
    if (window.chart2Ctx.shouldRender()) { redraw(); } else { window.chart2Ctx.needsInitialDraw = true; }

    window.addEventListener('resize', debounce(function(){ setDimensions2(); redraw(); }, 150));
    if ('ResizeObserver' in window){ var ro = new ResizeObserver(function(){ setDimensions2(); redraw(); }); ro.observe(document.getElementById('chart2')); }
})();