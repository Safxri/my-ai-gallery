const CLOUD_NAME = "mediaflows_3e76c11d-8d62-4257-a219-93239b1b11f2";
const UPLOAD_PRESET = "ml_default";
const GALLERY_TAG = "school_gallery";

// 1. โหลดโมเดล AI
async function initAI() {
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log("AI Ready");
    fetchImages();
}

// 2. ดึงรูปจาก Cloudinary มาโชว์
async function fetchImages() {
    const gallery = document.getElementById('photo-gallery');
    try {
        const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`);
        const data = await response.json();
        gallery.innerHTML = data.resources.map(img => 
            `<img src="https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${img.public_id}.${img.format}" class="gallery-item">`
        ).join('');
    } catch (e) {
        gallery.innerHTML = "ไม่พบรูปภาพในคลัง";
    }
}

// 3. ระบบล็อก Admin (แบบง่าย)
document.getElementById('admin-btn').addEventListener('click', () => {
    const pass = prompt("กรุณากรอกรหัสผ่านเจ้าของเว็บ:");
    if(pass === "1234") { // เปลี่ยนรหัสผ่านตรงนี้
        document.getElementById('admin-panel').classList.toggle('hidden');
    } else {
        alert("รหัสผ่านไม่ถูกต้อง");
    }
});

// 4. ระบบอัปโหลด
async function handleUpload() {
    const files = document.getElementById('upload-input').files;
    for(let file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('tags', GALLERY_TAG);
        await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData });
    }
    alert("อัปโหลดเรียบร้อย!");
    fetchImages();
}

initAI();
