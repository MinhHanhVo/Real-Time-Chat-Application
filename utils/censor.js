const fs = require('fs');
const path = require('path');

// Đọc danh sách từ cấm từ file configs/badWords.json
let badWords;
try {
    badWords = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/badWords.json'), 'utf8'));
} catch (error) {
    console.error('Không thể đọc badWords.json, sử dụng danh sách mặc định');
    badWords = [
        'từ_không_lịch_sự_1',
        'từ_không_lịch_sự_2',
        'từ_tiêu_cực_1',
        'damn',
        'adfhajfg'
    ];
}

// Hàm thay thế từ cấm bằng ***
const censorContent = (content) => {
    if (!content || typeof content !== 'string') return content;

    let censoredContent = content;
    badWords.forEach(word => {
        // Tạo regex để tìm từ, bỏ qua hoa thường
        const regex = new RegExp(`\\b${word}\\b`, 'gi'); // \b đảm bảo chỉ thay thế từ độc lập
        censoredContent = censoredContent.replace(regex, '***');
    });

    return censoredContent;
};

module.exports = { censorContent };