const CLOUD_NAME = "dzarhswab";
const GALLERY_TAG = "school_gallery";
let allPhotoDescriptors = []; 

async function initAI() {
    const statusArea = document.getElementById('status-area');
    try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/weights';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        statusArea.innerHTML = "✅ ระบบ AI พร้อมใช้งาน";
        fetchImages();
    } catch (e) {
        statusArea.innerHTML = "❌ โหลด AI ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ";
    }
}

async function fetchImages() {
    const gallery = document.getElementById('photo-gallery');
    try {
        const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`);
        const data = await response.json();
        gallery.innerHTML = "";
        allPhotoDescriptors = [];

        for (let imgInfo of data.resources) {
            const imgUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${imgInfo.public_id}.${imgInfo.format}`;
            const imgElement = document.createElement('img');
            imgElement.src = imgUrl;
            imgElement.className = "gallery-item";
            gallery.appendChild(imgElement);
            preprocessImage(imgUrl);
        }
        document.getElementById('counter').innerText = `พบรูปภาพทั้งหมด ${data.resources.length} รูป`;
    } catch (e) {
        gallery.innerHTML = "ไม่พบรูปภาพในคลัง (ตรวจสอบการเปิด Resource list ใน Cloudinary)";
    }
}

async function preprocessImage(url) {
    try {
        const img = await faceapi.fetchImage(url, { crossOrigin: 'anonymous' });
        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        if (detection) allPhotoDescriptors.push({ url: url, descriptor: detection.descriptor });
    } catch (e) {}
}

document.getElementById('face-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const statusArea = document.getElementById('status-area');
    if (!file) return;

    statusArea.innerHTML = "⏳ กำลังวิเคราะห์ใบหน้า...";
    const queryImg = await faceapi.bufferToImage(file);
    const queryDetection = await faceapi.detectSingleFace(queryImg, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

    if (!queryDetection) {
        statusArea.innerHTML = "❌ ไม่พบใบหน้าในรูปภาพของคุณ";
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

initAI();
