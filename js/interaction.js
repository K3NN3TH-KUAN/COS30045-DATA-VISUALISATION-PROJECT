(function(){
  var ctx;
  var tooltip = d3.select('body').append('div').attr('id','chart2-tooltip').attr('role','tooltip').attr('aria-live','polite');
  var selTip = d3.select('body').append('div').attr('id','chart2-select-tooltip').attr('role','tooltip').attr('aria-live','polite');
  var donutTip = d3.select('body').append('div').attr('id','chart2-donut-tooltip').attr('role','tooltip').attr('aria-live','polite');
  var fmt = d3.format(',');
  function show(v){ tooltip.style('opacity', v ? 0.97 : 0); }
  function showSel(v){ selTip.style('opacity', v ? 0.98 : 0); }
function placeInChart(tip, event, containerId){
  var host = document.getElementById(containerId || 'chart2');
  var vb = host ? host.getBoundingClientRect() : { left: 0, top: 0, right: (window.innerWidth||0), bottom: (window.innerHeight||0) };
  var scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
  var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  var cont = { left: vb.left + scrollX, top: vb.top + scrollY, right: vb.right + scrollX, bottom: vb.bottom + scrollY };
  var rect = tip.node().getBoundingClientRect();
  var x = (event && typeof event.pageX === 'number') ? event.pageX : cont.left;
  var y = (event && typeof event.pageY === 'number') ? event.pageY : cont.top;
  var pad = 10;
  var left = x + 12; if (left + rect.width > cont.right - pad) left = cont.right - pad - rect.width; if (left < cont.left + pad) left = cont.left + pad;
  var top = y + 12; if (top + rect.height > cont.bottom - pad) top = cont.bottom - pad - rect.height; if (top < cont.top + pad) top = cont.top + pad;
  tip.attr('data-last-x', x).attr('data-last-y', y).style('left', left + 'px').style('top', top + 'px');
}
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
      .style('transition','left 160ms ease, top 160ms ease')
      .style('opacity',0);
    var style = document.createElement('style');
    style.textContent = '#chart2-tooltip .tt-head{font-weight:700;margin-bottom:6px}#chart2-tooltip .tt-row{display:flex;align-items:center;gap:8px;line-height:1.4}#chart2-tooltip .tt-row.hi{font-weight:700}#chart2-tooltip .sw{width:18px;height:4px;border-radius:2px;display:inline-block}#chart2-tooltip .lab{min-width:34px}#chart2-tooltip .val{margin-left:auto;font-variant-numeric:tabular-nums}.hover-year-line{transition:opacity 160ms ease;will-change:opacity}#chart2-select-tooltip{position:absolute;background:#eef1f5;color:#111;padding:8px 10px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.12);font-family:Segoe UI, Arial, sans-serif;font-size:13px;pointer-events:none;opacity:0}#chart2-select-tooltip .hd{font-weight:700;margin-bottom:8px;font-size:14px}#chart2-select-tooltip .row{display:flex;gap:8px}#chart2-select-tooltip .lab{min-width:110px;opacity:0.9}#chart2-select-tooltip .val{margin-left:auto;font-variant-numeric:tabular-nums}#chart2-donut-tooltip{position:absolute;background:rgba(0,0,0,0.85);color:#fff;padding:8px 10px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.4);font-family:Segoe UI, Arial, sans-serif;font-size:12px;pointer-events:none;opacity:0}.viz2-enter{opacity:0;transform:translateY(12px);transition:opacity 380ms ease,transform 380ms ease}.viz2-enter.in{opacity:1;transform:none}#chart2 .loading{color:#999;font-size:13px;padding:8px 0}';
    document.head.appendChild(style);
    var style2 = document.createElement('style');
    style2.textContent = '.tt-donut{display:flex;align-items:center;gap:8px;max-width:280px}.tt-donut .title{display:inline-block;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tt-donut .val{font-variant-numeric:tabular-nums}#chart2-donut-tooltip{transition:left 160ms ease, top 160ms ease}#chart2-tooltip{transition:left 160ms ease, top 160ms ease}#chart2-select-tooltip{transition:left 160ms ease, top 160ms ease}@media (max-width:768px){.tt-donut{max-width:220px}.tt-donut .title{max-width:140px}}@media (max-width:480px){.tt-donut{max-width:180px}.tt-donut .title{max-width:120px}}#chart2-donut-tooltip:hover .title{white-space:normal;max-width:none} .donut-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.2} @media (max-width:768px){.donut-title{font-size:16px}} @media (max-width:480px){.donut-title{font-size:14px}}';
    document.head.appendChild(style2);
    selTip.style('position','absolute').style('transition','left 160ms ease, top 160ms ease');
    donutTip.style('position','absolute').style('transition','left 160ms ease, top 160ms ease');
  }
  function setup(){
    if (!window.chart2Ctx || !window.chart2Ctx.ready) return;
    ctx = window.chart2Ctx;
    window.chart2Ctx.applySelection = applySelection;
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
               if (ctx.selectedSeriesKey) { placeInChart(selTip, event, 'chart2'); return; }
               var p = d3.pointer(event, ctx.svg.node());
               var year = nearestYear(p[0]);
               var xv = Math.max(0, Math.min(ctx.width, ctx.x(year)));
               vline.attr('x1', xv).attr('x2', xv);
               if (year !== lastYear){ tooltip.html(htmlFor(year)); lastYear = year; }
               placeInChart(tooltip, event, 'chart2');
             })
             .on('mouseleave', function(){ show(false); showSel(false); lastYear = null; vline.attr('opacity',0); })
             .on('click', function(){ if (ctx.animating) return; resetSelection(); });
      var xTicks = ctx.svg.select('.axis--x').selectAll('text');
      xTicks.on('mouseenter', function(event, d){
               if (ctx.selectedSeriesKey) return;
               var xv = Math.max(0, Math.min(ctx.width, ctx.x(d)));
               vline.attr('x1', xv).attr('x2', xv).attr('opacity',1);
               if (lastYear !== d) { tooltip.html(htmlFor(d)); lastYear = d; show(true); }
               placeInChart(tooltip, event);
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
      function fmtOr(v){ return (v!=null && !isNaN(v)) ? fmt(v) : '—'; }
      var title = '<div class="hd">'+year+' • '+fullName(key)+'</div>';
      var pc = policeCameraFor(year, key);
      var method = (ctx.methodSel && ctx.methodSel.value) ? ctx.methodSel.value : 'All';
      var isPoliceOnly = /police/i.test(method) && !/all|both/i.test(method);
      var isCameraOnly = /camera/i.test(method) && !/all|both/i.test(method);
      if (isPoliceOnly) {
        return title + '<div class="row"><span class="lab">Police issued fines</span><span class="val">'+fmtOr(pc.police)+'</span></div>';
      }
      if (isCameraOnly) {
        return title + '<div class="row"><span class="lab">Camera issued fines</span><span class="val">'+fmtOr(pc.camera)+'</span></div>';
      }
      return title +
        '<div class="row"><span class="lab">Police issued fines</span><span class="val">'+fmtOr(pc.police)+'</span></div>'+
        '<div class="row"><span class="lab">Camera issued fines</span><span class="val">'+fmtOr(pc.camera)+'</span></div>';
    }
    function applySelection(key, year, event){
      ctx.selectedSeriesKey = key;
      ctx.selectedYear = year;
      var lines = ctx.svg.selectAll('path.series-line');
      lines.interrupt();
      lines.transition().duration(250)
        .style('opacity', function(){ return (this.getAttribute('data-key')===key)?1:0.2; })
        .attr('stroke-width', function(){ return (this.getAttribute('data-key')===key)?6:4; })
        .attr('stroke', function(){
          var k = this.getAttribute('data-key');
          var base = ctx.color(k);
          if (k === key){
            var hc = d3.color(base);
            var dark = (hc && hc.darker) ? hc.darker(1.2) : null;
            return dark && dark.formatHex ? dark.formatHex() : base;
          }
          return base;
        });
      var sel = ctx.svg.select('path.series-line.series-'+key);
      sel.attr('aria-label', 'Selected series '+fullName(key))
        .attr('aria-hidden', null);
      var pt = d3.pointer(event, ctx.svg.node());
      selTip.html(htmlSel(year, key));
      placeInChart(selTip, event);
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
      var panel = container.closest('.info-panel');
      container.style.minHeight = panel ? (Math.max(520, Math.round(panel.getBoundingClientRect().height)) + 'px') : '520px';
      var wb = (container.getBoundingClientRect().width || (panel ? panel.getBoundingClientRect().width : 380));
      var w = Math.max(280, Math.round(wb));
      var h = Math.max(440, (panel ? Math.round(panel.getBoundingClientRect().height) : 520));
      var svg = d3.select(container).append('svg')
        .attr('width', '100%')
        .attr('height', h)
        .attr('viewBox', '0 0 '+w+' '+h)
        .attr('preserveAspectRatio','xMinYMin meet')
        .style('font-family','"Segoe UI",sans-serif')
        .style('overflow','hidden')
        .style('display','block');
      var vw = window.innerWidth || document.documentElement.clientWidth;
var isTablet = vw <= 1024, isMobile = vw <= 768, isTiny = vw <= 480;
var isDesktop = vw >= 1025;
var topPad = isTiny ? 36 : (isMobile ? 42 : 50);
var bottomPad = isTiny ? 100 : (isMobile ? 110 : 140);
var rightColW = (isMobile || isTiny) ? 0 : 160;
var centerY = topPad + (h - topPad - bottomPad) / 2;
var centerX = w / 2;
var r = Math.min(w - rightColW, (h - topPad - bottomPad)) * (isTiny ? 0.42 : (isMobile ? 0.44 : 0.44));
      var g = svg.append('g').attr('transform','translate('+centerX+','+centerY+')');
      var pie = d3.pie().value(function(d){ return d.value; }).sort(null);
      var arc = d3.arc().innerRadius(r * (isTiny ? 0.55 : 0.58)).outerRadius(r);
      var colors = { Police: '#0072B2', Camera: '#D55E00' };
      var mode = 'value';
      function labelText(d){
        var v = d.data.value || 0;
        if (mode === 'percent') {
          var pct = Math.round((v / Math.max(1,total)) * 1000) / 10;
          return pct + '%';
        }
        return fmt(v);
      }
      var arcs = g.selectAll('path.segment').data(pie(data)).enter().append('path')
        .attr('class','segment')
        .attr('fill', function(d){ return colors[d.data.label]; })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', isTiny ? 0.9 : (isMobile ? 1.1 : 1.2))
        .attr('opacity', function(d){ return d.data.value>0 ? 1 : 0.15; })
        .attr('tabindex', 0)
        .attr('role','img')
        .attr('aria-label', function(d){ return d.data.label+': '+fmt(d.data.value); })
        .each(function(d){ this._current = { startAngle: 0, endAngle: 0 }; })
        .transition().duration(1000).ease(d3.easeCubicOut)
        .attrTween('d', function(d){ var i = d3.interpolate(this._current, d); this._current = i(1); return function(t){ return arc(i(t)); }; });
      var inner = r * (isTiny ? 0.55 : 0.58);
      var midR = (inner + r) / 2;
      var minAngle = 0.18;
      g.selectAll('text.inner-label').data(pie(data)).enter().append('text')
        .attr('class','inner-label')
        .attr('text-anchor','middle')
        .style('font-size', isTiny ? '11px' : (isMobile ? '12px' : '13px'))
        .style('font-weight','700')
        .style('pointer-events','none')
        .style('fill', function(d){ var col = d3.color(colors[d.data.label]); var y = col ? (0.299*col.r + 0.587*col.g + 0.114*col.b) : 255; return y > 160 ? '#111' : '#fff'; })
        .attr('opacity', function(d){ var ang = d.endAngle - d.startAngle; return isDesktop ? 0 : ((d.data.value>0 && ang >= minAngle) ? 0.98 : 0); })
        .attr('transform', function(d){ var a=(d.startAngle+d.endAngle)/2; var x=Math.cos(a)*midR; var y=Math.sin(a)*midR; return 'translate('+x+','+y+')'; })
        .text(function(d){ return fmt(d.data.value); });
      function donutTipContent(d){ var label=d.data.label, val=fmt(d.data.value); return '<div class="tt-donut"><span class="title" title="'+label+'">'+label+'</span><span class="sep">:</span><span class="val">'+val+'</span></div>'; }
      function placeDonutTip(d){
        var container = document.getElementById('info-pie'); if (!container) return;
        var vb = container.getBoundingClientRect(); var scrollX = window.scrollX || document.documentElement.scrollLeft || 0; var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        var mid = (d.startAngle + d.endAngle)/2; var side = Math.cos(mid) > 0 ? 1 : -1; var c = arc.centroid(d);
        var pageX = vb.left + scrollX + centerX + c[0] + side * 16; var pageY = vb.top + scrollY + centerY + c[1];
        placeInChart(donutTip, { pageX: pageX, pageY: pageY }, 'info-pie');
      }
      g.selectAll('path.segment')
        .on('mouseenter', function(event, d){ donutTip.html(donutTipContent(d)).style('opacity', 0.95); placeDonutTip(d); })
        .on('mousemove', function(event, d){ placeDonutTip(d); })
        .on('mouseleave', function(){ donutTip.style('opacity', 0); })
        .on('touchstart', function(event, d){ donutTip.html(donutTipContent(d)).style('opacity', 0.95); placeDonutTip(d); })
        .on('touchmove', function(event, d){ placeDonutTip(d); })
        .on('keydown', function(event, d){ if (event.code==='Enter'||event.code==='Space'){ donutTip.html(donutTipContent(d)).style('opacity',0.95); placeDonutTip(d); } });

      var slices = pie(data).filter(function(d){ return d.data.value>0; });
      var half = (h - topPad - bottomPad) / 2;
      var minGap = 16;
      function layout(sidePos){
        sidePos.sort(function(a,b){ return Math.sin(a.mid) - Math.sin(b.mid); });
        var placed = [];
        sidePos.forEach(function(p){
          var y = Math.sin(p.mid) * (r + 18);
          if (placed.length && (y - placed[placed.length-1]) < minGap) y = placed[placed.length-1] + minGap;
          y = Math.max(-half + 10, Math.min(half - 10, y));
          placed.push(y);
          p.d._layout = {
            y: y,
            x2: Math.cos(p.mid) * (r + 12),
            x3: Math.cos(p.mid) * (r + 12) + (p.side>0 ? 22 : -22),
            side: p.side
          };
        });
      }
      var pos = slices.map(function(d){ var mid=(d.startAngle+d.endAngle)/2; var side = (Math.cos(mid)>0) ? 1 : -1; return { d:d, mid:mid, side:side }; });
      if (!isMobile && !isTiny) {
        layout(pos.filter(function(p){ return p.side<0; }));
        layout(pos.filter(function(p){ return p.side>0; }));
      }
      var labels = g.selectAll('text.arc-label');
      if (!isMobile && !isTiny) {
        var leaders = g.selectAll('path.label-leader').data(slices).enter().append('path')
          .attr('class','label-leader')
          .attr('fill','none')
          .attr('stroke','#ffffff')
          .attr('stroke-width',1)
          .attr('opacity',0.85)
          .attr('d', function(d){
            var c = arc.centroid(d);
            var lay = d._layout || { y: Math.sin((d.startAngle+d.endAngle)/2)*(r+18), x2: Math.cos((d.startAngle+d.endAngle)/2)*(r+12), x3: Math.cos((d.startAngle+d.endAngle)/2)*(r+12) + (Math.cos((d.startAngle+d.endAngle)/2)>0?22:-22) };
            return 'M ' + c[0] + ' ' + c[1] + ' L ' + lay.x2 + ' ' + lay.y + ' L ' + lay.x3 + ' ' + lay.y;
          });
        labels = g.selectAll('text.arc-label').data(slices).enter().append('text')
          .attr('class','arc-label')
          .style('font-size', isTiny ? '12px' : (isMobile ? '13px' : '14px'))
          .style('font-weight','700')
          .style('fill','#fff')
          .attr('opacity',0.95)
          .attr('text-anchor', function(d){ var lay = d._layout; return (lay && lay.side>0) ? 'start' : 'end'; })
          .attr('transform', function(d){
            var lay = d._layout || {};
            return 'translate(' + (lay.x3||0) + ',' + (lay.y||0) + ')';
          })
          .text(function(d){ return labelText(d); });
      }

      var btnW = isTiny ? 90 : (isMobile ? 100 : 108), btnH = isTiny ? 30 : 34, radius = 17, spacing = 10;
var toggleX = centerX - ((btnW*2 + spacing) / 2);
var toggleY = centerY + r + (isTiny ? 28 : 40);
      var toggle = svg.append('g')
        .attr('transform','translate('+toggleX+','+toggleY+')')
        .attr('class','mode-toggle')
        .attr('role','group')
        .attr('aria-label','Donut label mode');
      var opts = [{k:'value',label:'Value'},{k:'percent',label:'Percent'}];
      function setModeState(){
        toggle.selectAll('g[role="button"]').each(function(_,ii){
          var active = opts[ii].k === mode;
          d3.select(this).select('rect')
            .attr('fill', active ? '#2563eb' : '#475569')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', active ? 1.6 : 1.2)
            .attr('opacity', 0.98);
        });
        labels.text(function(d){ return labelText(d); });
      }
      opts.forEach(function(o,i){
        var gx = toggle.append('g')
          .attr('transform','translate('+(i*(btnW+spacing))+',0)')
          .style('cursor','pointer')
          .attr('role','button')
          .attr('tabindex', 0)
          .attr('aria-label','Show '+o.label);
        gx.append('rect')
          .attr('width', btnW)
          .attr('height', btnH)
          .attr('rx', radius)
          .attr('fill', o.k===mode ? '#2563eb' : '#475569')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', o.k===mode ? 1.6 : 1.2)
          .attr('opacity', 0.98);
        gx.append('text')
          .attr('x', btnW/2)
          .attr('y', 20)
          .attr('text-anchor','middle')
          .style('font-size', isTiny ? '12px' : (isMobile ? '13px' : '14px'))
          .style('font-weight','700')
          .style('fill','#fff')
          .text(o.label);
        var onActivate = function(){ mode = o.k; setModeState(); };
        gx.on('click', onActivate)
          .on('keydown', function(event){ if (event.code==='Enter'||event.code==='Space'){ onActivate(); } })
          .on('mouseenter', function(){ d3.select(this).select('rect').transition().duration(120).attr('fill', o.k===mode ? '#3b82f6' : '#64748b'); })
          .on('mouseleave', function(){ d3.select(this).select('rect').transition().duration(120).attr('fill', o.k===mode ? '#2563eb' : '#475569'); });
      });
      setModeState();

      var titleW = Math.max(360, w - rightColW - 24);
      var titleX = (w/2) - (titleW/2);
      var titleFO = svg.append('foreignObject')
        .attr('x', titleX)
        .attr('y', 8)
        .attr('width', titleW)
        .attr('height', 46);
      titleFO.append('xhtml:div')
        .attr('class','donut-title')
        .attr('title','Annual Fines by '+ fullName(key)+' in '+year)
        .style('font-weight','700')
        .style('color','#fff')
        .style('text-align','center')
        .style('line-height','1.2')
        .style('word-wrap','break-word')
        .style('overflow','hidden')
        .text('Annual Fines by '+ fullName(key)+' in '+year);

      var legendData = data.filter(function(d){ return (d.value||0) > 0; });
      var legendW = 80;
      var legend = svg.append('g').attr('transform','translate(' + (w - legendW - 12) + ',' + (topPad + 8) + ')');
      legendData.forEach(function(d,i){
        var gy = legend.append('g').attr('transform','translate(0,' + (i*26) + ')');
        gy.append('rect').attr('width', 14).attr('height', 14).attr('rx',3).attr('fill', colors[d.label]).attr('stroke','#fff').attr('stroke-width',1);
        gy.append('text').attr('x', 22).attr('y', 11).style('font-size','14px').style('fill','#fff').text(d.label);
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
        .on('mouseenter', function(event, d){ selTip.html(htmlSel(d.YEAR, key)); placeInChart(selTip, event); showSel(true); })
        .on('mousemove', function(event){ placeInChart(selTip, event); })
        .on('mouseleave', function(){ showSel(false); })
        .on('click', function(event, d){ applySelection(key, d.YEAR, event); })
        .on('keydown', function(event){ var d = d3.select(this).datum(); if (event.code==='Enter'||event.code==='Space'){ applySelection(key, d.YEAR, event); } })
        .on('touchstart', function(event){ var t = (event.changedTouches||event.touches||[])[0]; var le = t ? { pageX:t.pageX, pageY:t.pageY } : event; var d = d3.select(this).datum(); applySelection(key, d.YEAR, le); })
        .transition().duration(240).attr('r', 4.2);
      g.raise();
    }
    function setInfoVisibility(show){
      var section = document.getElementById('blank2-section');
      var panel = section ? section.querySelector('aside.info-panel') : null;
      var t = panel ? panel.querySelector('#info-title') : document.getElementById('info-title');
      var p = panel ? panel.querySelector('ul.info-points') : document.querySelector('.info-points');
      var a = panel ? panel.querySelector('.section-actions') : null;
      var pie = panel ? panel.querySelector('#info-pie') : document.getElementById('info-pie');
      if (t) t.style.display = show ? '' : 'none';
      if (p) p.style.display = show ? '' : 'none';
      if (a) a.style.display = show ? '' : 'none';
      if (pie) pie.style.display = show ? 'none' : 'block';
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

    function debounce(fn, ms){ var t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); }; }
    function reclamp(tip){ if (!tip) return; var node = tip.node(); if (!node) return; var op = parseFloat(tip.style('opacity')) || 0; if (op < 0.05) return; var lx = +node.getAttribute('data-last-x'); var ly = +node.getAttribute('data-last-y'); if (isFinite(lx) && isFinite(ly)) { var containerId = (node.id==='chart2-donut-tooltip') ? 'info-pie' : 'chart2'; placeInChart(tip, { pageX: lx, pageY: ly }, containerId); } }
    var reclampAll = debounce(function(){ reclamp(tooltip); reclamp(selTip); reclamp(donutTip); }, 80);
    window.addEventListener('scroll', reclampAll, { passive: true });
    window.addEventListener('resize', reclampAll);
  });
})();