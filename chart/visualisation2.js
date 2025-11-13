(function(){
    var margin = { top: 40, right: 260, bottom: 110, left: 110 }; // increase bottom for rotated ticks + legend
    var chartEl = document.getElementById('chart2');
    var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;

    // make a width-only estimate first; bottom margin doesn't affect width
    var width = totalWidth - margin.left - margin.right;
    var isMobile = window.innerWidth <= 768;

    // Estimate legend layout to decide how much bottom space we need
    var seriesKeys = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
    var maxPerRow = isMobile ? Math.min(4, Math.max(2, Math.floor(width / 110)))
                             : Math.max(4, Math.floor(width / 140)); // desktop columns
    var rowsEstimate = Math.ceil(seriesKeys.length / Math.max(1, maxPerRow));
    // reserve extra bottom space if legend spans multiple rows
    margin.bottom = 110 + (rowsEstimate > 1 ? (rowsEstimate - 1) * 26 : 0);

    var totalHeight = 520;
    var height = totalHeight - margin.top - margin.bottom;

    var svg = d3.select('#chart2')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    function toNum(v) {
        return (v == null || (typeof v === 'string' && v.trim() === '')) ? null : +v;
    }
    function safe(v, fallback) {
        return (v == null || isNaN(v)) ? fallback : v;
    }

    var seriesKeys = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
    var color = d3.scaleOrdinal()
        .domain(seriesKeys)
        .range(d3.schemeTableau10 || ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f']);

    d3.csv('data/visualisation2.csv', function(d){
        return {
            YEAR: +d.YEAR,
            ACT: toNum(d.ACT), NSW: toNum(d.NSW), NT: toNum(d.NT), QLD: toNum(d.QLD),
            SA: toNum(d.SA), TAS: toNum(d.TAS), VIC: toNum(d.VIC), WA: toNum(d.WA)
        };
    }).then(function(data){
        var startSel = document.getElementById('year2-start');
        var endSel = document.getElementById('year2-end');

        var yearsMap = {}; data.forEach(function(d){ yearsMap[d.YEAR] = true; });
        var years = Object.keys(yearsMap).map(function(s){ return +s; }).sort(d3.ascending);
        years.forEach(function(y){
            var opt1 = document.createElement('option'); opt1.value = y; opt1.textContent = y; startSel.appendChild(opt1);
            var opt2 = document.createElement('option'); opt2.value = y; opt2.textContent = y; endSel.appendChild(opt2);
        });
        startSel.value = years[0];
        endSel.value = years[years.length - 1];

        function selectedKeys() {
            // Read active state from toggle buttons (falls back to true if btn not found)
            return seriesKeys.filter(function(k){
                var btn = document.getElementById('btn-' + k);
                return btn ? btn.classList.contains('active') : true;
            });
        }

        // Define filtered to fix “filtered is not defined”
        function filtered() {
            var start = +startSel.value, end = +endSel.value;
            return data.filter(function(d){ return d.YEAR >= start && d.YEAR <= end; });
        }

        function redraw() {
            var f = filtered();
            var keys = selectedKeys();
            svg.selectAll('*').remove();

            // Define mobile flag ONCE (fixes "isMobile is not defined")
            var isMobile = window.innerWidth <= 768;

            // X scale (single axis render)
            var x = d3.scaleLinear()
                .domain(d3.extent(f, function (d) { return d.YEAR; }))
                .range([0, width]);

            // Even-year ticks; ensure last year is included even if odd
            var yearVals = f.map(function(d){ return d.YEAR; })
                            .filter(function(v, i, a){ return a.indexOf(v) === i; })
                            .sort(d3.ascending);
            var tickYears = yearVals.filter(function(y){ return y % 2 === 0; });
            if (tickYears.length === 0 || tickYears[tickYears.length - 1] !== yearVals[yearVals.length - 1]) {
                tickYears.push(yearVals[yearVals.length - 1]);
            }

            var xAxis = d3.axisBottom(x)
                .tickValues(tickYears)
                .tickFormat(d3.format('d'))
                .tickSizeOuter(0);

            var xAxisG = svg.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .attr('class', 'axis axis--x')
                .call(xAxis);

            // Rotate labels to 75° and shrink slightly on mobile
            xAxisG.selectAll('text')
                .attr('transform', 'rotate(75)')
                .style('text-anchor', 'start')
                .attr('dx', '0.6em')
                .attr('dy', '0.35em')
                .attr('font-size', isMobile ? 11 : 13);

            // Y scale + axis
            var yMax = d3.max(keys, function (k) {
                return d3.max(f, function (d) { return safe(d[k], 0); });
            });
            var yMinPos = Infinity;
            keys.forEach(function (k) {
                f.forEach(function (d) {
                    var v = safe(d[k], null);
                    if (v != null && v > 0 && v < yMinPos) { yMinPos = v; }
                });
            });
            if (!isFinite(yMinPos)) { yMinPos = 1; }

            var y = d3.scaleLog().domain([yMinPos, yMax]).range([height, 0]).nice();
            var yAxis = d3.axisLeft(y)
                .ticks(10)
                .tickFormat(function(d) {
                    var k = Math.log10(d);
                    return Math.abs(k - Math.round(k)) < 1e-6 ? d3.format('~d')(d) : '';
                });

            svg.append('g')
                .attr('class', 'axis axis--y')
                .call(yAxis);
        
            // Lines
            var line = d3.line()
                .defined(function (d) { return d.value != null && !isNaN(d.value) && d.value > 0; })
                .x(function (d) { return x(d.YEAR); })
                .y(function (d) { return y(d.value); });

            keys.forEach(function (key, i) {
                var seriesData = f.map(function (d) { return { YEAR: d.YEAR, value: d[key] }; });
                var p = svg.append('path')
                    .datum(seriesData)
                    .attr('fill', 'none')
                    .attr('stroke', color(key))
                    .attr('stroke-width', 2)
                    .attr('stroke-linecap', 'round')
                    .attr('d', line);
            
                // Start-to-end draw animation
                var totalLength = p.node().getTotalLength();
                p.attr('stroke-dasharray', totalLength + ' ' + totalLength)
                 .attr('stroke-dashoffset', totalLength)
                 .transition()
                 .delay(i * 150)       // slight stagger per series
                 .duration(1500)
                 .ease(d3.easeLinear)  // clear start-to-end motion
                 .attr('stroke-dashoffset', 0);
            });

            // Move Year lower a bit
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height + 70)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .text('Year');

            // Legend below Year; auto-wrap to multiple rows when needed (mobile and desktop)
            var legend = svg.append('g')
                // nudge left from center so it aligns under the plot
                .attr('transform', 'translate(' + (width / 2 - 60) + ',' + (height + 95) + ')');

            var colW = isMobile ? 110 : 140; // space per legend item
            var rowH = 22;
            var cols = Math.max(1, Math.min(seriesKeys.length, Math.floor(width / colW)));
            var rows = Math.ceil(seriesKeys.length / cols);

            // center the grid horizontally
            var totalGridWidth = (cols - 1) * colW;
            var startX = -totalGridWidth / 2;

            seriesKeys.forEach(function(k, i){
                var col = i % cols;
                var row = Math.floor(i / cols);
                var cx = startX + col * colW;
                var cy = row * rowH;

                legend.append('rect')
                    .attr('x', cx).attr('y', cy - 8)
                    .attr('width', 30).attr('height', 16)
                    .attr('rx', 3).attr('ry', 3)
                    .attr('fill', color(k)).attr('stroke', '#555').attr('stroke-width', 1);

                legend.append('text')
                    .attr('x', cx + 36).attr('y', cy)
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', isMobile ? '14px' : '16px')
                    .text(k);
            });

            // Y-axis label to match the image (no unit scaling)
            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -height / 2)
                .attr('y', -80)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .text('Annual Fines');
        }

        redraw();

        // Toggle buttons: toggle active class and redraw
        seriesKeys.forEach(function(k){
            var btn = document.getElementById('btn-' + k);
            if (btn) {
                btn.addEventListener('click', function(){
                    btn.classList.toggle('active');
                    redraw();
                });
            }
        });

        // Year range listeners
        startSel.addEventListener('change', redraw);
        endSel.addEventListener('change', redraw);
        seriesKeys.forEach(function(k){
            var cb = document.getElementById('jur-' + k);
            if (cb) cb.addEventListener('change', redraw);
        });
    }).catch(function (err) {
        console.error(err);
        var msg = document.createElement('div');
        msg.textContent = 'Failed to load visualisation2.csv. Serve over HTTP (e.g., http://localhost:8000). Error: ' + err.message;
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
      var isMobile = totalWidth <= 768;
    
      if (isMobile) {
        margin.left = 80;   // nudge left
        margin.right = 16;  // tight right
        margin.bottom = 130; // allow two-row legend
      } else {
        margin.left = 110;
        margin.right = 260;
        margin.bottom = 110;
      }
    
      var baseTotalHeight = 480; // laptop baseline height stays
      var totalHeight = isMobile ? Math.max(280, Math.round(totalWidth * 0.55)) : baseTotalHeight;
    
      width = totalWidth - margin.left - margin.right;
      height = totalHeight - margin.top - margin.bottom;
    
      d3.select('#chart2 svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
      svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    // Initial sizing + draw
    setDimensions2();
    redraw();

    window.addEventListener('resize', debounce(function(){
      setDimensions2();
      redraw();
    }, 150));
})();