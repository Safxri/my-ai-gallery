const CLOUD_NAME = "dzarhswab";
const GALLERY_TAG = "school_gallery";
let allPhotoDescriptors = []; 

// 1. เริ่มโหลดระบบเมื่อเปิดหน้าเว็บ
window.onload = () => {
    initAI();
};

async function initAI() {
    const statusArea = document.getElementById('status-area');
    console.log("กำลังโหลดโมเดล AI...");

    try {
        // ใช้ Weights จาก GitHub ของผู้พัฒนาโดยตรง
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/weights';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        statusArea.innerHTML = "✅ ระบบ AI พร้อมใช้งาน";
        fetchImages();
    } catch (err) {
        console.error(err);
        statusArea.innerHTML = "❌ โหลด AI ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ";
    }
}

// 2. ดึงรูปภาพทั้งหมด
async function fetchImages() {
    const gallery = document.getElementById('photo-gallery');
    const counter = document.getElementById('counter');
    
    try {
        const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`);
        const data = await response.json();
        
        gallery.innerHTML = "";
        allPhotoDescriptors = [];
        counter.innerHTML = `พบรูปภาพทั้งหมด ${data.resources.length} รูป (กำลังสแกนใบหน้า...)`;

        for (let imgInfo of data.resources) {
            const imgUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${imgInfo.public_id}.${imgInfo.format}`;
            
            // แสดงรูป
            const imgElement = document.createElement('img');
            imgElement.src = imgUrl;
            imgElement.className = "gallery-item";
            gallery.appendChild(imgElement);

            // สแกนใบหน้าเก็บไว้
            preprocessImage(imgUrl);
        }
    } catch (err) {
        gallery.innerHTML = "ไม่พบรูปภาพในคลัง หรือไม่ได้เปิดสิทธิ์ Resource List";
    }
}

async function preprocessImage(url) {
    try {
        const img = await faceapi.fetchImage(url, { crossOrigin: 'anonymous' });
        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        if (detection) {
            allPhotoDescriptors.push({ url: url, descriptor: detection.descriptor });
        }
    } catch (e) { /* ข้ามรูปที่ไม่มีใบหน้า */ }
}

// 3. ค้นหาใบหน้า
document.getElementById('face-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusArea = document.getElementById('status-area');
    statusArea.innerHTML = "⏳ กำลังวิเคราะห์ใบหน้าของคุณ...";

    const queryImg = await faceapi.bufferToImage(file);
    const queryDetection = await faceapi.detectSingleFace(queryImg, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

    if (!queryDetection) {
        statusArea.innerHTML = "❌ ไม่พบใบหน้าในรูปของคุณ";
        return;
    }

    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = "";
    let matchCount = 0;

    allPhotoDescriptors.forEach(item => {
        const distance = faceapi.euclideanDistance(queryDetection.descriptor, item.descriptor);
        if (distance < 0.6) {
            const img = document.createElement('img');
            img.src = item.url;
            img.className = "gallery-item";
            gallery.appendChild(img);
            matchCount++;
        }
    });

    statusArea.innerHTML = `✅ เจอรูปที่คล้ายคุณ ${matchCount} รูป <button onclick="location.reload()">ดูทั้งหมด</button>`;
});
