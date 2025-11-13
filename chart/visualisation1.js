(function () {
  var margin = { top: 40, right: 260, bottom: 110, left: 130 }; // add space for Year + legend
  var chartEl = document.getElementById('chart');
  var totalWidth = (chartEl && chartEl.clientWidth) ? chartEl.clientWidth : 960;
  var totalHeight = 520;
  var width = totalWidth - margin.left - margin.right;
  var height = totalHeight - margin.top - margin.bottom;

  var svg = d3.select('#chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  function safe(v, fallback) {
    return (v == null || isNaN(v)) ? fallback : v;
  }

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
    var btnPolice = document.getElementById('btn-police');
    var btnCamera = document.getElementById('btn-camera');

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
      var keys = [];
      if (btnPolice.classList.contains('active')) keys.push('Police');
      if (btnCamera.classList.contains('active')) keys.push('Camera');
      return keys;
    }

    // Reusable tooltip for Chart 1
    var tooltip = d3.select('body')
      .append('div')
      .attr('id', 'chart1-tooltip')
      .style('position', 'absolute')
      .style('background', '#111')
      .style('color', '#fff')
      .style('padding', '6px 8px')
      .style('border-radius', '4px')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    function redraw() {
      var f = filtered();
      var keys = currentKeys();
  
      svg.selectAll('*').remove();
  
      var isMobile = window.innerWidth <= 768;
      var xPad = isMobile ? Math.round(width * 0.05) : 0; // shorten x-axis a bit on mobile
      var x = d3.scaleLinear()
        .domain(d3.extent(f, function(d){ return d.YEAR; }))
        .range([xPad, width - xPad]);
  
      var yMax = d3.max(f, function(d){
        var m = 0;
        keys.forEach(function(k){ m = Math.max(m, (d[k] == null || isNaN(d[k])) ? 0 : d[k]); });
        return m;
      });
      var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();
  
      var xAxis = d3.axisBottom(x).tickFormat(d3.format('d'));
      var yAxis = d3.axisLeft(y);
  
      var xAxisG = svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .attr('class', 'axis axis--x')
        .call(xAxis);
    
    // Rotate all year ticks to 75° (lean right)
    xAxisG.selectAll('text')
      .attr('transform', 'rotate(75)')
      .style('text-anchor', 'start')
      .attr('dx', '0.6em')
      .attr('dy', '0.35em');
    
      svg.append('g')
        .attr('class', 'axis axis--y')
        .call(yAxis);

      // Lines with visible start-to-end animation
      var colors = { Police: '#1f77b4', Camera: '#d62728' };
      var lineFor = function(key){
        return d3.line()
          .defined(function(d){ return d[key] != null && !isNaN(d[key]); })
          .x(function(d){ return x(d.YEAR); })
          .y(function(d){ return y(d[key]); });
      };
  
      keys.forEach(function(k, i){
        var p = svg.append('path')
          .datum(f)
          .attr('fill', 'none')
          .attr('stroke', colors[k])
          .attr('stroke-width', 2)
          .attr('stroke-linecap', 'round')
          .attr('d', lineFor(k));
  
        var totalLength = p.node().getTotalLength();
        p.attr('stroke-dasharray', totalLength + ' ' + totalLength)
         .attr('stroke-dashoffset', totalLength)
         .transition()
         .delay(i * 150)
         .duration(1500)
         .ease(d3.easeLinear)
         .attr('stroke-dashoffset', 0);
      });
      // Keep only one Year label (lower position)
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 70)
        .attr('text-anchor', 'middle')
        .style('font-size', isMobile ? '16px' : '18px')
        .text('Year');

      // Legend: centered; tighter spacing and shorter labels on mobile
      var legend = svg.append('g')
        // move a bit left from exact center
        .attr('transform', 'translate(' + (width / 2 - 80) + ',' + (height + 95) + ')');

      var spacing = isMobile ? 120 : 240;
      var labels = isMobile ? { Police: 'Police', Camera: 'Camera' }
                            : { Police: 'Police issued fines', Camera: 'Camera issued fines' };

      keys.forEach(function(k, i) {
        var xoff = (i - (keys.length - 1) / 2) * spacing;
      
        // Rectangle swatch
        legend.append('rect')
          .attr('x', xoff)
          .attr('y', -8)
          .attr('width', 30)
          .attr('height', 16)
          .attr('rx', 3).attr('ry', 3)
          .attr('fill', (k === 'Police' ? '#1f77b4' : '#d62728'))
          .attr('stroke', '#555')
          .attr('stroke-width', 1);
      
        legend.append('text')
          .attr('x', xoff + 36)
          .attr('y', 0)
          .attr('dominant-baseline', 'middle')
          .style('font-size', isMobile ? '16px' : '18px')
          .text(labels[k]);
      });
    
      // Add circles with hover tooltip at each data point
      // Interactive dots: grow + solid fill on hover
      var fmt = d3.format(',');
      var circleGroup = svg.append('g').attr('class', 'points');
  
      keys.forEach(function(k){
        var seriesColor = colors[k];
        circleGroup.selectAll('circle.point-' + k)
          .data(f.filter(function(d){ return d[k] != null && !isNaN(d[k]); }))
          .enter()
          .append('circle')
          .attr('class', 'point-' + k)
          .attr('cx', function(d){ return x(d.YEAR); })
          .attr('cy', function(d){ return y(d[k]); })
          .attr('r', 5)                    // slightly bigger default size
          .attr('fill', seriesColor)
          .attr('stroke', 'none')
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d){
            d3.select(this)
              .transition().duration(120)
              .attr('r', 7);               // grow a bit on hover
  
            var html = 'Year: ' + d.YEAR + '<br>' + k + ': ' + fmt(d[k]);
            tooltip
              .html(html)
              .style('opacity', 0.95)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY + 10) + 'px');
          })
          .on('mousemove', function(event){
            tooltip
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY + 10) + 'px');
          })
          .on('mouseout', function(){
            d3.select(this)
              .transition().duration(150)
              .attr('r', 5);               // return to slightly bigger default
            tooltip.style('opacity', 0);
          });
      });
    }

    // Mobile-only axis styling for better readability
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // X axis: gently rotate and shrink font
      svg.select('.axis--x').selectAll('text')
        .attr('font-size', 11)
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(35)');
      // Y axis: slightly smaller font
      svg.select('.axis--y').selectAll('text')
        .attr('font-size', 12);
    }
    redraw();

    // Toggle buttons behavior
    btnPolice.addEventListener('click', function(){
      btnPolice.classList.toggle('active');
      redraw();
    });
    btnCamera.addEventListener('click', function(){
      btnCamera.classList.toggle('active');
      redraw();
    });
    startSel.addEventListener('change', redraw);
    endSel.addEventListener('change', redraw);
  }).catch(function(err){
    console.error(err);
    var msg = document.createElement('div');
    msg.textContent = 'Failed to load CSV. Serve this page over HTTP (e.g., http://localhost:8000). Error: ' + err.message;
    msg.style.color = '#d62728';
    msg.style.marginTop = '8px';
    document.getElementById('chart').appendChild(msg);
  });

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
      margin.left = 130;
      margin.right = 260;
      margin.bottom = 110;
    }

    var baseTotalHeight = 480;
    var totalHeight = isMobile ? Math.max(260, Math.round(totalWidth * 0.55)) : baseTotalHeight;

    width = totalWidth - margin.left - margin.right;
    height = totalHeight - margin.top - margin.bottom;

    d3.select('#chart svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  }
  // Initial sizing + draw
  setDimensions();
  redraw();

  // Redraw on resize
  window.addEventListener('resize', debounce(function(){
      setDimensions();
      redraw();
  }, 150));
})();