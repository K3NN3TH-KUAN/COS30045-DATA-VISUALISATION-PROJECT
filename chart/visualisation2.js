(function(){
    var margin = {
        top: 60,
        right: 100,
        bottom: 0,
        left: 100
    }; // increase bottom for rotated ticks + legend
    var chartEl = document.getElementById('chart2');
    var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;

    // make a width-only estimate first; bottom margin doesn't affect width
    var width = totalWidth;
    var isMobile = window.innerWidth <= 768;

    // Estimate legend layout to decide how much bottom space we need
    var seriesKeys = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
    var maxPerRow = isMobile ? Math.min(4, Math.max(2, Math.floor(width / 110)))
                             : Math.max(4, Math.floor(width / 140)); // desktop columns
    var rowsEstimate = Math.ceil(seriesKeys.length / Math.max(1, maxPerRow));
    // reserve extra bottom space if legend spans multiple rows
    margin.bottom = 110 + (rowsEstimate > 1 ? (rowsEstimate - 1) * 26 : 0);

    var totalHeight = (chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 520;
    var height = totalHeight - margin.top - margin.bottom;

    var svg = d3.select('#chart2')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('role','img')
        .attr('aria-label','Annual fines by jurisdiction line chart')
        .style('font-family', 'Segoe UI, Arial, sans-serif')
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

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
        var methodSel = document.getElementById('det-method');

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
            var optB = document.createElement('option'); optB.value='Both'; optB.textContent='Both'; methodSel.appendChild(optB);
            Array.from(set).sort().forEach(function(m){ var o=document.createElement('option'); o.value=m; o.textContent=m; methodSel.appendChild(o); });
            methodSel.value = (prev && Array.from(set).includes(prev)) ? prev : 'Both';
        }

        function filteredData(){
            var start = +startSel.value, end = +endSel.value;
            var method = methodSel.value;
            if (method === 'Both' || !method) {
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

            var isMobile = window.innerWidth <= 768;
            var x = d3.scaleLinear().domain(d3.extent(f, function(d){ return d.YEAR; })).range([0, width]);

            var yearVals = f.map(function(d){ return d.YEAR; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).sort(d3.ascending);
            var isCamera = methodSel && /camera/i.test(methodSel.value);
            var tickYears = isCamera ? yearVals : yearVals.filter(function(y){ return y % 2 === 0; });
            if (!isCamera && (tickYears.length === 0 || tickYears[tickYears.length - 1] !== yearVals[yearVals.length - 1])) { tickYears.push(yearVals[yearVals.length - 1]); }

            // Add x-axis
            var xAxis = d3.axisBottom(x)
                .tickValues(tickYears)
                .tickFormat(d3.format('d'))
                .tickSizeOuter(0);

            var xAxisG = svg.append('g')
                .attr('transform','translate(0,'+height+')')
                .attr('class','axis axis--x')
                .call(xAxis);

            xAxisG.selectAll('text')
                .attr('transform','rotate(0)')
                .style('text-anchor','middle')
                .attr('dx','0')
                .attr('dy','0.85em')
                .attr('font-size', isMobile ? 11 : 13);

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
                .tickFormat(d3.format('~d'));

            var yAxisG = svg.append('g')
                .attr('transform','translate(0,0)')
                .attr('class','axis axis--y');
            yAxisG.transition().duration(600).call(yAxis);
            yAxisG.selectAll('text').style('font-size', isMobile ? '11px' : '13px');

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
                 .on('end', function(){
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
                        var g = svg.append('g').attr('transform','translate('+gx+','+gy+')');
                        var label = g.append('text')
                            .attr('x', 0)
                            .attr('y', 0)
                            .attr('text-anchor','start')
                            .attr('dominant-baseline','middle')
                            .style('font-size', isMobile ? '12px' : '13px')
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
                    }
                    pendingAnimations--;
                    if (pendingAnimations<=0){ window.chart2Ctx.animating = false; if(window.chart2Ctx.onAnimDone) window.chart2Ctx.onAnimDone(); }
                 });
            });

            // Title
            svg.append('text')
                .attr('x', -80)
                .attr('y', -50)
                .attr('text-anchor', 'start')
                .attr('dominant-baseline','hanging')
                .style('font-size', '20px')
                .style('font-weight', '700')
                .text('Annual Fines by Jurisdiction');

            // X-axis label
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height + 50)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .text('Year');

            // Horizontal legend below X-axis label
            var itemW = isMobile ? 80 : 90;
            var totalLegendW = keys.length * itemW;
            var startX = (width - totalLegendW) / 2;
            var legend = svg.append('g').attr('transform', 'translate(0,' + (height + 90) + ')');
            keys.forEach(function(k, i){
                var lx = startX + i * itemW;
                legend.append('rect')
                    .attr('x', lx)
                    .attr('y', -8)
                    .attr('width', 20)
                    .attr('height', 14)
                    .attr('rx', 3)
                    .attr('ry', 3)
                    .attr('fill', color(k));
                legend.append('text')
                    .attr('x', lx + 24)
                    .attr('y', 0)
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', isMobile ? '12px' : '13px')
                    .text(k);
            });

            // Y-axis label
            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -height / 2)
                .attr('y', -60)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .text(yLabel);

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
    function setDimensions2() {
      var chartEl = document.getElementById('chart2');
      var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
      var totalHeight = (chartEl && chartEl.clientHeight) ? chartEl.clientHeight : 520;
    
      width = totalWidth - margin.left - margin.right;
      height = totalHeight - margin.top - margin.bottom;
    
      d3.select('#chart2 svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight);
    
      svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    // Initial sizing + draw
    setDimensions2();
    if (window.chart2Ctx.shouldRender()) { redraw(); } else { window.chart2Ctx.needsInitialDraw = true; }

    window.addEventListener('resize', debounce(function(){
      setDimensions2();
      redraw();
    }, 150));
})();