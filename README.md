# Survey Cloud Viewer

เว็บแอปสำหรับตรวจสอบข้อมูลสำรวจและโมเดลสามมิติในระบบพิกัดจริง สร้างด้วย Three.js และ Vite

## ความสามารถหลัก

- เปิด Point Cloud: LAS, LAZ และ PLY
- เปิด Mesh Model: GLB, GLTF, OBJ, STL และ PLY
- สร้างพื้นผิวภูมิประเทศจาก GeoTIFF DEM พร้อมตรวจ EPSG/UTM
- ใช้ PRS92 / Philippines Zone 3 (EPSG:3123) เป็นระบบพิกัดโครงการเริ่มต้น
- แปลง PRS92 เป็น WGS84 อัตโนมัติสำหรับภาพดาวเทียมและ OSM โดยรักษาพิกัดสำรวจต้นฉบับ
- เลือกภาพดาวเทียม Esri World Imagery หรือ MapTiler Satellite ตาม Local Origin และระบบพิกัดที่เลือก
- ปรับความละเอียดภาพโครงการ Zoom 14–20 และขอบเขตโหลด 100, 250 หรือ 600 เมตร พร้อมแสดงค่าประมาณเมตรต่อพิกเซล
- วางภาพดาวเทียมบนพื้นผิว DEM (terrain draping)
- คง Project DEM ที่ Offset 0.000 m เป็นค่าใช้งานปกติ เพราะมาจาก Point Cloud ชุดเดียวกัน และซ่อนการ Calibrate ไว้ในเครื่องมือขั้นสูง
- วาง Esri imagery ให้ติดตาม Project DEM อัตโนมัติ พร้อมปรับ Imagery Offset แยกได้
- ปรับระดับ Regional Terrain, อาคาร OSM และถนน OSM แยกกันได้ โดยไม่แก้ geometry ต้นฉบับ
- โหลด Regional Terrain รัศมี 2, 5 หรือ 10 กิโลเมตรจาก Mapzen Terrain Tiles บน AWS Open Data
- วาง Esri imagery บนภูเขารอบโครงการและ Blend เข้ากับ Project DEM
- ตัดภาพดาวเทียมตามพื้นที่ DEM/NoData เพื่อป้องกันผนังภาพแนวดิ่ง
- นำเข้า DXF พร้อมรักษาค่าพิกัดและปรับ Elevation Offset
- แสดง Point Cloud ด้วยสี RGB, Elevation และ Classification
- จัดการ CAD Layer และสีภายใน DXF
- เลือก DXF Entity และดู Type, Layer และ Handle
- วัดค่า ΔX, ΔY, ΔZ, ระยะราบ และระยะเอียง
- วัดปริมาตรกองวัสดุด้วย Polygon, Best-fit Base Plane และ Grid Cell พร้อม Cut, Fill, Net Volume และ Coverage
- Export รายงานปริมาตรเป็น PDF สองหน้า (สรุปพร้อมภาพ Viewer และตารางพิกัด) หรือ CSV สำหรับ Excel
- Axis Snap แบบ Auto, X, Y, Z และ Off
- ย้าย Orbit Center และซูมเข้าหาตำแหน่งใต้เมาส์
- Adaptive point budget สำหรับ LAS/LAZ ขนาดใหญ่
- ตรวจจับ DXF outlier เพื่อเลือกขอบเขตเริ่มต้นที่เหมาะสม

## เริ่มต้นใช้งาน

ต้องติดตั้ง Node.js รุ่นใหม่ที่รองรับ Vite 7

```bash
npm install
npm run dev
```

เปิด <http://127.0.0.1:5173>

## เว็บไซต์สาธารณะ

เปิด Viewer ได้ที่ <https://nextstep-y.github.io/survey-cloud-viewer/>

## Production build

```bash
npm run build
npm run preview
```

## รูปแบบไฟล์

| ประเภท | รูปแบบที่รองรับ |
| --- | --- |
| Point Cloud | LAS, LAZ, PLY |
| Mesh | GLB, GLTF, OBJ, STL, PLY |
| Drawing | ASCII DXF |
| Terrain | GeoTIFF DEM (TIF, TIFF) |

Binary DXF ต้องบันทึกใหม่เป็น ASCII DXF ก่อนนำเข้า

## ความปลอดภัยของข้อมูล

ไฟล์ข้อมูลสำรวจและโมเดลจริงถูกระบุใน `.gitignore` เพื่อป้องกันการ commit ขึ้น GitHub โดยไม่ตั้งใจ เฉพาะไฟล์ตัวอย่างสังเคราะห์ใน `test-data/` เท่านั้นที่อนุญาตให้เก็บใน repository

## Technology

- [Three.js](https://threejs.org/)
- [loaders.gl](https://loaders.gl/)
- [dxf-parser](https://github.com/gdsestimating/dxf-parser)
- [Vite](https://vite.dev/)
