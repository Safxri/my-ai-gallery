const CLOUD_NAME = "dzarhswab";
const GALLERY_TAG = "school_gallery";
let allPhotoDescriptors = []; 

// 1. โหลดโมเดล AI
async function initAI() {
    console.log("กำลังโหลด AI...");
    const statusArea = document.getElementById('status-area');
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        console.log("AI Ready!");
        if(statusArea) statusArea.innerHTML = "ระบบ AI พร้อมใช้งาน";
        fetchImages();
    } catch (e) {
        console.error("AI Load Error:", e);
        if(statusArea) statusArea.innerHTML = "โหลด AI ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ";
    }
}

// 2. ดึงรูปจาก Cloudinary
async function fetchImages() {
    const gallery = document.getElementById('photo-gallery');
    try {
        // ดึงรายชื่อรูปภาพที่มี Tag "school_gallery"
        const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`);
        const data = await response.json();
        
        gallery.innerHTML = ""; 
        allPhotoDescriptors = []; 

        for (let imgInfo of data.resources) {
            const imgUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${imgInfo.public_id}.${imgInfo.format}`;
            
            // แสดงรูปในแกลเลอรี
            const imgElement = document.createElement('img');
            imgElement.src = imgUrl;
            imgElement.className = "gallery-item";
            gallery.appendChild(imgElement);

            // ส่งไปให้ AI แอบสแกนเก็บไว้ (Background process)
            preprocessImage(imgUrl);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        gallery.innerHTML = "<p>ไม่พบรูปภาพในคลัง หรือยังไม่ได้เปิดสิทธิ์ Resource List ใน Cloudinary</p>";
    }
}

// ฟังก์ชันแอบสแกนหน้าในคลัง (แก้เรื่อง crossOrigin)
async function preprocessImage(url) {
    try {
        const img = await faceapi.fetchImage(url, { crossOrigin: 'anonymous' });
        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        if (detection) {
            allPhotoDescriptors.push({ url: url, descriptor: detection.descriptor });
        }
    } catch (e) {
        console.warn("สแกนรูปไม่ผ่านหนึ่งรูป (อาจเป็นเพราะไฟล์เสียหรือไม่มีใบหน้า):", url);
    }
}

// 3. ระบบค้นหาใบหน้า
document.getElementById('face-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusArea = document.getElementById('status-area');
    statusArea.innerHTML = "<p style='color:blue'>กำลังวิเคราะห์ใบหน้าของคุณ...</p>";

    const queryImg = await faceapi.bufferToImage(file);
    const queryDetection = await faceapi.detectSingleFace(queryImg, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

    if (!queryDetection) {
        statusArea.innerHTML = "<p style='color:red'>ไม่พบใบหน้าในรูปภาพของคุณ ลองใช้รูปอื่นที่เห็นหน้าชัดๆ ครับ</p>";
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

    statusArea.innerHTML = `<p style='color:green'>เจอรูปที่คล้ายคุณทั้งหมด ${matchCount} รูป</p> 
                            <button onclick="fetchImages()" style="margin-top:10px; padding:5px 15px; cursor:pointer;">ดูรูปทั้งหมดใหม่</button>`;
});

initAI();
