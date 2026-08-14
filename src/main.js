import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { load } from '@loaders.gl/core';
import { LASLoader } from '@loaders.gl/las';
import proj4 from 'proj4';
import DxfParser from 'dxf-parser';
import './style.css';
import './measure.css';

document.querySelector('#app').innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Survey Cloud home"><span class="brand-mark">SC</span><span><b>SURVEY CLOUD</b><small>COORDINATE VIEWER</small></span></a>
      <div class="project"><span class="status-dot"></span><span><small>PROJECT</small><b>Untitled survey</b></span></div>
      <div class="header-actions"><button class="icon-btn" id="helpBtn" title="วิธีใช้งาน">?</button><button class="primary" id="addDataTop">＋ เพิ่มข้อมูล</button></div>
    </header>
    <main>
      <aside class="sidebar">
        <section class="side-head"><div><span class="eyebrow">DATA MANAGER</span><h1>ชั้นข้อมูล</h1></div><button class="mini-add" id="addDataSide">＋</button></section>
        <div class="drop-zone" id="dropZone"><div class="upload-icon">↥</div><b>วางไฟล์ที่นี่</b><span>หรือคลิกเพื่อเลือกไฟล์</span><small>LAS · LAZ · PLY · GLB · GLTF · OBJ · STL · DXF · TIF DEM</small></div>
        <input id="fileInput" type="file" multiple accept=".las,.laz,.ply,.glb,.gltf,.obj,.stl,.dxf,.tif,.tiff" hidden />
        <div class="layers" id="layers"><div class="empty-layer"><span>◇</span><p>ยังไม่มีชั้นข้อมูล</p><small>นำเข้า Point Cloud, Mesh หรือ DXF เพื่อเริ่มต้น</small></div></div>
        <section class="coordinate-card">
          <div class="card-title"><span>◎</span><div><b>ระบบพิกัดโครงการ</b><small>LOCAL OR PROJECTED CRS</small></div></div>
          <div class="origin-grid"><label>Easting<input id="originX" type="number" step="any" value="0"></label><label>Northing<input id="originY" type="number" step="any" value="0"></label><label>Elevation<input id="originZ" type="number" step="any" value="0"></label></div>
          <button class="secondary" id="applyOrigin">กำหนด Local Origin</button>
          <div class="background-settings"><div class="card-title"><span>▧</span><div><b>พื้นหลังภูมิศาสตร์</b><small>DEM + ESRI IMAGERY + OSM 3D</small></div></div><label class="crs-field">ระบบพิกัดโครงการ<select id="projectCrs"><option value="EPSG:3123" selected>PRS92 / Philippines Zone 3 (EPSG:3123)</option><option value="UTM">WGS84 / UTM</option></select></label><div class="background-grid" id="utmSettings" hidden><label>UTM Zone<input id="utmZone" type="number" min="1" max="60" value="51"></label><label>Hemisphere<select id="utmHemisphere"><option value="N" selected>North</option><option value="S">South</option></select></label></div><div class="background-grid"><label>รัศมี<select id="osmRadius"><option value="300">300 m</option><option value="600" selected>600 m</option><option value="1000">1,000 m</option></select></label><label>ความละเอียด<select id="imageryZoom"><option value="15">ต่ำ · เร็ว</option><option value="16" selected>กลาง</option><option value="17">สูง</option></select></label></div><label class="dem-picker">DEM GeoTIFF<input id="demInput" type="file" accept=".tif,.tiff"><span id="demStatus">ยังไม่ได้โหลด DEM</span></label><label class="toggle-row background-toggle">แสดง Terrain<input id="terrainVisible" type="checkbox" checked><i></i></label><button class="secondary imagery-button" id="loadImagery">โหลดภาพดาวเทียม Esri</button><label class="toggle-row background-toggle">แสดงภาพดาวเทียม<input id="imageryVisible" type="checkbox" checked><i></i></label><button class="secondary" id="loadBackground">โหลดอาคารและถนน OSM</button><label class="toggle-row background-toggle">แสดง OSM 3D<input id="backgroundVisible" type="checkbox" checked><i></i></label><small class="osm-credit">Imagery © Esri and data providers · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></small></div>
          <label class="budget-field">POINT BUDGET<select id="pointBudget"><option value="500000">0.5 ล้าน · เร็ว</option><option value="1000000" selected>1 ล้าน · แนะนำ</option><option value="2000000">2 ล้าน · ละเอียด</option><option value="4000000">4 ล้าน · เครื่องแรง</option></select></label>
          <p class="hint">พิกัดจริงจะถูกเก็บไว้ครบถ้วน แต่เลื่อนใกล้จุดกำเนิดขณะเรนเดอร์เพื่อความแม่นยำ</p>
        </section>
      </aside>
      <section class="viewport-wrap">
        <div id="viewport"></div>
        <div class="view-tools"><button data-view="top" title="Top view">TOP</button><button data-view="iso" class="active" title="Isometric view">ISO</button><button id="fitView" class="fit-all" title="Zoom ดูทุกชั้นข้อมูล">⌗ ดูทั้งหมด</button><button id="pivotBtn" class="pivot-button" title="ย้ายจุดศูนย์กลางการหมุนและซูม">◎ ตั้งศูนย์</button><button id="measureBtn" class="measure-button" title="Measure XYZ">↔ วัดระยะ</button></div>
        <div class="compass"><span>N</span><i></i></div>
        <div class="welcome" id="welcome"><span class="eyebrow">SURVEY-GRADE 3D WORKSPACE</span><h2>ตรวจสอบโมเดลใน<br><em>พิกัดจริง</em></h2><p>รวม Point Cloud, Mesh และแบบ DXF ไว้ในพื้นที่เดียว พร้อมปรับค่าระดับแบบเรียลไทม์</p><button class="primary large" id="startBtn">＋ นำเข้าข้อมูลแรก</button><div class="format-row"><span><i class="cyan"></i>POINT CLOUD</span><span><i class="amber"></i>MESH MODEL</span><span><i class="red"></i>DXF DRAWING</span></div></div>
        <div class="loading" id="loading" hidden><span></span><b>กำลังประมวลผลไฟล์…</b></div>
        <div class="recovery" id="recovery" hidden><span></span><b>กำลังกู้คืนการแสดงผล 3D…</b></div>
        <div class="coordinate-warning" id="coordinateWarning" hidden><div><b>ตำแหน่งข้อมูลอาจไม่ตรงกัน</b><p id="coordinateWarningText"></p></div><button id="warningFitNew">ดูไฟล์ใหม่</button><button id="warningFitAll">ดูทั้งหมด</button><button id="warningClose">×</button></div>
        <div class="coord-readout"><span id="readE">E —</span><span id="readN">N —</span><span id="readZ">Z —</span></div>
        <div class="measure-panel" id="measurePanel" hidden><div class="measure-head"><b>MEASURE XYZ</b><button id="closeMeasure">×</button></div><p id="measureHint">เลื่อนเมาส์บนพื้นผิว แล้วคลิกจุดเริ่มต้น</p><div class="snap-row target-snap"><span>TARGET SNAP</span><button data-target-snap="surface" class="active">SURFACE</button><button data-target-snap="vertex">VERTEX</button></div><div class="snap-row"><span>AXIS SNAP</span><button data-axis="auto" class="active">AUTO</button><button data-axis="x">X</button><button data-axis="y">Y</button><button data-axis="z">Z</button><button data-axis="off">OFF</button></div><div class="measure-values"><div><span>ΔX</span><b id="deltaX">—</b></div><div><span>ΔY</span><b id="deltaY">—</b></div><div><span>ΔZ</span><b id="deltaZ">—</b></div><div><span>ระยะราบ</span><b id="distance2d">—</b></div><div class="total"><span>ระยะเอียง</span><b id="distance3d">—</b></div></div><button class="secondary" id="clearMeasure">วัดใหม่</button></div>
      </section>
      <aside class="properties">
        <div class="properties-head"><span class="eyebrow">INSPECTOR</span><h2>คุณสมบัติ</h2></div>
        <div id="noSelection" class="no-selection"><div>⌁</div><b>ยังไม่ได้เลือกชั้นข้อมูล</b><p>เลือกชั้นข้อมูลทางซ้ายเพื่อดูรายละเอียดและปรับค่าระดับ</p></div>
        <div id="propertyPanel" hidden>
          <div class="selected-name"><span id="selectedType">DXF</span><b id="selectedName"></b></div>
          <label class="field">ชื่อชั้นข้อมูล<input id="layerName" type="text"></label>
          <div class="property-group" id="elevationGroup"><div class="group-title"><b>ค่าระดับ DXF</b><span>WORLD Z</span></div><label class="big-number"><input id="elevation" type="number" step="0.001" value="0"><span>m</span></label><input id="elevationRange" type="range" min="-50" max="50" value="0" step="0.01"><div class="range-labels"><span>−50 m</span><span>+50 m</span></div><div class="nudge"><button data-nudge="-1">−1.00</button><button data-nudge="-0.1">−0.10</button><button data-nudge="0.1">+0.10</button><button data-nudge="1">+1.00</button></div><button class="secondary" id="resetElevation">คืนค่าระดับเดิม</button></div>
          <div class="property-group dxf-detail" id="dxfDetail"><div class="group-title"><b>รายละเอียด DXF</b><span>CAD LAYERS</span></div><label class="dxf-color">สีทั้งไฟล์<input id="dxfColor" type="color" value="#ff6b5d"></label><div class="dxf-layer-list" id="dxfLayerList"></div><div class="entity-info" id="entityInfo"><span>SELECTED ENTITY</span><p>คลิกเส้น DXF บน Viewer เพื่อดูรายละเอียด</p></div></div>
          <div class="property-group"><div class="group-title"><b>การแสดงผล</b></div><label class="toggle-row">แสดงชั้นข้อมูล<input id="visibleToggle" type="checkbox" checked><i></i></label><label class="field" id="colorModeRow">รูปแบบสี<select id="colorMode"><option value="rgb">สีจริง RGB</option><option value="elevation">เฉดสีตามความสูง</option><option value="classification">เฉดสีตาม Classification</option></select></label><div class="color-legend" id="colorLegend"></div><label class="field">ความโปร่งใส <span id="opacityValue">100%</span><input id="opacity" type="range" min="0" max="1" value="1" step="0.01"></label><label class="field" id="pointSizeRow">ขนาดจุด <span id="pointSizeValue">1.2 px</span><input id="pointSize" type="range" min="0.5" max="5" value="1.2" step="0.1"></label></div>
          <div class="property-group info"><div><span>จำนวนองค์ประกอบ</span><b id="elementCount">—</b></div><div><span>ขอบเขต Z</span><b id="zBounds">—</b></div><div id="focusInfo" hidden><span>ขอบเขตเริ่มต้น</span><b>งานหลัก · ตัด outlier</b></div></div>
          <button class="secondary inspector-fit" id="fitSelected">ซูมไปยังชั้นข้อมูลนี้</button>
          <button class="danger" id="removeLayer">ลบชั้นข้อมูล</button>
        </div>
      </aside>
    </main>
    <footer><span id="webglStatus"><i class="status-dot"></i> WebGL พร้อมใช้งาน</span><span>WORLD COORDINATES · METRES</span><span>Survey Cloud MVP 0.1</span></footer>
  </div>
  <div class="toast" id="toast"></div>`;

const viewport = document.querySelector('#viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07100f);
scene.fog = new THREE.FogExp2(0x07100f, 0.00035);
const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 1e8);
camera.position.set(35, -45, 32);
camera.up.set(0, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.screenSpacePanning = true;
controls.zoomToCursor = true;
controls.zoomSpeed = 0.75;
controls.panSpeed = 0.85;
controls.minDistance = 0.001;
controls.maxDistance = Infinity;
controls.minTargetRadius = 0;
controls.maxTargetRadius = Infinity;
controls.target.set(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xc9fff4, 0x10201b, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(20, -30, 60); scene.add(sun);
const grid = new THREE.GridHelper(200, 40, 0x215c50, 0x12342e); grid.rotation.x = Math.PI / 2; scene.add(grid);
const axes = new THREE.AxesHelper(8); scene.add(axes);
const pivotVisual=new THREE.Mesh(new THREE.RingGeometry(.7,1,32),new THREE.MeshBasicMaterial({color:0xffd45c,side:THREE.DoubleSide,transparent:true,opacity:.9,depthTest:false}));pivotVisual.visible=false;pivotVisual.renderOrder=30;scene.add(pivotVisual);
const imageryGroup=new THREE.Group();imageryGroup.name='Esri World Imagery';scene.add(imageryGroup);
const terrainGroup=new THREE.Group();terrainGroup.name='GeoTIFF DEM terrain';scene.add(terrainGroup);
const backgroundGroup=new THREE.Group();backgroundGroup.name='OpenStreetMap 3D background';scene.add(backgroundGroup);
let terrainData=null;

const state = { layers: [], selectedId: null, selectedEntity:null, origin: new THREE.Vector3(), nextId: 1, measuring:false, measureStart:null, measurePreview:null, measureAxis:'auto', measureTarget:'surface', snapPoint:null, pivotMode:false };
const $ = (s) => document.querySelector(s);
const fileInput = $('#fileInput');
const openPicker = () => fileInput.click();
['#addDataTop','#addDataSide','#startBtn'].forEach(s => $(s).addEventListener('click', openPicker));
$('#dropZone').addEventListener('click', openPicker);
fileInput.addEventListener('change', e => importFiles([...e.target.files]));
['dragenter','dragover'].forEach(ev => $('#dropZone').addEventListener(ev, e => { e.preventDefault(); $('#dropZone').classList.add('dragging'); }));
['dragleave','drop'].forEach(ev => $('#dropZone').addEventListener(ev, e => { e.preventDefault(); $('#dropZone').classList.remove('dragging'); }));
$('#dropZone').addEventListener('drop', e => importFiles([...e.dataTransfer.files]));

let renderRequested=false,rafId=0,contextLost=false;
function invalidate(){if(renderRequested||contextLost||document.hidden)return;renderRequested=true;rafId=requestAnimationFrame(renderFrame)}
function renderFrame(){renderRequested=false;if(contextLost||document.hidden)return;controls.update();renderer.render(scene,camera)}
function resize() { const { clientWidth:w, clientHeight:h } = viewport;if(!w||!h)return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();invalidate(); }
new ResizeObserver(resize).observe(viewport);
controls.addEventListener('change',invalidate);controls.addEventListener('start',invalidate);controls.addEventListener('end',invalidate);invalidate();
function resumeViewer(){
  if(contextLost)return;cancelAnimationFrame(rafId);renderRequested=false;controls.enabled=true;resize();controls.update();invalidate();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(rafId);renderRequested=false}else resumeViewer()});
window.addEventListener('focus',resumeViewer);window.addEventListener('pageshow',resumeViewer);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(rafId);renderRequested=false;controls.enabled=false;$('#recovery').hidden=false;$('#webglStatus').innerHTML='<i class="status-dot warning"></i> WebGL ขาดการเชื่อมต่อ'});
renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;scene.traverse(o=>{o.geometry?.attributes&&Object.values(o.geometry.attributes).forEach(a=>a.needsUpdate=true);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true)});$('#recovery').hidden=true;$('#webglStatus').innerHTML='<i class="status-dot"></i> WebGL กู้คืนแล้ว';resumeViewer();toast('กู้คืนการแสดงผล 3D สำเร็จ')});
function toast(message, error=false){ const el=$('#toast'); el.textContent=message; el.className=`toast show ${error?'error':''}`; clearTimeout(toast.t); toast.t=setTimeout(()=>el.className='toast',3500); }
const extOf = name => name.split('.').pop().toLowerCase();
const colorFor = type => ({ point:0x45e0c2, mesh:0xf0ad57, dxf:0xff6b5d })[type];
proj4.defs('EPSG:3123','+proj=tmerc +lat_0=0 +lon_0=121 +k=0.99995 +x_0=500000 +y_0=0 +ellps=clrk66 +towgs84=-127.62,-67.24,-47.04,3.068,-4.903,-1.578,-1.06 +units=m +no_defs +type=crs');
function utmToLatLon(easting,northing,zone,hemisphere='N'){
  const a=6378137,eccSquared=.00669438,k0=.9996,eccPrimeSquared=eccSquared/(1-eccSquared),x=easting-500000;let y=northing;if(hemisphere==='S')y-=10000000;
  const longOrigin=(zone-1)*6-180+3,M=y/k0,mu=M/(a*(1-eccSquared/4-3*eccSquared**2/64-5*eccSquared**3/256)),e1=(1-Math.sqrt(1-eccSquared))/(1+Math.sqrt(1-eccSquared));
  const phi1Rad=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu),sin=Math.sin(phi1Rad),cos=Math.cos(phi1Rad),tan=Math.tan(phi1Rad),N1=a/Math.sqrt(1-eccSquared*sin*sin),T1=tan*tan,C1=eccPrimeSquared*cos*cos,R1=a*(1-eccSquared)/(1-eccSquared*sin*sin)**1.5,D=x/(N1*k0);
  const lat=phi1Rad-(N1*tan/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*eccPrimeSquared)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*eccPrimeSquared-3*C1*C1)*D**6/720);
  const lon=(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*eccPrimeSquared+24*T1*T1)*D**5/120)/cos;
  return {lat:THREE.MathUtils.radToDeg(lat),lon:longOrigin+THREE.MathUtils.radToDeg(lon)};
}
function selectedCrs(){if($('#projectCrs').value==='EPSG:3123')return{code:'EPSG:3123',label:'PRS92 Zone 3',epsg:3123};const zone=Math.round(+$('#utmZone').value),hemisphere=$('#utmHemisphere').value;return{code:`+proj=utm +zone=${zone} ${hemisphere==='S'?'+south ':''}+datum=WGS84 +units=m +no_defs`,label:`UTM ${zone}${hemisphere}`,epsg:(hemisphere==='S'?32700:32600)+zone}}
function projectToLatLon(easting,northing){const crs=selectedCrs();if(crs.code==='EPSG:3123'){const [lon,lat]=proj4(crs.code,'EPSG:4326',[easting,northing]);return{lat,lon}}const zone=Math.round(+$('#utmZone').value),hemisphere=$('#utmHemisphere').value;return utmToLatLon(easting,northing,zone,hemisphere)}
function latLonToLocal(lat,lon){const [x,y]=proj4('EPSG:4326',selectedCrs().code,[lon,lat]);return new THREE.Vector2(x-state.origin.x,y-state.origin.y)}
$('#projectCrs').addEventListener('change',e=>{const utm=e.target.value==='UTM';$('#utmSettings').hidden=!utm;if(backgroundGroup.children.length||imageryGroup.children.length||terrainGroup.children.length){clearBackground();clearImagery();clearTerrain()}toast(`เปลี่ยนระบบพิกัดเป็น ${utm?'WGS84 / UTM':'PRS92 Zone 3 (EPSG:3123)'} · กรุณาโหลดพื้นหลังใหม่`)});
function clearTerrain(){terrainGroup.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});terrainGroup.clear();terrainData=null;$('#demStatus').textContent='ยังไม่ได้โหลด DEM';invalidate()}
function validElevation(value,noData){return Number.isFinite(value)&&(noData==null||value!==noData)&&Math.abs(value)<1e7}
function terrainHeightAt(x,y){
  if(!terrainData)return null;const {bounds,width,height,values,noData}=terrainData;if(x<bounds.minX||x>bounds.maxX||y<bounds.minY||y>bounds.maxY)return null;
  const fx=(x-bounds.minX)/(bounds.maxX-bounds.minX)*(width-1),fy=(bounds.maxY-y)/(bounds.maxY-bounds.minY)*(height-1),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(x0+1,width-1),y1=Math.min(y0+1,height-1),tx=fx-x0,ty=fy-y0,v00=values[y0*width+x0],v10=values[y0*width+x1],v01=values[y1*width+x0],v11=values[y1*width+x1];if(![v00,v10,v01,v11].every(v=>validElevation(v,noData)))return null;return THREE.MathUtils.lerp(THREE.MathUtils.lerp(v00,v10,tx),THREE.MathUtils.lerp(v01,v11,tx),ty)-state.origin.z;
}
function makeTerrainGeometry(bounds,width,height,values,noData){const positions=new Float32Array(width*height*3),indices=[];for(let row=0;row<height;row++)for(let col=0;col<width;col++){const i=row*width+col,x=THREE.MathUtils.lerp(bounds.minX,bounds.maxX,col/(width-1)),y=THREE.MathUtils.lerp(bounds.maxY,bounds.minY,row/(height-1)),z=validElevation(values[i],noData)?values[i]-state.origin.z:0;positions.set([x,y,z],i*3)}for(let row=0;row<height-1;row++)for(let col=0;col<width-1;col++){const a=row*width+col,b=a+1,c=a+width,d=c+1;if([values[a],values[b],values[c]].every(v=>validElevation(v,noData)))indices.push(a,c,b);if([values[b],values[c],values[d]].every(v=>validElevation(v,noData)))indices.push(b,c,d)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry}
async function loadDem(file){
  const {fromArrayBuffer}=await import('geotiff'),tiff=await fromArrayBuffer(await file.arrayBuffer()),image=await tiff.getImage(),sourceWidth=image.getWidth(),sourceHeight=image.getHeight(),size=Math.min(256,Math.max(32,Math.round(Math.sqrt(Math.min(sourceWidth*sourceHeight,256*256))))),scale=Math.min(1,size/Math.max(sourceWidth,sourceHeight)),width=Math.max(2,Math.round(sourceWidth*scale)),height=Math.max(2,Math.round(sourceHeight*scale)),rasters=await image.readRasters({samples:[0],width,height,resampleMethod:'bilinear'}),values=rasters[0],bbox=image.getBoundingBox(),geoKeys=image.getGeoKeys(),projected=!!geoKeys.ProjectedCSTypeGeoKey||Math.max(...bbox.map(Math.abs))>1000;let bounds;
  const crs=selectedCrs(),epsg=Number(geoKeys.ProjectedCSTypeGeoKey);if(projected&&Number.isFinite(epsg)&&epsg!==32767&&epsg!==crs.epsg)throw new Error(`DEM EPSG:${epsg} ไม่ตรงกับ ${crs.label} (EPSG:${crs.epsg})`);
  if(projected)bounds={minX:bbox[0]-state.origin.x,minY:bbox[1]-state.origin.y,maxX:bbox[2]-state.origin.x,maxY:bbox[3]-state.origin.y};else{const sw=latLonToLocal(bbox[1],bbox[0]),ne=latLonToLocal(bbox[3],bbox[2]);bounds={minX:sw.x,minY:sw.y,maxX:ne.x,maxY:ne.y}}
  if(!(bounds.maxX>bounds.minX&&bounds.maxY>bounds.minY))throw new Error('ขอบเขตพิกัด GeoTIFF ไม่ถูกต้อง');const noDataRaw=image.getGDALNoData(),parsedNoData=noDataRaw==null?null:Number(noDataRaw),noData=Number.isFinite(parsedNoData)?parsedNoData:null,geometry=makeTerrainGeometry(bounds,width,height,values,noData),material=new THREE.MeshStandardMaterial({color:0x49655c,roughness:1,metalness:0,side:THREE.DoubleSide,transparent:true,opacity:.9}),mesh=new THREE.Mesh(geometry,material),hadImagery=imageryGroup.children.length>0;mesh.userData.contextOnly=true;clearTerrain();if(hadImagery)clearImagery();terrainData={bounds,width,height,values,noData,fileName:file.name};terrainGroup.add(mesh);terrainGroup.visible=true;$('#terrainVisible').checked=true;$('#demStatus').textContent=`${file.name} · ${width}×${height} mesh`;if(!state.layers.length&&geometry.boundingBox)fitBox(geometry.boundingBox);toast(`สร้าง Terrain จาก ${file.name} สำเร็จ · ${width*height} vertices${hadImagery?' · กรุณาโหลดภาพดาวเทียมใหม่':''}`);invalidate();
}
$('#demInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;$('#loading').hidden=false;try{await loadDem(file)}catch(error){console.error(error);toast(`${file.name}: ${error.message||'อ่าน DEM ไม่สำเร็จ'}`,true)}finally{$('#loading').hidden=true;e.target.value=''}});$('#terrainVisible').addEventListener('change',e=>{terrainGroup.visible=e.target.checked;invalidate()});
function tileXY(lat,lon,zoom){const n=2**zoom,x=Math.floor((lon+180)/360*n),latRad=THREE.MathUtils.degToRad(Math.max(-85.0511,Math.min(85.0511,lat))),y=Math.floor((1-Math.asinh(Math.tan(latRad))/Math.PI)/2*n);return{x,y}}
function tileBounds(x,y,zoom){const n=2**zoom,lon1=x/n*360-180,lon2=(x+1)/n*360-180,lat1=THREE.MathUtils.radToDeg(Math.atan(Math.sinh(Math.PI*(1-2*y/n)))),lat2=THREE.MathUtils.radToDeg(Math.atan(Math.sinh(Math.PI*(1-2*(y+1)/n))));return{west:lon1,east:lon2,north:lat1,south:lat2}}
function imageryTileGeometry(sw,ne){const segments=terrainData?24:1,geometry=new THREE.PlaneGeometry(ne.x-sw.x,ne.y-sw.y,segments,segments),position=geometry.attributes.position,cx=(sw.x+ne.x)/2,cy=(sw.y+ne.y)/2;for(let i=0;i<position.count;i++){const x=cx+position.getX(i),y=cy+position.getY(i),z=terrainHeightAt(x,y);position.setZ(i,z==null?-.12:z+.04)}position.needsUpdate=true;geometry.computeVertexNormals();return geometry}
function clearImagery(){imageryGroup.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose();m.dispose()})});imageryGroup.clear();invalidate()}
async function loadEsriImagery(){
  const radius=+$('#osmRadius').value,zoom=+$('#imageryZoom').value,center=projectToLatLon(state.origin.x,state.origin.y);if(!Number.isFinite(center.lat)||Math.abs(center.lat)>85){toast('Local Origin หรือระบบพิกัดไม่ถูกต้อง',true);return}
  const latRadius=THREE.MathUtils.radToDeg(radius/6378137),lonRadius=latRadius/Math.max(Math.cos(THREE.MathUtils.degToRad(center.lat)),.1),nw=tileXY(center.lat+latRadius,center.lon-lonRadius,zoom),se=tileXY(center.lat-latRadius,center.lon+lonRadius,zoom),tiles=[];for(let y=nw.y;y<=se.y;y++)for(let x=nw.x;x<=se.x;x++)tiles.push({x,y});if(tiles.length>64){toast('พื้นที่และความละเอียดสร้าง Tile มากเกินไป กรุณาลดรัศมีหรือความละเอียด',true);return}
  $('#loadImagery').disabled=true;$('#loadImagery').textContent=`กำลังโหลด ${tiles.length} tiles…`;const next=new THREE.Group(),loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');let loaded=0;
  try {for(const tile of tiles){try{const texture=await loader.loadAsync(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y}/${tile.x}`);texture.colorSpace=THREE.SRGBColorSpace;const b=tileBounds(tile.x,tile.y,zoom),sw=latLonToLocal(b.south,b.west,center),ne=latLonToLocal(b.north,b.east,center),geometry=imageryTileGeometry(sw,ne),material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,opacity:.92,depthWrite:false}),mesh=new THREE.Mesh(geometry,material);mesh.position.set((sw.x+ne.x)/2,(sw.y+ne.y)/2,0);mesh.renderOrder=-5;mesh.userData.contextOnly=true;next.add(mesh);loaded++}catch(error){console.warn('Imagery tile failed',tile,error)}}if(!loaded)throw new Error('ไม่สามารถอ่าน Tile ภาพดาวเทียมได้');clearImagery();while(next.children.length)imageryGroup.add(next.children[0]);imageryGroup.visible=true;$('#imageryVisible').checked=true;toast(`โหลด Esri World Imagery สำเร็จ · ${loaded}/${tiles.length} tiles${terrainData?' · draped on DEM':''}`);invalidate()}catch(error){next.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose()});console.error(error);toast(`โหลดภาพดาวเทียมไม่สำเร็จ: ${error.message}`,true)}finally{$('#loadImagery').disabled=false;$('#loadImagery').textContent='โหลดภาพดาวเทียม Esri'}
}
$('#loadImagery').addEventListener('click',loadEsriImagery);$('#imageryVisible').addEventListener('change',e=>{imageryGroup.visible=e.target.checked;invalidate()});
function clearBackground(){backgroundGroup.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});backgroundGroup.clear();invalidate()}
function osmColor(tags){const value=tags['building:colour']||tags['building:color'];if(value&&CSS.supports('color',value))return new THREE.Color(value);const material=tags['building:material'];return new THREE.Color(material==='glass'?0x6096a5:material==='brick'?0x9a6656:material==='concrete'?0x87918e:0x82918d)}
function osmHeight(tags){const tagged=parseFloat(tags.height);if(Number.isFinite(tagged))return Math.max(2,Math.min(tagged,300));const levels=parseFloat(tags['building:levels']);return Number.isFinite(levels)?Math.max(3,Math.min(levels*3,300)):7}
function addOsmBuilding(element,center){const nodes=element.geometry;if(!nodes?.length)return;const points=nodes.map(n=>latLonToLocal(n.lat,n.lon,center));if(points.length>2&&points[0].distanceTo(points.at(-1))<.01)points.pop();if(points.length<3)return;const shape=new THREE.Shape(points),height=osmHeight(element.tags||{}),geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1}),material=new THREE.MeshStandardMaterial({color:osmColor(element.tags||{}),roughness:.92,metalness:0,transparent:true,opacity:.82});const mesh=new THREE.Mesh(geometry,material);mesh.position.z=.05;backgroundGroup.add(mesh)}
function addOsmRoad(element,center){const nodes=element.geometry;if(!nodes?.length)return;const points=nodes.map(n=>{const p=latLonToLocal(n.lat,n.lon,center);return new THREE.Vector3(p.x,p.y,.08)});if(points.length<2)return;const geometry=new THREE.BufferGeometry().setFromPoints(points),material=new THREE.LineBasicMaterial({color:0x65716e,transparent:true,opacity:.75});backgroundGroup.add(new THREE.Line(geometry,material))}
async function loadOsmBackground(){
  const radius=+$('#osmRadius').value,center=projectToLatLon(state.origin.x,state.origin.y);if(!Number.isFinite(center.lat)||Math.abs(center.lat)>85){toast('Local Origin หรือระบบพิกัดไม่ถูกต้อง',true);return}
  $('#loadBackground').disabled=true;$('#loadBackground').textContent='กำลังโหลด…';
  try {const query=`[out:json][timeout:25];(way[building](around:${radius},${center.lat},${center.lon});way[highway](around:${radius},${center.lat},${center.lon}););out geom;`,response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:`data=${encodeURIComponent(query)}`});if(!response.ok)throw new Error(`Overpass HTTP ${response.status}`);const data=await response.json();clearBackground();const ground=new THREE.Mesh(new THREE.CircleGeometry(radius,64),new THREE.MeshStandardMaterial({color:0x172723,roughness:1,transparent:true,opacity:.78,side:THREE.DoubleSide}));ground.position.z=-.05;backgroundGroup.add(ground);let buildings=0,roads=0;for(const element of data.elements||[]){if(element.tags?.building){addOsmBuilding(element,center);buildings++}else if(element.tags?.highway){addOsmRoad(element,center);roads++}}backgroundGroup.visible=true;$('#backgroundVisible').checked=true;if(!buildings&&!roads)toast(`ไม่พบข้อมูล OSM บริเวณนี้ · ตรวจ ${selectedCrs().label} และ Local Origin`,true);else toast(`โหลดพื้นหลัง OSM สำเร็จ · อาคาร ${buildings} · ถนน ${roads}`);invalidate()}catch(error){console.error(error);toast(`โหลดพื้นหลังไม่สำเร็จ: ${error.message}`,true)}finally{$('#loadBackground').disabled=false;$('#loadBackground').textContent='โหลดพื้นหลัง 3D'}
}
$('#loadBackground').addEventListener('click',loadOsmBackground);$('#backgroundVisible').addEventListener('change',e=>{backgroundGroup.visible=e.target.checked;invalidate()});

