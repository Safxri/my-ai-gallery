const CLOUD_NAME = "mediaflows_3e76c11d-8d62-4257-a219-93239b1b11f2";
const GALLERY_TAG = "school_gallery";
let allPhotoDescriptors = []; // เก็บค่าใบหน้าของทุกรูปในคลัง

// 1. โหลดโมเดล AI และเริ่มดึงรูป
async function initAI() {
    console.log("กำลังโหลด AI...");
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    console.log("AI Ready!");
    fetchImages();
}

// 2. ดึงรูปจาก Cloudinary และให้ AI แอบสแกนหน้าเก็บไว้ล่วงหน้า
async function fetchImages() {
    const gallery = document.getElementById('photo-gallery');
    try {
        const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`);
        const data = await response.json();
        
        gallery.innerHTML = ""; // ล้างหน้าเว็บก่อนโหลด
        
        allPhotoDescriptors = []; // ล้างค่าเก่า

        for (let imgInfo of data.resources) {
            const imgUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${imgInfo.public_id}.${imgInfo.format}`;
            
            // สร้าง Element รูปภาพโชว์บนเว็บ
            const imgElement = document.createElement('img');
            imgElement.src = imgUrl;
            imgElement.className = "gallery-item";
            gallery.appendChild(imgElement);

            // ให้ AI แอบสแกนหน้าในรูปนี้เก็บไว้ (เพื่อใช้ค้นหาเร็วๆ)
            preprocessImage(imgUrl);
        }
    } catch (e) {
        gallery.innerHTML = "<p>ไม่พบรูปภาพในคลัง หรือยังไม่ได้เปิดสิทธิ์ Resource List</p>";
    }
}

// ฟังก์ชันแอบสแกนหน้าในคลัง
async function preprocessImage(url) {
    const img = await faceapi.fetchImage(url);
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (detection) {
        allPhotoDescriptors.push({ url: url, descriptor: detection.descriptor });
    }
}

// 3. ระบบค้นหาใบหน้า (เมื่อผู้ใช้เลือกรูปตัวเอง)
document.getElementById('face-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusArea = document.getElementById('status-area');
    statusArea.innerHTML = "<p style='color:blue'>กำลังวิเคราะห์ใบหน้าของคุณ...</p>";

    const queryImg = await faceapi.bufferToImage(file);
    const queryDetection = await faceapi.detectSingleFace(queryImg, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

    if (!queryDetection) {
        statusArea.innerHTML = "<p style='color:red'>ไม่พบใบหน้าในรูปภาพของคุณ ลองเปลี่ยนรูปใหม่ครับ</p>";
        return;
    }

    // เปรียบเทียบกับรูปในคลัง
    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = ""; // ล้างหน้าจอเพื่อโชว์ผลลัพธ์
    let matchCount = 0;

    allPhotoDescriptors.forEach(item => {
        const distance = faceapi.euclideanDistance(queryDetection.descriptor, item.descriptor);
        if (distance < 0.6) { // ค่ามาตรฐาน: น้อยกว่า 0.6 คือคนเดียวกัน
            const img = document.createElement('img');
            img.src = item.url;
            img.className = "gallery-item";
            gallery.appendChild(img);
            matchCount++;
        }
    });

    statusArea.innerHTML = `<p style='color:green'>ค้นหาเสร็จสิ้น! เจอรูปที่คล้ายคุณทั้งหมด ${matchCount} รูป</p> 
                            <button onclick="fetchImages()" style="margin-top:10px">ดูรูปทั้งหมดใหม่</button>`;
});

initAI();
