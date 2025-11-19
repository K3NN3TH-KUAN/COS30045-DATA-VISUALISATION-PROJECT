(function(){
  var ctx;
  var tooltip = d3.select('body').append('div').attr('id','chart2-tooltip').attr('role','tooltip').attr('aria-live','polite');
  var selTip = d3.select('body').append('div').attr('id','chart2-select-tooltip').attr('role','tooltip').attr('aria-live','polite');
  var donutTip = d3.select('body').append('div').attr('id','chart2-donut-tooltip').attr('role','tooltip').attr('aria-live','polite');
  var fmt = d3.format(',');
  function show(v){ tooltip.style('opacity', v ? 0.97 : 0); }
  function showSel(v){ selTip.style('opacity', v ? 0.98 : 0); }
  function htmlFor(year){
    var c = ctx.color;
    var data = ctx.data || [];
    var keys = ctx.keysCache || (ctx.selectedKeys ? ctx.selectedKeys() : []);
    var row = data.find(function(r){ return r.YEAR === year; });
    var maxVal = null;
    keys.forEach(function(k){
      var v = row ? row[k] : null;
      if (v != null && !isNaN(v)) { var n = +v; if (maxVal == null || n > maxVal) maxVal = n; }
    });
    var parts = [];
    parts.push('<div class="tt-head">'+year+'</div>');
    keys.forEach(function(k){
      var v = row ? row[k] : null;
      var s = (v != null && !isNaN(v)) ? fmt(v) : '—';
      var cls = 'tt-row' + ((v != null && !isNaN(v) && +v === maxVal) ? ' hi' : '');
      parts.push('<div class="'+cls+'"><span class="sw" style="background:'+c(k)+'"></span><span class="lab">'+k+'</span><span class="val">'+s+'</span></div>');
    });
    return parts.join('');
  }
  function nearestYear(mx){
    var xi = ctx.x.invert(mx);
    var years = ctx.yearVals && ctx.yearVals.length ? ctx.yearVals : Array.from(new Set((ctx.data||[]).map(function(d){ return d.YEAR; }))).sort(d3.ascending);
    var best = years[0];
    var diff = Math.abs(xi - best);
    for (var i=1;i<years.length;i++){ var y=years[i]; var d=Math.abs(xi-y); if (d<diff){ best=y; diff=d; } }
    return best;
  }
  var lastYear = null;
  function applyStyles(){
    tooltip.style('position','absolute')
      .style('background','#eef1f5')
      .style('color','#111')
      .style('padding','8px 10px')
      .style('border-radius','6px')
      .style('box-shadow','0 6px 18px rgba(0,0,0,0.12)')
      .style('font-family','Segoe UI, Arial, sans-serif')
      .style('font-size','13px')
      .style('pointer-events','none')
      .style('opacity',0);
    var style = document.createElement('style');
    style.textContent = '#chart2-tooltip .tt-head{font-weight:700;margin-bottom:6px}#chart2-tooltip .tt-row{display:flex;align-items:center;gap:8px;line-height:1.4}#chart2-tooltip .tt-row.hi{font-weight:700}#chart2-tooltip .sw{width:18px;height:4px;border-radius:2px;display:inline-block}#chart2-tooltip .lab{min-width:34px}#chart2-tooltip .val{margin-left:auto;font-variant-numeric:tabular-nums}.hover-year-line{transition:opacity 160ms ease;will-change:opacity}#chart2-select-tooltip{position:absolute;background:rgba(0,0,0,0.8);color:#fff;padding:10px 12px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.35);font-family:Segoe UI, Arial, sans-serif;font-size:13px;pointer-events:none;opacity:0}#chart2-select-tooltip .hd{font-weight:700;margin-bottom:8px;font-size:14px}#chart2-select-tooltip .row{display:flex;gap:8px}#chart2-select-tooltip .lab{min-width:110px;opacity:0.9}#chart2-select-tooltip .val{margin-left:auto;font-variant-numeric:tabular-nums}#chart2-donut-tooltip{position:absolute;background:rgba(0,0,0,0.85);color:#fff;padding:8px 10px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.4);font-family:Segoe UI, Arial, sans-serif;font-size:12px;pointer-events:none;opacity:0}.viz2-enter{opacity:0;transform:translateY(12px);transition:opacity 380ms ease,transform 380ms ease}.viz2-enter.in{opacity:1;transform:none}#chart2 .loading{color:#999;font-size:13px;padding:8px 0}';
    document.head.appendChild(style);
    selTip.style('position','absolute');
    donutTip.style('position','absolute');
  }
  function setup(){
    if (!window.chart2Ctx || !window.chart2Ctx.ready) return;
    ctx = window.chart2Ctx;
    ctx.onRedraw = function(){
      ctx.svg.selectAll('.hover-overlay2').remove();
      ctx.svg.selectAll('.hover-year-line').remove();
      var vline = ctx.svg.append('line')
        .attr('class','hover-year-line')
        .attr('x1',0).attr('x2',0)
        .attr('y1',0).attr('y2',ctx.height)
        .attr('stroke','#333')
        .attr('stroke-width',2)
        .attr('opacity',0)
        .attr('aria-hidden','true')
        .attr('role','presentation')
        .style('pointer-events','none');
      var overlay = ctx.svg.append('rect')
        .attr('class','hover-overlay2')
        .attr('x',0).attr('y',0)
        .attr('width', ctx.width).attr('height', ctx.height)
        .attr('fill','transparent')
        .style('pointer-events','all');
      overlay.lower();
      vline.raise();
      overlay.on('mouseenter', function(event){ show(true); vline.attr('opacity',1); })
             .on('mousemove', function(event){
               if (ctx.selectedSeriesKey) { show(false); return; }
               var p = d3.pointer(event, ctx.svg.node());
               var year = nearestYear(p[0]);
               var xv = Math.max(0, Math.min(ctx.width, ctx.x(year)));
               vline.attr('x1', xv).attr('x2', xv);
               if (year !== lastYear){ tooltip.html(htmlFor(year)); lastYear = year; }
               tooltip.style('left', (event.pageX + 12) + 'px').style('top', (event.pageY + 12) + 'px');
             })
             .on('mouseleave', function(){ show(false); lastYear = null; vline.attr('opacity',0); })
             .on('click', function(){ if (ctx.animating) return; resetSelection(); });
      var xTicks = ctx.svg.select('.axis--x').selectAll('text');
      xTicks.on('mouseenter', function(event, d){
               if (ctx.selectedSeriesKey) return;
               var xv = Math.max(0, Math.min(ctx.width, ctx.x(d)));
               vline.attr('x1', xv).attr('x2', xv).attr('opacity',1);
               if (lastYear !== d) { tooltip.html(htmlFor(d)); lastYear = d; show(true); }
             }).on('mouseleave', function(){ if (!ctx.selectedSeriesKey) vline.attr('opacity',0); });
      if (!ctx.selectedSeriesKey && lastYear !== null) { tooltip.html(htmlFor(lastYear)); }
      bindLineHandlers();
    };
    function fullName(k){
      var map = { ACT:'Australian Capital Territory', NSW:'New South Wales', NT:'Northern Territory', QLD:'Queensland', SA:'South Australia', TAS:'Tasmania', VIC:'Victoria', WA:'Western Australia' };
      return map[k] || k;
    }
    function resetSelection(){
      ctx.selectedSeriesKey = null;
      ctx.selectedYear = null;
      showSel(false);
      var lines = ctx.svg.selectAll('path.series-line');
      lines.interrupt();
      lines.transition().duration(300)
        .style('opacity', 1)
        .attr('stroke-width', 4)
        .attr('stroke', function(){ var k=this.getAttribute('data-key'); return ctx.color(k); })
        .attr('aria-hidden', null)
        .attr('aria-label', null);
      ctx.svg.selectAll('.selection-markers').remove();
      var container = document.getElementById('info-pie');
      if (container) container.innerHTML = '';
      setInfoVisibility(true);
    }
    function policeCameraFor(year, key){
      var p = 0, c = 0;
      var rows = ctx.data5 || [];
      rows.forEach(function(r){
        if (r.YEAR === year){
          var dm = (r.DETECTION_METHOD||'').toLowerCase();
          var v = r[key];
          if (dm.indexOf('police')>=0 && v!=null && !isNaN(v)) p += +v;
          if (dm.indexOf('camera')>=0 && v!=null && !isNaN(v)) c += +v;
        }
      });
      return { police: p||null, camera: c||null };
    }
    function htmlSel(year, key){
      var method = (ctx.methodSel && ctx.methodSel.value) ? ctx.methodSel.value : 'Both';
      function fmtOr(v){ return (v!=null && !isNaN(v)) ? fmt(v) : '—'; }
      var title = '<div class="hd">'+year+' • '+fullName(key)+'</div>';
      if (method === 'Both') {
        var totalRow = (ctx.data || []).find(function(r){ return r.YEAR === year; });
        var total = totalRow ? totalRow[key] : null;
        var pc = policeCameraFor(year, key);
        return title +
          '<div class="row"><span class="lab">Total fines</span><span class="val">'+fmtOr(total)+'</span></div>'+
          '<div class="row"><span class="lab">Police issued fines</span><span class="val">'+fmtOr(pc.police)+'</span></div>'+
          '<div class="row"><span class="lab">Camera issued fines</span><span class="val">'+fmtOr(pc.camera)+'</span></div>';
      } else if (/police/i.test(method)) {
        var rP = (ctx.data || []).find(function(r){ return r.YEAR === year; });
        var vP = rP ? rP[key] : null;
        return title + '<div class="row"><span class="lab">Police issued fines</span><span class="val">'+fmtOr(vP)+'</span></div>';
      } else if (/camera/i.test(method)) {
        var rC = (ctx.data || []).find(function(r){ return r.YEAR === year; });
        var vC = rC ? rC[key] : null;
        return title + '<div class="row"><span class="lab">Camera issued fines</span><span class="val">'+fmtOr(vC)+'</span></div>';
      } else {
        var rX = (ctx.data || []).find(function(r){ return r.YEAR === year; });
        var vX = rX ? rX[key] : null;
        return title + '<div class="row"><span class="lab">'+method+'</span><span class="val">'+fmtOr(vX)+'</span></div>';
      }
    }
    function applySelection(key, year, event){
      ctx.selectedSeriesKey = key;
      ctx.selectedYear = year;
      var lines = ctx.svg.selectAll('path.series-line');
      lines.interrupt();
      lines.transition().duration(300).style('opacity', function(){ return (this.getAttribute('data-key')===key)?1:0.1; });
      var sel = ctx.svg.select('path.series-line.series-'+key);
      var base = ctx.color(key);
      var hiObj = d3.color(base);
      var hi = (hiObj && hiObj.darker) ? (hiObj.darker(1.2).formatHex ? hiObj.darker(1.2).formatHex() : base) : base;
      sel.transition().duration(300)
        .attr('stroke-width', 6)
        .attr('stroke', hi)
        .attr('aria-label', 'Selected series '+fullName(key))
        .attr('aria-hidden', null);
      var pt = d3.pointer(event, ctx.svg.node());
      selTip.html(htmlSel(year, key))
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY + 12) + 'px');
      showSel(true);
      show(false);
      renderSelectionMarkers(key);
      renderInfoPie(year, key);
    }
    function bindLineHandlers(){
      ctx.svg.selectAll('path.series-line')
        .on('click', function(event){
          if (ctx.animating) return;
          var key = this.getAttribute('data-key');
          var p = d3.pointer(event, ctx.svg.node());
          var year = nearestYear(p[0]);
          applySelection(key, year, event);
        })
        .on('keydown', function(event){
          if (ctx.animating) return;
          if (event.code === 'Enter' || event.code === 'Space'){
            var key = this.getAttribute('data-key');
            var year = nearestYear(ctx.x.invert ? ctx.x(ctx.yearVals[ctx.yearVals.length-1]) : 0);
            applySelection(key, year, event);
          }
        })
        .on('touchstart', function(event){
          if (ctx.animating) return;
          var touches = event.changedTouches || event.touches;
          var t = touches && touches[0] ? touches[0] : null;
          var key = this.getAttribute('data-key');
          var localEvent = t ? { pageX: t.pageX, pageY: t.pageY } : event;
          var bboxEvent = t ? t : event;
          var p = d3.pointer(bboxEvent, ctx.svg.node());
          var year = nearestYear(p[0]);
          applySelection(key, year, localEvent);
        });
    }
    bindLineHandlers();
    if (ctx.selectedSeriesKey && ctx.selectedYear){ renderInfoPie(ctx.selectedYear, ctx.selectedSeriesKey);}
    function renderInfoPie(year, key){
      var container = document.getElementById('info-pie');
      if (!container) return;
      container.innerHTML = '';
      setInfoVisibility(false);
      var method = (ctx.methodSel && ctx.methodSel.value) ? ctx.methodSel.value : 'Both';
      var rows = ctx.data5 || [];
      var p = 0, c = 0;
      rows.forEach(function(r){
        if (r.YEAR === year){
          var dm = (r.DETECTION_METHOD||'').toLowerCase();
          var v = r[key];
          if (dm.indexOf('police')>=0 && v!=null && !isNaN(v)) p += +v;
          if (dm.indexOf('camera')>=0 && v!=null && !isNaN(v)) c += +v;
        }
      });
      if (/police/i.test(method)) { c = 0; }
      if (/camera/i.test(method)) { p = 0; }
      var data = [ {label:'Police', value:p}, {label:'Camera', value:c} ];
      var total = (p||0) + (c||0);
      if (!total){
        var msg = document.createElement('div');
        msg.textContent = 'No detection data for '+year+' • '+fullName(key);
        msg.style.fontSize = '13px';
        msg.style.color = '#555';
        container.appendChild(msg);
        return;
      }
      container.style.width = '100%';
      container.style.height = '100%';
      var panel = container.closest('.info-panel');
      var w = container.clientWidth || (panel ? panel.clientWidth : 220);
      var h = container.clientHeight || (panel ? panel.clientHeight : 240);
      var svg = d3.select(container).append('svg')
        .attr('width', '100%')
        .attr('height', '90%')
        .attr('viewBox', '0 0 '+w+' '+h)
        .style('display','block');
      var topPad = 48, bottomPad = 50;
      var centerY = topPad + (h - topPad - bottomPad) / 2;
      var r = Math.min(w, (h - topPad - bottomPad)) * 0.50;
      var g = svg.append('g').attr('transform','translate('+(w/2)+','+centerY+')');
      var pie = d3.pie().value(function(d){ return d.value; }).sort(null);
      var arc = d3.arc().innerRadius(r*0.58).outerRadius(r);
      var colors = { Police: '#0072B2', Camera: '#D55E00' };
      var arcs = g.selectAll('path.segment').data(pie(data)).enter().append('path')
        .attr('class','segment')
        .attr('fill', function(d){ return colors[d.data.label]; })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.2)
        .attr('opacity', function(d){ return d.data.value>0 ? 1 : 0.15; })
        .attr('tabindex', 0)
        .attr('role','img')
        .attr('aria-label', function(d){ return d.data.label+': '+fmt(d.data.value); })
        .each(function(d){ this._current = { startAngle: 0, endAngle: 0 }; })
        .transition().duration(700).ease(d3.easeCubicOut)
        .attrTween('d', function(d){ var i = d3.interpolate(this._current, d); this._current = i(1); return function(t){ return arc(i(t)); }; });
      g.selectAll('path.segment')
        .on('mouseenter', function(event, d){
          donutTip.html(d.data.label + ': ' + fmt(d.data.value))
            .style('opacity', 0.95)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
        })
        .on('mousemove', function(event){
          donutTip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseleave', function(){ donutTip.style('opacity', 0); })
        .on('keydown', function(event, d){ if (event.code==='Enter'||event.code==='Space'){ donutTip.html(d.data.label + ': ' + fmt(d.data.value)).style('opacity',0.95).style('left',(event.pageX||0)+10+'px').style('top',(event.pageY||0)+10+'px'); } });
      svg.append('text')
        .attr('x', w/2)
        .attr('y', 18)
        .attr('text-anchor','middle')
        .style('font-size','18px')
        .style('font-weight','700')
        .style('fill','#fff')
        .text('Annual Fines by '+ fullName(key)+' in '+year);

      var legendData = data.filter(function(d){ return (d.value||0) > 0; });
      var legWidth = legendData.length * 96;
      var legStart = (w/2) - (legWidth/2);
      var legend = svg.append('g').attr('transform','translate(' + legStart + ',' + (h - bottomPad + 8) + ')');
      legendData.forEach(function(d,i){
        var gx = legend.append('g').attr('transform','translate(' + (i*96) + ',0)');
        gx.append('rect').attr('width', 14).attr('height', 14).attr('rx',3).attr('fill', colors[d.label]).attr('stroke','#fff').attr('stroke-width',1);
        gx.append('text').attr('x', 20).attr('y', 11).style('font-size','16px').style('fill','#fff').text(d.label);
      });

      container.setAttribute('aria-label', 'Detection method proportion for '+fullName(key)+' in '+year);
    }
    function renderSelectionMarkers(key){
      ctx.svg.selectAll('.selection-markers').remove();
      var g = ctx.svg.append('g').attr('class','selection-markers');
      var base = ctx.color(key);
      var hiObj = d3.color(base);
      var fill = (hiObj && hiObj.darker) ? (hiObj.darker(0.8).formatHex ? hiObj.darker(0.8).formatHex() : base) : base;
      var pts = (ctx.data || []).map(function(d){ return { YEAR: d.YEAR, value: d[key] }; })
        .filter(function(d){ return d.value != null && !isNaN(d.value) && d.value > 0; });
      var nodes = g.selectAll('circle').data(pts).enter().append('circle')
        .attr('cx', function(d){ return ctx.x(d.YEAR); })
        .attr('cy', function(d){ return ctx.y(d.value); })
        .attr('r', 0)
        .attr('fill', fill)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.2)
        .attr('tabindex', 0)
        .attr('role','button')
        .attr('aria-label','Select '+fullName(key)+' for year')
        .style('cursor','pointer')
        .style('pointer-events','all')
        .on('click', function(event, d){ applySelection(key, d.YEAR, event); })
        .on('keydown', function(event){ var d = d3.select(this).datum(); if (event.code==='Enter'||event.code==='Space'){ applySelection(key, d.YEAR, event); } })
        .on('touchstart', function(event){ var t = (event.changedTouches||event.touches||[])[0]; var le = t ? { pageX:t.pageX, pageY:t.pageY } : event; var d = d3.select(this).datum(); applySelection(key, d.YEAR, le); })
        .transition().duration(240).attr('r', 4.2);
      g.raise();
    }
    function setInfoVisibility(show){
      var t = document.getElementById('info-title');
      var p = document.querySelector('.info-points');
      if (t) t.style.display = show ? '' : 'none';
      if (p) p.style.display = show ? '' : 'none';
    }
    bindLineHandlers();
    if (ctx.selectedSeriesKey && ctx.selectedYear){ renderInfoPie(ctx.selectedYear, ctx.selectedSeriesKey); renderSelectionMarkers(ctx.selectedSeriesKey); }
    if (ctx.onRedraw) ctx.onRedraw();
  }
  document.addEventListener('DOMContentLoaded', function(){
    applyStyles();
    var t = setInterval(function(){ if (window.chart2Ctx && window.chart2Ctx.ready){ clearInterval(t); setup(); } }, 60);
    function setupObserver(){
      var section = document.getElementById('blank2-section');
      var chartHost = document.getElementById('chart2');
      if (!section){ if (window.chart2Ctx && window.chart2Ctx.onSectionEnter) window.chart2Ctx.onSectionEnter(); return; }
      var introEls = section.querySelectorAll('.info-title, .info-points, .chart-card');
      introEls.forEach(function(el){ el.classList.add('viz2-enter'); });
      function onEnter(){ section.classList.add('in-view'); introEls.forEach(function(el){ el.classList.add('in'); }); if (window.chart2Ctx && window.chart2Ctx.onSectionEnter) window.chart2Ctx.onSectionEnter(); var l = chartHost && chartHost.querySelector('.loading'); if (l) l.remove(); }
      function onExit(){ section.classList.remove('in-view'); donutTip.style('opacity',0); selTip.style('opacity',0); tooltip.style('opacity',0); }
      if ('IntersectionObserver' in window){
        var pending = false;
        var io = new IntersectionObserver(function(entries){ var e = entries[0]; if (!e) return; var vis = e.intersectionRatio >= 0.28; if (vis && !pending){ pending=true; onEnter(); setTimeout(function(){ pending=false; }, 200); } if (!vis){ onExit(); } }, { threshold: [0,0.28,0.5,1] });
        io.observe(section);
        if (chartHost && chartHost.children.length === 0){ var ld = document.createElement('div'); ld.className='loading'; ld.textContent='Loading chart…'; chartHost.appendChild(ld); }
      } else { onEnter(); }
    }
    setupObserver();
  });
})();