async function importFiles(files){
  if(!files.length) return; $('#loading').hidden=false;
  for(const file of files){
    try { const ext=extOf(file.name); let result;
      if(['las','laz'].includes(ext)) result=await loadLas(file);
      else if(ext==='ply') result=await loadPly(file);
      else if(['glb','gltf','obj','stl'].includes(ext)) result=await loadMesh(file,ext);
      else if(ext==='dxf') result=await loadDxf(file);
      else if(['tif','tiff'].includes(ext)){await loadDem(file);continue}
      else throw new Error(`ยังไม่รองรับ .${ext}`);
      addLayer(file.name,result);
    } catch(err){ console.error(err); toast(`${file.name}: ${err.message||'อ่านไฟล์ไม่สำเร็จ'}`,true); }
  }
  $('#loading').hidden=true; fileInput.value='';
}

function positionsFromLoaderAttribute(attr){ return attr?.value || attr; }
function rgb3(source,count){
  if(!source)return null; const stride=source.length/count>=4?4:3,out=new Uint8Array(count*3);
  for(let i=0;i<count;i++){for(let c=0;c<3;c++){const v=source[i*stride+c]??255;out[i*3+c]=source instanceof Float32Array||source instanceof Float64Array?Math.round(Math.min(1,v)*255):v}}
  return out;
}
function elevationColors(pos,box){
  const n=pos.length/3,out=new Uint8Array(n*3),span=Math.max(box.max.z-box.min.z,1e-9);
  for(let i=0;i<n;i++){const t=Math.max(0,Math.min(1,(pos[i*3+2]-box.min.z)/span));let r,g,b;if(t<.25){r=20;g=80+t*4*500;b=230}else if(t<.5){r=20;g=205;b=230-(t-.25)*4*190}else if(t<.75){r=(t-.5)*4*235+20;g=205;b=40}else{r=255;g=205-(t-.75)*4*180;b=35}out.set([r,g,b],i*3)}return out;
}
const classPalette={0:[155,165,165],1:[190,190,190],2:[151,104,70],3:[133,190,90],4:[70,170,70],5:[20,125,45],6:[220,80,65],7:[210,80,210],8:[245,210,75],9:[45,130,220],10:[125,95,65],11:[245,130,35],12:[150,150,150],13:[235,80,140],14:[80,210,210],15:[150,100,210],16:[230,190,60],17:[70,70,210],18:[230,55,55]};
function classificationColors(values,count){if(!values)return null;const out=new Uint8Array(count*3);for(let i=0;i<count;i++)out.set(classPalette[values[i]&31]||[175,175,175],i*3);return out}
async function readLasPointCount(file){
  const header=await file.slice(0,375).arrayBuffer(); const view=new DataView(header);
  if(header.byteLength<111 || String.fromCharCode(...new Uint8Array(header,0,4))!=='LASF') return 0;
  const legacy=view.getUint32(107,true); const minor=view.getUint8(25);
  if(minor>=4 && header.byteLength>=255 && typeof view.getBigUint64==='function'){
    const extended=Number(view.getBigUint64(247,true)); if(extended>0) return extended;
  }
  return legacy;
}
async function loadLas(file){
  const total=await readLasPointCount(file); const budget=Number($('#pointBudget').value)||1000000;
  const skip=Math.max(1,Math.ceil(total/budget));
  const data=await load(file, LASLoader, {worker:true,las:{skip}});
  const attrs=data.attributes || data.loaderData?.attributes || {};
  const pos=positionsFromLoaderAttribute(attrs.POSITION || attrs.position);
  if(!pos) throw new Error('ไม่พบข้อมูลตำแหน่งใน LAS/LAZ');
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geometry.computeBoundingBox();
  const count=pos.length/3,sourceColors=positionsFromLoaderAttribute(attrs.COLOR_0 || attrs.color),classes=positionsFromLoaderAttribute(attrs.classification || attrs.CLASSIFICATION);
  const colorSets={rgb:rgb3(sourceColors,count),elevation:elevationColors(pos,geometry.boundingBox),classification:classificationColors(classes,count)};
  const initial=colorSets.rgb||colorSets.elevation; geometry.setAttribute('color',new THREE.BufferAttribute(initial,3,true)); geometry.userData.colorSets=colorSets;
  const material=new THREE.PointsMaterial({size:1.2,sizeAttenuation:false,color:0xffffff,vertexColors:true});
  return { object:new THREE.Points(geometry,material), type:'point', count:pos.length/3, totalCount:total||pos.length/3, skip };
}
async function readPlyHeader(file){const text=new TextDecoder().decode(await file.slice(0,16384).arrayBuffer()),end=text.indexOf('end_header');if(end<0)throw new Error('ไม่พบ end_header ในไฟล์ PLY');const header=text.slice(0,end),vertex=header.match(/element\s+vertex\s+(\d+)/i),face=header.match(/element\s+face\s+(\d+)/i),texture=header.match(/comment\s+TextureFile\s+(.+)/i);return {vertexCount:Number(vertex?.[1]||0),faceCount:Number(face?.[1]||0),textureName:texture?.[1]?.trim()||''}}
async function loadPly(file){
  const info=await readPlyHeader(file),geometry=new PLYLoader().parse(await file.arrayBuffer()); geometry.computeBoundingBox();
  const isMesh=info.faceCount>0||!!geometry.index||!!geometry.attributes.normal;
  if(!isMesh){const pos=geometry.attributes.position.array,count=geometry.attributes.position.count,source=geometry.attributes.color?.array;geometry.computeBoundingBox();geometry.userData.colorSets={rgb:rgb3(source,count),elevation:elevationColors(pos,geometry.boundingBox),classification:null};if(geometry.userData.colorSets.rgb)geometry.setAttribute('color',new THREE.BufferAttribute(geometry.userData.colorSets.rgb,3,true));else geometry.setAttribute('color',new THREE.BufferAttribute(geometry.userData.colorSets.elevation,3,true))}
  const hasColors=!!geometry.attributes.color,hasNormals=!!geometry.attributes.normal;
  const material=isMesh?(hasNormals?new THREE.MeshStandardMaterial({color:hasColors?0xffffff:colorFor('mesh'),vertexColors:hasColors,roughness:.75,metalness:.08,side:THREE.DoubleSide}):new THREE.MeshBasicMaterial({color:hasColors?0xffffff:colorFor('mesh'),vertexColors:hasColors,side:THREE.DoubleSide})):new THREE.PointsMaterial({size:1.2,sizeAttenuation:false,color:0xffffff,vertexColors:true});
  return {object:isMesh?new THREE.Mesh(geometry,material):new THREE.Points(geometry,material),type:isMesh?'mesh':'point',count:isMesh?(info.faceCount||geometry.attributes.position.count/3):geometry.attributes.position.count,totalCount:info.vertexCount||geometry.attributes.position.count,textureName:info.textureName};
}
async function loadMesh(file,ext){
  let object;
  if(ext==='glb'||ext==='gltf'){
    const url=URL.createObjectURL(file);
    try {
      const gltfScene=(await new GLTFLoader().loadAsync(url)).scene;
      // glTF is Y-up. Survey layers in this viewer use X=E, Y=N, Z=elevation,
      // so rotate the complete scene to map (X,Y,Z) -> (X,-Z,Y).
      object=new THREE.Group();
      object.name=gltfScene.name||'glTF survey model';
      object.rotation.x=Math.PI/2;
      object.add(gltfScene);
      object.updateMatrixWorld(true);
      object.userData.axisConversion='glTF Y-up → Survey Z-up';
    } finally { URL.revokeObjectURL(url); }
  }
  else if(ext==='obj') object=new OBJLoader().parse(await file.text());
  else { const geometry=new STLLoader().parse(await file.arrayBuffer()); geometry.computeVertexNormals(); object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:colorFor('mesh'),roughness:.72,metalness:.06})); }
  let count=0; object.traverse(o=>{ if(o.isMesh){ count+=o.geometry.attributes.position?.count||0; o.material=o.material?.clone?.()||new THREE.MeshStandardMaterial({color:colorFor('mesh')}); } });
  return {object,type:'mesh',count,importNote:object.userData.axisConversion||''};
}
function normalizeDxfText(source){
  if(source.startsWith('AutoCAD Binary DXF')) throw new Error('ไฟล์นี้เป็น Binary DXF กรุณา Save As เป็น ASCII DXF ก่อนนำเข้า');
  const raw=source.replace(/^\uFEFF/,'').replace(/\0/g,'').split(/\r\n|\r|\n/);
  while(raw.length&&raw.at(-1).trim()==='')raw.pop();
  const repairs=[];if(raw.length%2){raw.pop();repairs.push('ตัด group code ที่ไม่มีค่า')}
  const groups=[];for(let i=0;i+1<raw.length;i+=2)groups.push({code:raw[i].trim(),value:raw[i+1].trim(),rawCode:raw[i],rawValue:raw[i+1]});
  const eofIndex=groups.findIndex(g=>g.code==='0'&&g.value.toUpperCase()==='EOF');if(eofIndex>=0&&eofIndex<groups.length-1){groups.splice(eofIndex+1);repairs.push('ตัดข้อมูลหลัง EOF')}
  let sectionDepth=0;for(const g of groups){if(g.code==='0'&&g.value.toUpperCase()==='SECTION')sectionDepth++;else if(g.code==='0'&&g.value.toUpperCase()==='ENDSEC')sectionDepth=Math.max(0,sectionDepth-1)}
  const hasEof=groups.some(g=>g.code==='0'&&g.value.toUpperCase()==='EOF');if(hasEof)groups.splice(groups.findIndex(g=>g.code==='0'&&g.value.toUpperCase()==='EOF'),1);
  while(sectionDepth-->0){groups.push({rawCode:'0',rawValue:'ENDSEC'});repairs.push('เติม ENDSEC')}
  groups.push({rawCode:'0',rawValue:'EOF'});if(!hasEof)repairs.push('เติม EOF');
  return {text:groups.flatMap(g=>[g.rawCode,g.rawValue]).join('\n')+'\n',repairs};
}
function quantile(sorted,q){const p=(sorted.length-1)*q,i=Math.floor(p),f=p-i;return sorted[i]+(sorted[Math.min(i+1,sorted.length-1)]-sorted[i])*f}
function computeDxfFocusBox(group){
  const fullBox=new THREE.Box3().setFromObject(group),xs=[],ys=[],zs=[];group.traverse(o=>{const a=o.geometry?.attributes?.position?.array;if(!a)return;const count=a.length/3,step=Math.max(1,Math.ceil(count/5000));for(let i=0;i<count;i+=step){xs.push(a[i*3]);ys.push(a[i*3+1]);zs.push(a[i*3+2])}});
  if(xs.length<50)return {box:fullBox,trimmed:false};xs.sort((a,b)=>a-b);ys.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);
  const robust=new THREE.Box3(new THREE.Vector3(quantile(xs,.05),quantile(ys,.05),quantile(zs,.05)),new THREE.Vector3(quantile(xs,.95),quantile(ys,.95),quantile(zs,.95))),fullSize=fullBox.getSize(new THREE.Vector3()),robustSize=robust.getSize(new THREE.Vector3()),fullSpan=Math.max(fullSize.x,fullSize.y,fullSize.z),robustSpan=Math.max(robustSize.x,robustSize.y,robustSize.z);
  return robustSpan>0&&fullSpan>robustSpan*8?{box:robust,trimmed:true}:{box:fullBox,trimmed:false};
}
async function loadDxf(file){
  const normalized=normalizeDxfText(await file.text());let dxf;
  try{dxf=new DxfParser().parseSync(normalized.text)}catch(error){throw new Error(`โครงสร้าง DXF ไม่สมบูรณ์หลังซ่อมอัตโนมัติ: ${error.message}`)}
  const group=new THREE.Group(),cadLayers=new Map();let count=0;
  const v3=v=>new THREE.Vector3(v.x||0,v.y||0,v.z||0);
  function addEntity(object,entity){const layerName=entity.layer||'0';let layerGroup=cadLayers.get(layerName);if(!layerGroup){layerGroup=new THREE.Group();layerGroup.name=layerName;layerGroup.userData={dxfLayer:true,layerName,color:'#ff6b5d',entityCount:0};cadLayers.set(layerName,layerGroup);group.add(layerGroup)}object.userData={dxfEntity:true,type:entity.type,layer:layerName,handle:entity.handle||'—',baseColor:'#ff6b5d'};layerGroup.userData.entityCount++;layerGroup.add(object);count++}
  for(const e of dxf.entities||[]){
    const verts=e.vertices||[];
    if(['LINE','LWPOLYLINE','POLYLINE'].includes(e.type) && verts.length){
      const pts=verts.map(v3); if((e.shape||e.closed) && pts.length>2) pts.push(pts[0].clone());
      addEntity(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:colorFor('dxf')})),e);
    } else if(e.type==='CIRCLE'||e.type==='ARC'){
      const start=e.type==='CIRCLE'?0:(e.startAngle||0); const end=e.type==='CIRCLE'?Math.PI*2:(e.endAngle||Math.PI*2);
      const curve=new THREE.EllipseCurve(e.center.x,e.center.y,e.radius,e.radius,start,end,false,0); const pts=curve.getPoints(64).map(p=>new THREE.Vector3(p.x,p.y,e.center.z||0));addEntity(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:colorFor('dxf')})),e);
    } else if(e.type==='POINT' && e.position){addEntity(new THREE.Points(new THREE.BufferGeometry().setFromPoints([v3(e.position)]),new THREE.PointsMaterial({color:colorFor('dxf'),size:4,sizeAttenuation:false})),e);}
    else if(e.type==='3DFACE' && verts.length>=3){ const pts=verts.map(v3);pts.push(pts[0].clone());addEntity(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:colorFor('dxf')})),e);}
  }
  if(!count) throw new Error('DXF นี้ไม่มี LINE / POLYLINE / CIRCLE / ARC / POINT ที่แสดงผลได้');
  group.userData.cadLayers=[...cadLayers.values()];
  const focus=computeDxfFocusBox(group);
  return {object:group,type:'dxf',count,focusBox:focus.box,focusTrimmed:focus.trimmed,repairNote:normalized.repairs.length?normalized.repairs.join(', '):''};
}

function worldBox(object, renderOffset=new THREE.Vector3()){ const box=new THREE.Box3().setFromObject(object); return box.translate(renderOffset.clone().multiplyScalar(-1)); }
function addLayer(name,result){
  const rawBox=new THREE.Box3().setFromObject(result.object);
  const previousBox=new THREE.Box3();state.layers.forEach(l=>previousBox.union(l.sourceBox));
  const focusBox=result.focusBox?.clone()||rawBox.clone();
  if(state.layers.length===0 && focusBox.isEmpty()===false){ const c=focusBox.getCenter(new THREE.Vector3()); state.origin.set(c.x,c.y,focusBox.min.z); syncOriginFields(); }
  const sets=result.object.geometry?.userData?.colorSets; const initialMode=sets?.rgb?'rgb':'elevation';
  const layer={id:state.nextId++,name,type:result.type,object:result.object,count:result.count,totalCount:result.totalCount||result.count,skip:result.skip||1,elevation:0,colorMode:initialMode,sourceBox:rawBox.clone(),focusBox,focusTrimmed:!!result.focusTrimmed};
  scene.add(layer.object); state.layers.push(layer); updateLayerTransform(layer); renderLayers(); selectLayer(layer.id); $('#welcome').hidden=true;
  if(state.layers.length===1)fitLayer(layer);else analyzeCoordinateAlignment(layer,previousBox);
  invalidate();const notes=[];if(result.repairNote)notes.push(`ซ่อมอัตโนมัติ: ${result.repairNote}`);if(result.importNote)notes.push(`แปลงแกน: ${result.importNote}`);if(result.focusTrimmed)notes.push('โฟกัสเฉพาะขอบเขตงานหลัก (พบ outlier)');if(result.textureName)notes.push(`แสดงพื้นผิวด้วย Vertex Color · Texture: ${result.textureName}`);toast(`นำเข้า ${name} สำเร็จ${notes.length?' · '+notes.join(' · '):''}`);
}
function updateLayerTransform(layer){ layer.object.position.set(-state.origin.x,-state.origin.y,-state.origin.z+(layer.type==='dxf'?layer.elevation:0));invalidate(); }
function renderLayers(){
  const root=$('#layers'); if(!state.layers.length){ root.innerHTML='<div class="empty-layer"><span>◇</span><p>ยังไม่มีชั้นข้อมูล</p><small>นำเข้า Point Cloud, Mesh หรือ DXF เพื่อเริ่มต้น</small></div>'; return; }
  root.innerHTML=state.layers.map(l=>`<div class="layer ${l.id===state.selectedId?'selected':''}" data-id="${l.id}"><span class="layer-icon ${l.type}">${l.type==='point'?'⁙':l.type==='mesh'?'◆':'⌁'}</span><span class="layer-copy"><b>${escapeHtml(l.name)}</b><small>${l.type==='point'?'POINT CLOUD':l.type==='mesh'?'MESH MODEL':'DXF DRAWING'}${l.type==='dxf'?` · Z ${fmt(l.elevation)}`:''}</small></span><span class="layer-actions"><button data-focus="${l.id}" title="ซูมไปชั้นนี้">⌖</button><button data-delete="${l.id}" title="ลบชั้นข้อมูล">×</button></span></div>`).join('');
  root.querySelectorAll('.layer').forEach(el=>el.addEventListener('click',()=>selectLayer(+el.dataset.id)));
  root.querySelectorAll('[data-focus]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();const l=state.layers.find(x=>x.id===+el.dataset.focus);if(l){selectLayer(l.id);fitLayer(l)}}));
  root.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();removeLayerById(+el.dataset.delete)}));
}
function escapeHtml(v){ const d=document.createElement('div');d.textContent=v;return d.innerHTML; }
function selected(){ return state.layers.find(l=>l.id===state.selectedId); }
function selectLayer(id){ state.selectedId=id; const l=selected(); renderLayers(); $('#noSelection').hidden=!!l; $('#propertyPanel').hidden=!l; if(!l)return;
  $('#selectedType').textContent=l.type.toUpperCase(); $('#selectedName').textContent=l.name; $('#layerName').value=l.name; $('#elevationGroup').hidden=l.type!=='dxf'; $('#dxfDetail').hidden=l.type!=='dxf'; $('#pointSizeRow').hidden=l.type!=='point'; $('#colorModeRow').hidden=l.type!=='point'; $('#colorLegend').hidden=l.type!=='point'; $('#elevation').value=l.elevation; $('#elevationRange').value=Math.max(-50,Math.min(50,l.elevation)); $('#visibleToggle').checked=l.object.visible; $('#elementCount').textContent=l.skip>1?`${l.count.toLocaleString()} / ${l.totalCount.toLocaleString()}`:l.count.toLocaleString();
  $('#focusInfo').hidden=!l.focusTrimmed;$('#zBounds').textContent=`${fmt(l.sourceBox.min.z+(l.type==='dxf'?l.elevation:0))} — ${fmt(l.sourceBox.max.z+(l.type==='dxf'?l.elevation:0))} m`; const mat=firstMaterial(l.object); const opacity=mat?.opacity??1; $('#opacity').value=opacity; $('#opacityValue').textContent=`${Math.round(opacity*100)}%`; if(l.type==='point'){ $('#pointSize').value=mat.size;$('#pointSizeValue').textContent=`${mat.size.toFixed(1)} px`;$('#colorMode').value=l.colorMode;renderColorLegend(l.colorMode); }
  if(l.type==='dxf')renderDxfDetails(l);
}
function renderDxfDetails(layer){const groups=layer.object.userData.cadLayers||[];if(groups[0])$('#dxfColor').value=groups[0].userData.color||'#ff6b5d';$('#dxfLayerList').innerHTML=groups.map((g,i)=>`<div class="dxf-layer-row"><button data-dxf-visible="${i}" class="dxf-eye ${g.visible?'on':''}">${g.visible?'●':'○'}</button><button data-dxf-focus="${i}" class="dxf-layer-name"><b>${escapeHtml(g.name)}</b><span>${g.userData.entityCount} entities</span></button><input data-dxf-color="${i}" type="color" value="${g.userData.color||'#ff6b5d'}"></div>`).join('');$('#dxfLayerList').querySelectorAll('[data-dxf-visible]').forEach(b=>b.addEventListener('click',()=>{const g=groups[+b.dataset.dxfVisible];g.visible=!g.visible;renderDxfDetails(layer);invalidate()}));$('#dxfLayerList').querySelectorAll('[data-dxf-focus]').forEach(b=>b.addEventListener('click',()=>fitBox(new THREE.Box3().setFromObject(groups[+b.dataset.dxfFocus]))));$('#dxfLayerList').querySelectorAll('[data-dxf-color]').forEach(input=>input.addEventListener('input',()=>setDxfGroupColor(groups[+input.dataset.dxfColor],input.value)));}
function setDxfGroupColor(group,color){group.userData.color=color;group.traverse(o=>{if(o.userData?.dxfEntity){o.userData.baseColor=color;o.material.color.set(o===state.selectedEntity?'#fff06a':color)}});invalidate()}
function setDxfFileColor(layer,color){(layer.object.userData.cadLayers||[]).forEach(g=>setDxfGroupColor(g,color));renderDxfDetails(layer)}
function renderColorLegend(mode){const el=$('#colorLegend');if(mode==='elevation')el.innerHTML='<div class="elevation-ramp"></div><div><span>ต่ำ</span><span>สูง</span></div>';else if(mode==='classification')el.innerHTML='<div class="class-key"><i class="ground"></i>Ground <i class="veg"></i>Vegetation <i class="building"></i>Building <i class="water"></i>Water</div>';else el.innerHTML='<small>RGB จากข้อมูลสีที่บันทึกในไฟล์</small>'}
function setPointColorMode(layer,mode){
  const geometry=layer.object.geometry,sets=geometry?.userData?.colorSets;if(!sets)return;
  if(!sets[mode]){toast(mode==='rgb'?'ไฟล์นี้ไม่มีข้อมูลสี RGB':'ไฟล์นี้ไม่มีข้อมูล Classification',true);$('#colorMode').value=layer.colorMode;return}
  geometry.setAttribute('color',new THREE.BufferAttribute(sets[mode],3,true));geometry.attributes.color.needsUpdate=true;layer.colorMode=mode;renderColorLegend(mode);invalidate();
}
function firstMaterial(obj){ let found; obj.traverse(o=>{if(!found&&o.material) found=Array.isArray(o.material)?o.material[0]:o.material;}); return found; }
function allMaterials(obj,fn){ obj.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(fn)}); }
function setElevation(v){ const l=selected(); if(!l||l.type!=='dxf')return; l.elevation=Number(v)||0; updateLayerTransform(l); $('#elevation').value=l.elevation; $('#elevationRange').value=Math.max(-50,Math.min(50,l.elevation)); renderLayers(); selectLayer(l.id); }
$('#elevation').addEventListener('input',e=>setElevation(e.target.value)); $('#elevationRange').addEventListener('input',e=>setElevation(e.target.value));
document.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>setElevation((selected()?.elevation||0)+Number(b.dataset.nudge)))); $('#resetElevation').addEventListener('click',()=>setElevation(0));
$('#layerName').addEventListener('change',e=>{ const l=selected(); if(l){l.name=e.target.value.trim()||l.name;renderLayers();selectLayer(l.id);} });
$('#visibleToggle').addEventListener('change',e=>{ const l=selected(); if(l){l.object.visible=e.target.checked;renderLayers();invalidate();} });
$('#opacity').addEventListener('input',e=>{const l=selected(); if(!l)return; const v=+e.target.value; allMaterials(l.object,m=>{m.transparent=v<1;m.opacity=v;m.needsUpdate=true}); $('#opacityValue').textContent=`${Math.round(v*100)}%`;invalidate();});
$('#colorMode').addEventListener('change',e=>{const l=selected();if(l?.type==='point')setPointColorMode(l,e.target.value)});
$('#dxfColor').addEventListener('input',e=>{const l=selected();if(l?.type==='dxf')setDxfFileColor(l,e.target.value)});
$('#pointSize').addEventListener('input',e=>{const l=selected(),v=+e.target.value;if(l){allMaterials(l.object,m=>{if(m.isPointsMaterial)m.size=v});$('#pointSizeValue').textContent=`${v.toFixed(1)} px`;invalidate()}});
function removeLayerById(id){const l=state.layers.find(x=>x.id===id);if(!l)return;scene.remove(l.object);dispose(l.object);state.layers=state.layers.filter(x=>x!==l);if(state.selectedId===id){state.selectedId=null;selectLayer(null)}else renderLayers();if(!state.layers.length)$('#welcome').hidden=false;$('#coordinateWarning').hidden=true;invalidate();toast(`ลบ ${l.name} แล้ว`)}
$('#removeLayer').addEventListener('click',()=>{const l=selected();if(l)removeLayerById(l.id)});
function dispose(obj){obj.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())})}
function syncOriginFields(){ $('#originX').value=state.origin.x.toFixed(3);$('#originY').value=state.origin.y.toFixed(3);$('#originZ').value=state.origin.z.toFixed(3); }
$('#applyOrigin').addEventListener('click',()=>{state.origin.set(+$(' #originX'.trim()).value||0,+$('#originY').value||0,+$('#originZ').value||0);state.layers.forEach(updateLayerTransform);if(backgroundGroup.children.length||imageryGroup.children.length||terrainGroup.children.length){clearBackground();clearImagery();clearTerrain();toast('อัปเดต Local Origin แล้ว · กรุณาโหลด DEM และพื้นหลังภูมิศาสตร์ใหม่')}else toast('อัปเดต Local Origin แล้ว');fitAll();});
function fitBox(box){if(box.isEmpty())return;const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),fov=THREE.MathUtils.degToRad(camera.fov),maxDim=Math.max(size.x,size.y,size.z,1),distance=Math.max(maxDim/(2*Math.tan(fov/2))*1.6,10);controls.target.copy(center);controls.cursor.copy(center);camera.position.copy(center).add(new THREE.Vector3(distance*.65,-distance*.65,distance*.55));camera.near=Math.max(distance/1e5,.01);camera.far=Math.max(distance*100,1e4);camera.updateProjectionMatrix();pivotVisual.visible=false;controls.update();invalidate()}
function fitLayer(layer){if(!layer)return;if(layer.focusBox){const box=layer.focusBox.clone().translate(layer.object.position);fitBox(box)}else fitBox(new THREE.Box3().setFromObject(layer.object))}
function fitAll(){if(!state.layers.length)return;const box=new THREE.Box3();state.layers.filter(l=>l.object.visible).forEach(l=>box.expandByObject(l.object));fitBox(box)}
function analyzeCoordinateAlignment(layer,previousBox){
  if(previousBox.isEmpty()||layer.sourceBox.isEmpty())return;const a=previousBox,b=layer.sourceBox,ca=a.getCenter(new THREE.Vector3()),cb=b.getCenter(new THREE.Vector3()),sa=a.getSize(new THREE.Vector3()),sb=b.getSize(new THREE.Vector3());
  const centerDistance=Math.hypot(ca.x-cb.x,ca.y-cb.y),scale=Math.max(sa.length(),sb.length(),1),ratio=Math.max(sa.length(),sb.length(),1)/Math.max(Math.min(sa.length(),sb.length()),.001);
  if(centerDistance>scale*2||ratio>1000){$('#coordinateWarningText').textContent=`ศูนย์กลางห่างกัน ${fmt(centerDistance)} m หรือขนาดต่างกันมาก กรุณาตรวจ CRS และหน่วยของไฟล์`;$('#coordinateWarning').hidden=false;$('#warningFitNew').onclick=()=>fitLayer(layer);$('#warningFitAll').onclick=fitAll}else $('#coordinateWarning').hidden=true;
}
$('#fitView').addEventListener('click',fitAll);document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const t=controls.target.clone();const d=Math.max(camera.position.distanceTo(t),10);camera.position.copy(t).add(b.dataset.view==='top'?new THREE.Vector3(0,0,d):new THREE.Vector3(d*.65,-d*.65,d*.55));camera.lookAt(t);controls.update();}));
$('#fitSelected').addEventListener('click',()=>fitLayer(selected()));$('#warningClose').addEventListener('click',()=>$('#coordinateWarning').hidden=true);
$('#helpBtn').addEventListener('click',()=>toast('ลากซ้าย: หมุน · ลากขวา: เลื่อน · Scroll: ซูมเข้าหาตำแหน่งใต้เมาส์ · โหมดวัด: ปลายลูกศรคือจุดจริง'));
const raycaster=new THREE.Raycaster(), mouse=new THREE.Vector2(), ground=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3();renderer.domElement.addEventListener('pointermove',e=>{const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);if(raycaster.ray.intersectPlane(ground,hit)){ $('#readE').textContent=`E ${fmt(hit.x+state.origin.x)}`;$('#readN').textContent=`N ${fmt(hit.y+state.origin.y)}`;$('#readZ').textContent=`Z ${fmt(state.origin.z)}`;}});

const measureGroup=new THREE.Group(); scene.add(measureGroup); let pointerDown=null;
function eventMouse(e){const r=renderer.domElement.getBoundingClientRect();return new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1)}
function nearestVertex(hit){
  const position=hit.object.geometry?.attributes?.position;if(!position||!hit.object.isMesh)return hit.point.clone();
  const candidates=hit.face?[hit.face.a,hit.face.b,hit.face.c]:[];if(!candidates.length)return hit.point.clone();
  const vertex=new THREE.Vector3(),best=new THREE.Vector3();let bestDistance=Infinity;
  for(const index of candidates){vertex.fromBufferAttribute(position,index).applyMatrix4(hit.object.matrixWorld);const d=vertex.distanceToSquared(hit.point);if(d<bestDistance){bestDistance=d;best.copy(vertex)}}
  return best;
}
function pickModelPoint(e,targetSnap='surface',allowGround=true){
  mouse.copy(eventMouse(e)); raycaster.setFromCamera(mouse,camera);
  const distance=camera.position.distanceTo(controls.target); raycaster.params.Points.threshold=Math.max(distance/1000,0.01); raycaster.params.Line.threshold=Math.max(distance/1200,0.01);
  const targets=state.layers.filter(l=>l.object.visible).map(l=>l.object); const hits=raycaster.intersectObjects(targets,true);
  if(hits.length){const first=hits[0];return {point:targetSnap==='vertex'?nearestVertex(first):first.point.clone(),kind:first.object.isMesh?(targetSnap==='vertex'?'VERTEX':'SURFACE'):first.object.isPoints?'POINT':'LINE'};}
  const point=allowGround?raycaster.ray.intersectPlane(ground,new THREE.Vector3())?.clone():null;return point?{point,kind:'GROUND'}:null;
}
function setNavigationPivot(point){controls.target.copy(point);controls.cursor.copy(point);const size=Math.max(camera.position.distanceTo(point)/120,.08);pivotVisual.position.copy(point);pivotVisual.scale.setScalar(size);pivotVisual.visible=true;controls.update();invalidate();toast(`ตั้งศูนย์ใหม่ E ${fmt(point.x+state.origin.x)} · N ${fmt(point.y+state.origin.y)} · Z ${fmt(point.z+state.origin.z)}`)}
function choosePivotAt(e){const pick=pickModelPoint(e,'surface');if(!pick)return;setNavigationPivot(pick.point);state.pivotMode=false;$('#pivotBtn').classList.remove('active');renderer.domElement.classList.remove('pivoting')}
function clearDxfEntitySelection(){if(state.selectedEntity){state.selectedEntity.material.color.set(state.selectedEntity.userData.baseColor||'#ff6b5d');state.selectedEntity=null}$('#entityInfo').innerHTML='<span>SELECTED ENTITY</span><p>คลิกเส้น DXF บน Viewer เพื่อดูรายละเอียด</p>';invalidate()}
function selectDxfAt(e){mouse.copy(eventMouse(e));raycaster.setFromCamera(mouse,camera);const distance=camera.position.distanceTo(controls.target);raycaster.params.Line.threshold=Math.max(distance/150,.08);raycaster.params.Points.threshold=Math.max(distance/150,.08);const dxfLayers=state.layers.filter(l=>l.type==='dxf'&&l.object.visible);const hit=raycaster.intersectObjects(dxfLayers.map(l=>l.object),true).find(h=>h.object.userData?.dxfEntity);if(!hit){clearDxfEntitySelection();return}clearDxfEntitySelection();const entity=hit.object;state.selectedEntity=entity;entity.material.color.set('#fff06a');const owner=dxfLayers.find(l=>{let o=entity;while(o){if(o===l.object)return true;o=o.parent}return false});if(owner)selectLayer(owner.id);const u=entity.userData;$('#entityInfo').innerHTML=`<span>SELECTED ENTITY</span><div><b>${escapeHtml(u.type)}</b><small>Layer: ${escapeHtml(u.layer)} · Handle: ${escapeHtml(String(u.handle))}</small></div>`;invalidate()}
function clearMeasureGraphics(){measureGroup.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});measureGroup.clear();state.measurePreview=null;state.snapPoint=null}
function clearMeasure(){state.measureStart=null;clearMeasureGraphics();['#deltaX','#deltaY','#deltaZ','#distance2d','#distance3d'].forEach(s=>$(s).textContent='—');$('#measureHint').textContent='เลื่อนเมาส์บนพื้นผิว แล้วคลิกจุดเริ่มต้น';invalidate()}
function marker(point,color){const distance=camera.position.distanceTo(controls.target),length=Math.max(distance/110,.12),headLength=length*.38,headWidth=length*.18,origin=point.clone().add(new THREE.Vector3(0,0,length));const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),origin,length,color,headLength,headWidth);arrow.traverse(o=>{if(o.material){o.material.depthTest=false;o.material.transparent=true;o.material.opacity=.95}o.renderOrder=20});return arrow}
function snapIndicator(point,kind){const distance=camera.position.distanceTo(point),size=Math.max(distance/420,.025),geometry=new THREE.RingGeometry(size*.62,size,20),material=new THREE.MeshBasicMaterial({color:kind==='VERTEX'?0xffd45c:0x58e5c4,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.95});const ring=new THREE.Mesh(geometry,material);ring.position.copy(point);ring.quaternion.copy(camera.quaternion);ring.renderOrder=25;ring.userData.snapIndicator=true;return ring}
function showSnapPreview(pick){if(state.snapPoint){measureGroup.remove(state.snapPoint);state.snapPoint.geometry.dispose();state.snapPoint.material.dispose()}state.snapPoint=snapIndicator(pick.point,pick.kind);measureGroup.add(state.snapPoint);if(!state.measureStart)$('#measureHint').textContent=`${pick.kind} · E ${fmt(pick.point.x+state.origin.x)} · N ${fmt(pick.point.y+state.origin.y)} · Z ${fmt(pick.point.z+state.origin.z)} · คลิกเพื่อเลือก`;invalidate()}
function updateMeasurePreview(rawEnd,kind){if(!state.measureStart)return;if(state.measurePreview){measureGroup.remove(state.measurePreview);state.measurePreview.geometry.dispose();state.measurePreview.material.dispose()}showSnapPreview({point:rawEnd,kind});const end=snappedEnd(state.measureStart,rawEnd),geometry=new THREE.BufferGeometry().setFromPoints([state.measureStart,end]),material=new THREE.LineDashedMaterial({color:0x7ff6dd,dashSize:.35,gapSize:.2,transparent:true,opacity:.75,depthTest:false});state.measurePreview=new THREE.Line(geometry,material);state.measurePreview.computeLineDistances();state.measurePreview.renderOrder=19;measureGroup.add(state.measurePreview);const d=end.clone().sub(state.measureStart);$('#deltaX').textContent=`${fmt(d.x)} m`;$('#deltaY').textContent=`${fmt(d.y)} m`;$('#deltaZ').textContent=`${fmt(d.z)} m`;$('#distance2d').textContent=`${fmt(Math.hypot(d.x,d.y))} m`;$('#distance3d').textContent=`${fmt(d.length())} m`;$('#measureHint').textContent=`${kind} · จุดปลาย E ${fmt(end.x+state.origin.x)} · N ${fmt(end.y+state.origin.y)} · Z ${fmt(end.z+state.origin.z)} · คลิกเพื่อยืนยัน`;invalidate()}
function snappedEnd(start,end){
  if(state.measureAxis==='off') return end.clone(); const delta=end.clone().sub(start); let axis=state.measureAxis;
  if(axis==='auto'){const a=[Math.abs(delta.x),Math.abs(delta.y),Math.abs(delta.z)],max=Math.max(...a);if(!delta.length()||max/delta.length()<.985)return end.clone();axis=['x','y','z'][a.indexOf(max)]}
  const out=start.clone(); out[axis]=end[axis]; return out;
}
function finishMeasure(rawEnd){
  const end=snappedEnd(state.measureStart,rawEnd),delta=end.clone().sub(state.measureStart); clearMeasureGraphics();measureGroup.add(marker(state.measureStart,0xffffff),marker(end,0x58e5c4));
  const geometry=new THREE.BufferGeometry().setFromPoints([state.measureStart,end]);measureGroup.add(new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0x58e5c4,dashSize:.5,gapSize:.25,depthTest:false})));measureGroup.children.at(-1).computeLineDistances();
  $('#deltaX').textContent=`${fmt(delta.x)} m`;$('#deltaY').textContent=`${fmt(delta.y)} m`;$('#deltaZ').textContent=`${fmt(delta.z)} m`;$('#distance2d').textContent=`${fmt(Math.hypot(delta.x,delta.y))} m`;$('#distance3d').textContent=`${fmt(delta.length())} m`;$('#measureHint').textContent=`จุดปลาย: E ${fmt(end.x+state.origin.x)} · N ${fmt(end.y+state.origin.y)} · Z ${fmt(end.z+state.origin.z)}`;
  state.measureStart=null;invalidate();
}
function toggleMeasure(on){if(on&&state.pivotMode){state.pivotMode=false;$('#pivotBtn').classList.remove('active');renderer.domElement.classList.remove('pivoting')}state.measuring=on;$('#measurePanel').hidden=!on;$('#measureBtn').classList.toggle('active',on);renderer.domElement.classList.toggle('measuring',on);controls.enabled=true;if(!on)clearMeasure()}
$('#measureBtn').addEventListener('click',()=>toggleMeasure(!state.measuring));$('#closeMeasure').addEventListener('click',()=>toggleMeasure(false));$('#clearMeasure').addEventListener('click',clearMeasure);
$('#pivotBtn').addEventListener('click',()=>{if(state.measuring)toggleMeasure(false);state.pivotMode=!state.pivotMode;$('#pivotBtn').classList.toggle('active',state.pivotMode);renderer.domElement.classList.toggle('pivoting',state.pivotMode);if(state.pivotMode)toast('คลิกตำแหน่งที่ต้องการใช้เป็นศูนย์กลางใหม่')});
document.querySelectorAll('[data-axis]').forEach(b=>b.addEventListener('click',()=>{state.measureAxis=b.dataset.axis;document.querySelectorAll('[data-axis]').forEach(x=>x.classList.toggle('active',x===b));clearMeasure()}));
document.querySelectorAll('[data-target-snap]').forEach(b=>b.addEventListener('click',()=>{state.measureTarget=b.dataset.targetSnap;document.querySelectorAll('[data-target-snap]').forEach(x=>x.classList.toggle('active',x===b));clearMeasure()}));
let previewTimer=0,lastPreviewEvent=null;renderer.domElement.addEventListener('pointermove',e=>{if(!state.measuring)return;lastPreviewEvent={clientX:e.clientX,clientY:e.clientY};if(previewTimer)return;previewTimer=setTimeout(()=>{previewTimer=0;if(!state.measuring||!lastPreviewEvent)return;const pick=pickModelPoint(lastPreviewEvent,state.measureTarget,false);if(!pick)return;if(state.measureStart)updateMeasurePreview(pick.point,pick.kind);else showSnapPreview(pick)},75)});
renderer.domElement.addEventListener('dblclick',e=>{if(!state.measuring)choosePivotAt(e)});
renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY}});renderer.domElement.addEventListener('pointerup',e=>{if(!pointerDown||Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>4)return;if(state.pivotMode){choosePivotAt(e);return}if(!state.measuring){selectDxfAt(e);return}const pick=pickModelPoint(e,state.measureTarget,false);if(!pick){toast('ไม่พบพื้นผิวใกล้ตำแหน่งเมาส์',true);return}const point=pick.point;if(!state.measureStart){clearMeasureGraphics();state.measureStart=point;measureGroup.add(marker(point,0xffffff));$('#measureHint').textContent=`${pick.kind} · จุดเริ่ม E ${fmt(point.x+state.origin.x)} · N ${fmt(point.y+state.origin.y)} · Z ${fmt(point.z+state.origin.z)} · เลื่อนเมาส์ไปยังจุดปลาย`;invalidate()}else finishMeasure(point)});
function fmt(v){return Number(v).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})}
